/**
 * math_concepts 정리 스크립트
 * 중복 개념 통합 + 너무 구체적인 개념 삭제
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const mw = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 중복 통합: canonical ← duplicates
const MERGES = [
  { canonical: '인수분해',         duplicates: ['다항식 인수분해', '다항식인수분해', '이차식 인수분해', '이차식인수분해', '공통인수분해', '공통인수 추출'] },
  { canonical: '동류항 정리',       duplicates: ['동류항', '동류항 계산', '같은 문자 모으기'] },
  { canonical: '계수 비교',         duplicates: ['계수비교'] },
  { canonical: '변수치환',          duplicates: ['변수 치환', '변수대입', '변수 대입', '미지수 치환', '치환', '식의 치환', '함수의 치환'] },
  { canonical: '근과 계수의 관계', duplicates: ['근과 계수', '근과계수', '두 수의 합과곱', '해의 합'] },
  { canonical: '근의공식',          duplicates: ['근의 공식'] },
  { canonical: '근호를 지수로 표현', duplicates: ['근호를 지수로', '근호를 지수로 변환', '근호와 지수', '근호 변환', '근호 표현', '근의 곱셈 성질'] },
  { canonical: '지수법칙',          duplicates: ['지수 법칙', '지수 계산', '거듭제곱 계산', '거듭제곱 성질'] },
  { canonical: '지수 방정식',       duplicates: ['지수방정식'] },
  { canonical: '다항식 전개',       duplicates: ['전개', '이항식 전개', '이항식곱셈', '전개식 정리', '전개와 정리', '이차식 전개', '괄호 제거', '다항식 계산', '다항식 뺄셈'] },
  { canonical: 'FOIL 방법',         duplicates: ['FOIL방법'] },
  { canonical: '직사각형 넓이 공식', duplicates: ['직사각형넓이', '직사각형의 넓이'] },
  { canonical: '삼각형 넓이 공식', duplicates: ['삼각형의 넓이'] },
  { canonical: '방정식 풀이',       duplicates: ['방정식풀이'] },
  { canonical: '일차항 계수',       duplicates: ['일차항계수'] },
  { canonical: '분수 계산',         duplicates: ['분수계산', '분수덧셈', '분수 곱셈'] },
  { canonical: '함수값',            duplicates: ['함수값 대입', '함수값 계산', '함수값 구하기', '함수값 해석', '함수의 대입'] },
  { canonical: '계수',              duplicates: ['계수 구하기', '계수의 곱셈'] },
  { canonical: '차의 제곱 공식',   duplicates: ['차이제곱공식'] },
  { canonical: '절댓값',            duplicates: ['절댓값의 정의'] },
  { canonical: '분수 지수',         duplicates: ['유리수 지수'] },
  { canonical: '백분율 변화',       duplicates: ['백분율 증가'] },
  { canonical: '초기값',            duplicates: ['초기 높이'] },
  { canonical: '식의 변형',         duplicates: ['식의 정리'] },
  { canonical: '함수의 정의',       duplicates: ['함수', '함수의 해석'] },
];

// 삭제만 (통합할 개념 없음)
const DELETE_ONLY = [
  'u(0)', 'x=0 대입', 'x=0일 때의 값', 'x=0일때값', 'x좌표 대입',
  '연립일차방정식의 식의 개수', '이차방정식의 근의 개수',
  '물리량 단위',
  '음수', '음수 분배', '음수 분배법칙', '음수해',
  '곱셈 표현', '항의 정의', '연산 순서', '부호 변환',
  '양변 나누기', '양변에 같은 수 곱하기', '양변의 같은 수로 나누기', '양변의 공통인수 약분',
  '밑 통합', '밑변환', '밑수와 감소', '밑의 형태',
  '지수 표기법', '지수표현', '지수적감소',
  '사칙연산', '단위변환', '단항식 계산', '입출력 관계',
  '약분', '통분', '좌표',
  '다항식 표준형', '정수 약수', '제곱수',
  '연간변화율',
];

async function getConceptMap(names) {
  const { data } = await mw.from('math_concepts').select('id,name').in('name', names);
  const map = {};
  for (const r of data ?? []) map[r.name] = r.id;
  return map;
}

async function main() {
  const { count: beforeConcepts } = await mw.from('math_concepts').select('*', { count: 'exact', head: true });
  const { count: beforeLinks } = await mw.from('math_problem_concepts').select('*', { count: 'exact', head: true });
  console.log(`시작: 개념 ${beforeConcepts}개, 링크 ${beforeLinks}개\n`);

  let mergedGroups = 0, mergedConcepts = 0, deletedConcepts = 0;

  // ── 통합 ──────────────────────────────────────────────────
  for (const { canonical, duplicates } of MERGES) {
    const allNames = [canonical, ...duplicates];
    const idMap = await getConceptMap(allNames);

    const canonicalId = idMap[canonical];
    if (!canonicalId) { console.warn(`  ⚠️  canonical 없음: ${canonical}`); continue; }

    const dupIds = duplicates.map(n => idMap[n]).filter(Boolean);
    if (dupIds.length === 0) continue;

    for (const dupId of dupIds) {
      // 이미 canonical과 연결된 problem_id 조회
      const { data: existLinks } = await mw
        .from('math_problem_concepts')
        .select('problem_id')
        .eq('concept_id', canonicalId);
      const existSet = new Set((existLinks ?? []).map(r => r.problem_id));

      // duplicate 링크 중 canonical과 충돌하는 것 삭제
      const { data: dupLinks } = await mw
        .from('math_problem_concepts')
        .select('problem_id')
        .eq('concept_id', dupId);

      const conflictIds = (dupLinks ?? []).filter(r => existSet.has(r.problem_id)).map(r => r.problem_id);
      if (conflictIds.length > 0) {
        await mw.from('math_problem_concepts')
          .delete()
          .eq('concept_id', dupId)
          .in('problem_id', conflictIds);
      }

      // 나머지 duplicate 링크 → canonical로 이전
      await mw.from('math_problem_concepts')
        .update({ concept_id: canonicalId })
        .eq('concept_id', dupId);

      // duplicate 개념 삭제
      await mw.from('math_concepts').delete().eq('id', dupId);
      mergedConcepts++;
    }

    const dupNames = duplicates.filter(n => idMap[n]);
    if (dupNames.length > 0) {
      console.log(`✅ [${canonical}] ← ${dupNames.join(', ')}`);
      mergedGroups++;
    }
  }

  // ── 삭제만 ─────────────────────────────────────────────────
  console.log('\n🗑️  단순 삭제:');
  const deleteIdMap = await getConceptMap(DELETE_ONLY);
  const toDeleteIds = Object.values(deleteIdMap);

  if (toDeleteIds.length > 0) {
    // 링크 먼저 삭제
    await mw.from('math_problem_concepts').delete().in('concept_id', toDeleteIds);
    // 개념 삭제
    const { error } = await mw.from('math_concepts').delete().in('id', toDeleteIds);
    if (error) console.warn('  ⚠️ 삭제 오류:', error.message);
    deletedConcepts = toDeleteIds.length;
    console.log(`  삭제: ${Object.keys(deleteIdMap).join(', ')}`);
  }

  // ── 결과 ─────────────────────────────────────────────────
  const { count: afterConcepts } = await mw.from('math_concepts').select('*', { count: 'exact', head: true });
  const { count: afterLinks } = await mw.from('math_problem_concepts').select('*', { count: 'exact', head: true });

  console.log(`\n🎉 완료!`);
  console.log(`  통합 그룹: ${mergedGroups}개 / 통합 삭제된 개념: ${mergedConcepts}개`);
  console.log(`  단순 삭제: ${deletedConcepts}개`);
  console.log(`  개념: ${beforeConcepts} → ${afterConcepts}개`);
  console.log(`  링크: ${beforeLinks} → ${afterLinks}개`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
