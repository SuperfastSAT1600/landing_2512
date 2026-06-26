import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import OpenAI from 'openai';
import type {
  LearningReport, DayReport, StudyHallDay, StudyHallSkill,
  TestCenterDay, TestCenterLesson, DailyReportDay, VocaDay, LessonFeedbackDay,
} from '@/types/srm-portal';

type SkillCrossRef = {
  skill: string;
  shAccuracy: number;
  tcAccuracy: number | null;
  gap: number | null;
};

type EdenInsight = {
  strengths: string[];
  weaknesses: string[];
  intentions: string[];
};

const VOCAB_MASTER_BOX = 5;
const VOCAB_MAX_MISSED = 6;
const TC_TREND_THRESHOLD = 0.12;
const COACH_FEEDBACK_MAX_CHARS = 500;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SKILL_KO: Record<string, string> = {
  'Words in Context': '문맥 속 어휘',
  'Command of Evidence': '근거 활용',
  'Central Ideas and Details': '중심 내용',
  'Inferences': '추론',
  'Transitions': '연결어',
  'Rhetorical Synthesis': '통합 서술',
  'Cross-Text Connections': '텍스트 연계',
  'Form, Structure, and Sense': '형태·구조·의미',
  'Boundaries': '문장 경계',
  'Linear Equations in One Variable': '일차 방정식',
  'Linear Equations in Two Variables': '이차 일차 방정식',
  'Systems of Two Linear Equations in Two Variables': '연립 방정식',
  'Linear Functions': '일차 함수',
  'Linear Inequalities': '부등식',
  'Nonlinear Functions': '비선형 함수',
  'Nonlinear Equations': '비선형 방정식',
  'Quadratic Functions': '이차 함수',
  'Ratios, Rates, and Proportional Relationships': '비율·비례',
  'Percentages': '백분율',
  'Problem-Solving and Data Analysis': '데이터 분석',
  'Two-variable Data': '이변수 데이터',
  'Probability and Conditional Probability': '확률',
  'Inference from Sample Statistics': '통계 추론',
  'Geometry and Trigonometry': '기하·삼각',
  'Right Triangles and Trigonometry': '직각삼각형·삼각함수',
  'Circles': '원',
  'Area and Volume': '넓이·부피',
};

function toKoreanSkill(skill: string): string {
  return SKILL_KO[skill] ?? skill;
}

function toKSTDate(isoStr: string): string {
  const d = new Date(isoStr);
  d.setHours(d.getHours() + 9);
  return d.toISOString().slice(0, 10);
}

function hashInput(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

async function prefetchNarrativeCache(profileId: string): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin
    .from('portal_narrative_cache')
    .select('report_date, item_type, input_hash, narrative')
    .eq('profile_id', profileId);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(`${row.report_date}:${row.item_type}:${row.input_hash}`, row.narrative as string);
  }
  return map;
}

function lookupCache(cache: Map<string, string>, date: string, itemType: string, inputHash: string): string | null {
  return cache.get(`${date}:${itemType}:${inputHash}`) ?? null;
}

async function setCachedNarrative(profileId: string, date: string, itemType: string, inputHash: string, narrative: string): Promise<void> {
  await supabaseAdmin
    .from('portal_narrative_cache')
    .upsert({ profile_id: profileId, report_date: date, item_type: itemType, input_hash: inputHash, narrative })
    .match({ profile_id: profileId, report_date: date, item_type: itemType, input_hash: inputHash });
}

async function extractEdenInsights(
  conversations: { skill: string; isCorrect: boolean; messages: { role: string; content: string }[] }[]
): Promise<EdenInsight | undefined> {
  const meaningful = conversations.filter(c =>
    c.messages.filter(m => m.role === 'user' && m.content?.trim().length > 3).length >= 2
  );
  if (meaningful.length === 0) return undefined;

  const convoText = meaningful.map(c => {
    const lines = c.messages
      .filter(m => m.content?.trim())
      .map(m => `${m.role === 'user' ? '학생' : 'Eden'}: ${m.content.trim()}`)
      .join('\n');
    return `[${c.skill} — ${c.isCorrect ? '정답' : '오답'}]\n${lines}`;
  }).join('\n\n');

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          'SAT 학습 코칭 대화를 분석해 JSON을 반환합니다.',
          '반환 형식: {"strengths": [...], "weaknesses": [...], "intentions": [...]}',
          '각 배열은 한국어 짧은 문장 1~3개. 없으면 빈 배열.',
          '',
          'strengths: 학생이 실제로 한 말이나 행동에서 드러난 구체적 강점.',
          '  - 추상적 평가("논리력이 좋다") 금지. 실제 장면 기반으로 쓸 것.',
          '  - 예시: "filmmakers와 journalists의 평행 구조를 스스로 짚어냈습니다"',
          '',
          'weaknesses: 실제 틀린 부분, 헷갈린 개념을 구체적으로.',
          '  - 추상적 평가("용어를 혼동한다") 금지. 어느 문제에서 무엇을 놓쳤는지.',
          '  - 예시: "연결어 문제에서 처음에 톤(tone)으로 접근해 오답 선택"',
          '',
          'intentions: 학생이 대화 중 이해하려 했던 구체적인 개념이나 논리.',
          '  - 예시: "같은 근거가 두 설명에 모두 적용되는 이유"',
          '',
          '설명 없이 JSON만 반환합니다.',
        ].join('\n'),
      },
      { role: 'user', content: convoText },
    ],
    max_tokens: 300,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}') as Partial<EdenInsight>;
    const insight: EdenInsight = {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      intentions: Array.isArray(parsed.intentions) ? parsed.intentions : [],
    };
    const hasContent = insight.strengths.length + insight.weaknesses.length + insight.intentions.length > 0;
    return hasContent ? insight : undefined;
  } catch {
    return undefined;
  }
}

