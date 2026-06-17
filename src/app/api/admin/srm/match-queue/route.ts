import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export interface AutoMatch {
  sfv2ProfileId: string;
  sfv2Name: string;
  matchScore: number;
  matchReason: 'phone' | 'email' | 'both' | 'name';
}

// "김윤서02" → ["김윤서"], "페퍼/Yerim Jung" → ["페퍼", "Yerim Jung"]
function extractNameVariants(name: string): string[] {
  return name
    .split('/')
    .map((s) => s.trim().replace(/\d+$/, '').trim())
    .filter(Boolean);
}

export interface UnlinkedStudent {
  crmStudentId: string;
  crmName: string;
  grade: string | null;
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
    .select('id, name, grade, parent_phone, sfv2_profile_id')
    .eq('lead_status', 'enrolled')
    .order('name');

  if (crmError) return NextResponse.json({ error: crmError.message }, { status: 500 });
  if (!unlinked || unlinked.length === 0) return NextResponse.json([]);

  const phones = unlinked.map((s) => s.parent_phone).filter(Boolean) as string[];

  // sfv2 조회 실패해도 전체 명단은 반환
  let byPhone = new Map<string, { id: string; full_name: string }>();
  // full_name → 매칭 프로필 목록 (unique 확인용)
  let byName = new Map<string, Array<{ id: string; full_name: string }>>();
  try {
    // 전화번호 매칭
    const { data: phoneMatches } = phones.length > 0
      ? await supabaseSFv2.from('profiles').select('id, full_name, phone, email').in('phone', phones)
      : { data: [] };
    byPhone = new Map((phoneMatches ?? []).map((p) => [p.phone, p]));

    // 이름 매칭: phone이 없거나 phone 매칭 실패한 학생들의 정규화된 이름 수집
    const phoneHitSet = new Set((phoneMatches ?? []).map((p) => p.phone));
    const needsNameMatch = unlinked.filter(
      (s) => !s.sfv2_profile_id && !(s.parent_phone && phoneHitSet.has(s.parent_phone))
    );
    const allVariants = [...new Set(needsNameMatch.flatMap((s) => extractNameVariants(s.name)))];

    if (allVariants.length > 0) {
      const { data: nameMatches } = await supabaseSFv2
        .from('profiles')
        .select('id, full_name, phone, email')
        .in('full_name', allVariants);
      for (const p of nameMatches ?? []) {
        const list = byName.get(p.full_name) ?? [];
        list.push(p);
        byName.set(p.full_name, list);
      }
    }
  } catch {
    // sfv2 접근 실패 시 자동 매칭 없이 명단만 반환
  }

  const result: UnlinkedStudent[] = unlinked.map((student) => {
    const phoneHit = student.parent_phone ? byPhone.get(student.parent_phone) : null;

    let autoMatch: AutoMatch | null = null;
    if (!student.sfv2_profile_id && phoneHit) {
      autoMatch = { sfv2ProfileId: phoneHit.id, sfv2Name: phoneHit.full_name, matchScore: 95, matchReason: 'phone' };
    } else if (!student.sfv2_profile_id && !phoneHit) {
      // 이름 기반 매칭: 정규화된 이름 변형 중 v2에서 유일하게 존재하는 것 사용
      for (const variant of extractNameVariants(student.name)) {
        const hits = byName.get(variant) ?? [];
        if (hits.length === 1) {
          autoMatch = { sfv2ProfileId: hits[0].id, sfv2Name: hits[0].full_name, matchScore: 75, matchReason: 'name' };
          break;
        }
      }
    }

    return {
      crmStudentId: student.id,
      crmName: student.name,
      grade: (student as unknown as { grade: string | null }).grade ?? null,
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
