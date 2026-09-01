/**
 * 녹음 이름으로 통화 종류를 가른다 (REQ-103).
 *
 * `call_transcripts`에는 세 갈래가 섞여 있다 — 신규 세일즈 콜, 재결제 콜, 그리고
 * 운영 콜(코치변경·스케쥴 조율·환불·동기부여). 전환 예측 pack이 배워야 하는 것은
 * 첫 번째뿐이다. 재결제는 자체 라벨을 가진 별도 퍼널의 사건이고(재결제 칸반,
 * types/crm.ts), 운영 콜에는 세일즈 신호가 없다.
 *
 * 종류를 알려주는 유일한 신호가 상담자가 손으로 붙인 녹음 이름이므로, 규칙은
 * 실제 이름에서 귀납했다. 케이스는 classify-call.test.ts에 원본 그대로 있다.
 */
export type CallKind = 'new_sales' | 'renewal' | 'winback' | 'ops' | 'unknown';

/** 코퍼스에 넣는 종류. 나머지는 학습에서 뺀다. */
export const CORPUS_KINDS: ReadonlyArray<CallKind> = ['new_sales', 'unknown'];

const OPS = ['코치변경', '스케쥴', '스케줄', '환불', '동기부여', '온보딩'];

/**
 * 세일즈가 아닌 쪽이 이긴다. `권지안_코치변경 및 재결제`처럼 두 성격이 한 통화에
 * 섞이면 학습에서 빼는 편이 낫다 — 잘못 넣은 통화는 라벨과 무관한 대화를 전환 신호로
 * 가르치지만, 빠뜨린 통화는 표본이 하나 주는 것으로 끝난다.
 */
export function classifyCall(recordingName: string | null | undefined): CallKind {
  const name = (recordingName ?? '').replace(/\s+/g, '');
  if (!name) return 'unknown';
  if (OPS.some((k) => name.includes(k))) return 'ops';
  if (name.includes('이탈')) return 'winback';
  if (name.includes('재결제') || name.includes('연장')) return 'renewal';
  if (name.includes('세일즈')) return 'new_sales';
  return 'unknown';
}
