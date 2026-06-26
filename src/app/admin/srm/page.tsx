'use client';
import { srmFetch } from './lib/srm-fetch';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DayTabs, getKstDateStr } from './components/DayTabs';
import { UnifiedTimeline } from './components/UnifiedTimeline';
import { AlertFeedRows } from './components/AlertFeedRows';
import { StudentPanel } from './components/StudentPanel';
import { CoachPanel } from './components/CoachPanel';
import { OpsTaskList } from './components/OpsTaskList';
import { OpsRadar } from './components/OpsRadar';
import { StudentSearch } from './components/StudentSearch';
import { StudentRoster } from './components/StudentRoster';
import { EventLogPanel } from './components/EventLogPanel';
import DailyLearningPage from './daily-learning/page';
import type { TaggedEvent } from './components/UnifiedTimeline';
import type { ScheduleResponse, ScheduleEvent } from '@/app/api/admin/srm/schedule/route';
import type { AlertsResponse } from '@/app/api/admin/srm/alerts/route';
import type { EventIssue } from '@/app/api/admin/srm/issues/route';
import { AlertTriangle } from 'lucide-react';

// sfv2 profile ID 기준 또는 CRM student ID 기준으로 패널 열기
interface SelectedStudent {
  id?: string;          // sfv2 profile ID
  crmStudentId?: string; // CRM student ID (v2 미연결)
  name: string;
  triggerType?: string;
  eventId?: string;
  eventTime?: string;
  eventType?: 'coachRoom' | 'studyHall' | 'vocab';
  coachId?: string;
}

interface SelectedCoach {
  id: string;
  name: string;
  relatedStudents: { name: string; events: string[] }[];
}

type MainTab = 'queue' | 'log' | 'roster' | 'daily';

function collectRelatedStudents(
  coachId: string,
  today: { coachRoom: ScheduleEvent[]; studyHall: ScheduleEvent[] } | undefined,
  tomorrow: { coachRoom: ScheduleEvent[]; studyHall: ScheduleEvent[] } | undefined,
): { name: string; events: string[] }[] {
  const studentMap = new Map<string, string[]>();

  const processEvents = (events: ScheduleEvent[], dayLabel: string) => {
    for (const ev of events) {
      const coachIdx = ev.coachIds?.indexOf(coachId) ?? -1;
      if (coachIdx === -1) continue;
      for (const studentName of ev.students) {
        const existing = studentMap.get(studentName) ?? [];
        existing.push(dayLabel);
        studentMap.set(studentName, existing);
      }
    }
  };

  if (today) {
    processEvents(today.coachRoom, '오늘');
    processEvents(today.studyHall, '오늘');
  }
  if (tomorrow) {
    processEvents(tomorrow.coachRoom, '내일');
    processEvents(tomorrow.studyHall, '내일');
  }

  return Array.from(studentMap.entries()).map(([name, events]) => ({ name, events }));
}

