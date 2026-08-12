/**
 * math_concepts 한국어 이름 → 영어 번역
 * name_en 컬럼에 저장
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

async function ensureColumn() {
  const { error } = await mw.from('math_concepts').select('name_en').limit(1);
  if (error?.message?.includes('name_en')) {
    console.error('name_en 컬럼이 없습니다. Supabase SQL 에디터에서 migration을 먼저 실행하세요.');
    process.exit(1);
  }
}

async function translateBatch(names) {
  const msg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `다음 SAT Advanced Math 개념들을 영어로 번역해줘. 수학 교육 맥락에 맞는 정확한 영어 용어로.
JSON 객체로만 응답해. key는 한국어 원문, value는 영어 번역.

${names.map(n => `- ${n}`).join('\n')}

예시: {"인수분해": "Factoring", "이차방정식": "Quadratic Equation"}`,
    }],
  });
  const text = msg.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('파싱 실패: ' + text);
  return JSON.parse(match[0]);
}

async function main() {
  await ensureColumn();

  const { data: concepts } = await mw
    .from('math_concepts')
    .select('id, name, name_en')
    .is('name_en', null);

  if (!concepts || concepts.length === 0) {
    console.log('✅ 모든 개념에 영어 이름이 이미 있습니다.');
    return;
  }

  console.log(`번역 대상: ${concepts.length}개\n`);

  const BATCH = 10;
  for (let i = 0; i < concepts.length; i += BATCH) {
    const batch = concepts.slice(i, i + BATCH);
    const names = batch.map(c => c.name);
    process.stdout.write(`[${i + 1}~${Math.min(i + BATCH, concepts.length)}] 번역 중... `);

    try {
      const translations = await translateBatch(names);
      for (const c of batch) {
        const nameEn = translations[c.name];
        if (!nameEn) { console.warn(`  ⚠️ 번역 없음: ${c.name}`); continue; }
        await mw.from('math_concepts').update({ name_en: nameEn }).eq('id', c.id);
      }
      console.log(Object.entries(translations).slice(0, 3).map(([k, v]) => `${k}→${v}`).join(', ') + '...');
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  const { count } = await mw.from('math_concepts').select('*', { count: 'exact', head: true }).not('name_en', 'is', null);
  console.log(`\n✅ 완료! name_en 채워진 개념: ${count}개`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
