import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import type { StudentMessageContext } from '@/types/coach-prep';
import type { AvailabilitySlot } from '@/lib/student-availability';

// 학생별 스케줄 링크: SFv2 schedule_access_link의 토큰으로 만든 학생 페이지 주소
export const SCHEDULE_LINK_BASE = 'https://app.superfastsat.io/report/';

const validTz = (tz: string | null | undefined): string | null => {
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
};

async function sfv2Timezone(profileId: string): Promise<string | null> {
  const { data, error } = await supabaseSFv2
    .from('scheduled_availability_slots').select('tz').eq('owner_id', profileId).order('effective_from', { ascending: false, nullsFirst: false }).limit(1);
  if (error) throw new Error(error.message);
  return validTz((data as { tz: string | null }[] | null)?.[0]?.tz);
}

async function sfv2ScheduleUrl(profileId: string): Promise<string | null> {
  const { data, error } = await supabaseSFv2
    .from('schedule_access_link').select('token').eq('user_id', profileId).is('revoked_at', null).order('created_at', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  const token = (data as { token: string }[] | null)?.[0]?.token;
  return token ? `${SCHEDULE_LINK_BASE}${token}` : null;
}

// 한쪽 조회가 실패해도 나머지 값은 내려준다 — 안내 메시지는 값이 없는 부분만 빠진다
async function orNull<T>(label: string, p: Promise<T | null>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    console.error(`[coach-prep] student context ${label} failed:`, e);
    return null;
  }
}

export async function loadStudentMessageContext(studentId: string): Promise<StudentMessageContext> {
  const { data, error } = await supabaseAdmin
    .from('students').select('preferred_language, parent_timezone, sfv2_profile_id').eq('id', studentId).maybeSingle();
  if (error) throw new Error(error.message); // 학생이 없는 것과 DB 오류를 구분한다 — 호출한 쪽이 로그를 남긴다
  const student = data as { preferred_language: string | null; parent_timezone: string | null; sfv2_profile_id: string | null } | null;
  if (!student) return { language: null, timezone: null, schedule_url: null };

  const profileId = student.sfv2_profile_id;
  const [timezone, scheduleUrl] = await Promise.all([
    profileId ? orNull('timezone', sfv2Timezone(profileId)) : Promise.resolve(null),
    profileId ? orNull('link', sfv2ScheduleUrl(profileId)) : Promise.resolve(null),
  ]);
  return {
    language: student.preferred_language ?? null,
    timezone: timezone ?? validTz(student.parent_timezone),
    schedule_url: scheduleUrl,
  };
}

// 학생이 SFv2에 입력한 코치룸 가능 시간 원본. SFv2 계정이 없거나 입력이 없으면 빈 배열(= 제한 없음)
export async function loadAvailabilitySlots(studentId: string): Promise<AvailabilitySlot[]> {
  const { data } = await supabaseAdmin.from('students').select('sfv2_profile_id').eq('id', studentId).maybeSingle();
  const profileId = (data as { sfv2_profile_id: string | null } | null)?.sfv2_profile_id;
  if (!profileId) return [];
  const { data: slots, error } = await supabaseSFv2
    .from('scheduled_availability_slots')
    .select('weekday, start_minute_local, end_minute_local, tz, effective_from, effective_until, notes')
    .eq('owner_id', profileId);
  if (error) throw new Error(error.message);
  return (slots ?? []) as AvailabilitySlot[];
}
