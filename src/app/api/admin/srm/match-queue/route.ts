import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export interface AutoMatch {
  sfv2ProfileId: string;
  sfv2Name: string;
  matchScore: number;
  matchReason: 'phone' | 'email' | 'both';
}

export interface UnlinkedStudent {
  crmStudentId: string;
  crmName: string;
  phone: string | null;
  email: string | null;
  sfv2ProfileId: string | null;
  autoMatch: AutoMatch | null;
}

// GET /api/admin/srm/match-queue
// 수업중(enrolled) CRM 학생 전체 반환 (연결 여부 무관) + 자동 매칭 후보 포함
export async function GET() {
  try {
  const { data: unlinked, error: crmError } = await supabaseAdmin
    .from('students')
    .select('id, name, parent_phone, sfv2_profile_id')
    .eq('funnel_stage', '8')
    .order('name');

  if (crmError) return NextResponse.json({ error: crmError.message }, { status: 500 });
  if (!unlinked || unlinked.length === 0) return NextResponse.json([]);

  const phones = unlinked.map((s) => s.parent_phone).filter(Boolean) as string[];
  const emails: string[] = []; // students 테이블에 email 컬럼 없음

  // sfv2 조회 실패해도 전체 명단은 반환
  let byPhone = new Map<string, { id: string; full_name: string }>();
  let byEmail = new Map<string, { id: string; full_name: string }>();
  try {
    const [{ data: phoneMatches }, { data: emailMatches }] = await Promise.all([
      phones.length > 0
        ? supabaseSFv2.from('profiles').select('id, full_name, phone, email').in('phone', phones)
        : { data: [] },
      emails.length > 0
        ? supabaseSFv2.from('profiles').select('id, full_name, phone, email').in('email', emails)
        : { data: [] },
    ]);
    byPhone = new Map((phoneMatches ?? []).map((p) => [p.phone, p]));
    byEmail = new Map((emailMatches ?? []).map((p) => [p.email, p]));
  } catch {
    // sfv2 접근 실패 시 자동 매칭 없이 명단만 반환
  }

  const result: UnlinkedStudent[] = unlinked.map((student) => {
    const phoneHit = student.parent_phone ? byPhone.get(student.parent_phone) : null;
    const emailHit = null; // email 컬럼 없음

    let autoMatch: AutoMatch | null = null;
    if (!student.sfv2_profile_id && phoneHit) {
      autoMatch = { sfv2ProfileId: phoneHit.id, sfv2Name: phoneHit.full_name, matchScore: 95, matchReason: 'phone' };
    }

    return {
      crmStudentId: student.id,
      crmName: student.name,
      phone: student.parent_phone ?? null,
      email: null,
      sfv2ProfileId: student.sfv2_profile_id ?? null,
      autoMatch,
    };
  });

  // 미연결 → 자동매칭 있음 → 자동매칭 없음 → 연결완료 순
  result.sort((a, b) => {
    const scoreA = a.sfv2ProfileId ? -1 : (a.autoMatch?.matchScore ?? 0);
    const scoreB = b.sfv2ProfileId ? -1 : (b.autoMatch?.matchScore ?? 0);
    return scoreB - scoreA;
  });

  return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[match-queue] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
