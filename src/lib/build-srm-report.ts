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

type VocabContext = {
  missedTerms: string[];
  masteredTerms: string[];
};

const VOCAB_MASTER_BOX = 5;
const VOCAB_MAX_MISSED = 6;
const TC_TREND_THRESHOLD = 0.12;
const COACH_FEEDBACK_MAX_CHARS = 500;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  vocabContext?: VocabContext,
): Promise<string> {
  const skillLines = [...stats.skills].sort((a, b) => b.total - a.total).slice(0, 4)
    .map(s => {
      const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      return `${s.skill}: ${s.total}문항 중 ${s.correct}문항 정답 (${acc}%)`;
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

  const isMathSession = stats.skills.length > 0 && stats.skills.every(s => s.domain === 'Math');
  const hasWordsInContext = stats.skills.some(s => s.skill === 'Words in Context');
  const vocabBlock = vocabContext && !isMathSession && hasWordsInContext && (vocabContext.missedTerms.length + vocabContext.masteredTerms.length) > 0 ? [
    '[최근 단어 학습 — 최근 7일]',
    vocabContext.missedTerms.length > 0 ? `틀린 단어: ${vocabContext.missedTerms.join(' / ')}` : '',
    vocabContext.masteredTerms.length > 0 ? `마스터한 단어: ${vocabContext.masteredTerms.join(' / ')}` : '',
  ].filter(Boolean).join('\n') : '';

  const userContent = [
    '[오늘 스터디홀]',
    `학습 시간: ${stats.durationMinutes}분 / ${volumeCtx} / 총 ${stats.totalProblems}문항 / 정답 ${stats.correctCount}개 / 정답률 ${stats.accuracy}% [${perfCtx}]`,
    skillLines ? `스킬별 성취: ${skillLines}` : '',
    weakestSkill ? `가장 취약한 스킬: ${weakestSkill.skill} (${weakestSkill.total}문항 중 ${weakestSkill.correct}문항 정답)` : '',
    hasCrossRef ? `\n${crossRefBlock}` : '',
    edenBlock ? `\n${edenBlock}` : '',
    vocabBlock ? `\n${vocabBlock}` : '',
    coachFeedback ? `\n[코치 피드백 — 최근]\n"${coachFeedback}"` : '',
  ].filter(Boolean).join('\n');

  const hasEden = !!edenInsight && (edenInsight.strengths.length + edenInsight.weaknesses.length) > 0;
  const hasVocab = !!vocabBlock;
  const isCompact = isShortSession && !hasCrossRef && !coachFeedback && !hasEden && !hasVocab;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: isCompact ? [
          '당신은 SuperfastSAT 코치입니다.',
          '학생의 스터디홀 학습 데이터를 분석해 학부모에게 전달하는 리포트를 2문장으로 작성합니다.',
          '',
          'SuperfastSAT 코칭 철학:',
          '- SAT는 예측 가능한 패턴을 가진 시스템입니다. 코치는 정답률이 아니라 오류 유형으로 학습 상태를 진단합니다.',
          '- 스터디홀은 연습 환경입니다. 패턴을 시간 압박 없이 체화하는 것이 목적입니다.',
          '- 리포트는 숫자 요약이 아니라 "학습 사이클이 지금 어디 있는가"를 보여주는 진단 도구입니다.',
          '',
          '작성 규칙:',
          '- "학생은"으로 시작하지 않습니다.',
          '- 첫 문장: 오늘 학습량과 결과. 둘째 문장: 다음 방향.',
          '- 금지: 숫자 나열, "~것이 중요합니다", "~로 보입니다", "~시사합니다".',
        ].join('\n') : [
          '당신은 SuperfastSAT 코치입니다.',
          '학생의 스터디홀 학습 데이터를 분석해 학부모에게 전달하는 리포트를 작성합니다.',
          '',
          'SuperfastSAT 코칭 철학:',
          '- SAT는 예측 가능한 패턴을 가진 시스템입니다. 코치는 정답률이 아니라 오류 유형으로 학습 상태를 진단합니다.',
          '- 학습 사이클: 레슨(학습) → 스터디홀(연습) → 테스트센터(검증). 리포트는 이 사이클이 지금 어디에 있는지 보여줍니다.',
          '- 스터디홀은 연습 환경입니다. 패턴을 시간 압박 없이 체화하는 것이 목적이고, 테스트센터가 그 내재화를 검증합니다.',
          '- "틀렸다"는 사실보다 "어떻게 틀렸는가"가 다음 수업 방향을 결정합니다.',
          '- 스터디홀 정답률이 높아도 테스트센터에서 무너진다면, 연습은 됐지만 압박 하 적용이 안 된 것입니다.',
          '- 코치 피드백이 있으면 리포트의 마지막은 그 계획을 학부모 언어로 전달합니다.',
          '- 리포트는 숫자 요약이 아니라 "학습 사이클이 지금 어디 있는가"를 보여주는 진단 도구입니다.',
          '',
          isMathSession
            ? '제약: 이 세션은 Math 스킬 전용입니다. 단어·어휘·Words in Context 관련 내용은 절대 언급하지 않습니다.'
            : '제약: 입력에 [최근 단어 학습] 항목이 없으면 어휘·단어·Words in Context를 절대 언급하지 않습니다.',
          '',
          '3개 단락으로 작성합니다. 단락 사이 빈 줄 하나. 단락 제목·레이블은 쓰지 않습니다.',
          '',
          '첫째 단락 — 오늘 학습량과 결과 (1~2문장):',
          '- [오늘 스터디홀] 수치 데이터만 씁니다. Eden 인사이트·해석을 넣지 않습니다.',
          '- 학습 시간과 전체 정답률은 반드시 포함합니다.',
          '- 스킬별 성취는 "N문항 중 M문항" 형식으로 씁니다. 퍼센트만 단독으로 쓰지 않습니다.',
          '  예: "문장 경계에서 10문항 중 5문항을 맞혔습니다" (O) / "문장 경계 50%" (X)',
          '- "학생은"으로 시작하지 않습니다.',
          '',
          '둘째 단락 — 결과의 의미와 오류 유형 (1~2문장):',
          '- 취약 스킬 이름을 반드시 포함합니다.',
          '- 어느 오류 유형이 반복되는지 읽어냅니다. 데이터에서 드러나지 않으면 유추하지 않습니다.',
          '- [Eden 대화 인사이트]가 있으면: 인사이트에 나온 구체적인 단어·문법 항목·장면을 그대로 인용합니다.',
          '  예: "\'emitting\'과 \'dedicating\'의 동사 역할에 대해 질문하는 장면이 있었습니다" (O)',
          '  예: "어휘 혼동이 남아있습니다" (X — 너무 추상적)',
          '  학부모가 아이가 공부하는 구체적인 장면을 머릿속에 그릴 수 있어야 합니다.',
          '  "[Eden~]에서는" 직접 언급 금지.',
          '- [최근 단어 학습]이 있고 문맥 속 어휘 스킬이 있으면: 최근 틀린 단어와 성취를 연결해 씁니다.',
          '  단어 이름을 직접 나열하지 말고 "최근 연습한 어휘에서 혼동이 남아있다"처럼 패턴으로 씁니다.',
          '- [테스트센터 교차]가 있으면 연습-검증 격차를 해석합니다. (격차 >10%p → 압박 하 적용 훈련 필요)',
          '',
          '셋째 단락 — 다음 수업 방향 (1문장):',
          '- [코치 피드백]이 있으면 두 방향 중 오늘 데이터와 교차하는 것을 선택합니다:',
          '  방향 A (수업→스터디홀): 수업에서 다룬 내용이 오늘 스터디홀에 나타났다면 그 연결을 전달합니다.',
          '  방향 B (스터디홀→수업): 오늘 스터디홀에서 드러난 약점이 다음 수업에서 보완될 것이라는 방향으로 씁니다.',
          '- [코치 피드백]이 없으면 둘째 단락에서 도출한 오류 유형·격차에 근거한 방향으로 씁니다.',
          '- "~예정입니다" 대신 "~집중합니다", "~다룹니다", "~이어갑니다" 등 현재형.',
          '',
          '정답률 톤: 85%+ → 강점 강조 / 70~84% → 잘한 점과 보완점 균형 / 50~69% → 개선 방향 제시 / 50%미만 → 흔들리는 부분을 지목하되 격려.',
          '금지: 데이터에 없는 행동 묘사, "~것이 중요합니다", "~로 보입니다", "~시사합니다", 퍼센트 단독 나열.',
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
  stats: { curriculumTitle?: string; curriculumDomain?: string; totalScore: number; totalProblems: number; lessons: TestCenterLesson[]; skills?: { skill: string; correct: number; total: number }[] },
  shCrossRef?: SkillCrossRef[],
  coachFeedback?: string,
  vocabContext?: VocabContext,
): Promise<string> {
  const accuracy = stats.totalProblems > 0 ? Math.round((stats.totalScore / stats.totalProblems) * 100) : 0;
  const perfCtx = accuracy >= 85 ? '우수' : accuracy >= 70 ? '양호' : '보완 필요';

  const domainLabel = stats.curriculumDomain
    ? (stats.curriculumDomain === 'reading_and_writing' ? 'RW' : stats.curriculumDomain === 'math' ? 'Math' : stats.curriculumDomain)
    : inferDomainFromLessons(stats.lessons);

  const lessonLines = stats.lessons.map((l, i) => {
    const pct = l.total > 0 ? Math.round((l.score / l.total) * 100) : 0;
    // Infer RW/Math from standard SAT question counts (27=RW, 22=Math)
    const domainHint = l.total === 27 ? 'RW' : l.total === 22 ? 'Math' : null;
    const titleLabel = l.title
      ? (domainHint ? `${domainHint} ${l.title}` : l.title)
      : (domainHint ? `${domainHint} Module ${i + 1}` : `Module ${i + 1}`);
    return `${titleLabel}: ${l.score}/${l.total} (${pct}%)`;
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
  const hasSkills = (stats.skills?.length ?? 0) > 0;
  const isInfoPoor = !stats.curriculumTitle && stats.lessons.length <= 1 && !hasCrossRef && !hasSkills;

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

  const skillLines = hasSkills ? (() => {
    const sorted = [...stats.skills!].sort((a, b) => b.total - a.total).slice(0, 4);
    const lines = sorted.map(s => {
      const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      return `${s.skill}: ${s.total}문항 중 ${s.correct}문항 정답 (${acc}%)`;
    }).join(' | ');
    const weakest = [...stats.skills!].sort((a, b) => {
      const ra = a.total > 0 ? a.correct / a.total : 1;
      const rb = b.total > 0 ? b.correct / b.total : 1;
      return ra !== rb ? ra - rb : b.total - a.total;
    })[0];
    return { lines, weakest };
  })() : null;

  const isRW = domainLabel === 'RW' || domainLabel === 'reading_and_writing';
  const vocabBlock = vocabContext && isRW && (vocabContext.missedTerms.length + vocabContext.masteredTerms.length) > 0 ? [
    '[최근 단어 학습 — 최근 7일]',
    vocabContext.missedTerms.length > 0 ? `틀린 단어: ${vocabContext.missedTerms.join(' / ')}` : '',
    vocabContext.masteredTerms.length > 0 ? `마스터한 단어: ${vocabContext.masteredTerms.join(' / ')}` : '',
  ].filter(Boolean).join('\n') : '';

  const userContent = [
    '[오늘 테스트센터]',
    stats.curriculumTitle ? `테스트: ${stats.curriculumTitle}${domainLabel ? ` (${domainLabel})` : ''}` : '',
    `총점: ${stats.totalScore}/${stats.totalProblems} (${accuracy}%) [${perfCtx}]`,
    lessonLines ? `모듈별: ${lessonLines}` : '',
    trendNote ? `흐름: ${trendNote}` : '',
    `전체 평균 ${accuracy}% 기준 — 10%p 이상 낮은 모듈을 약한 모듈로 판정`,
    skillLines ? `스킬별 성취: ${skillLines.lines}` : '',
    skillLines ? `가장 취약한 스킬: ${skillLines.weakest.skill} (${skillLines.weakest.total}문항 중 ${skillLines.weakest.correct}문항 정답)` : '',
    hasCrossRef ? `\n${crossRefBlock}` : '',
    vocabBlock ? `\n${vocabBlock}` : '',
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
          'SuperfastSAT 코칭 철학:',
          '- 학습 사이클: 레슨(학습) → 스터디홀(연습) → 테스트센터(검증). 테스트센터는 이 사이클의 검증 단계입니다.',
          '- 테스트센터는 검증 환경입니다. 스터디홀 연습과 비교했을 때 격차가 크면 연습은 됐지만 실전 적용이 안 된 것입니다.',
          '- 전체 정답률보다 모듈 간 흐름이 중요합니다. 어디서 무너지는지가 다음 수업의 방향을 결정합니다.',
          '- 코치가 우려했던 부분이 오늘 결과에서 확인됐는지, 아니면 개선됐는지를 학부모에게 전달합니다.',
          '',
          'SAT 시험 구조:',
          '- RW: 모듈1(27문) + 모듈2(27문, 적응형) — 모듈1 결과가 모듈2 난이도를 결정합니다.',
          '- Math: 모듈1(22문) + 모듈2(22문, 적응형) — 동일.',
          '- 모듈2가 어려운 버전이면 모듈1을 잘 푼 것입니다. 모듈2 정답률이 낮더라도 어려운 버전인지 쉬운 버전인지 맥락이 중요합니다.',
          '- RW 스킬: Words in Context / Text Structure and Purpose / Cross-Text Connections / Central Ideas and Details / Command of Evidence / Inferences / Rhetorical Synthesis / Transitions / Boundaries / Form, Structure, and Sense',
          '- Math 스킬: Linear equations / Systems of equations / Linear functions / Linear inequalities / Nonlinear functions / Nonlinear equations / Equivalent expressions / Percentages / Ratios and rates / Two-variable data / One-variable data / Inference from sample statistics / Area and volume / Lines and angles / Circles / Right triangles',
          '',
          isRW
            ? '제약: 입력에 [최근 단어 학습] 항목이 없으면 어휘·단어를 절대 언급하지 않습니다.'
            : '제약: 이 테스트는 Math입니다. Writing·RW·단어·어휘를 절대 언급하지 않습니다.',
          '',
          '작성 규칙:',
          '- 전체 정답률이 아니라 모듈 흐름과 무너지는 지점을 중심으로 해석합니다.',
          '- 평균 정답률보다 10%p 이상 낮은 모듈을 구체적으로 지목합니다. 낮은 모듈이 없으면 지목하지 않습니다.',
          '- 커리큘럼 제목이 있으면 반드시 언급합니다.',
          '- [스킬별 성취]가 있으면 취약한 스킬 이름을 반드시 언급합니다. "N문항 중 M문항" 형식 사용.',
          '- [스터디홀 교차] 항목이 있으면 연습-검증 격차를 반드시 해석합니다.',
          '- [최근 단어 학습]이 있으면 최근 틀린 어휘 패턴을 RW 결과 해석에 연결합니다.',
          '  단어 이름을 나열하지 말고 "최근 연습한 어휘에서 혼동이 남아있는 패턴"처럼 씁니다.',
          '- [코치 피드백] 항목이 있으면 마지막 문장은 두 방향 중 오늘 결과와 교차하는 것을 선택합니다:',
          '  방향 A (수업→테스트센터): 수업에서 다룬 내용이 오늘 테스트 결과에서 확인됐다면 그 연결을 전달합니다.',
          '  방향 B (테스트센터→수업): 오늘 테스트에서 드러난 약점이 다음 수업에서 보완될 것이라는 방향으로 씁니다.',
          '- [코치 피드백]이 없으면 마지막 문장은 오늘 결과에서 도출한 방향입니다.',
          '- "~예정입니다" 대신 "~집중합니다", "~다룹니다", "~이어갑니다" 등 현재형으로 씁니다.',
          '- 금지: 데이터에 없는 행동 묘사, "~것이 중요합니다", "~로 보입니다", "~시사합니다".',
          `- ${sentenceGuide}`,
        ].join('\n'),
      },
      { role: 'user', content: userContent },
    ],
    max_tokens: 420, temperature: 0.3,
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
    { data: tcUnitAttempts },
    { data: dailyReports },
    { data: vocabEvents },
    { data: vocabExposed },
  ] = await Promise.all([
    prefetchNarrativeCache(profileId),
    supabaseSFv2.from('study_hall_session').select('id, started_at, ended_at').eq('user_id', profileId).not('ended_at', 'is', null).order('started_at', { ascending: false }).limit(60),
    supabaseSFv2.from('study_hall_unit_attempts').select('study_hall_session_id, is_correct, attempted_at, unit_id, chat_messages, time_spent_seconds, confidence_level').eq('student_id', profileId).order('attempted_at', { ascending: false }).limit(500),
    supabaseSFv2.from('test_center_lesson_attempts').select('id, test_center_session_id, score, total, status, lesson_id, curriculum_id').eq('student_id', profileId).not('score', 'is', null),
    supabaseSFv2.from('test_center_unit_attempts').select('test_lesson_attempt_id, unit_id, is_correct').eq('student_id', profileId).order('attempted_at', { ascending: false }).limit(2000),
    supabaseSFv2.from('daily_reports').select('report_date, report_md, status').eq('student_id', profileId).eq('status', 'sent').order('report_date', { ascending: false }).limit(30),
    supabaseSFv2.schema('vocab').from('events').select('entry_id, is_correct, prev_box, new_box, occurred_at').eq('subject_id', profileId).eq('kind', 'graded').order('occurred_at', { ascending: false }).limit(1000),
    supabaseSFv2.schema('vocab').from('events').select('entry_id').eq('subject_id', profileId).limit(10000),
  ]);

  const vocabExposedCount = new Set((vocabExposed ?? []).map(r => r.entry_id as string).filter(Boolean)).size;

  const shUnitIds = [...new Set((shAttempts ?? []).map(a => a.unit_id as string).filter(Boolean))];
  const tcUnitIds = [...new Set((tcUnitAttempts ?? []).map(a => a.unit_id as string).filter(Boolean))];
  const allUnitIds = [...new Set([...shUnitIds, ...tcUnitIds])];
  // Batch in chunks of 80 to stay under Supabase URL length limits (~3 KB per request)
  const UNIT_BATCH = 80;
  const unitBatchResults = await Promise.all(
    Array.from({ length: Math.ceil(allUnitIds.length / UNIT_BATCH) }, (_, i) =>
      supabaseSFv2.from('units').select('id, skill, domain').in('id', allUnitIds.slice(i * UNIT_BATCH, (i + 1) * UNIT_BATCH))
    )
  );
  const unitsMap = new Map<string, { skill: string; domain: string }>();
  for (const { data } of unitBatchResults) {
    for (const u of data ?? []) { if (u.id && u.skill) unitsMap.set(u.id, { skill: u.skill as string, domain: u.domain as string }); }
  }

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
    edenBySession.get(sid)!.push({ skill: meta.skill, isCorrect: !!a.is_correct, messages: msgs });
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

  // lesson attempt id → session id 매핑 (unit attempts 집계에 필요)
  const tcLessonAttemptToSession = new Map<string, string>();
  for (const a of tcAttempts ?? []) {
    const lessonAttemptId = a.id as string;
    const sid = a.test_center_session_id as string;
    if (lessonAttemptId && sid) tcLessonAttemptToSession.set(lessonAttemptId, sid);
  }

  // TC 세션별 스킬 집계
  const tcSkillsBySession = new Map<string, Map<string, { skill: string; domain: string; correct: number; total: number }>>();
  for (const a of tcUnitAttempts ?? []) {
    const lessonAttemptId = a.test_lesson_attempt_id as string;
    const uid = a.unit_id as string;
    if (!lessonAttemptId || !uid) continue;
    const sid = tcLessonAttemptToSession.get(lessonAttemptId);
    if (!sid || !tcSessionDateMap.has(sid)) continue;
    const meta = unitsMap.get(uid);
    if (!meta?.skill) continue;
    if (!tcSkillsBySession.has(sid)) tcSkillsBySession.set(sid, new Map());
    const skillMap = tcSkillsBySession.get(sid)!;
    if (!skillMap.has(meta.skill)) skillMap.set(meta.skill, { skill: meta.skill, domain: meta.domain, correct: 0, total: 0 });
    const sk = skillMap.get(meta.skill)!; sk.total++;
    if (a.is_correct) sk.correct++;
  }

  const tcBySession = new Map<string, { lessons: TestCenterLesson[]; curriculumTitle?: string; curriculumDomain?: string; skills: { skill: string; domain: string; correct: number; total: number }[] }>();
  for (const a of tcAttempts ?? []) {
    const sid = a.test_center_session_id as string;
    if (!tcSessionDateMap.has(sid)) continue;
    if (!tcBySession.has(sid)) {
      const currId = a.curriculum_id as string | undefined;
      const curriculum = currId ? curriculumMap.get(currId) : undefined;
      tcBySession.set(sid, { lessons: [], curriculumTitle: curriculum?.title, curriculumDomain: curriculum?.domain, skills: [] });
    }
    const lessonId = a.lesson_id as string | undefined;
    tcBySession.get(sid)!.lessons.push({ title: lessonId ? lessonTitleMap.get(lessonId) : undefined, score: a.score as number, total: a.total as number });
  }
  // 집계된 스킬 데이터를 tcBySession에 주입
  for (const [sid, skillMap] of tcSkillsBySession) {
    const session = tcBySession.get(sid);
    if (session) session.skills = Array.from(skillMap.values());
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

  // Lesson Feedback 조회 (coachFeedback 우선순위 결정에 필요해 SH/TC 내러티브 전에 실행)
  let lessonFeedbackEvents: { id: string; starts_at: string; assigned_teacher_id: string | null; feedback: string }[] = [];
  const { data: participantRowsEarly } = await supabaseSFv2
    .from('scheduled_event_participants').select('event_id').eq('user_id', profileId);
  if (participantRowsEarly?.length) {
    const earlyEventIds = participantRowsEarly.map(r => r.event_id as string);
    const { data: fbEvents } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at, assigned_teacher_id, feedback')
      .in('id', earlyEventIds)
      .eq('category', 'coach_room')
      .not('feedback', 'is', null)
      .neq('feedback', '')
      .order('starts_at', { ascending: false })
      .limit(60);
    lessonFeedbackEvents = (fbEvents ?? []) as typeof lessonFeedbackEvents;
  }

  // 날짜별 수업 피드백 조회 — targetDate 이전의 가장 최근 수업 피드백 반환
  // (수업은 SH/TC와 같은 날이 아니어도 되므로, 해당 날짜 이전 최근 것을 사용)
  function getCoachFeedbackForDate(targetDate: string): string | undefined {
    const lessonFb = lessonFeedbackEvents.find(e => toKSTDate(e.starts_at) <= targetDate);
    if (lessonFb?.feedback) return lessonFb.feedback.slice(0, COACH_FEEDBACK_MAX_CHARS) || undefined;
    const dr = (dailyReports ?? []).find(r => (r.report_date as string) <= targetDate);
    return ((dr?.report_md as string | null) ?? '').slice(0, COACH_FEEDBACK_MAX_CHARS) || undefined;
  }

  // Vocab 집계 (getVocabContextForDate에서 참조하므로 함수 정의 전에 선언)
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

  // Vocab context: 날짜별 최근 7일 누적 (missedTerms, masteredTerms)
  function getVocabContextForDate(targetDate: string): VocabContext | undefined {
    const vocabDatesSorted = [...vocaByDate.entries()].sort(([a], [b]) => a.localeCompare(b));
    const cutoff = new Date(targetDate);
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const missedSet = new Set<string>();
    const masteredSet = new Set<string>();
    for (const [d, agg] of vocabDatesSorted) {
      if (d < cutoffStr || d > targetDate) continue;
      for (const id of agg.missedIds) { const t = termMap.get(id); if (t) missedSet.add(t); }
      for (const id of agg.masteredIds) { const t = termMap.get(id); if (t) masteredSet.add(t); }
    }
    if (missedSet.size === 0 && masteredSet.size === 0) return undefined;
    return {
      missedTerms: [...missedSet].slice(0, VOCAB_MAX_MISSED),
      masteredTerms: [...masteredSet].slice(0, 3),
    };
  }

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

    const vocabContext = getVocabContextForDate(date);
    const coachFeedback = getCoachFeedbackForDate(date);
    const cacheInput = {
      durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy,
      skills: [...skills].sort((a, b) => a.skill.localeCompare(b.skill)).map(s => ({ skill: s.skill, correct: s.correct, total: s.total })),
      tcCrossRef, coachFeedback, edenInsight, vocabContext,
    };
    const inputHash = hashInput(cacheInput);
    let narrative = lookupCache(narrativeCache, date, 'study_hall', inputHash);
    if (!narrative) {
      narrative = stats.totalProblems > 0
        ? await generateStudyHallNarrative({ durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy, skills }, tcCrossRef.length ? tcCrossRef : undefined, coachFeedback, edenInsight, vocabContext)
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

    const vocabContextTc = getVocabContextForDate(date);
    const coachFeedbackTc = getCoachFeedbackForDate(date);
    const tcSkills = data.skills.length > 0 ? data.skills : undefined;
    const cacheInput = {
      curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain,
      totalScore, totalProblems, lessons: data.lessons.map(l => ({ title: l.title, score: l.score, total: l.total })),
      skills: tcSkills ? [...tcSkills].sort((a, b) => a.skill.localeCompare(b.skill)).map(s => ({ skill: s.skill, correct: s.correct, total: s.total })) : undefined,
      shCrossRef, coachFeedback: coachFeedbackTc, vocabContext: vocabContextTc,
    };
    const inputHash = hashInput(cacheInput);
    let narrative: string | undefined;
    if (totalProblems > 0) {
      narrative = lookupCache(narrativeCache, date, 'test_center', inputHash) ?? undefined;
      if (!narrative) {
        narrative = await generateTestCenterNarrative(
          { curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain, totalScore, totalProblems, lessons: data.lessons, skills: tcSkills },
          shCrossRef.length ? shCrossRef : undefined, coachFeedbackTc, vocabContextTc,
        );
        await setCachedNarrative(profileId, date, 'test_center', inputHash, narrative);
      }
    }
    getOrCreate(date).items.push({ type: 'test_center', curriculumTitle: data.curriculumTitle, curriculumDomain: data.curriculumDomain, lessons: data.lessons, totalScore, totalProblems, aiNarrative: narrative, skills: tcSkills } satisfies TestCenterDay);
  }));

  // Daily Reports
  for (const dr of dailyReports ?? []) {
    getOrCreate(dr.report_date as string).items.push({ type: 'daily_report', reportMd: dr.report_md as string } satisfies DailyReportDay);
  }

  // Lesson Feedback — lessonFeedbackEvents는 위에서 coachFeedback 계산 시 이미 조회됨
  if (lessonFeedbackEvents.length) {
    const teacherIds = [...new Set(lessonFeedbackEvents.map(e => e.assigned_teacher_id).filter(Boolean))] as string[];
    const { data: teacherProfiles } = teacherIds.length
      ? await supabaseSFv2.from('profiles').select('id, full_name').in('id', teacherIds)
      : { data: [] };
    const teacherMap = new Map<string, string>();
    for (const p of teacherProfiles ?? []) { if (p.id && p.full_name) teacherMap.set(p.id as string, p.full_name as string); }

    for (const ev of lessonFeedbackEvents) {
      const date = toKSTDate(ev.starts_at);
      const coachName = ev.assigned_teacher_id ? teacherMap.get(ev.assigned_teacher_id) : undefined;
      getOrCreate(date).items.push({
        type: 'lesson_feedback',
        eventId: ev.id,
        startsAt: ev.starts_at,
        coachName,
        feedback: ev.feedback,
      } satisfies LessonFeedbackDay);
    }
  }

  await Promise.all(Array.from(vocaByDate.entries()).map(async ([date, agg]) => {
    const wordCount = agg.entryIds.size;
    const accuracy = agg.gradedCount > 0 ? Math.round((agg.correctCount / agg.gradedCount) * 100) : 0;
    const masteredCount = agg.masteredIds.size;
    const missedTerms = [...new Set(agg.missedIds)].map(id => termMap.get(id)).filter((t): t is string => Boolean(t)).slice(0, VOCAB_MAX_MISSED);
    const coachFeedbackVoca = getCoachFeedbackForDate(date);
    const cacheInput = { wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms: [...missedTerms].sort(), coachFeedback: coachFeedbackVoca };
    const inputHash = hashInput(cacheInput);
    let narrative = lookupCache(narrativeCache, date, 'voca', inputHash);
    if (!narrative) {
      narrative = await generateVocaNarrative({ wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms }, coachFeedbackVoca);
      await setCachedNarrative(profileId, date, 'voca', inputHash, narrative);
    }
    getOrCreate(date).items.push({ type: 'voca', wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms, aiNarrative: narrative } satisfies VocaDay);
  }));

  const days = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  return { reportVersion: 4, days, vocabExposedCount };
}
