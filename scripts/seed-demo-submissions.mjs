// 데모용 연습 제출 데이터 시딩
// 실행: node scripts/seed-demo-submissions.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env.local 로드
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── 가짜 Instagram 핸들 60개 ──────────────────────────────
const HANDLES = [
  'jiyeon_sat', 'minjun_study', 'sat_king_kr', 'hyeong_j', 'suhyun22',
  'satprep_ace', 'study.hard.kr', 'kyu_sat1600', 'jisoo_math', 'yuna_rw',
  'sat_gg_kr', 'brian_sat23', 'hana_study', 'sunho_1600', 'rw_master_k',
  'jungwoo_sat', 'miso_study', 'sat_pro_kr', 'eunji_ace', 'junho_1600',
  'sat_daily_kr', 'hyunji22', 'prep_king99', 'somi_sat', 'k_sat_leo',
  'dasom_study', 'sat_1600_yj', 'wonjun_kr', 'nara_sat', 'jaeho_prep',
  'sat_crack_kr', 'seoyeon_rw', 'min_studylog', 'taehun_sat', 'yejin22sat',
  'sat_go_kr', 'jinho_prep', 'minji_study', 'sat_ace_korea', 'hyun_sat99',
  'rw_pro_kr', 'jihun_1600', 'sat_daily99', 'sooyeon_kr', 'prep_with_k',
  'sat_target_kr', 'dongjun22', 'yoojin_sat', 'sat_kr_ace', 'hajin_prep',
  'mathking_kr', 'sat_go_kr2', 'jiwon_study', 'sunwoo_sat', 'bomin_kr',
  'sat_crack99', 'haeun_prep', 'study_sat_kr', 'junhyuk_rw', 'sujin_1600',
].map(h => '@' + h);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const choice = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

// ── Quadratic 문제 ID 30개 ──────────────────────────────
const QUAD_IDS = [
  'qg-01','qg-02','qg-03','qg-04','qg-05','qg-06','qg-07','qg-08',
  'qe-01','qe-02','qe-03','qe-04','qe-05','qe-06','qe-07',
  'qd-01','qd-02','qd-03','qd-04','qd-05','qd-06','qd-07','qd-08',
  'qv-01','qv-02','qv-03','qv-04','qv-05','qv-06','qv-07',
];

function generateSubmission(testId, instagramId, allQuestionIds) {
  const skill = Math.random() * 0.6 + 0.3; // 0.30 ~ 0.90
  const totalCount = testId === 'quadratic-equations-30'
    ? rand(15, 30)
    : rand(25, 180);

  const pickedIds = shuffle(allQuestionIds).slice(0, totalCount);
  const questionResults = {};
  const answers = {};
  let correctCount = 0;

  for (const qId of pickedIds) {
    const isCorrect = Math.random() < skill;
    questionResults[qId] = isCorrect;
    answers[qId] = isCorrect ? 'A' : choice(['B', 'C', 'D']); // 정답은 항상 A로 가정
    if (isCorrect) correctCount++;
  }

  return {
    test_id: testId,
    instagram_id: instagramId,
    student_name: null,
    answers,
    correct_count: correctCount,
    total_count: totalCount,
    question_results: questionResults,
  };
}

async function seedTest(testId, questionIds) {
  const count = rand(45, 65);
  const picked = shuffle(HANDLES).slice(0, count);

  console.log(`\n[${testId}] ${count}명 삽입 중...`);

  const rows = picked.map(h => generateSubmission(testId, h, questionIds));

  const { error } = await supabase.from('practice_submissions').insert(rows);
  if (error) {
    console.error('  오류:', error.message);
  } else {
    const avgScore = Math.round(rows.reduce((s, r) => s + r.correct_count / r.total_count, 0) / rows.length * 100);
    console.log(`  완료: ${count}명, 평균 정답률 ${avgScore}%`);
  }
}

// ── June-2026 문제 ID 가져오기 ────────────────────────────
async function fetchJuneQuestionIds() {
  const res = await fetch(`${env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/practice/june-2026`).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  return data.groups?.flatMap(g => g.questions.map(q => q.id)) ?? null;
}

(async () => {
  console.log('=== 데모 제출 데이터 시딩 ===');

  // Quadratic (문제 ID 고정)
  await seedTest('quadratic-equations-30', QUAD_IDS);

  // June-2026 (문제 ID 동적 로드 또는 제네릭 ID 사용)
  const juneIds = await fetchJuneQuestionIds();
  if (juneIds) {
    await seedTest('june-2026-subskill-300', juneIds);
  } else {
    // 서버 없이 실행 시 question_results 없이 삽입
    const count = rand(45, 65);
    const picked = shuffle(HANDLES).slice(0, count);
    console.log(`\n[june-2026-subskill-300] ${count}명 삽입 중 (question_results 없음)...`);
    const rows = picked.map(h => {
      const skill = Math.random() * 0.6 + 0.3;
      const total = rand(25, 180);
      const correct = Math.round(total * skill * (0.85 + Math.random() * 0.3));
      return {
        test_id: 'june-2026-subskill-300',
        instagram_id: h,
        student_name: null,
        answers: {},
        correct_count: Math.min(correct, total),
        total_count: total,
        question_results: {},
      };
    });
    const { error } = await supabase.from('practice_submissions').insert(rows);
    if (error) console.error('  오류:', error.message);
    else console.log(`  완료: ${count}명`);
  }

  console.log('\n완료!');
})();
