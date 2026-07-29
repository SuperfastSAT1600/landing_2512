'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState, useEffect } from 'react';
import { Copy, Check, Crown, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { ScheduleEvent } from '@/app/api/admin/srm/schedule/route';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { SessionStatusSection } from './SessionStatusSection';
import type { SessionStatusLog } from '@/app/api/admin/srm/session-status/route';
import type { V2SessionSuggestion } from '@/app/api/admin/srm/v2-session-status/route';
import type { TutoringUser } from '@/app/api/admin/srm/tutoring-users/route';

type EventType = 'coachRoom' | 'studyHall' | 'vocab';
type TaggedEvent = ScheduleEvent & { eventType: EventType; day: 'today' };

function toTimeStr(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const TZ_REGION: Record<string, string> = {
  'America/Los_Angeles': '미국 서부', 'America/Vancouver': '미국 서부',
  'America/Denver': '미국 산악', 'America/Phoenix': '미국 산악', 'America/Boise': '미국 산악',
  'America/Chicago': '미국 중부', 'America/Winnipeg': '미국 중부',
  'America/New_York': '미국 동부', 'America/Toronto': '미국 동부', 'America/Detroit': '미국 동부',
  'Pacific/Honolulu': '하와이', 'America/Anchorage': '알래스카',
  'Europe/London': '영국', 'Europe/Dublin': '영국',
  'Europe/Paris': '유럽 중부', 'Europe/Berlin': '유럽 중부', 'Europe/Amsterdam': '유럽 중부',
  'Europe/Helsinki': '유럽 동부', 'Europe/Athens': '유럽 동부',
  'Asia/Tokyo': '일본', 'Asia/Shanghai': '중국', 'Asia/Hong_Kong': '홍콩',
  'Asia/Singapore': '싱가포르', 'Asia/Bangkok': '태국',
  'Asia/Ho_Chi_Minh': '베트남', 'Asia/Saigon': '베트남',
  'Asia/Jakarta': '인도네시아', 'Asia/Kuala_Lumpur': '말레이시아',
  'Australia/Sydney': '호주 동부', 'Australia/Melbourne': '호주 동부',
  'Australia/Perth': '호주 서부', 'Pacific/Auckland': '뉴질랜드',
};

function tzToRegion(tz: string): string {
  return TZ_REGION[tz] ?? tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

function getTzAbbr(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  }).formatToParts(new Date(iso));
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
}

function toDateKey(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
}

function toDateKo(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { timeZone: tz, month: 'numeric', day: 'numeric' });
}

function toDateEn(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: tz, month: 'long', day: 'numeric' });
}

function buildLocalParts(ev: ScheduleEvent, kstTime: string): string[] {
  const kstDateKey = toDateKey(ev.startsAt, 'Asia/Seoul');
  return ev.students.map((_name, i) => {
    const tz = ev.studentTimezones?.[i];
    if (!tz || tz === 'Asia/Seoul') return null;
    try {
      const localTime = toTimeStr(ev.startsAt, tz);
      const localDateKey = toDateKey(ev.startsAt, tz);
      if (localTime === kstTime && localDateKey === kstDateKey) return null;
      const datePart = localDateKey !== kstDateKey ? `${toDateKo(ev.startsAt, tz)} ` : '';
      return `${tzToRegion(tz)} 기준 ${datePart}${localTime}`;
    } catch {
      return null;
    }
  }).filter((x): x is string => x !== null);
}

function buildLocalPartsEn(ev: ScheduleEvent, kstTime: string): string[] {
  const kstDateKey = toDateKey(ev.startsAt, 'Asia/Seoul');
  return ev.students.map((_name, i) => {
    const tz = ev.studentTimezones?.[i];
    if (!tz || tz === 'Asia/Seoul') return null;
    try {
      const localTime = toTimeStr(ev.startsAt, tz);
      const localDateKey = toDateKey(ev.startsAt, tz);
      if (localTime === kstTime && localDateKey === kstDateKey) return null;
      const datePart = localDateKey !== kstDateKey ? `${toDateEn(ev.startsAt, tz)} ` : '';
      const abbr = getTzAbbr(ev.startsAt, tz);
      return `${abbr} ${datePart}${localTime}`;
    } catch {
      return null;
    }
  }).filter((x): x is string => x !== null);
}