async function humanizeNarrative(text: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          '당신은 한국어 윤문 전문가입니다.',
          '입력된 학부모 리포트 문장에서 AI 특유의 표현을 사람이 쓴 코치 언어로 교체합니다.',
          '수치·고유명사·스킬명·날짜는 절대 변경하지 않습니다.',
          '문장 수를 줄이거나 의미를 바꾸지 않습니다. 격식체(합쇼체)를 유지합니다.',
          '',
          '교정 규칙 (S1 우선, S2 선택):',
          '- "~인 것입니다/~한 것입니다" → 평서형으로 ("~합니다", "~입니다")',
          '- "~할 수 있습니다" 남발 → 단언으로 ("~합니다")',
          '- "~로 보입니다/~인 듯합니다" → 단언 가능하면 단언',
          '- "이를 통해/이로 인해" → "~로", "~해서" 등으로 교체',
          '- "~에 대해(서)" 불필요한 경우 → 목적격 직결',
          '- "~을 가지고 있습니다" → 형용사·동사로 ("~이 강합니다", "~을 보이고 있습니다")',
          '- "결론적으로/따라서/이를 통해/정리하면" 문두 → 삭제 또는 본문에 녹임',
          '- "주목할 만합니다/시사하는 바가 큽니다" → 구체 서술로',
          '- "본질적으로/핵심적으로" → 삭제',
          '- "~이라는 점에서" 반복 → "~서", "~기 때문에"',
          '- 동일 종결어미 "~다/~습니다"가 3문장 연속이면 1문장 변형 ("~었습니다", "~ㄹ 것입니다", "~하고 있습니다")',
          '- "또한/따라서/아울러/게다가" 문두 접속사 → 삭제 후 자연스럽게 이음',
          '',
          '변경 최소화 원칙: 교정이 필요 없는 표현은 그대로 둡니다.',
          '출력: 윤문된 텍스트만 반환합니다. 설명·주석 없이.',
        ].join('\n'),
      },
      { role: 'user', content: text },
    ],
    max_tokens: 400, temperature: 0.2,
  });
  const result = res.choices[0]?.message?.content?.trim() ?? text;
  return result.length > 0 ? result : text;
}

