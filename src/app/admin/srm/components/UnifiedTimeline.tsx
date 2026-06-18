'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState } from 'react';
import { Copy, Check, Crown, AlertTriangle } from 'lucide-react';
import { ScheduleEvent } from '@/app/api/admin/srm/schedule/route';
import { useAdminAuth } from '@/lib/useAdminAuth';

type EventType = 'coachRoom' | 'studyHall';
type EventDay = 'today' | 'tomorrow';

type TaggedEvent = ScheduleEvent & { eventType: EventType; day: EventDay };

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
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
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

const DAY_MS = 24 * 60 * 60 * 1000;

// 내일 이벤트는 오늘 같은 시각에 연락해야 하므로 -24h를 sort key로 사용
function contactTime(ev: TaggedEvent): number {
  const ms = new Date(ev.startsAt).getTime();
  return ev.day === 'tomorrow' ? ms - DAY_MS : ms;
}

function mergeAndSort(
  todayCoach: ScheduleEvent[],
  todaySH: ScheduleEvent[],
  tomorrowCoach: ScheduleEvent[],
  tomorrowSH: ScheduleEvent[],
): TaggedEvent[] {
  const tag = (evs: ScheduleEvent[], eventType: EventType, day: EventDay): TaggedEvent[] =>
    evs.map((e) => ({ ...e, eventType, day }));

  return [
    ...tag(todayCoach, 'coachRoom', 'today'),
    ...tag(todaySH, 'studyHall', 'today'),
    ...tag(tomorrowCoach, 'coachRoom', 'tomorrow'),
    ...tag(tomorrowSH, 'studyHall', 'tomorrow'),
  ].sort((a, b) => contactTime(a) - contactTime(b));
}

interface StudentClickArg {
  id: string;
  name: string;
  eventId?: string;
  eventTime?: string;
  eventType?: 'coachRoom' | 'studyHall';
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
  tomorrowCoachRoom: ScheduleEvent[];
  tomorrowStudyHall: ScheduleEvent[];
  loading?: boolean;
  eventDate: string;
  vipStudentIds?: Set<string>;
  studentLanguages?: Map<string, 'ko' | 'en'>;
  pausedStudentIds?: Set<string>;
  loggedEventIds?: Set<string>;
  issueEventIds?: Set<string>;
  onStudentClick: (student: StudentClickArg) => void;
  onCoachClick: (coach: CoachClickArg) => void;
  onEventClick: (ev: TaggedEvent & { startsAtKst: string }) => void;
}

