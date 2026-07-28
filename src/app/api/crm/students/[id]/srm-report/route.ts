import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { buildSrmReport } from '@/lib/build-srm-report';
import type { LearningReport } from '@/types/srm-portal';

// GET /api/crm/students/[id]/srm-report
// CRM 학생 id로 연결된 v2 프로필(sfv2_profile_id)의 학습 리포트(SRM 데이터)를 조회한다.
// buildSrmReport는 무거운 연산이므로 카드에서 온디맨드로만 호출된다.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('name, sfv2_profile_id')
    .eq('id', id)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const profileId = (student as { sfv2_profile_id?: string | null }).sfv2_profile_id;
  if (!profileId) {
    return NextResponse.json({ error: 'no_v2_profile' }, { status: 404 });
  }

  // 빠른 운영 확인용: 캐시된 AI 내러티브는 쓰되 미캐시 생성은 생략(지표는 그대로).
  const report: LearningReport = await buildSrmReport(profileId, { skipNarratives: true });
  return NextResponse.json({
    report,
    studentName: (student as { name: string }).name,
    profileId,
  });
}
