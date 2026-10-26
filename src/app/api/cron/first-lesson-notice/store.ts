import { supabaseAdmin } from '@/lib/supabase-admin';

/** 알림 선점. 이미 알린(또는 다른 실행이 선점한) 매칭이면 false */
export async function claimMatching(matchingId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('first_lesson_notices')
    .upsert({ matching_id: matchingId }, { onConflict: 'matching_id', ignoreDuplicates: true })
    .select('matching_id');
  if (error) throw new Error(`first_lesson_notices claim: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** 전송 실패 시 선점을 풀어 다음 실행에서 다시 시도하게 한다 */
export async function releaseMatching(matchingId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('first_lesson_notices').delete().eq('matching_id', matchingId);
  if (error) throw new Error(`first_lesson_notices release: ${error.message}`);
}
