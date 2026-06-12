'use client';

import { useState, useEffect } from 'react';
import { DayTabs, getKstDateStr } from './components/DayTabs';
import { ScheduleList } from './components/ScheduleList';
import { AlertSection } from './components/AlertSection';
import { StudentPanel } from './components/StudentPanel';
import { OpsTaskList } from './components/OpsTaskList';
import { StudentSearch } from './components/StudentSearch';
import { MatchQueue } from './components/MatchQueue';
import { StudentRoster } from './components/StudentRoster';
import type { ScheduleResponse } from '@/app/api/admin/srm/schedule/route';
import type { AlertsResponse } from '@/app/api/admin/srm/alerts/route';

// sfv2 profile ID 기준 또는 CRM student ID 기준으로 패널 열기
interface SelectedStudent {
  id?: string;          // sfv2 profile ID
  crmStudentId?: string; // CRM student ID (v2 미연결)
  name: string;
}
type MainTab = 'schedule' | 'ops' | 'link' | 'roster';

export default function SrmPage() {
  const [mainTab, setMainTab] = useState<MainTab>('schedule');
  const [selectedDate, setSelectedDate] = useState(() => getKstDateStr(0));
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);

  useEffect(() => {
    if (mainTab !== 'schedule') return;
    setScheduleLoading(true);
    setSchedule(null);
    fetch(`/api/admin/srm/schedule?date=${selectedDate}`)
      .then((r) => r.json())
      .then(setSchedule)
      .finally(() => setScheduleLoading(false));
  }, [selectedDate, mainTab]);

  useEffect(() => {
    if (mainTab !== 'schedule') return;
    setAlertsLoading(true);
    fetch('/api/admin/srm/alerts')
      .then((r) => r.json())
      .then(setAlerts)
      .finally(() => setAlertsLoading(false));
  }, [mainTab]);

  const handleStudentClick = (id: string, name: string) => {
    setSelectedStudent({ id, name });
  };

  const handleRosterStudentClick = (student: SelectedStudent) => {
    setSelectedStudent(student);
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">SRM</h1>
      </div>

      {/* 메인 탭 */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {(['schedule', 'ops', 'link', 'roster'] as MainTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              mainTab === t
                ? 'text-white border-blue-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {t === 'schedule' ? '스케줄' : t === 'ops' ? '운영' : t === 'link' ? '연결' : '명단'}
          </button>
        ))}
      </div>

      {mainTab !== 'link' && mainTab !== 'roster' && (
        <DayTabs selected={selectedDate} onChange={setSelectedDate} />
      )}

      {mainTab === 'schedule' && (
        <>
          <div className="flex gap-8">
            <ScheduleList
              title="수업 (코치룸)"
              events={schedule?.coachRoom ?? []}
              type="coachRoom"
              loading={scheduleLoading}
              eventDate={selectedDate}
              onStudentClick={setSelectedStudent}
            />
            <div className="w-px bg-white/5 shrink-0" />
            <ScheduleList
              title="스터디홀"
              events={schedule?.studyHall ?? []}
              type="studyHall"
              loading={scheduleLoading}
              eventDate={selectedDate}
              onStudentClick={setSelectedStudent}
            />
          </div>

          <AlertSection
            data={alerts}
            loading={alertsLoading}
            onStudentClick={setSelectedStudent}
          />
        </>
      )}

      {mainTab === 'ops' && (
        <>
          <StudentSearch onSelect={handleRosterStudentClick} />
          <OpsTaskList date={selectedDate} onStudentClick={handleStudentClick} />
        </>
      )}

      {mainTab === 'link' && (
        <MatchQueue onLinked={() => {}} />
      )}

      {mainTab === 'roster' && (
        <StudentRoster onStudentClick={handleRosterStudentClick} />
      )}

      {selectedStudent && (
        <StudentPanel
          studentId={selectedStudent.id}
          crmStudentId={selectedStudent.crmStudentId}
          studentName={selectedStudent.name}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