async function generateStudyHallNarrative(
  stats: { durationMinutes: number; totalProblems: number; correctCount: number; accuracy: number; skills: StudyHallSkill[] },
  tcCrossRef?: SkillCrossRef[],
  coachFeedback?: string,
  edenInsight?: EdenInsight,
): Promise<string> {
  const skillLines = [...stats.skills].sort((a, b) => b.total - a.total).slice(0, 4)
    .map(s => {
      const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      return `${toKoreanSkill(s.skill)}: ${s.correct}/${s.total}문항 (${acc}%)`;
    })
    .join(' | ');

  // 동점일 때 total이 많은 쪽을 취약으로 선택 (stable)
  const weakestSkill = stats.skills.length > 1
    ? [...stats.skills].sort((a, b) => {
        const ra = a.total > 0 ? a.correct / a.total : 1;
        const rb = b.total > 0 ? b.correct / b.total : 1;
        return ra !== rb ? ra - rb : b.total - a.total;
      })[0]
    : null;

  const volumeCtx = stats.totalProblems < 15 ? '짧은 연습 세션' : stats.totalProblems < 40 ? '보통 세션' : '집중 세션';
  const perfCtx = stats.accuracy >= 85 ? '우수한 성취' : stats.accuracy >= 70 ? '안정적인 수준' : stats.accuracy >= 50 ? '보완이 필요한 구간' : '기초 강화가 필요한 단계';

  const hasCrossRef = (tcCrossRef?.length ?? 0) > 0;
  const isShortSession = stats.totalProblems < 15 || stats.skills.length === 0;

  const crossRefBlock = hasCrossRef ? [
    '[테스트센터 교차 — 최근 결과]',
    '동일 영역 검증 정답률:',
    ...tcCrossRef!.map(ref => {
      const gapLabel = ref.tcAccuracy === null
        ? '테스트센터 기록 없음'
        : ref.gap !== null && ref.gap > 10 ? '압박 하 적용 훈련 필요'
        : '±10%p 이내 → 안정적';
      const tcStr = ref.tcAccuracy !== null ? `테스트센터 ${ref.tcAccuracy}%` : '테스트센터 기록 없음';
      const gapStr = ref.gap !== null ? ` / 격차 ${ref.gap > 0 ? '+' : ''}${ref.gap}%p → ${gapLabel}` : ` → ${gapLabel}`;
      return `- ${ref.skill}: 스터디홀 ${ref.shAccuracy}% / ${tcStr}${gapStr}`;
    }),
  ].join('\n') : '';

  const edenBlock = edenInsight ? [
    '[Eden 대화 인사이트]',
    edenInsight.strengths.length > 0 ? `강점: ${edenInsight.strengths.join(' / ')}` : '',
    edenInsight.weaknesses.length > 0 ? `약점: ${edenInsight.weaknesses.join(' / ')}` : '',
    edenInsight.intentions.length > 0 ? `학습 의도: ${edenInsight.intentions.join(' / ')}` : '',
  ].filter(Boolean).join('\n') : '';

  const userContent = [
    '[오늘 스터디홀]',
    `학습 시간: ${stats.durationMinutes}분 / ${volumeCtx} / 총 ${stats.totalProblems}문항 / 정답 ${stats.correctCount}개 / 정답률 ${stats.accuracy}% [${perfCtx}]`,
    skillLines ? `스킬별 성취: ${skillLines}` : '',
    weakestSkill ? `가장 취약한 스킬: ${toKoreanSkill(weakestSkill.skill)} (${weakestSkill.correct}/${weakestSkill.total}문항)` : '',
    hasCrossRef ? `\n${crossRefBlock}` : '',
    edenBlock ? `\n${edenBlock}` : '',
    coachFeedback ? `\n[코치 피드백 — 최근]\n"${coachFeedback}"` : '',
  ].filter(Boolean).join('\n');

  const hasEden = !!edenInsight && (edenInsight.strengths.length + edenInsight.weaknesses.length) > 0;
  const isCompact = isShortSession && !hasCrossRef && !coachFeedback && !hasEden;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: isCompact ? [
          '당신은 SuperfastSAT 코치입니다.',
          '학생의 스터디홀 학습 데이터를 분석해 학부모에게 전달하는 리포트를 2문장으로 작성합니다.',
          '- "학생은"으로 시작하지 않습니다.',
          '- 첫 문장: 오늘 학습량과 결과. 둘째 문장: 다음 방향.',
          '- 금지: 숫자 나열, "~것이 중요합니다", "~로 보입니다", "~시사합니다".',
        ].join('\n') : [
          '당신은 SuperfastSAT 코치입니다.',
          '학생의 스터디홀 학습 데이터를 분석해 학부모에게 전달하는 리포트를 작성합니다.',
          '',
          '구조: 단락 3개, 각 단락 사이 빈 줄 하나.',
          '',
          '[현상] 오늘 학습량과 결과 (1~2문장)',
          '- [오늘 스터디홀] 수치 데이터만 씁니다. Eden 인사이트·해석을 넣지 않습니다.',
          '- 학습 시간과 전체 정답률은 반드시 포함합니다.',
          '- 스킬별 성취는 "N문항 중 M문항" 형식으로 씁니다. 퍼센트만 단독으로 쓰지 않습니다.',
          '  예: "문장 경계에서 10문항 중 5문항을 맞혔습니다" (O) / "문장 경계 50%" (X)',
          '- "학생은"으로 시작하지 않습니다.',
          '',
          '[해석] 결과와 학습 장면의 의미 (1~2문장)',
          '- 취약 스킬 이름을 반드시 포함합니다.',
          '- [Eden 대화 인사이트]가 있으면: 강점 장면 1개 + 약점 개념 1개를 구체적으로 씁니다.',
          '  학부모가 아이 공부하는 모습을 그릴 수 있게. "[Eden~]에서는" 직접 언급 금지.',
          '- [테스트센터 교차]가 있으면 연습-검증 격차를 해석합니다.',
          '',
          '[계획] 다음 수업 방향 (1문장)',
          '- [코치 피드백]이 있으면 그 내용에 근거합니다.',
          '- 없으면 해석에서 도출한 방향으로 씁니다.',
          '- "~예정입니다" 대신 "~집중합니다", "~다룹니다", "~이어갑니다" 등 현재형.',
          '',
          '정답률 톤: 85%+ → 강점 / 70~84% → 균형 / 50~69% → 개선 / 50%미만 → 격려.',
          '금지: 데이터에 없는 행동 묘사, "~것이 중요합니다", "~로 보입니다", "~시사합니다", 숫자 나열.',
        ].join('\n'),
      },
      { role: 'user', content: userContent },
    ],
    max_tokens: isCompact ? 200 : 600, temperature: 0.3,
  });
  const raw = res.choices[0]?.message?.content?.trim() ?? '';
  return raw ? await humanizeNarrative(raw) : '';
}

function inferDomainFromLessons(lessons: TestCenterLesson[]): string | undefined {
  const titles = lessons.map(l => l.title?.toLowerCase() ?? '').join(' ');
  if (/math/.test(titles)) return 'Math';
  if (/reading|writing|rw/.test(titles)) return 'RW';
  return undefined;
}