function buildCopyMessage(ev: ScheduleEvent, isTomorrow: boolean): string {
  const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
  const kstDate = toDateKo(ev.startsAt, 'Asia/Seoul');
  const localParts = buildLocalParts(ev, kstTime);
  const dayWord = isTomorrow ? '내일' : '오늘';
  const suffix = isTomorrow ? '잊지 마세요! ' : '';
  let msg = `<알림> ${dayWord} 수업 ${kstDate} ${kstTime}(한국 시간 기준)에 있습니다${isTomorrow ? ',' : '!'} ${suffix}`;
  if (localParts.length > 0) msg += `(${localParts.join(', ')}) `;
  msg += '출석 잘해서 공부해보자구요!';
  return msg;
}

function buildCopyMessageEn(ev: ScheduleEvent, isTomorrow: boolean): string {
  const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
  const kstDate = toDateEn(ev.startsAt, 'Asia/Seoul');
  const localParts = buildLocalPartsEn(ev, kstTime);
  const dayWord = isTomorrow ? 'tomorrow' : 'today';
  const suffix = isTomorrow ? " Don't forget!" : '';
  let msg = `<Alert> You have a class ${dayWord}, ${kstDate} at ${kstTime} (Korea Standard Time)!${suffix}`;
  if (localParts.length > 0) msg += ` (${localParts.join(', ')})`;
  msg += ' Please join on time and study hard!';
  return msg;
}

function buildStudyHallCopyMessage(ev: ScheduleEvent, isTomorrow: boolean): string {
  const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
  const kstDate = toDateKo(ev.startsAt, 'Asia/Seoul');
  const localParts = buildLocalParts(ev, kstTime);
  let timeInfo = `${kstDate} ${kstTime}(한국 시간)`;
  if (localParts.length > 0) timeInfo += `, ${localParts.join(' / ')}`;
  const dayWord = isTomorrow ? '내일' : '오늘';
  const verb = isTomorrow ? '잊지 말고' : '늦지 말고';
  return `${dayWord} 스터디홀 접속 시간 ${timeInfo}이니 ${verb} 출석하자구요!`;
}

function buildStudyHallCopyMessageEn(ev: ScheduleEvent, isTomorrow: boolean): string {
  const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
  const kstDate = toDateEn(ev.startsAt, 'Asia/Seoul');
  const localParts = buildLocalPartsEn(ev, kstTime);
  let timeInfo = `${kstDate} at ${kstTime} (Korea Standard Time)`;
  if (localParts.length > 0) timeInfo += ` / ${localParts.join(' / ')}`;
  const dayWord = isTomorrow ? "Tomorrow's" : "Today's";
  const verb = isTomorrow ? "Don't forget to join!" : "Don't be late!";
  return `${dayWord} Study Hall starts on ${timeInfo}. ${verb}`;
}

function buildVocabCopyMessage(ev: ScheduleEvent, isTomorrow: boolean): string {
  const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
  const kstDate = toDateKo(ev.startsAt, 'Asia/Seoul');
  const localParts = buildLocalParts(ev, kstTime);
  let timeInfo = `${kstDate} ${kstTime}(한국 시간)`;
  if (localParts.length > 0) timeInfo += `, ${localParts.join(' / ')}`;
  const dayWord = isTomorrow ? '내일' : '오늘';
  const verb = isTomorrow ? '잊지 말고' : '늦지 말고';
  return `${dayWord} 단어학습 접속 시간 ${timeInfo}이니 ${verb} 출석해서 단어 외우는데 집중해보자구요!`;
}

