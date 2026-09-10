/**
 * "불완전 함수+지나는 점" 개념 자동 태깅
 * 패턴: 미지수(상수)가 포함된 함수 + 그 함수가 지나는 점이 조건으로 주어지는 문제
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const mw = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const claude = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const CONCEPT_NAME = '불완전 함수+지나는 점';
const CONCEPT_SLUG = '불완전-함수-지나는-점';

function stripHtml(html) {
  return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Claude로 분류: 해당 패턴인지 yes/no
async function classify(questionText) {
  const msg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{
      role: 'user',
      content: `다음 SAT 수학 문제가 아래 패턴에 해당하는지 판단해줘.

패턴: "함수식에 미지수(상수, 파라미터)가 포함되어 있고, 그 함수가 특정 좌표 점을 지난다는 조건이 주어지는 문제"

예시:
- f(x) = ax² + b 가 점 (2, 5)를 지날 때 a를 구하시오 → YES
- g(x) = k(x-3)² 의 그래프가 (1, 8)을 지날 때 k의 값은? → YES
- h(x) = 3x² - 5x + 2 의 최댓값은? → NO (미지수 없음)
- f(x) = cx + d 에서 y절편이 4일 때 → NO (점을 지난다는 조건 아님)

문제: ${questionText.slice(0, 600)}

YES 또는 NO 만 응답해줘.`,
    }],
  });
  return msg.content[0].text.trim().toUpperCase().startsWith('Y');
}

async function main() {
  // 모든 활성 문제 가져오기 (HTML 있는 것만)
  const { data: problems, error } = await mw
    .from('math_problems')
    .select('id, question_html')
    .eq('is_active', true)
    .not('question_html', 'is', null);

  if (error) throw new Error(error.message);
  console.log(`📋 분류 대상: ${problems.length}개 문제\n`);

  // 개념 upsert
  const { data: concept, error: conceptErr } = await mw
    .from('math_concepts')
    .upsert({ name: CONCEPT_NAME, slug: CONCEPT_SLUG }, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id')
    .single();
  if (conceptErr) throw new Error('개념 생성 실패: ' + conceptErr.message);
  const conceptId = concept.id;
  console.log(`✅ 개념 준비: "${CONCEPT_NAME}" (id: ${conceptId})\n`);

  // 이미 이 개념이 태깅된 문제 목록
  const { data: already } = await mw
    .from('math_problem_concepts')
    .select('problem_id')
    .eq('concept_id', conceptId);
  const alreadySet = new Set((already ?? []).map(r => r.problem_id));

  const matched = [];
  let yes = 0, no = 0, skip = 0;

  for (let i = 0; i < problems.length; i++) {
    const p = problems[i];
    const text = stripHtml(p.question_html);
    if (!text) { skip++; continue; }

    if (alreadySet.has(p.id)) {
      process.stdout.write(`[${i+1}/${problems.length}] ⏭️  이미 태깅됨\n`);
      skip++;
      continue;
    }

    process.stdout.write(`[${i+1}/${problems.length}] 분류 중... `);
    try {
      const isMatch = await classify(text);
      if (isMatch) {
        matched.push(p.id);
        yes++;
        console.log('✅ YES');
      } else {
        no++;
        console.log('❌ NO');
      }
    } catch (e) {
      console.log(`⚠️  오류: ${e.message}`);
    }
  }

  // 매칭된 문제들에 개념 연결
  if (matched.length > 0) {
    const links = matched.map(pid => ({ problem_id: pid, concept_id: conceptId }));
    const { error: linkErr } = await mw
      .from('math_problem_concepts')
      .upsert(links, { onConflict: 'problem_id,concept_id', ignoreDuplicates: true });
    if (linkErr) throw new Error('링크 삽입 실패: ' + linkErr.message);
  }

  console.log(`\n🎉 완료!`);
  console.log(`  YES (태깅): ${yes}개`);
  console.log(`  NO: ${no}개`);
  console.log(`  스킵: ${skip}개`);
  console.log(`  총 "${CONCEPT_NAME}" 태깅 문제: ${yes + alreadySet.size}개`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