async function generateTestCenterNarrative(
  stats: { curriculumTitle?: string; curriculumDomain?: string; totalScore: number; totalProblems: number; lessons: TestCenterLesson[] },
  shCrossRef?: SkillCrossRef[],
  coachFeedback?: string,
): Promise<string> {
  const accuracy = stats.totalProblems > 0 ? Math.round((stats.totalScore / stats.totalProblems) * 100) : 0;
  const perfCtx = accuracy >= 85 ? '우수' : accuracy >= 70 ? '양호' : '보완 필요';

  const domainLabel = stats.curriculumDomain
    ? (stats.curriculumDomain === 'reading_and_writing' ? 'RW' : stats.curriculumDomain === 'math' ? 'Math' : stats.curriculumDomain)
    : inferDomainFromLessons(stats.lessons);

  const lessonLines = stats.lessons.map((l, i) => {
    const pct = l.total > 0 ? Math.round((l.score / l.total) * 100) : 0;
    return `${l.title ?? `Module ${i + 1}`}: ${l.score}/${l.total} (${pct}%)`;
  }).join(' | ');

  let trendNote = '';
  if (stats.lessons.length >= 2) {
    const accs = stats.lessons.map(l => (l.total > 0 ? l.score / l.total : 0));
    const first = accs[0]; const last = accs[accs.length - 1];
    if (last - first > TC_TREND_THRESHOLD) trendNote = '후반 모듈로 갈수록 성취가 올라가는 상승 흐름';
    else if (first - last > TC_TREND_THRESHOLD) trendNote = '후반 모듈에서 정확도가 떨어지는 흐름';
    else trendNote = '모듈 간 일관된 성취';
  }

  const hasCrossRef = (shCrossRef?.length ?? 0) > 0;
  const isInfoPoor = !stats.curriculumTitle && stats.lessons.length <= 1 && !hasCrossRef;

  const crossRefBlock = hasCrossRef ? [
    '[스터디홀 교차 — 최근 결과]',
    '오늘 테스트 영역의 연습 기록:',
    ...shCrossRef!.map(ref => {
      const gapLabel = ref.shAccuracy === 0
        ? '스터디홀 기록 없음 → 연습 없이 검증에 노출'
        : ref.gap !== null && ref.gap > 10 ? '압박 하 적용 훈련 필요'
        : '안정적';
      const gapStr = ref.gap !== null && ref.shAccuracy > 0 ? ` / 격차 ${ref.gap > 0 ? '+' : ''}${ref.gap}%p → ${gapLabel}` : ` → ${gapLabel}`;
      const tcStr = ref.tcAccuracy !== null ? `테스트센터 ${ref.tcAccuracy}%` : '테스트센터 기록 없음';
      return `- ${ref.skill}: 스터디홀 ${ref.shAccuracy}% / ${tcStr}${gapStr}`;
    }),
  ].join('\n') : '';

  const userContent = [
    '[오늘 테스트센터]',
    stats.curriculumTitle ? `테스트: ${stats.curriculumTitle}${domainLabel ? ` (${domainLabel})` : ''}` : '',
    `총점: ${stats.totalScore}/${stats.totalProblems} (${accuracy}%) [${perfCtx}]`,
    lessonLines ? `모듈별: ${lessonLines}` : '',
    trendNote ? `흐름: ${trendNote}` : '',
    `전체 평균 ${accuracy}% 기준 — 10%p 이상 낮은 모듈을 약한 모듈로 판정`,
    hasCrossRef ? `\n${crossRefBlock}` : '',
    coachFeedback ? `\n[코치 피드백 — 최근]\n"${coachFeedback}"` : '',
  ].filter(Boolean).join('\n');

  const sentenceGuide = isInfoPoor
    ? '2문장으로 작성합니다.'
    : '3문장으로 작성합니다.';

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          '당신은 SuperfastSAT 코치입니다.',
          '학생의 테스트센터 결과를 분석해 학부모에게 전달하는 리포트를 작성합니다.',
          '',
          'SuperfastSAT의 코칭 철학:',
          '- 테스트센터는 검증 환경입니다. 스터디홀 연습과 비교했을 때 격차가 크면 연습은 됐지만 실전 적용이 안 된 것입니다.',
          '- 전체 정답률보다 모듈 간 흐름이 중요합니다. 어디서 무너지는지가 다음 수업의 방향을 결정합니다.',
          '- 코치가 우려했던 부분이 오늘 결과에서 확인됐는지, 아니면 개선됐는지를 학부모에게 전달합니다.',
          '',
          '작성 규칙:',
          '- 전체 정답률이 아니라 모듈 흐름과 무너지는 지점을 중심으로 해석합니다.',
          '- 평균 정답률보다 10%p 이상 낮은 모듈이 있으면 그 모듈을 구체적으로 지목합니다.',
          '- 커리큘럼 제목이 있으면 반드시 언급합니다.',
          '- [스터디홀 교차] 항목이 있으면 연습-검증 격차를 반드시 해석합니다.',
          '- [코치 피드백] 항목이 있으면 마지막 문장은 반드시 그 피드백에 근거한 다음 수업 방향입니다.',
          '- [코치 피드백]이 없으면 마지막 문장은 오늘 결과에서 도출한 방향입니다.',
          `- ${sentenceGuide}`,
        ].join('\n'),
      },
      { role: 'user', content: userContent },
    ],
    max_tokens: 380, temperature: 0.3,
  });
  const raw = res.choices[0]?.message?.content?.trim() ?? '';
  return raw ? await humanizeNarrative(raw) : '';
}