function buildVocabCopyMessageEn(ev: ScheduleEvent, isTomorrow: boolean): string {
  const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
  const kstDate = toDateEn(ev.startsAt, 'Asia/Seoul');
  const localParts = buildLocalPartsEn(ev, kstTime);
  let timeInfo = `${kstDate} at ${kstTime} (Korea Standard Time)`;
  if (localParts.length > 0) timeInfo += ` / ${localParts.join(' / ')}`;
  const dayWord = isTomorrow ? "Tomorrow's" : "Today's";
  const verb = isTomorrow ? "Don't forget!" : "Don't be late!";
  return `${dayWord} Vocab session is on ${timeInfo}. ${verb} Join and focus on memorizing the words!`;
}

function mergeAndSort(
  todayCoach: ScheduleEvent[],
  todaySH: ScheduleEvent[],
  todayVocab: ScheduleEvent[],
): TaggedEvent[] {
  const tag = (evs: ScheduleEvent[], eventType: EventType): TaggedEvent[] =>
    evs.map((e) => ({ ...e, eventType, day: 'today' as const }));
  return [
    ...tag(todayCoach, 'coachRoom'),
    ...tag(todaySH, 'studyHall'),
    ...tag(todayVocab, 'vocab'),
  ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

interface StudentClickArg {
  id: string;
  name: string;
  eventId?: string;
  eventTime?: string;
  eventType?: EventType;
  coachId?: string;
}

interface CoachClickArg {
  id: string;
  name: string;
}

export type { TaggedEvent };

interface Props {
  todayCoachRoom: ScheduleEvent[];
  todayStudyHall: ScheduleEvent[];
  todayVocab: ScheduleEvent[];
  loading?: boolean;
  eventDate: string;
  vipStudentIds?: Set<string>;
  studentLanguages?: Map<string, 'ko' | 'en'>;
  pausedStudentIds?: Set<string>;
  loggedEventIds?: Set<string>;
  issueEventIds?: Set<string>;
  tutoringUserMap?: Map<string, TutoringUser>;
  onStudentClick: (student: StudentClickArg) => void;
  onCoachClick: (coach: CoachClickArg) => void;
  onEventClick: (ev: TaggedEvent & { startsAtKst: string }) => void;
  highlightEventId?: string;
}

export function UnifiedTimeline({
  todayCoachRoom,
  todayStudyHall,
  todayVocab,
  loading,
  eventDate,
  vipStudentIds,
  studentLanguages,
  pausedStudentIds,
  loggedEventIds,
  issueEventIds,
  tutoringUserMap,
  onStudentClick,
  onCoachClick,
  onEventClick,
  highlightEventId,
}: Props) {
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const [sessionLogs, setSessionLogs] = useState<Record<string, SessionStatusLog[]>>({});
  const [v2Suggestions, setV2Suggestions] = useState<Record<string, Record<string, V2SessionSuggestion>>>({});
  const [v2LoadingIds, setV2LoadingIds] = useState<Set<string>>(new Set());
  const { userName } = useAdminAuth();

  const events = mergeAndSort(todayCoachRoom, todayStudyHall, todayVocab);

  useEffect(() => {
    if (!highlightEventId) return;
    const el = document.querySelector(`[data-event-id="${highlightEventId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightEventId, events.length]);

  // v2 제안 → 기존 로그 없는 학생에 한해 자동 저장
  const autoSaveSuggestions = async (
    suggestionsMap: Record<string, Record<string, V2SessionSuggestion>>,
    currentLogs: Record<string, SessionStatusLog[]>,
  ) => {
    for (const ev of events) {
      if (ev.eventType === 'coachRoom') continue;
      const eventSuggestions = suggestionsMap[ev.id];
      if (!eventSuggestions) continue;

      const eventLogs = currentLogs[ev.id] ?? [];
      const eventType = ev.eventType === 'studyHall' ? 'study_hall' : 'vocab';

      if (!tutoringUserMap || tutoringUserMap.size === 0) continue; // 맵 로딩 전이면 자동저장 보류
      for (const [studentId, suggestion] of Object.entries(eventSuggestions)) {
        if (!suggestion.suggestedStatus) continue;
        if (!tutoringUserMap.has(studentId)) continue;

        const sidx = ev.studentIds?.findIndex((id) => id === studentId) ?? -1;
        const studentName = sidx >= 0 ? ev.students[sidx] : null;
        if (!studentName) continue;

        if (eventLogs.some((l) => l.student_name === studentName)) continue;

        try {
          const res = await srmFetch('/api/admin/srm/session-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: ev.id,
              eventType,
              eventDate,
              studentId,
              studentName,
              status: suggestion.suggestedStatus,
              loggedBy: 'v2-자동',
            }),
          });
          const { data } = await res.json();
          if (data) {
            setSessionLogs((prev) => ({
              ...prev,
              [ev.id]: [...(prev[ev.id] ?? []), data],
            }));
            eventLogs.push(data);
          }
        } catch { /* non-fatal */ }
      }
    }
  };

  // 배치 조회: studyHall/vocab 이벤트 로그 + v2 세션 상태 → 자동 저장
  useEffect(() => {
    const shVocabEvents = events.filter((e) => e.eventType !== 'coachRoom');
    if (!shVocabEvents.length) return;

    const eventIds = shVocabEvents.map((e) => e.id);
    const filterStudentIds = (ids: string[]) =>
      tutoringUserMap && tutoringUserMap.size > 0
        ? ids.filter((id) => tutoringUserMap.has(id))
        : ids;

    const eventsParam = encodeURIComponent(JSON.stringify(shVocabEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType === 'studyHall' ? 'study_hall' : 'vocab',
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      studentIds: filterStudentIds(e.studentIds ?? []),
    }))));

    Promise.all([
      srmFetch(`/api/admin/srm/session-status?eventIds=${eventIds.join(',')}`).then((r) => r.json()),
      srmFetch(`/api/admin/srm/v2-session-status?events=${eventsParam}`).then((r) => r.json()),
    ]).then(([statusData, v2Data]) => {
      const grouped: Record<string, SessionStatusLog[]> = {};
      for (const log of statusData.data ?? []) {
        if (!grouped[log.event_id]) grouped[log.event_id] = [];
        grouped[log.event_id].push(log);
      }
      setSessionLogs(grouped);

      const map: Record<string, Record<string, V2SessionSuggestion>> = {};
      for (const item of v2Data.data ?? []) {
        map[item.eventId] = Object.fromEntries(
          item.suggestions.map((s: V2SessionSuggestion) => [s.studentId, s])
        );
      }
      setV2Suggestions(map);

      autoSaveSuggestions(map, grouped);
    }).catch(() => {});
  }, [events.length, eventDate, tutoringUserMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshV2 = async (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    setV2LoadingIds((prev) => new Set(prev).add(eventId));
    try {
      const tutoringIds = (ev.studentIds ?? []).filter(
        (id) => !tutoringUserMap || tutoringUserMap.size === 0 || tutoringUserMap.has(id),
      );
      const eventsParam = encodeURIComponent(JSON.stringify([{
        id: ev.id,
        eventType: ev.eventType === 'studyHall' ? 'study_hall' : 'vocab',
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        studentIds: tutoringIds,
      }]));
      const res = await srmFetch(`/api/admin/srm/v2-session-status?events=${eventsParam}`);
      const d = await res.json();
      const item = (d.data ?? [])[0];
      if (item) {
        const newSuggestions = Object.fromEntries(item.suggestions.map((s: V2SessionSuggestion) => [s.studentId, s]));
        setV2Suggestions((prev) => ({ ...prev, [eventId]: newSuggestions }));

        // 수동 조회: 마지막 로그와 다를 때만 저장 (기존 로그가 있어도 저장)
        const eventType = ev.eventType === 'studyHall' ? 'study_hall' : 'vocab';
        const eventLogs = sessionLogs[eventId] ?? [];
        const newLogs: SessionStatusLog[] = [];
        for (const suggestion of item.suggestions as V2SessionSuggestion[]) {
          if (!suggestion.suggestedStatus) continue;
          if (tutoringUserMap && tutoringUserMap.size > 0 && !tutoringUserMap.has(suggestion.studentId)) continue;
          const sidx = ev.studentIds?.findIndex((id) => id === suggestion.studentId) ?? -1;
          const studentName = sidx >= 0 ? ev.students[sidx] : null;
          if (!studentName) continue;
          const studentLogs = [...eventLogs, ...newLogs].filter((l) => l.student_name === studentName);
          const lastLog = studentLogs[studentLogs.length - 1];
          if (lastLog?.status === suggestion.suggestedStatus) continue;
          try {
            const res2 = await srmFetch('/api/admin/srm/session-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId: ev.id, eventType, eventDate,
                studentId: suggestion.studentId, studentName,
                status: suggestion.suggestedStatus,
                loggedBy: 'v2-자동',
              }),
            });
            const { data: saved } = await res2.json();
            if (saved) newLogs.push(saved);
          } catch { /* non-fatal */ }
        }
        if (newLogs.length > 0) {
          setSessionLogs((prev) => ({
            ...prev,
            [eventId]: [...(prev[eventId] ?? []), ...newLogs],
          }));
        }
      }
    } catch { /* non-fatal */ }
    setV2LoadingIds((prev) => { const n = new Set(prev); n.delete(eventId); return n; });
  };

  const totalCount = events.length;

  const handleCopy = async (ev: TaggedEvent, lang: 'ko' | 'en') => {
    let msg: string;
    if (ev.eventType === 'studyHall') {
      msg = lang === 'en' ? buildStudyHallCopyMessageEn(ev, false) : buildStudyHallCopyMessage(ev, false);
    } else if (ev.eventType === 'vocab') {
      msg = lang === 'en' ? buildVocabCopyMessageEn(ev, false) : buildVocabCopyMessage(ev, false);
    } else {
      msg = lang === 'en' ? buildCopyMessageEn(ev, false) : buildCopyMessage(ev, false);
    }
    await navigator.clipboard.writeText(msg);
    setCopiedIds((prev) => new Set(prev).add(`${ev.id}-${lang}`));

    try {
      const eventTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
      const eventType = ev.eventType === 'coachRoom' ? 'coach_room' : ev.eventType === 'vocab' ? 'vocab' : 'study_hall';
      await srmFetch('/api/admin/srm/copy-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: ev.id,
          eventType,
          eventDate,
          eventTime,
          studentNames: ev.students,
          messagePreview: msg.slice(0, 200),
          copiedBy: userName || '관리자',
        }),
      });
    } catch {
      // non-fatal
    }
  };

  const handleAction = async (ev: TaggedEvent) => {
    setActionedIds((prev) => new Set(prev).add(ev.id));
    try {
      const eventTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
      const eventType = ev.eventType === 'coachRoom' ? 'coach_room' : ev.eventType === 'vocab' ? 'vocab' : 'study_hall';
      await srmFetch('/api/admin/srm/copy-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: ev.id,
          eventType: 'action',
          eventDate,
          eventTime,
          studentNames: ev.students,
          messagePreview: `[CHK] ${eventType}`,
          copiedBy: userName || '관리자',
        }),
      });
    } catch {
      // non-fatal
    }
  };

  const renderRow = (ev: TaggedEvent) => {
    const isDone = ev.status === 'completed';
    const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
    const timeStr = `${kstTime}~${toTimeStr(ev.endsAt, 'Asia/Seoul')}`;
    const isCoach = ev.eventType === 'coachRoom';
    const isVocab = ev.eventType === 'vocab';

    // 튜터링 유저 필터: map에 데이터가 있으면 해당 유저만 표시
    const filteredIndices = tutoringUserMap && tutoringUserMap.size > 0
      ? ev.students.map((_, i) => i).filter((i) => {
          const sid = ev.studentIds?.[i];
          return !sid || tutoringUserMap.has(sid);
        })
      : ev.students.map((_, i) => i);
    const filteredEv = {
      ...ev,
      students: filteredIndices.map((i) => ev.students[i]),
      studentIds: filteredIndices.map((i) => ev.studentIds?.[i] ?? ''),
      studentTimezones: filteredIndices.map((i) => ev.studentTimezones?.[i] ?? null),
    };

    const copiedKo = copiedIds.has(`${ev.id}-ko`);
    const copiedEn = copiedIds.has(`${ev.id}-en`);
    const alreadyLogged = !!(loggedEventIds?.has(ev.id));
    const hasIssue = !!(issueEventIds?.has(ev.id));
    const isActioned = actionedIds.has(ev.id);
    const alreadySent = copiedKo || copiedEn || alreadyLogged;
    const isComplete = alreadySent || isActioned;
    const isHighlighted = ev.id === highlightEventId;

    const msgPreview = isVocab
      ? buildVocabCopyMessage(ev, false)
      : ev.eventType === 'studyHall'
      ? buildStudyHallCopyMessage(ev, false)
      : buildCopyMessage(ev, false);

    const rowClass = isHighlighted
      ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-400 hover:bg-blue-100'
      : isComplete
      ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
      : hasIssue
      ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
      : isDone
      ? 'border-gray-200 bg-gray-50 opacity-80 hover:opacity-100'
      : 'border-red-200 bg-red-50 hover:bg-red-100';

    return (
      <div key={ev.id} data-event-id={ev.id} className="rounded-lg border overflow-hidden">
      <div
        onClick={() => onEventClick({ ...ev, startsAtKst: kstTime })}
        className={`flex items-stretch gap-0 text-sm cursor-pointer transition-colors ${rowClass} border-0`}
      >
        {/* 시간 */}
        <div className="w-[90px] shrink-0 px-3 py-3">
          <span className={`font-mono text-xs font-semibold whitespace-nowrap ${isDone ? 'text-gray-400' : 'text-gray-700'}`}>{timeStr}</span>
        </div>

        {/* 유형 */}
        <div className="w-[62px] shrink-0 px-2 py-3 border-l border-gray-100 flex justify-center items-center">
          <span className={`text-[11px] font-semibold whitespace-nowrap ${
            isCoach ? 'text-blue-600'
            : isVocab ? 'text-emerald-600'
            : 'text-purple-600'
          }`}>
            {isCoach ? '수업' : isVocab ? '단어학습' : '스터디홀'}
          </span>
        </div>

        {/* 학생 + 코치 */}
        <div className="w-[180px] shrink-0 px-3 py-3 border-l border-gray-100 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {filteredEv.students.map((name, i) => {
            const studentId = filteredEv.studentIds?.[i];
            const isVip = !!(studentId && vipStudentIds?.has(studentId));
            const lang = studentId ? (studentLanguages?.get(studentId) ?? 'ko') : 'ko';
            const isPaused = !!(studentId && pausedStudentIds?.has(studentId));
            const tUser = studentId ? tutoringUserMap?.get(studentId) : undefined;
            return (
              <button
                key={`${ev.id}-s-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onStudentClick({
                    id: studentId ?? name,
                    name,
                    eventId: ev.id,
                    eventTime: toTimeStr(ev.startsAt, 'Asia/Seoul'),
                    eventType: ev.eventType,
                    coachId: ev.coachIds?.[0] ?? undefined,
                  });
                }}
                className={`inline-flex items-center gap-0.5 hover:text-blue-500 hover:underline transition-colors text-xs leading-tight ${
                  isDone ? 'text-gray-400' : 'text-gray-800'
                }`}
              >
                {isVip && <Crown size={10} className="text-yellow-400 shrink-0" />}
                {name}
                {isPaused && <span className="text-[10px] font-medium text-orange-700 bg-orange-100 px-1 rounded">휴원</span>}
                {lang === 'en' && <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1 rounded">EN</span>}
                {tUser && tUser.status !== 'active' && tUser.status !== 'paused' && (
                  <span className={`text-[9px] font-medium px-1 rounded ${
                    tUser.status === 'ended' ? 'text-red-600 bg-red-50' :
                    tUser.status === 'partial_end' ? 'text-gray-500 bg-gray-100' :
                    'text-blue-600 bg-blue-50'
                  }`}>
                    {tUser.status === 'ended' ? '종료' : tUser.status === 'partial_end' ? '부분종료' : '세일즈'}
                  </span>
                )}
                {tUser && <span className="text-[9px] text-gray-400">잔여{tUser.remainingHours}h</span>}
              </button>
            );
          })}
          {ev.coaches.length > 0 && (
            <span className="text-gray-300 flex items-center gap-1 text-xs">
              <span>↔</span>
              {ev.coaches.map((coachName, i) => (
                <button
                  key={`${ev.id}-c-${i}`}
                  onClick={(e) => { e.stopPropagation(); onCoachClick({ id: ev.coachIds?.[i] ?? coachName, name: coachName }); }}
                  className="text-gray-400 hover:text-blue-500 hover:underline transition-colors"
                >
                  {coachName}
                </button>
              ))}
            </span>
          )}
        </div>

        {/* 메시지 미리보기 + KO / EN */}
        <div className="flex-1 min-w-0 px-3 py-2.5 border-l border-gray-100 flex flex-col gap-1.5 justify-center">
          <p className="text-[11px] text-gray-400 truncate leading-relaxed">{msgPreview}</p>
          <div className="flex">
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(ev, 'ko'); }}
              title="한국어 메시지 복사"
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-l text-[10px] font-medium border transition-colors ${
                copiedKo
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-100'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white'
              }`}
            >
              {copiedKo ? <Check size={10} /> : <Copy size={10} />}
              {isVocab ? '학습 안내' : isCoach ? '출석 안내' : '입장 안내'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(ev, 'en'); }}
              title="English message copy"
              className={`px-1.5 py-0.5 rounded-r text-[9px] font-bold border-y border-r transition-colors ${
                copiedEn
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-100'
                  : 'border-gray-200 text-blue-400 hover:text-blue-600 hover:border-blue-300 bg-white'
              }`}
            >
              {copiedEn ? <Check size={9} /> : 'EN'}
            </button>
          </div>
        </div>

        {/* 업무 완료 */}
        <div className="w-[72px] shrink-0 px-2 py-3 border-l border-gray-100 flex items-center justify-center">
          {isComplete ? (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
              <Check size={10} />
              {alreadySent ? '발송됨' : 'chk'}
            </span>
          ) : hasIssue ? (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange-600">
              <AlertTriangle size={10} />이슈
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleAction(ev); }}
              title="대응/관리 완료 체크"
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border border-gray-200 bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
            >
              <ClipboardCheck size={10} />
              chk
            </button>
          )}
        </div>
      </div>
      {!isCoach && (
        <SessionStatusSection
          ev={{ ...filteredEv, eventType: filteredEv.eventType as 'studyHall' | 'vocab' }}
          eventDate={eventDate}
          userName={userName || '관리자'}
          v2Suggestions={v2Suggestions}
          onRefreshV2={handleRefreshV2}
          v2Loading={v2LoadingIds.has(ev.id)}
          initialLogs={sessionLogs[ev.id]}
        />
      )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-900">스케줄</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {loading ? '...' : totalCount}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <p className="text-xs text-gray-400 py-4">스케줄 없음</p>
      ) : (
        <div>
          {/* 헤더 */}
          <div className="flex items-center gap-0 mb-1 px-0">
            <div className="w-[90px] shrink-0 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">시간</div>
            <div className="w-[62px] shrink-0 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-l border-gray-100 flex justify-center">유형</div>
            <div className="w-[180px] shrink-0 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-l border-gray-100">학생 · 코치</div>
            <div className="flex-1 min-w-0 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-l border-gray-100">메시지</div>
            <div className="w-[72px] shrink-0 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-l border-gray-100 flex justify-center">완료</div>
          </div>
          <div className="space-y-1.5">
            {events.map(renderRow)}
          </div>
        </div>
      )}
    </div>
  );
}
