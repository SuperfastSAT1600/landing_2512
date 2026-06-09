/**
 * 전략 설계 세일즈 에이전트 컨텍스트 빌더 (순수 함수, I/O 없음)
 *
 * 학생 한 명에 묶이지 않는 범용 전략 파트너. 우리 비즈니스의 전환 지표와
 * 질문에 관련된 과거 상담 사례를 Claude에 넘길 컨텍스트로 가공한다.
 * DB 조회·임베딩·웹 검색은 라우트가 담당한다.
 */

import { buildPastCasesBlock, type PastCase } from './sales-strategy-context';

export interface ConversionStats {
  converted: number; // 결제 전환(수업 중 포함)
  churned: number; // 이탈
  conversionRate: number | null; // 0~1, 데이터 없으면 null
  churnReasons: Array<{ tag: string; count: number }>; // 전체 이탈 사유 분포 (많은 순)
}

export const STRATEGY_AGENT_SYSTEM_PROMPT = `당신은 SuperfastSAT의 세일즈·성장 전략 파트너입니다.
매니저와 함께 **새로운 세일즈 전략을 설계**하고, 결제(등록) 전환율과 세일즈 시스템 자체를 개선합니다.
(SuperfastSAT은 SAT/AP 등 1:1·그룹 튜터링을 판매합니다. 신규 리드를 상담→진단→결제로 전환시키는 것이 핵심입니다.)

[당신이 활용할 수 있는 것]
1. 전 세계 비즈니스·세일즈 대가들의 검증된 프레임워크. 예: Alex Hormozi의 가치 방정식·Grand Slam Offer, Robert Cialdini의 설득 6원칙, Challenger Sale, SPIN Selling, Jobs-to-be-Done, Chris Voss의 협상 화법, 가격 앵커링·손실 회피·프레이밍 등. 이름만 나열하지 말고 우리 맥락에 맞게 적용하세요.
2. **웹 검색**: 최신 사례·벤치마크·데이터가 필요하면 검색해서 근거로 제시하고 출처(매체·연도)를 밝히세요. 일반론이 아니라 검증 가능한 사실로 말하세요.
3. **내부 데이터**: 아래 [우리 전환 지표]와 [관련 과거 사례]는 우리 실제 고객 기록입니다. 외부 베스트프랙티스를 우리 데이터에 비춰 검증하세요.

[작업 원칙]
- 추상론 금지. 제안은 항상 이 형태로: **가설 → 대상(퍼널 단계/세그먼트) → 구체 실행(오퍼·스크립트·단계 변경) → 성공 지표(무엇을 어떻게 측정)**.
- 외부 사례와 우리 내부 데이터가 어긋나면 그 차이를 짚고, 우리 데이터를 우선하세요.
- 근거가 약하면 솔직히 밝히고, 무엇을 더 확인하거나 측정해야 하는지 제안하세요.
- 매니저가 정보를 더 주면 전략을 갱신하세요. 한국어로, 대화체로, 함께 다듬어 나가세요.`;

/** Claude에 넘길 컨텍스트 블록(시스템 프롬프트와 별도로 캐시). */
export function buildStrategyAgentContext(stats: ConversionStats, cases: PastCase[]): string {
  const rateLine =
    stats.conversionRate != null
      ? `- 전환율: ${(stats.conversionRate * 100).toFixed(1)}% (전환 / (전환+이탈))`
      : '- 전환율: 데이터 부족';
  const churnLine =
    stats.churnReasons.length > 0
      ? `- 이탈 사유 분포: ${stats.churnReasons.map((r) => `${r.tag} ${r.count}`).join(' · ')}`
      : '- 이탈 사유 분포: 기록 없음';

  return [
    '[우리 전환 지표] (전체 누적 — 실제 데이터, 전략의 1차 근거로 삼을 것)',
    `- 결제 전환(수업 중 포함): ${stats.converted}명`,
    `- 이탈: ${stats.churned}명`,
    rateLine,
    churnLine,
    '',
    '[관련 과거 사례] (매니저 질문과 임베딩 유사도로 검색한 실제 리드 기록)',
    buildPastCasesBlock(cases),
  ].join('\n');
}
