const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

// 4개 문서의 핵심 기준 (빌드 타임 임베드)
const PERSONA_CRITERIA = `
[페르소나 기준]
SuperfastSAT는 SAT를 매 시험마다 직접 응시하고, College Board 데이터를 직접 분석하며, 실제 수강생 반응을 매일 관찰하는 코치 팀이다.
독자가 느껴야 하는 것 5가지:
1. "이 사람 진짜 똑똑하구나" — 생각하는 방식, 남들이 넘어가는 디테일, 인과를 역방향으로 짚기
2. "이 시험에 집요하게 파고드는구나" — 직접 수집한 데이터, 수치 없으면 주장 금지
3. "디테일하게 보면서 단순하게 만드는구나" — 디테일과 프레임워크 둘 다
4. "잘 가르치기 위해 연구하는 사람들이구나" — 독자가 막히는 지점을 먼저 안다
5. "나도 저렇게 생각하고 싶다" — 지적 동경, 코치의 사고 과정이 보인다
`;

const VOICE_CRITERIA = `
[Voice 기준]
- 합니다/입니다 체 전체. ~다/~이다 종결 금지.
- 한 문단 2~4줄. 강조 문장은 단독 줄 + 앞뒤 빈 줄.
- 1인칭 고백형 금지. 독자 호칭: "학생" 또는 "학생, 학부모님"
- 금지 표현: "살펴보겠습니다", "중요합니다", "이를 통해", "따라서" 연속, "정리하면", "결론적으로"
- 오프닝은 매 포스팅마다 다른 진입점. 같은 장면 구조(상담 장면 등) 반복 금지.
- 수치 없는 주장 금지. 데이터는 "무엇이 나올 것인가"가 아니라 "어떻게 설계되었는가"에 사용.
`;

const TEACHING_CRITERIA = `
[학습법 기준 — SuperfastSAT 고유 전략]
현재 문서화된 처방형 전략:
- Confidence Level 훈련: 문제마다 확신도 기록 → 예상 틀린 수 vs 실제 틀린 수 추적
- 마지막 1~2분 전략: 시험 1주일 전부터 미리 정해두기
- 시험 후 즉시 기록: 어렵거나 틀렸을 것 같은 문제의 Skill 기록
- Desmos 교차 검증: 두 번 모두 Desmos 금지, 첫 풀이와 다른 방법으로 검증
- M1/M2 시간 관리: 난이도별 배분 시간 설계 (super easy 5초, hard 150초 등)
- SAT 성적표 한계: 틀린 문항·배점 없음, Domain 수준만 공개
`;

const SKILL_CRITERIA = `
[Skill(프롬프트) 기준]
- 포스팅 유형 5종: 현상형·전략형·개념형·비교형·오류수정형
- awareness_flow 기반 구조: 독자의 인식이 단계적으로 이동해야 함
- 메커니즘 설명 필수: "왜 그런가"의 인과가 반드시 한 곳에 포함
- 독자 수준 전제: SAT 기초 설명 금지, 이미 아는 독자 대상
- H2 섹션 최소 2개, 랜딩은 섹션당 최소 3문단(주장→예시→행동)
- 사실 주장에는 반드시 데이터 또는 메커니즘 중 하나 필수
`;

async function qwenAdvise(prompt: string): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return '(DASHSCOPE_API_KEY 없음)';
  const res = await fetch(QWEN_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen-plus',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function adviseBlogDraft(
  title: string,
  ghostMarkdown: string,
): Promise<string> {
  return qwenAdvise(`당신은 SuperfastSAT 블로그 시스템의 첨삭 에이전트입니다.
이 블로그는 4개 문서(페르소나, Voice, 학습법, Skill/프롬프트)를 기반으로 AI가 작성합니다.
방금 작성된 포스팅을 분석해서, 어떤 문서가 어떻게 보강되어야 하는지 구체적인 개선 의견을 주세요.

${PERSONA_CRITERIA}
${VOICE_CRITERIA}
${TEACHING_CRITERIA}
${SKILL_CRITERIA}

---
포스팅 제목: ${title}
포스팅 본문:
${ghostMarkdown.slice(0, 4000)}
---

분석 출력 형식 (반드시 이 형식으로):

🧑 **페르소나**
이 포스팅에서 페르소나가 잘 드러난 부분과 부족한 부분. 문서에 추가하거나 수정해야 할 내용을 1~2줄로.

🗣️ **Voice**
이 포스팅에서 발견된 voice 패턴 중 문서에 추가할 금지/허용 표현. 없으면 "이상 없음".

📚 **학습법**
이 포스팅 주제와 관련해서 teaching-content.md에 추가되어야 할 SuperfastSAT 고유 전략이나 방법론. 구체적으로 어떤 섹션에 무엇을 추가해야 하는지.

⚙️ **Skill(프롬프트)**
이 포스팅을 쓰면서 드러난 프롬프트 규칙의 공백. blog-prompts.ts에 추가하거나 수정해야 할 규칙.`);
}