async function generateVocaNarrative(
  stats: { wordCount: number; gradedCount: number; correctCount: number; accuracy: number; masteredCount: number; missedTerms: string[] },
  coachFeedback?: string,
): Promise<string> {
  const perfCtx = stats.accuracy >= 80 ? '잘 익어가는 단계' : stats.accuracy >= 60 ? '꾸준히 쌓이는 중' : stats.accuracy >= 40 ? '아직 낯선 단어가 많은 초기 단계' : '집중 반복 노출이 필요한 단계';
  const missedLine = stats.missedTerms.length ? `복습 필요: ${stats.missedTerms.join(', ')}` : '복습 필요: 없음';

  const userContent = [
    '[오늘 단어 학습]',
    `학습 단어: ${stats.wordCount}개 / 채점 ${stats.gradedCount}문항 / 정답 ${stats.correctCount}개 / 정답률 ${stats.accuracy}% [${perfCtx}]`,
    `마스터: ${stats.masteredCount}개`,
    missedLine,
    coachFeedback ? `\n[코치 피드백 — 최근]\n"${coachFeedback}"` : '',
  ].filter(Boolean).join('\n');

  const sentenceGuide = coachFeedback
    ? '3문장으로 작성합니다.'
    : stats.wordCount < 20 ? '2문장으로 작성합니다.' : '3문장으로 작성합니다.';

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          '당신은 SuperfastSAT 코치입니다.',
          '학생의 단어 학습 결과를 분석해 학부모에게 전달하는 리포트를 작성합니다.',
          '',
          'SuperfastSAT의 단어 코칭 철학:',
          '- 단어 학습의 문제는 암기량 부족일 수도 있고, 잘못 알고 있는 방식일 수도 있습니다.',
          '  코치 피드백이 있으면 그 판단을 따릅니다. 없으면 정답률과 볼륨으로 단계를 판단합니다.',
          '- 정답률이 낮아도 처음 접하는 단어가 많은 학생은 암기 단계에 있는 것입니다.',
          '- 마스터 단어가 있으면 반드시 언급합니다.',
          '',
          '작성 규칙:',
          '- 단어 볼륨(노출 수)과 정답률을 함께 해석합니다.',
          '- 마스터 단어가 있으면 반드시 언급합니다.',
          '- [코치 피드백] 항목이 있으면 마지막 문장은 그 피드백에 근거한 다음 학습 방향입니다.',
          '- [코치 피드백]이 없으면 마지막 문장은 복습 방향으로 마무리합니다.',
          `- ${sentenceGuide}`,
        ].join('\n'),
      },
      { role: 'user', content: userContent },
    ],
    max_tokens: 320, temperature: 0.3,
  });
  const raw = res.choices[0]?.message?.content?.trim() ?? '';
  return raw ? await humanizeNarrative(raw) : '';
}

