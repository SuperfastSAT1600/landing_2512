/**
 * SuperfastSAT v2 → mathweb 임포트 스크립트
 * Advanced Math (3 스킬) + Claude 한국어 개념 태깅
 *
 * 실행: node scripts/import-v2-mathweb.mjs
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

// .env.local 파싱
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const v2 = createClient(env.SUPERFASTSAT_V2_SUPABASE_URL, env.SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY);
const mw = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const claude = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SKILLS = [
  'Nonlinear functions',
  'Equivalent expressions',
  'Nonlinear equations in one variable and systems of equations in two variables',
];

// 난이도별 목표 수량
const TARGETS = { easy: 10, medium: 40, hard: 40 };

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function extractConcepts(p) {
  const questionText = stripHtml(p.question ?? '');
  const explanationText = stripHtml(p.explanation ?? '').slice(0, 300);

  const msg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `다음 SAT Advanced Math 문제를 풀기 위해 학생이 반드시 알아야 할 수학 개념을 한국어로 3~5개 추출해줘.
개념은 구체적이고 짧게 (2~8글자). JSON 배열로만 응답해.

문제: ${questionText}
정답: ${p.correct_answer}
해설: ${explanationText}

예시 응답: ["이차함수", "인수분해", "x절편"]`,
    }],
  });

  const text = msg.content[0].text.trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Claude 응답 파싱 실패: ${text}`);
  return JSON.parse(match[0]);
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣-]/g, '')
    .replace(/-+/g, '-');
}

async function upsertConcepts(conceptNames) {
  const ids = [];
  for (const name of conceptNames) {
    const slug = slugify(name);
    const { data, error } = await mw
      .from('math_concepts')
      .upsert({ name, slug }, { onConflict: 'slug', ignoreDuplicates: false })
      .select('id')
      .single();
    if (error) throw new Error(`concept upsert 실패: ${error.message}`);
    ids.push(data.id);
  }
  return ids;
}

async function main() {
  // 이미 임포트된 ID 목록
  const { data: imported } = await mw
    .from('math_problems')
    .select('v2_unit_id')
    .not('v2_unit_id', 'is', null);
  const importedIds = new Set(imported.map(r => r.v2_unit_id));
  console.log(`⏭️  이미 임포트된 문제: ${importedIds.size}개`);

  // 난이도별로 v2에서 후보 수집
  const toImport = [];

  for (const [difficulty, target] of Object.entries(TARGETS)) {
    console.log(`\n📥 ${difficulty} ${target}개 조회 중...`);

    // 스킬별로 균등 배분
    const perSkill = Math.ceil(target / SKILLS.length);
    const collected = [];

    for (const skill of SKILLS) {
      const { data, error } = await v2
        .from('units')
        .select('id, question, options, correct_answer, skill, difficulty, explanation')
        .eq('section', 'math')
        .eq('domain', 'advanced_math')
        .eq('skill', skill)
        .eq('difficulty', difficulty)
        .not('question', 'is', null)
        .limit(perSkill + 5); // 여유분 포함

      if (error) { console.warn(`  ⚠️  ${skill} 조회 실패:`, error.message); continue; }

      const fresh = data.filter(u => !importedIds.has(u.id));
      collected.push(...fresh);
    }

    // 목표 수량만큼 자르기
    toImport.push(...collected.slice(0, target).map(u => ({ ...u, difficulty })));
    console.log(`  ✅ ${Math.min(collected.length, target)}개 확보`);
  }

  console.log(`\n🚀 총 ${toImport.length}개 임포트 시작\n`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < toImport.length; i++) {
    const p = toImport[i];
    process.stdout.write(`[${i + 1}/${toImport.length}] ${p.difficulty.padEnd(6)} ${p.skill.slice(0, 30)}... `);

    try {
      // 개념 추출
      const concepts = await extractConcepts(p);

      // 문제 삽입
      const { data: inserted, error: insertErr } = await mw
        .from('math_problems')
        .insert({
          title: `Advanced Math — ${p.skill}`,
          question_html: p.question,
          options_json: p.options,
          answer_text: p.correct_answer,
          difficulty: p.difficulty,
          v2_unit_id: p.id,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // 개념 연결
      const conceptIds = await upsertConcepts(concepts);
      const links = conceptIds.map(cid => ({ problem_id: inserted.id, concept_id: cid }));
      await mw.from('math_problem_concepts').insert(links);

      console.log(`✅ [${concepts.join(', ')}]`);
      success++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      fail++;
    }
  }

  // 결과
  const { count: total } = await mw
    .from('math_problems')
    .select('*', { count: 'exact', head: true })
    .not('v2_unit_id', 'is', null);
  const { count: conceptTotal } = await mw
    .from('math_concepts')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ 완료! 성공 ${success}개 / 실패 ${fail}개`);
  console.log(`  math_problems (v2 전체): ${total}개`);
  console.log(`  math_concepts 전체: ${conceptTotal}개`);
}

main().catch(e => { console.error('❌ 오류:', e.message); process.exit(1); });
