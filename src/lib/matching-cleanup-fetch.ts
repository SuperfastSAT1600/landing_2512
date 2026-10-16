// '매칭 정리 필요' 원본 — 코치 현황 입력 + 활성 매칭별 마지막·다음 수업, 매칭 시작일·입장코드
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { scanAllPages } from '@/lib/supabase-scan';
import { fetchCoachRosterInput } from '@/lib/coach-roster-fetch';
import type { CleanupInput } from '@/lib/matching-cleanup';

// UUID 100개 ≈ 3.7KB — 프록시 URL 길이 한도(8KB) 안쪽
const IN_CHUNK = 100;
const RECENT_DAYS = 28;

const chunks = (xs: string[]) => Array.from({ length: Math.ceil(xs.length / IN_CHUNK) }, (_, i) => xs.slice(i * IN_CHUNK, (i + 1) * IN_CHUNK));

async function fetchLessons(ids: string[], now: number): Promise<CleanupInput['lessons']> {
  const out: CleanupInput['lessons'] = {};
  for (const part of chunks(ids)) {
    // 오래된 순으로 끝까지 읽어 지난 수업은 덮어쓰고(마지막), 예정 수업은 처음 것만 남긴다(다음)
    const events = await scanAllPages<{ matching_id: string; starts_at: string }>((f, t, c) => supabaseSFv2.from('scheduled_events')
      .select('matching_id, starts_at', c).eq('category', 'coach_room').neq('status', 'cancelled').in('matching_id', part)
      .order('starts_at').order('id').range(f, t));
    for (const e of events) {
      const cur = (out[e.matching_id] ??= { last: null, next: null });
      if (Date.parse(e.starts_at) <= now) cur.last = e.starts_at;
      else cur.next ??= e.starts_at;
    }
  }
  return out;
}

async function fetchMeta(ids: string[]): Promise<CleanupInput['meta']> {
  const lists = await Promise.all(chunks(ids).map(async (part) => {
    const res = await supabaseSFv2.from('matchings').select('id, activated_at, entry_code').in('id', part);
    if (res.error) throw new Error(res.error.message);
    return (res.data ?? []) as { id: string; activated_at: string | null; entry_code: string | null }[];
  }));
  return Object.fromEntries(lists.flat().map((m) => [m.id, { activated_at: m.activated_at, entry_code: m.entry_code }]));
}

export async function fetchMatchingCleanupInput(now = Date.now()): Promise<CleanupInput> {
  const input = await fetchCoachRosterInput();
  const ids = input.matchings.filter((m) => m.status === 'active').map((m) => m.id);
  const [lessons, meta] = await Promise.all([fetchLessons(ids, now), fetchMeta(ids)]);
  return { input, lessons, meta, recentCutoff: new Date(now - RECENT_DAYS * 86_400_000).toISOString() };
}