export default function SrmPage() {
  const searchParams = useSearchParams();
  const urlDate = searchParams.get('date');
  const urlEventId = searchParams.get('eventId');

  const [mainTab, setMainTab] = useState<MainTab>('queue');
  const [selectedDate, setSelectedDate] = useState(() => {
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;
    return getKstDateStr(0);
  });
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<SelectedCoach | null>(null);
  const [vipStudentIds, setVipStudentIds] = useState<Set<string>>(new Set());
  const [studentLanguages, setStudentLanguages] = useState<Map<string, 'ko' | 'en'>>(new Map());
  const [pausedStudentIds, setPausedStudentIds] = useState<Set<string>>(new Set());
  const [loggedEventIds, setLoggedEventIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<(TaggedEvent & { startsAtKst: string }) | null>(null);
  const [openIssues, setOpenIssues] = useState<EventIssue[]>([]);

  useEffect(() => {
    if (mainTab !== 'queue') return;
    setScheduleLoading(true);
    setSchedule(null);
    srmFetch(`/api/admin/srm/schedule?date=${selectedDate}`)
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(async (scheduleData: ScheduleResponse) => {
        setSchedule(scheduleData);

        // 해당 날짜 스케줄의 모든 이벤트 ID 수집 (오늘 + 내일)
        const allEventIds = [
          ...(scheduleData?.today?.coachRoom ?? []),
          ...(scheduleData?.today?.studyHall ?? []),
          ...(scheduleData?.today?.vocab ?? []),
          ...(scheduleData?.tomorrow?.coachRoom ?? []),
          ...(scheduleData?.tomorrow?.studyHall ?? []),
          ...(scheduleData?.tomorrow?.vocab ?? []),
        ].map((e: ScheduleEvent) => e.id);

        if (!allEventIds.length) { setLoggedEventIds(new Set()); return; }

        const [logData, commsData] = await Promise.all([
          srmFetch(`/api/admin/srm/copy-log?date=${selectedDate}`).then((r) => r.json()).catch(() => ({ data: [] })),
          srmFetch(`/api/admin/srm/communications?eventIds=${allEventIds.join(',')}`).then((r) => r.json()).catch(() => []),
        ]);

        const ids = new Set<string>((logData.data ?? []).map((e: { event_id: string }) => e.event_id));
        (Array.isArray(commsData) ? commsData : [])
          .filter((e: { event_id: string | null }) => e.event_id)
          .forEach((e: { event_id: string }) => ids.add(e.event_id));
        setLoggedEventIds(ids);
      })
      .finally(() => setScheduleLoading(false));
  }, [selectedDate, mainTab]);

  useEffect(() => {
    if (mainTab !== 'queue') return;
    setAlertsLoading(true);
    srmFetch('/api/admin/srm/alerts')
      .then((r) => r.json())
      .then(setAlerts)
      .finally(() => setAlertsLoading(false));
  }, [mainTab]);

  useEffect(() => {
    if (mainTab !== 'queue') return;
    srmFetch('/api/admin/srm/issues?status=open&limit=100')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setOpenIssues(data); })
      .catch((err) => console.error('[SrmPage] issues fetch failed:', err));
  }, [mainTab, selectedEvent]);

  useEffect(() => {
    if (mainTab !== 'queue') return;
    Promise.all([
      srmFetch('/api/admin/srm/vip-students').then((r) => r.json()).catch(() => ({})),
      srmFetch('/api/admin/srm/student-languages').then((r) => r.json()).catch(() => ({})),
      srmFetch('/api/admin/srm/paused-students').then((r) => r.json()).catch(() => ({})),
    ]).then(([vipData, langData, pauseData]) => {
      if (Array.isArray(vipData?.sfv2ProfileIds)) {
        setVipStudentIds(new Set(vipData.sfv2ProfileIds));
      }
      if (langData?.languages && typeof langData.languages === 'object') {
        setStudentLanguages(new Map(Object.entries(langData.languages) as [string, 'ko' | 'en'][]));
      }
      if (Array.isArray(pauseData?.sfv2ProfileIds)) {
        setPausedStudentIds(new Set(pauseData.sfv2ProfileIds));
      }
    });
  }, [mainTab]);

  useEffect(() => {
    if (!urlEventId || !schedule) return;
    const allEvents = [
      ...(schedule.today.coachRoom.map((e) => ({ ...e, eventType: 'coachRoom' as const, day: 'today' as const }))),
      ...(schedule.today.studyHall.map((e) => ({ ...e, eventType: 'studyHall' as const, day: 'today' as const }))),
      ...(schedule.today.vocab.map((e) => ({ ...e, eventType: 'vocab' as const, day: 'today' as const }))),
      ...(schedule.tomorrow.coachRoom.map((e) => ({ ...e, eventType: 'coachRoom' as const, day: 'tomorrow' as const }))),
      ...(schedule.tomorrow.studyHall.map((e) => ({ ...e, eventType: 'studyHall' as const, day: 'tomorrow' as const }))),
      ...(schedule.tomorrow.vocab.map((e) => ({ ...e, eventType: 'vocab' as const, day: 'tomorrow' as const }))),
    ];
    const target = allEvents.find((e) => e.id === urlEventId);
    if (!target) return;
    const startsAtKst = new Date(target.startsAt).toLocaleTimeString('ko-KR', {
      timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    setSelectedEvent({ ...target, startsAtKst });
  }, [schedule, urlEventId]);

  const handleLanguageChange = (sfv2ProfileId: string, lang: 'ko' | 'en') => {
    setStudentLanguages((prev) => new Map(prev).set(sfv2ProfileId, lang));
  };

  const handleStudentClick = (id: string, name: string) => {
    setSelectedStudent({ id, name });
  };

  const handleRosterStudentClick = (student: SelectedStudent) => {
    setSelectedStudent(student);
  };

  const handleCoachClick = (coach: { id: string; name: string }) => {
    const relatedStudents = collectRelatedStudents(
      coach.id,
      schedule?.today,
      schedule?.tomorrow,
    );
    setSelectedCoach({ ...coach, relatedStudents });
  };

  const handleScheduleStudentClick = (student: { id: string; name: string; eventId?: string; eventTime?: string; eventType?: 'coachRoom' | 'studyHall' | 'vocab'; coachId?: string }) => {
    setSelectedStudent({
      id: student.id,
      name: student.name,
      eventId: student.eventId,
      eventTime: student.eventTime,
      eventType: student.eventType,
      coachId: student.coachId,
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">SRM</h1>
      </div>

      {/* 메인 탭 */}
      <div className="flex gap-1 mb-6">
        {(['queue', 'log', 'roster', 'daily'] as MainTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              mainTab === t
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {t === 'queue' ? '업무 큐' : t === 'log' ? '업무 로그' : t === 'roster' ? '명단' : '학습 리포트'}
          </button>
        ))}
      </div>

      {mainTab !== 'roster' && mainTab !== 'daily' && (
        <DayTabs selected={selectedDate} onChange={setSelectedDate} />
      )}

      {mainTab === 'queue' && openIssues.length > 0 && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle size={14} className="text-orange-600 shrink-0" />
          <span className="text-sm text-orange-700 font-medium">미해결 이슈 {openIssues.length}건</span>
          <div className="flex gap-1.5 flex-wrap ml-1">
            {openIssues.slice(0, 5).map((issue) => (
              <span key={issue.id} className="text-[11px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                {issue.student_name ?? issue.title}
              </span>
            ))}
            {openIssues.length > 5 && (
              <span className="text-[11px] text-gray-500">+{openIssues.length - 5}건 더</span>
            )}
          </div>
        </div>
      )}

      {mainTab === 'queue' && (
        <>
          <StudentSearch onSelect={handleRosterStudentClick} />
          <AlertFeedRows
            data={alerts}
            loading={alertsLoading}
            onStudentClick={(student) => setSelectedStudent({
              id: student.id,
              name: student.name,
              triggerType: student.triggerType,
            })}
            onCoachClick={handleCoachClick}
          />
          <UnifiedTimeline
            todayCoachRoom={schedule?.today?.coachRoom ?? []}
            todayStudyHall={schedule?.today?.studyHall ?? []}
            todayVocab={schedule?.today?.vocab ?? []}
            tomorrowCoachRoom={schedule?.tomorrow?.coachRoom ?? []}
            tomorrowStudyHall={schedule?.tomorrow?.studyHall ?? []}
            tomorrowVocab={schedule?.tomorrow?.vocab ?? []}
            loading={scheduleLoading}
            eventDate={selectedDate}
            vipStudentIds={vipStudentIds}
            studentLanguages={studentLanguages}
            pausedStudentIds={pausedStudentIds}
            loggedEventIds={loggedEventIds}
            issueEventIds={new Set(openIssues.filter((i) => i.event_id).map((i) => i.event_id!))}
            onStudentClick={handleScheduleStudentClick}
            onCoachClick={handleCoachClick}
            onEventClick={setSelectedEvent}
            highlightEventId={urlEventId ?? undefined}
          />
        </>
      )}

      {mainTab === 'log' && (
        <>
          <OpsRadar onStudentClick={handleRosterStudentClick} />
          <div className="mt-6 pt-5 border-t border-gray-200">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">업무 기록</p>
            <OpsTaskList date={selectedDate} onStudentClick={handleStudentClick} />
          </div>
        </>
      )}

      {mainTab === 'roster' && (
        <StudentRoster onStudentClick={handleRosterStudentClick} />
      )}

      {mainTab === 'daily' && (
        <DailyLearningPage />
      )}

      {selectedStudent && (
        <StudentPanel
          studentId={selectedStudent.id}
          crmStudentId={selectedStudent.crmStudentId}
          studentName={selectedStudent.name}
          triggerType={selectedStudent.triggerType}
          eventId={selectedStudent.eventId}
          eventTime={selectedStudent.eventTime}
          eventType={selectedStudent.eventType}
          coachId={selectedStudent.coachId}
          onClose={() => setSelectedStudent(null)}
          onLanguageChange={handleLanguageChange}
        />
      )}

      {selectedEvent && !selectedStudent && (
        <EventLogPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {selectedCoach && !selectedStudent && (
        <CoachPanel
          coachId={selectedCoach.id}
          coachName={selectedCoach.name}
          relatedStudents={selectedCoach.relatedStudents}
          onClose={() => setSelectedCoach(null)}
        />
      )}
    </div>
    </div>
  );
}
