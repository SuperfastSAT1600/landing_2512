import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { ConsultationEntry } from '@/types/crm';
import { randomUUID } from 'crypto';

/**
 * POST /api/crm/students/bulk-memo
 * 여러 학생의 consultation_timeline에 동일한 상담 메모를 일괄 추가하고
 * last_contacted_at을 갱신한다.
 * Body: { student_ids: string[], raw_memo: string }
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  let body: { student_ids?: string[]; raw_memo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' } },
      { status: 400 }
    );
  }

  const { student_ids, raw_memo } = body;

  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    return NextResponse.json(
      { error: { code: 'MISSING_STUDENT_IDS', message: 'student_ids는 1개 이상이어야 합니다.' } },
      { status: 400 }
    );
  }

  if (!raw_memo || typeof raw_memo !== 'string' || raw_memo.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 'MISSING_MEMO', message: '메모 내용을 입력해주세요.' } },
      { status: 400 }
    );
  }

  const { data: students, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('id, consultation_timeline')
    .in('id', student_ids);

  if (fetchError) {
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: '학생 조회에 실패했습니다.' } },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const trimmedMemo = raw_memo.trim();

  const updatePromises = (students ?? []).map(async (student) => {
    const existing: ConsultationEntry[] = Array.isArray(student.consultation_timeline)
      ? student.consultation_timeline
      : [];

    const newEntry: ConsultationEntry = {
      id: randomUUID(),
      created_at: now,
      raw_memo: trimmedMemo,
      published: false,
    };

    return supabaseAdmin
      .from('students')
      .update({
        consultation_timeline: [...existing, newEntry],
        last_contacted_at: now,
      })
      .eq('id', student.id);
  });

  const results = await Promise.all(updatePromises);

  const failedIds = results
    .map((r, i) => (r.error ? (students ?? [])[i]?.id : null))
    .filter(Boolean) as string[];

  if (failedIds.length > 0) {
    console.error(`[bulk-memo POST] ${failedIds.length}/${student_ids.length} updates failed`);
  }

  const updated = (students ?? []).length - failedIds.length;
  const status = failedIds.length > 0 ? 207 : 201;

  return NextResponse.json({ data: { updated, failed_ids: failedIds } }, { status });
}
