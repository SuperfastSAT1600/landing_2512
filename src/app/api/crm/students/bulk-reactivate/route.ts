import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { ReactivationEntry } from '@/types/crm';

/**
 * POST /api/crm/students/bulk-reactivate
 * 여러 학생에 대해 재활성화 로그 항목을 일괄 추가하고
 * lead_status를 'reactivating'으로 변경한다.
 * Body: { student_ids: string[], strategy: string, notes?: string }
 * Requires admin authentication.
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  let body: { student_ids?: string[]; strategy?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' } },
      { status: 400 }
    );
  }

  const { student_ids, strategy, notes } = body;

  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    return NextResponse.json(
      { error: { code: 'MISSING_STUDENT_IDS', message: 'student_ids는 1개 이상이어야 합니다.' } },
      { status: 400 }
    );
  }

  if (!strategy || strategy.trim() === '') {
    return NextResponse.json(
      { error: { code: 'MISSING_STRATEGY', message: '전략 메모는 필수입니다.' } },
      { status: 400 }
    );
  }

  // 대상 학생들의 현재 reactivation_log 일괄 조회
  const { data: students, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('id, reactivation_log')
    .in('id', student_ids);

  if (fetchError) {
    console.error('[bulk-reactivate POST] fetch error', fetchError);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: '학생 조회에 실패했습니다.' } },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const trimmedStrategy = strategy.trim();
  const trimmedNotes = notes?.trim();

  // 각 학생에 대해 신규 항목을 append하여 업데이트
  const updatePromises = (students ?? []).map(async (student) => {
    const existingLog: ReactivationEntry[] = Array.isArray(student.reactivation_log)
      ? student.reactivation_log
      : [];

    const newEntry: ReactivationEntry = {
      id: crypto.randomUUID(),
      attempted_at: now,
      strategy: trimmedStrategy,
      outcome: 'pending',
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    };

    return supabaseAdmin
      .from('students')
      .update({
        lead_status: 'reactivating',
        reactivation_log: [...existingLog, newEntry],
      })
      .eq('id', student.id);
  });

  const results = await Promise.all(updatePromises);
  const failedCount = results.filter((r) => r.error !== null).length;

  const failedIds = results
    .map((r, i) => (r.error ? (students ?? [])[i]?.id : null))
    .filter(Boolean) as string[];

  if (failedIds.length > 0) {
    console.error(`[bulk-reactivate POST] ${failedIds.length}/${student_ids.length} updates failed`);
  }

  const updated = (students ?? []).length - failedIds.length;
  const status = failedIds.length > 0 ? 207 : 200;

  return NextResponse.json({ data: { updated, failed_ids: failedIds } }, { status });
}