export async function buildSrmReport(profileId: string): Promise<LearningReport> {
  const [
    narrativeCache,
    { data: shSessions },
    { data: shAttempts },
    { data: tcAttempts },
    { data: dailyReports },
    { data: vocabEvents },
    { data: vocabExposed },
  ] = await Promise.all([
    prefetchNarrativeCache(profileId),
    supabaseSFv2.from('study_hall_session').select('id, started_at, ended_at').eq('user_id', profileId).not('ended_at', 'is', null).order('started_at', { ascending: false }).limit(60),
    supabaseSFv2.from('study_hall_unit_attempts').select('study_hall_session_id, is_correct, attempted_at, unit_id, chat_messages, time_spent_seconds, confidence_level').eq('student_id', profileId).order('attempted_at', { ascending: false }).limit(500),
    supabaseSFv2.from('test_center_lesson_attempts').select('test_center_session_id, score, total, status, lesson_id, curriculum_id').eq('student_id', profileId).not('score', 'is', null),
    supabaseSFv2.from('daily_reports').select('report_date, report_md, status').eq('student_id', profileId).eq('status', 'sent').order('report_date', { ascending: false }).limit(30),
    supabaseSFv2.schema('vocab').from('events').select('entry_id, is_correct, prev_box, new_box, occurred_at').eq('subject_id', profileId).eq('kind', 'graded').order('occurred_at', { ascending: false }).limit(1000),
    supabaseSFv2.schema('vocab').from('events').select('entry_id').eq('subject_id', profileId).limit(10000),
  ]);

  const vocabExposedCount = new Set((vocabExposed ?? []).map(r => r.entry_id as string).filter(Boolean)).size;

  const unitIds = [...new Set((shAttempts ?? []).map(a => a.unit_id as string).filter(Boolean))];
  const { data: unitsMeta } = unitIds.length ? await supabaseSFv2.from('units').select('id, skill, domain').in('id', unitIds) : { data: [] };
  const unitsMap = new Map<string, { skill: string; domain: string }>();
  for (const u of unitsMeta ?? []) { if (u.id && u.skill) unitsMap.set(u.id, { skill: u.skill as string, domain: u.domain as string }); }

  const tcSessionIds = [...new Set((tcAttempts ?? []).map(a => a.test_center_session_id as string).filter(Boolean))];
  const tcLessonIds = [...new Set((tcAttempts ?? []).map(a => a.lesson_id as string).filter(Boolean))];
  const tcCurriculumIds = [...new Set((tcAttempts ?? []).map(a => a.curriculum_id as string).filter(Boolean))];

  const [{ data: tcSessions }, { data: tcLessons }, { data: tcCurricula }] = await Promise.all([
    tcSessionIds.length ? supabaseSFv2.from('test_center_session').select('id, started_at').in('id', tcSessionIds) : { data: [] },
    tcLessonIds.length ? supabaseSFv2.from('lessons').select('id, title').in('id', tcLessonIds) : { data: [] },
    tcCurriculumIds.length ? supabaseSFv2.from('curricula').select('id, title, domain').in('id', tcCurriculumIds) : { data: [] },
  ]);

  const lessonTitleMap = new Map<string, string>();
  for (const l of tcLessons ?? []) { if (l.id && l.title) lessonTitleMap.set(l.id as string, l.title as string); }
  const curriculumMap = new Map<string, { title: string; domain: string }>();
  for (const c of tcCurricula ?? []) { if (c.id && c.title) curriculumMap.set(c.id, { title: c.title as string, domain: (c.domain as string) ?? '' }); }

  const dayMap = new Map<string, DayReport>();
  function getOrCreate(date: string): DayReport {
    if (!dayMap.has(date)) dayMap.set(date, { date, items: [] });
    return dayMap.get(date)!;
  }

  // Study Hall
  const shSessionMap = new Map<string, { started_at: string; ended_at: string }>();
  for (const s of shSessions ?? []) shSessionMap.set(s.id, { started_at: s.started_at, ended_at: s.ended_at });

  const shBySession = new Map<string, { total: number; correct: number }>();
  for (const a of shAttempts ?? []) {
    const sid = a.study_hall_session_id as string;
    if (!shBySession.has(sid)) shBySession.set(sid, { total: 0, correct: 0 });
    const e = shBySession.get(sid)!; e.total++;
    if (a.is_correct) e.correct++;
  }

  const shSkillsBySession = new Map<string, Map<string, { skill: string; domain: string; correct: number; total: number }>>();
  for (const a of shAttempts ?? []) {
    const sid = a.study_hall_session_id as string;
    const uid = a.unit_id as string;
    if (!uid) continue;
    const meta = unitsMap.get(uid);
    if (!meta?.skill) continue;
    if (!shSkillsBySession.has(sid)) shSkillsBySession.set(sid, new Map());
    const skillMap = shSkillsBySession.get(sid)!;
    if (!skillMap.has(meta.skill)) skillMap.set(meta.skill, { skill: meta.skill, domain: meta.domain, correct: 0, total: 0 });
    const sk = skillMap.get(meta.skill)!; sk.total++;
    if (a.is_correct) sk.correct++;
  }

  // Eden 대화 데이터 수집 (스킬별 그룹)
  type EdenConvo = { skill: string; isCorrect: boolean; messages: { role: string; content: string }[] };
  const edenBySession = new Map<string, EdenConvo[]>();
  for (const a of shAttempts ?? []) {
    const sid = a.study_hall_session_id as string;
    const uid = a.unit_id as string;
    const msgs = a.chat_messages as { role: string; content: string }[] | null;
    if (!msgs || msgs.length === 0) continue;
    const meta = unitsMap.get(uid);
    if (!meta?.skill) continue;
    if (!edenBySession.has(sid)) edenBySession.set(sid, []);
    edenBySession.get(sid)!.push({ skill: toKoreanSkill(meta.skill), isCorrect: !!a.is_correct, messages: msgs });
  }

  const shByDate = new Map<string, { totalMinutes: number; totalProblems: number; correctCount: number; skillMap: Map<string, { skill: string; domain: string; correct: number; total: number }>; edenConvos: EdenConvo[] }>();
  for (const [sid, stats] of shBySession) {
    const s = shSessionMap.get(sid);
    if (!s) continue;
    const date = toKSTDate(s.started_at);
    const minutes = Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
    if (!shByDate.has(date)) shByDate.set(date, { totalMinutes: 0, totalProblems: 0, correctCount: 0, skillMap: new Map(), edenConvos: [] });
    const d = shByDate.get(date)!;
    d.totalMinutes += minutes; d.totalProblems += stats.total; d.correctCount += stats.correct;
    const sessionSkills = shSkillsBySession.get(sid);
    if (sessionSkills) {
      for (const [skillKey, sk] of sessionSkills) {
        if (!d.skillMap.has(skillKey)) d.skillMap.set(skillKey, { skill: sk.skill, domain: sk.domain, correct: 0, total: 0 });
        const ds = d.skillMap.get(skillKey)!; ds.correct += sk.correct; ds.total += sk.total;
      }
    }
    const sessionEden = edenBySession.get(sid);
    if (sessionEden) d.edenConvos.push(...sessionEden);
  }

  // Test Center — build session map before cross-ref computation
  const tcSessionDateMap = new Map<string, string>();
  for (const s of tcSessions ?? []) tcSessionDateMap.set(s.id, toKSTDate(s.started_at));

  const tcBySession = new Map<string, { lessons: TestCenterLesson[]; curriculumTitle?: string; curriculumDomain?: string }>();
  for (const a of tcAttempts ?? []) {
    const sid = a.test_center_session_id as string;
    if (!tcSessionDateMap.has(sid)) continue;
    if (!tcBySession.has(sid)) {
      const currId = a.curriculum_id as string | undefined;
      const curriculum = currId ? curriculumMap.get(currId) : undefined;
      tcBySession.set(sid, { lessons: [], curriculumTitle: curriculum?.title, curriculumDomain: curriculum?.domain });
    }
    const lessonId = a.lesson_id as string | undefined;
    tcBySession.get(sid)!.lessons.push({ title: lessonId ? lessonTitleMap.get(lessonId) : undefined, score: a.score as number, total: a.total as number });
  }

  // Cross-reference: domain-level accuracy aggregates
  const RW_DOMAINS = new Set(['reading_and_writing', 'information_and_ideas', 'craft_and_structure', 'standard_english_conventions', 'expression_of_ideas']);
  const MATH_DOMAINS = new Set(['math', 'algebra', 'advanced_math', 'problem_solving_and_data_analysis', 'geometry_and_trigonometry']);
  const normalizeDomain = (d?: string | null) =>
    !d ? null : RW_DOMAINS.has(d) ? 'RW' : MATH_DOMAINS.has(d) ? 'Math' : null;

  const tcDomainStats = new Map<string, { correct: number; total: number }>();
  for (const [, data] of tcBySession) {
    const domain = normalizeDomain(data.curriculumDomain);
    if (!domain) continue;
    if (!tcDomainStats.has(domain)) tcDomainStats.set(domain, { correct: 0, total: 0 });
    const s = tcDomainStats.get(domain)!;
    for (const l of data.lessons) { s.correct += l.score; s.total += l.total; }
  }

  const shDomainStats = new Map<string, { correct: number; total: number }>();
  for (const [, stats] of shByDate) {
    for (const [, sk] of stats.skillMap) {
      const domain = normalizeDomain(sk.domain);
      if (!domain) continue;
      if (!shDomainStats.has(domain)) shDomainStats.set(domain, { correct: 0, total: 0 });
      const s = shDomainStats.get(domain)!;
      s.correct += sk.correct; s.total += sk.total;
    }
  }

  // Coach feedback: most recent daily report
  const coachFeedback = (dailyReports ?? []).length > 0
    ? ((dailyReports![0].report_md as string | null) ?? '').slice(0, COACH_FEEDBACK_MAX_CHARS) || undefined
    : undefined;

  await Promise.all(Array.from(shByDate.entries()).map(async ([date, stats]) => {
    const accuracy = stats.totalProblems > 0 ? Math.round((stats.correctCount / stats.totalProblems) * 100) : 0;
    const skills = Array.from(stats.skillMap.values());

    // Compute TC cross-ref for this SH session
    const shDomainsToday = new Map<string, { correct: number; total: number }>();
    for (const [, sk] of stats.skillMap) {
      const domain = normalizeDomain(sk.domain);
      if (!domain) continue;
      if (!shDomainsToday.has(domain)) shDomainsToday.set(domain, { correct: 0, total: 0 });
      const s = shDomainsToday.get(domain)!;
      s.correct += sk.correct; s.total += sk.total;
    }
    const tcCrossRef: SkillCrossRef[] = Array.from(shDomainsToday.entries()).map(([domain, sh]) => {
      const shAcc = sh.total > 0 ? Math.round(sh.correct / sh.total * 100) : 0;
      const tcStat = tcDomainStats.get(domain);
      const tcAcc = tcStat && tcStat.total > 0 ? Math.round(tcStat.correct / tcStat.total * 100) : null;
      return { skill: domain, shAccuracy: shAcc, tcAccuracy: tcAcc, gap: tcAcc !== null ? shAcc - tcAcc : null };
    });

    // Eden 인사이트 추출 (캐시 키 먼저 계산 후 캐시 미스 시에만 LLM 호출)
    const edenCacheKey = stats.edenConvos.length > 0
      ? hashInput(stats.edenConvos.map(c => ({ skill: c.skill, isCorrect: c.isCorrect, msgs: c.messages.map(m => m.content).join('|') })))
      : null;
    let edenInsight: EdenInsight | undefined;
    if (edenCacheKey) {
      const cachedEden = lookupCache(narrativeCache, date, 'eden_insight', edenCacheKey);
      if (cachedEden) {
        try { edenInsight = JSON.parse(cachedEden) as EdenInsight; } catch { /* ignore */ }
      } else {
        edenInsight = await extractEdenInsights(stats.edenConvos);
        if (edenInsight) await setCachedNarrative(profileId, date, 'eden_insight', edenCacheKey, JSON.stringify(edenInsight));
      }
    }

    const cacheInput = {
      durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy,
      skills: [...skills].sort((a, b) => a.skill.localeCompare(b.skill)).map(s => ({ skill: s.skill, correct: s.correct, total: s.total })),
      tcCrossRef, coachFeedback, edenInsight,
    };
    const inputHash = hashInput(cacheInput);
    let narrative = lookupCache(narrativeCache, date, 'study_hall', inputHash);
    if (!narrative) {
      narrative = stats.totalProblems > 0
        ? await generateStudyHallNarrative({ durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy, skills }, tcCrossRef.length ? tcCrossRef : undefined, coachFeedback, edenInsight)
        : `${stats.totalMinutes}분간 스터디홀에 접속했습니다.`;
      await setCachedNarrative(profileId, date, 'study_hall', inputHash, narrative);
    }
    getOrCreate(date).items.push({ type: 'study_hall', durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy, aiNarrative: narrative, skills: skills.length > 0 ? skills : undefined } satisfies StudyHallDay);
  }));

  await Promise.all(Array.from(tcBySession.entries()).map(async ([sid, data]) => {
    const date = tcSessionDateMap.get(sid)!;
    const totalScore = data.lessons.reduce((s, x) => s + x.score, 0);
    const totalProblems = data.lessons.reduce((s, x) => s + x.total, 0);

    // Compute SH cross-ref for this TC session (infer domain from lessons if curriculum domain is null)
    const inferredDomain = data.curriculumDomain
      ? normalizeDomain(data.curriculumDomain)
      : (() => {
          const d = inferDomainFromLessons(data.lessons);
          return d === 'RW' ? 'RW' : d === 'Math' ? 'Math' : null;
        })();
    const tcDomain = inferredDomain;
    const shCrossRef: SkillCrossRef[] = [];
    if (tcDomain) {
      const shStat = shDomainStats.get(tcDomain);
      const shAcc = shStat && shStat.total > 0 ? Math.round(shStat.correct / shStat.total * 100) : 0;
      const tcAcc = totalProblems > 0 ? Math.round(totalScore / totalProblems * 100) : null;
      shCrossRef.push({ skill: tcDomain, shAccuracy: shAcc, tcAccuracy: tcAcc, gap: shAcc > 0 && tcAcc !== null ? shAcc - tcAcc : null });
    }

    const cacheInput = {
      curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain,
      totalScore, totalProblems, lessons: data.lessons.map(l => ({ title: l.title, score: l.score, total: l.total })),
      shCrossRef, coachFeedback,
    };
    const inputHash = hashInput(cacheInput);
    let narrative: string | undefined;
    if (totalProblems > 0) {
      narrative = lookupCache(narrativeCache, date, 'test_center', inputHash) ?? undefined;
      if (!narrative) {
        narrative = await generateTestCenterNarrative(
          { curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain, totalScore, totalProblems, lessons: data.lessons },
          shCrossRef.length ? shCrossRef : undefined, coachFeedback,
        );
        await setCachedNarrative(profileId, date, 'test_center', inputHash, narrative);
      }
    }
    getOrCreate(date).items.push({ type: 'test_center', curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain, lessons: data.lessons, totalScore, totalProblems, aiNarrative: narrative } satisfies TestCenterDay);
  }));

  // Daily Reports
  for (const dr of dailyReports ?? []) {
    getOrCreate(dr.report_date as string).items.push({ type: 'daily_report', reportMd: dr.report_md as string } satisfies DailyReportDay);
  }

  // Lesson Feedback — scheduled_events.feedback (coach_room, completed)
  const { data: participantRows } = await supabaseSFv2
    .from('scheduled_event_participants')
    .select('event_id')
    .eq('user_id', profileId);

  if (participantRows?.length) {
    const participantEventIds = participantRows.map(r => r.event_id as string);
    const { data: feedbackEvents } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at, assigned_teacher_id, feedback')
      .in('id', participantEventIds)
      .eq('category', 'coach_room')
      .not('feedback', 'is', null)
      .neq('feedback', '')
      .order('starts_at', { ascending: false })
      .limit(60);

    if (feedbackEvents?.length) {
      const teacherIds = [...new Set(feedbackEvents.map(e => e.assigned_teacher_id as string | null).filter(Boolean))] as string[];
      const { data: teacherProfiles } = teacherIds.length
        ? await supabaseSFv2.from('profiles').select('id, full_name').in('id', teacherIds)
        : { data: [] };
      const teacherMap = new Map<string, string>();
      for (const p of teacherProfiles ?? []) { if (p.id && p.full_name) teacherMap.set(p.id as string, p.full_name as string); }

      for (const ev of feedbackEvents) {
        const date = toKSTDate(ev.starts_at as string);
        const coachName = ev.assigned_teacher_id ? teacherMap.get(ev.assigned_teacher_id as string) : undefined;
        getOrCreate(date).items.push({
          type: 'lesson_feedback',
          eventId: ev.id as string,
          startsAt: ev.starts_at as string,
          coachName,
          feedback: ev.feedback as string,
        } satisfies LessonFeedbackDay);
      }
    }
  }

  // Vocab
  type VocaAgg = { entryIds: Set<string>; gradedCount: number; correctCount: number; masteredIds: Set<string>; missedIds: string[] };
  const vocaByDate = new Map<string, VocaAgg>();
  for (const e of vocabEvents ?? []) {
    const entryId = e.entry_id as string | null;
    if (!entryId) continue;
    const date = toKSTDate(e.occurred_at as string);
    if (!vocaByDate.has(date)) vocaByDate.set(date, { entryIds: new Set(), gradedCount: 0, correctCount: 0, masteredIds: new Set(), missedIds: [] });
    const agg = vocaByDate.get(date)!;
    agg.entryIds.add(entryId); agg.gradedCount++;
    if (e.is_correct === true) agg.correctCount++;
    if (e.is_correct === false) agg.missedIds.push(entryId);
    const prevBox = (e.prev_box as number | null) ?? 0;
    const newBox = (e.new_box as number | null) ?? 0;
    if (newBox >= VOCAB_MASTER_BOX && prevBox < VOCAB_MASTER_BOX) agg.masteredIds.add(entryId);
  }

  const missedEntryIds = [...new Set(Array.from(vocaByDate.values()).flatMap(a => a.missedIds))];
  const { data: vocabEntries } = missedEntryIds.length ? await supabaseSFv2.schema('vocab').from('entries').select('id, term').in('id', missedEntryIds) : { data: [] };
  const termMap = new Map<string, string>();
  for (const en of vocabEntries ?? []) { if (en.id && en.term) termMap.set(en.id as string, en.term as string); }

  await Promise.all(Array.from(vocaByDate.entries()).map(async ([date, agg]) => {
    const wordCount = agg.entryIds.size;
    const accuracy = agg.gradedCount > 0 ? Math.round((agg.correctCount / agg.gradedCount) * 100) : 0;
    const masteredCount = agg.masteredIds.size;
    const missedTerms = [...new Set(agg.missedIds)].map(id => termMap.get(id)).filter((t): t is string => Boolean(t)).slice(0, VOCAB_MAX_MISSED);
    const cacheInput = { wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms: [...missedTerms].sort(), coachFeedback };
    const inputHash = hashInput(cacheInput);
    let narrative = lookupCache(narrativeCache, date, 'voca', inputHash);
    if (!narrative) {
      narrative = await generateVocaNarrative({ wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms }, coachFeedback);
      await setCachedNarrative(profileId, date, 'voca', inputHash, narrative);
    }
    getOrCreate(date).items.push({ type: 'voca', wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms, aiNarrative: narrative } satisfies VocaDay);
  }));

  const days = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  return { days, vocabExposedCount };
}
