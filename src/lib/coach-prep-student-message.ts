import type { LessonOption } from '@/lib/coach-prep-request';

export const SCHEDULE_PROMPT_EN =
  'You can schedule your "Study Hall" (for homework) and "Vocab Gym" (for vocabulary practice) through the link below. Please take a moment to input the hours you can study this week!';
export const SCHEDULE_PROMPT_KO =
  '그리고 우리가 숙제를 할 Study Hall과 단어 공부를 할 Vocab Gym 스케줄을 등록해주세요! 매주 공부할 수 있는 시간을 상황에 맞게 최대한으로 넣어보자구요!!';

type Lang = 'ko' | 'en';
const KST = 'Asia/Seoul';
const WEEKDAYS: Record<Lang, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

// 학생 시간대의 달력 값. Intl로 DST까지 반영하고, 요일은 연·월·일에서 직접 구해 로케일에 의존하지 않는다.
export function formatInTimeZone(iso: string, timeZone: string, lang: Lang): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).formatToParts(new Date(iso));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const [y, mo, d, h24, mi] = [n('year'), n('month'), n('day'), n('hour'), n('minute')];
  const wd = WEEKDAYS[lang][new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hm = `${h12}:${String(mi).padStart(2, '0')}`;
  const pm = h24 >= 12;
  return lang === 'ko'
    ? `${mo}/${d}(${wd}) ${pm ? '오후' : '오전'} ${hm}`
    : `${wd} ${mo}/${d}, ${hm} ${pm ? 'PM' : 'AM'}`;
}

interface MessageInput {
  coachName: string;
  options: LessonOption[];
  /** 학생 시간대(IANA). 모르면 null → KST */
  timezone: string | null;
  /** CRM students.preferred_language: english면 영어, 그 외는 한국어 */
  language: string | null;
  scheduleUrl: string | null;
}

// 담당자가 학생 채팅방에 붙여 넣을 안내: 코치가 가능하다고 한 수업 시간(학생 시간대)과 스케줄 등록 안내
export function buildStudentMessage({ coachName, options, timezone, language, scheduleUrl }: MessageInput): string {
  const lang: Lang = language === 'english' ? 'en' : 'ko';
  const tz = timezone ?? KST;
  const tzLabel = timezone ?? (lang === 'ko' ? '한국 시간(KST)' : 'Korea Standard Time (KST)');
  const when = (iso: string) => formatInTimeZone(iso, tz, lang);

  const header = lang === 'ko'
    ? `${coachName} 코치님이 수업 가능하다고 알려주신 시간이에요! (${timezone ? `학생 현지 시간 · ${tzLabel}` : tzLabel} 기준)`
    : `Here are the times ${coachName} is available for your lessons (${timezone ? `your local time · ${tzLabel}` : tzLabel}):`;
  const lines = options.map((o) => {
    const num = o.label.replace(/\D/g, '');
    return lang === 'ko'
      ? `옵션 ${num}: 첫 수업 ${when(o.first)} · 두 번째 수업 ${when(o.second)}`
      : `Option ${num}: 1st lesson ${when(o.first)} · 2nd lesson ${when(o.second)}`;
  });
  const prompt = lang === 'ko' ? SCHEDULE_PROMPT_KO : SCHEDULE_PROMPT_EN;
  return [[header, ...lines].join('\n'), scheduleUrl ? `${prompt}\n${scheduleUrl}` : prompt].join('\n\n');
}
