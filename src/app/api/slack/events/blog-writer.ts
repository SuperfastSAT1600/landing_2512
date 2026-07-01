import Anthropic from '@anthropic-ai/sdk';

export type Topic = { n?: number; title: string; rationale: string; point: string };

const SKELETON_SYSTEM = `당신은 SuperfastSAT 블로그 포스팅 골격(Skeleton) 설계 전문가입니다.
주어진 주제로 아래 양식을 JSON으로 채워 반환하세요.

## 포스팅 유형 5종
- 현상형: 독자가 모르는 패턴/사실을 데이터로 보여줄 때. 끝맺음=구체 예시(HOW 없음). 메커니즘 주어=CB/출제설계/문법규칙 (학생 주어 금지).
- 전략형: 공부법/풀이법 제시. 끝맺음=실전 체크리스트.
- 개념형: 헷갈리는 개념 구분. 끝맺음=판단 기준 1줄.
- 비교형: A vs B 선택 기준. 끝맺음=독자 자기 판단 유도.
- 오류수정형: 자주 하는 실수 교정. 끝맺음=확인 체크리스트.

## 반환 JSON 형식
{
  "type": "현상형|전략형|개념형|비교형|오류수정형",
  "confusion_scene": "독자가 실제로 겪는 구체적 혼란 장면 1~2줄 (시험 중 특정 선택지를 고른 순간 수준의 구체성)",
  "opening_claim": "혼란 장면을 뒤집는 한 문장 (데이터 또는 메커니즘 기반)",
  "reader_delta": "이 글을 읽은 독자는 [구체 행동 동사]할 것이다 — '알게 된다' '이해한다' 금지",
  "sections": [
    {"title": "H2 섹션 제목", "arc": "C/R/E/I 중 포함 단계 2개 이상", "first_sentence_type": "Claim|Tension", "note": "오프닝 전진 방식"}
  ],
  "reversals": [
    "섹션명: 독자는 X라고 생각하지만, 실제로는 Y이다 (최소 2개)",
    "섹션명: 독자는 X라고 생각하지만, 실제로는 Y이다"
  ],
  "objections": [
    {"objection": "그래도 X이지 않나?", "closed_in": "섹션명"},
    {"objection": "그래도 Y이지 않나?", "closed_in": "섹션명"},
    {"objection": "그래도 Z이지 않나?", "closed_in": "섹션명"}
  ],
  "closing_type": "구체 예시|실전 체크리스트|판단 기준 1줄|독자 자기 판단|확인 체크리스트"
}`;

const PROSE_SYSTEM = `당신은 SuperfastSAT 블로그 작성 전문가입니다.
주어진 골격(Skeleton JSON)을 따라 공식 블로그·랜딩 페이지용 포스팅을 작성합니다.

## 절대 문체 규칙
- 합니다/입니다 체 전체 준수. ~다/~이다 종결 금지.
- 줄바꿈 리듬: 문장 1~2개 후 반드시 빈 줄. 강조 문장은 단독 줄+앞뒤 빈 줄. 3문장 이상 이어진 단락 절대 금지.
- 1인칭 고백형 금지: "저도 처음엔 그랬습니다" 등.
- 독자 호칭: "학생" 또는 "학생, 학부모님"

## 금지 표현 (포스팅 전체)
"살펴보겠습니다" / "중요합니다" / "~해야 합니다" 반복 / "실전에서는" / "이번 섹션에서는 X에 대해 알아보겠습니다"

## 현상형일 때 추가 금지
메커니즘 섹션 주어가 "학생"이면 안 됩니다. 반드시 College Board / 출제 설계 / 문법 규칙이 주어.

## 오프닝 구조 (이 순서 고정)
1. TL;DR 박스 (도입부 바로 다음): "> **핵심 요약**: 40~60자 핵심 메시지"
2. 이런 분들에게 도움이 됩니다: 독자 유형 3~5개 글머리 기호
3. 목차: H2 헤딩 1:1 매핑

## 섹션 규칙
- 각 H2 섹션은 골격의 arc에 지정된 C→R→E→I 단계 반드시 포함.
- 섹션 첫 문장: Claim 또는 Tension
- 섹션 마지막 문장: Bridge(다음 예고) 또는 Resolution(결론)
- 골격의 reversals를 해당 섹션에 포함. ("사실은 ~입니다." / "그런데 데이터를 보면 다릅니다.")
- 골격의 objections를 해당 섹션에서 닫음.

## FAQ 섹션 (GEO 최적화 — 필수)
H2 의문형 제목 3~5개. 각 답변 첫 문장이 질문에 직접 답해야 합니다.

## 끝맺음
골격의 closing_type에 따라 작성. 마지막 문장: "이것 기억하세요."

## CTA (랜딩/고스트용)
끝맺음 직후 1회만. "SuperfastSAT에서 [관련 학습]을 시작해보세요."

## 글자 수
5,000~8,000자. 너무 짧으면 각 섹션을 더 깊이 전개합니다.`;

async function generateSkeleton(
  topic: Topic, client: Anthropic
): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: SKELETON_SYSTEM,
    messages: [{
      role: 'user',
      content: `주제: ${topic.title}\n근거: ${topic.rationale || '없음'}\n핵심 포인트: ${topic.point || '없음'}\n\n골격 JSON을 반환해주세요.`,
    }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  try { return JSON.parse(jsonMatch?.[0] ?? '{}'); } catch { return {}; }
}

export async function writeBlog(topic: Topic): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const skeleton = await generateSkeleton(topic, client);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: PROSE_SYSTEM,
    messages: [{
      role: 'user',
      content: `주제: ${topic.title}\n\n골격(Skeleton):\n${JSON.stringify(skeleton, null, 2)}\n\n위 골격을 따라 마크다운으로 작성해주세요. 합니다/입니다 체, 줄바꿈 리듬, 오프닝 구조(TL;DR→독자유형→목차), FAQ섹션, 끝맺음("이것 기억하세요.") 모두 포함.`,
    }],
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}