export function UnifiedTimeline({
  todayCoachRoom,
  todayStudyHall,
  tomorrowCoachRoom,
  tomorrowStudyHall,
  loading,
  eventDate,
  vipStudentIds,
  studentLanguages,
  pausedStudentIds,
  loggedEventIds,
  issueEventIds,
  onStudentClick,
  onCoachClick,
  onEventClick,
}: Props) {
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const { userName } = useAdminAuth();

  const events = mergeAndSort(todayCoachRoom, todayStudyHall, tomorrowCoachRoom, tomorrowStudyHall);
  const totalCount = events.length;

  const handleCopy = async (ev: TaggedEvent, lang: 'ko' | 'en') => {
    const isTomorrow = ev.day === 'tomorrow';
    let msg: string;
    if (ev.eventType === 'studyHall') {
      msg = lang === 'en' ? buildStudyHallCopyMessageEn(ev, isTomorrow) : buildStudyHallCopyMessage(ev, isTomorrow);
    } else {
      msg = lang === 'en' ? buildCopyMessageEn(ev, isTomorrow) : buildCopyMessage(ev, isTomorrow);
    }
    await navigator.clipboard.writeText(msg);

    setCopiedIds((prev) => new Set(prev).add(`${ev.id}-${lang}`));

    try {
      const eventTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
      const eventType = ev.eventType === 'coachRoom' ? 'coach_room' : 'study_hall';
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

  const renderRow = (ev: TaggedEvent) => {
    const isDone = ev.status === 'completed';
    const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');
    const timeStr = `${kstTime}~${toTimeStr(ev.endsAt, 'Asia/Seoul')}`;
    const isCoach = ev.eventType === 'coachRoom';

    const copiedKo = copiedIds.has(`${ev.id}-ko`);
    const copiedEn = copiedIds.has(`${ev.id}-en`);
    const alreadyLogged = !!(loggedEventIds?.has(ev.id));
    const hasIssue = !!(issueEventIds?.has(ev.id));
    const alreadySent = copiedKo || copiedEn || alreadyLogged;

    const msgPreview = ev.eventType === 'studyHall'
      ? buildStudyHallCopyMessage(ev, ev.day === 'tomorrow')
      : buildCopyMessage(ev, ev.day === 'tomorrow');

    return (
      <div
        key={ev.id}
        onClick={() => onEventClick({ ...ev, startsAtKst: kstTime })}
        className={`flex items-stretch gap-3 px-3 py-2.5 rounded-md text-sm group cursor-pointer ${
          alreadySent
            ? 'bg-emerald-50 hover:bg-emerald-100'
            : isDone
            ? 'bg-gray-50 opacity-80 hover:opacity-100'
            : 'bg-white hover:bg-gray-50'
        }`}
      >
        {/* 시간 열 */}
        <div className="w-14 shrink-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-sm font-semibold ${isDone ? 'text-gray-400' : 'text-gray-700'}`}>{timeStr}</span>
        </div>

        {/* 좌측: 유형 + 학생 */}
        <div className="w-[32%] min-w-0 flex flex-col gap-1 justify-center border-l border-gray-100 pl-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
              isCoach ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {isCoach ? '수업' : '스터디홀'}
            </span>
            {ev.day === 'tomorrow' && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">내일</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
            {ev.students.map((name, i) => {
              const studentId = ev.studentIds?.[i];
              const isVip = !!(studentId && vipStudentIds?.has(studentId));
              const lang = studentId ? (studentLanguages?.get(studentId) ?? 'ko') : 'ko';
              const isPaused = !!(studentId && pausedStudentIds?.has(studentId));
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
                  className={`inline-flex items-center gap-0.5 hover:text-blue-400 hover:underline transition-colors text-sm leading-tight ${
                    isDone ? 'text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {isVip && <Crown size={11} className="text-yellow-400 shrink-0" />}
                  {name}
                  {isPaused && <span className="text-[10px] font-medium text-orange-700 bg-orange-100 px-1 rounded">휴원</span>}
                  {lang === 'en' && <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1 rounded">EN</span>}
                </button>
              );
            })}
            {isCoach && ev.coaches.length > 0 && (
              <span className="text-gray-500 flex items-center gap-1 text-xs">
                <span className="text-gray-400">↔</span>
                {ev.coaches.map((coachName, i) => (
                  <button
                    key={`${ev.id}-c-${i}`}
                    onClick={(e) => { e.stopPropagation(); onCoachClick({ id: ev.coachIds?.[i] ?? coachName, name: coachName }); }}
                    className="hover:text-blue-400 hover:underline transition-colors text-gray-400"
                  >
                    {coachName}
                  </button>
                ))}
              </span>
            )}
          </div>
        </div>

        {/* 중간: 메시지 미리보기 + 복사 버튼 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 border-l border-gray-100 pl-3">
          <p className="text-[11px] text-gray-500 truncate leading-relaxed">{msgPreview}</p>
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(ev, 'ko'); }}
              title="한국어 메시지 복사"
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                copiedKo
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {copiedKo ? <Check size={10} /> : <Copy size={10} />}
              KO
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(ev, 'en'); }}
              title="English message copy"
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                copiedEn
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-blue-200 text-blue-600 hover:text-blue-700 hover:border-blue-300'
              }`}
            >
              {copiedEn ? <Check size={10} /> : <Copy size={10} />}
              EN
            </button>
          </div>
        </div>

        {/* 우측: 액션 상태 */}
        <div className="w-20 shrink-0 flex flex-col items-end justify-center gap-1 border-l border-gray-100 pl-3">
          {alreadySent && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
              <Check size={10} />발송됨
            </span>
          )}
          {hasIssue && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange-600">
              <AlertTriangle size={10} />이슈
            </span>
          )}
          {!alreadySent && !hasIssue && (
            <span className="text-[10px] text-gray-300">—</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">스케줄</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {loading ? '...' : totalCount}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <p className="text-xs text-gray-400 py-4">스케줄 없음</p>
      ) : (
        <div className="space-y-1.5">
          {events.map(renderRow)}
        </div>
      )}
    </div>
  );
}
