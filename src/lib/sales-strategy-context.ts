/**
 * 세일즈 전략 AI 컨텍스트 빌더 (순수 함수, I/O 없음)
 *
 * 현재 신규 리드의 기록과 유사 과거 학생들의 결과(결제 전환/이탈)를 Claude에 넘길
 * 프롬프트 컨텍스트 문자열로 가공한다. DB 조회·임베딩·API 호출은 라우트가 담당한다.
 */

/** 컨텍스트 구성에 필요한 학생 필드 (students 테이블의 부분집합) */
export interface StrategyStudent {
  id: string;
  name: string;
  grade?: string | null;
  school_type?: string | null;
  desired_subjects?: string | null;
  previous_rw_score?: number | null;
  previous_math_score?: number | null;
  target_score?: number | null;
  churn_type?: string | null;
  churn_tag?: string | null;
  inquiry_channel?: string | null;
  traffic_source?: string | null;
  lead_status?: string | null;
  funnel_stage?: string | null;
  consultation_timeline?: Array<{ raw_memo?: string; ai_purified?: string; created_at?: string }> | null;
  reactivation_log?: Array<{ strategy?: string; outcome?: string }> | null;
}

export interface PastCase {
  student: StrategyStudent;
  similarity: number;
}

export type Outcome = 'converted' | 'churned' | 'in_progress';

const OUTCOME_LABEL: Record<Outcome, string> = {
  converted: '결제 전환',
  churned: '이탈',
  in_progress: '진행 중',
};

/** lead_status/funnel_stage로 학생의 결과를 판정. */
export function outcomeOf(s: StrategyStudent): Outcome {
  if (s.lead_status === 'enrolled' || s.funnel_stage === '8') return 'converted';
  if (s.funnel_stage === 'churned' || s.lead_status === 'inactive' || s.lead_status === 'reactivating') {
    return 'churned';
  }
  return 'in_progress';
}

function scoreLine(s: StrategyStudent): string | null {
  const rw = s.previous_rw_score;
  const math = s.previous_math_score;
  if (rw != null && math != null) return `직전 점수: RW ${rw} / Math ${math} (합계 ${rw + math})`;
  if (rw != null) return `직전 RW: ${rw}`;
  if (math != null) return `직전 Math: ${math}`;
  return null;
}

/** 상담 기록을 시간순으로 정렬해 "[날짜] 메모" 줄 배열로. 내부 전략 판단용이라 raw_memo 우선. */
function memoLines(s: StrategyStudent, limit?: number): string[] {
  const sorted = (s.consultation_timeline ?? [])
    .slice()
    .sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1));
  const lines = sorted
    .map((e) => {
      const date = e.created_at?.slice(0, 10) ?? '';
      const memo = (e.raw_memo ?? e.ai_purified ?? '').trim();
      return memo ? `  [${date}] ${memo}` : null;
    })
    .filter((l): l is string => l !== null);
  return limit != null ? lines.slice(-limit) : lines;
}

/** 현재 신규 리드의 전체 프로필 블록. */
export function buildCurrentStudentBlock(s: StrategyStudent): string {
  const lines: string[] = [];
  lines.push(`이름: ${s.name}`);
  const meta = [s.grade, s.school_type, s.desired_subjects].filter(Boolean).join(' | ');
  if (meta) lines.push(meta);

  const score = scoreLine(s);
  if (score) lines.push(score);
  if (s.target_score != null) lines.push(`목표 점수: ${s.target_score}`);

  const inflow = [s.traffic_source && `유입 ${s.traffic_source}`, s.inquiry_channel && `채널 ${s.inquiry_channel}`]
    .filter(Boolean)
    .join(' / ');
  if (inflow) lines.push(inflow);

  lines.push(`현재 단계: ${s.funnel_stage ?? '-'} (${OUTCOME_LABEL[outcomeOf(s)]})`);

  if (s.churn_type || s.churn_tag) {
    lines.push(`이탈 이력: ${s.churn_type ?? '-'} / ${s.churn_tag ?? '-'}`);
  }

  const memos = memoLines(s);
  if (memos.length > 0) {
    lines.push('상담 기록:');
    lines.push(...memos);
  } else {
    lines.push('상담 기록: (없음)');
  }

  const reacts = (s.reactivation_log ?? [])
    .map((r) => `${r.strategy ?? ''}(${r.outcome ?? ''})`)
    .filter((t) => t !== '()')
    .join(', ');
  if (reacts) lines.push(`재활성화 시도: ${reacts}`);

  return lines.join('\n');
}

/** 유사 과거 사례 블록. 각 사례를 결과 라벨 + 유사도 + 상담 요약으로 압축. */
export function buildPastCasesBlock(cases: PastCase[]): string {
  if (cases.length === 0) {
    return '유사한 과거 사례를 찾지 못했습니다. 현재 학생 정보만으로 전략을 제안하세요.';
  }

  return cases
    .map((c, i) => {
      const s = c.student;
      const outcome = OUTCOME_LABEL[outcomeOf(s)];
      const pct = Math.round(c.similarity * 100);
      const header = `사례 ${i + 1} [${outcome}] (유사도 ${pct}%) — ${s.name} | ${s.grade ?? '-'} | ${s.desired_subjects ?? '-'}`;
      const lines = [header];

      const score = scoreLine(s);
      if (score) lines.push(`  ${score}`);
      if (outcomeOf(s) === 'churned' && (s.churn_type || s.churn_tag)) {
        lines.push(`  이탈 사유: ${s.churn_type ?? '-'} / ${s.churn_tag ?? '-'}`);
      }
      const memos = memoLines(s, 4);
      if (memos.length > 0) {
        lines.push('  상담 요약:');
        lines.push(...memos.map((m) => `  ${m.trim()}`));
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

export const SALES_STRATEGY_SYSTEM_PROMPT = `당신은 SuperfastSAT의 시니어 세일즈 전략가입니다.
SAT 튜터링 신규 리드를 **결제(등록)로 전환**시키기 위한 세일즈 전략을 매니저와 자연어로 논의하고 추천합니다.

당신에게는 다음이 주어집니다:
- [현재 학생]: 지금 세일즈 중인 신규 리드의 전체 기록(상담 메모, 점수, 목표, 유입, 단계)
- [유사 과거 사례]: 임베딩 유사도로 찾은 과거 학생들. 각 사례에 결과(결제 전환 / 이탈)와 상담 요약이 붙어 있습니다.

작업 원칙:
- 과거 "전환" 사례에서 통한 접근과 "이탈" 사례에서 실패한 지점을 대조해 근거 있는 전략을 제시하세요.
- 추측이 아니라 주어진 기록에 근거해 말하세요. 근거가 약하면 솔직히 밝히고 무엇을 더 확인해야 하는지 물으세요.
- 추상적 조언("신뢰를 쌓으세요") 대신, 이 학생에게 바로 쓸 수 있는 **구체적 행동·메시지·다음 단계**를 제안하세요.
- 가격 민감·점수 불안·경쟁사 비교 등 이탈 위험 신호를 짚고 대응 화법을 제시하세요.
- 매니저가 추가 정보를 주면 그에 맞춰 전략을 갱신하세요. 대화체로, 한국어로 답하세요.`;

/** Claude에 넘길 컨텍스트 user-context 블록(시스템 프롬프트와 별도로 캐시) */
export function buildContextBlock(current: StrategyStudent, cases: PastCase[]): string {
  return [
    '[현재 학생]',
    buildCurrentStudentBlock(current),
    '',
    '[유사 과거 사례]',
    buildPastCasesBlock(cases),
  ].join('\n');
}
