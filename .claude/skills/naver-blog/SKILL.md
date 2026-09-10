---
name: naver-blog
description: "네이버 블로그 포스팅 작성 전문 스킬. Markdown 기반 wiki/blog 구조에서 blueprint.md를 받아 네이버 플랫폼에 맞춘 스타일링·줄바꿈·해시태그·형식 요소를 적용하여 최종 md 파일을 생성합니다."
---

# 네이버 블로그 포스팅 스킬 (Markdown 기반)

## 개요

이 스킬은 Markdown 기반 블로그 포스팅 워크플로우에서 **네이버 블로그 전용 변환**을 담당합니다.

**입력**: `wiki/blog/{date-slug}/blueprint.md` (플랫폼 중립 핵심 콘텐츠)
**출력**: `content/posts/{date-slug}-naver.md` (네이버 스타일 적용)

---

## 브랜드 보이스 페르소나

이 스킬로 쓰는 모든 글은 `.claude/skills/superfastsat-persona.md`를 **먼저 읽고** 시작한다.

핵심만 요약:
- 화자는 **"저희"** (SuperfastSAT 코치 팀 — 매 시험 직접 응시, College Board 데이터 직접 분석)
- 글은 **구체적인 장면·관찰·데이터**에서 시작한다. 주제 선언으로 시작하지 않는다
- 전문가로서 **직선적으로** 말한다 — "~할 수 있습니다", "~가 중요합니다" 금지
- 네이버 특성상 문장은 짧고 끊어 읽기 쉽게, 그러나 **논리 전개는 동일하게** 유지한다
- 스킬 분석 포스팅은 `master_sat_ontology_v3.jsonl` 데이터 없이 쓰지 않는다

---

## 핵심 철학

설득력 있는 포스팅을 쓰려면 구조보다 이 세 가지가 먼저 갖춰져야 한다.

**1. 글쓴이가 먼저 설득되어 있어야 한다**
"이걸 알았을 때 나는 왜 놀랐는가"가 분명해야 한다. 발견의 경험이 없으면 구조가 그것을 대신하려 하고, 독자는 그걸 느낀다. 이 경험이 흐릿하면 글을 쓰기 전에 데이터를 다시 열어야 한다.

**2. 말하려는 것이 하나여야 한다**
설득은 독자의 생각을 A에서 B로 옮기는 일이다. 주장이 하나로 정확해질수록 순서는 자연스럽게 따라온다. 주장이 둘이면 글이 두 편이다.

**3. 독자가 지금 어디 있는지 알아야 한다**
"이 독자가 지금 무엇을 믿고 있고, 무엇을 틀리게 알고 있는가." 이게 정확하면 무엇을 먼저 말해야 할지가 자명해진다.

형식 요소(독자 가정, 목차, 요약)는 본문이 완성된 후 역산한다.

---

## blueprint.md → naver.md 변환 규칙

### 1. 파일 구조

blueprint.md는 다음 구조를 갖습니다:

```yaml
---
title: 포스팅 제목
date: 2026-05-18
slug: 포스팅-슬러그
skill: Inference  # College Board 공식 스킬명 (번역 금지)
domain: Reading and Writing
type: 현상형 | 전략형 | 개념형 | 비교형 | 오류수정형
tags: [tag1, tag2, ...]
---

# H1 제목 (본문 제목과 동일)

:::reader-profile
- 독자 유형 1
- 독자 유형 2
:::

:::quick-summary
핵심 발견 1
핵심 발견 2
:::

## H2 섹션 1
본문 내용...

## H2 섹션 N
본문 내용...

## 결론
결론 내용...
```

### 2. Markdown 마커 변환 (blueprint → naver)

blueprint.md의 특수 마커를 네이버 플랫폼에 맞게 변환합니다.

#### :::reader-profile::: → ## 이런 분들에게 도움을 드리고자 썼습니다.

**blueprint 형식:**
```
:::reader-profile
- 독자 유형 1
- 독자 유형 2
:::
```

**naver 변환:**
```markdown
## 이런 분들에게 도움을 드리고자 썼습니다.

- 독자 유형 1
- 독자 유형 2
```

규칙:
- 글머리 기호 유지
- "~이 궁금한 학생", "~로 고민 중인 학생" 형식 선호
- 3~5개 항목

#### :::quick-summary::: → ## 바쁘시면 이것만 보세요!

**blueprint 형식:**
```
:::quick-summary
핵심 발견 1
핵심 발견 2
:::
```

**naver 변환:**
```markdown
## 바쁘시면 이것만 보세요!

- 핵심 발견 1
- 핵심 발견 2
```

규칙:
- 글머리 기호로 변환
- 2~3개 항목 (본문 읽지 않아도 결론 알 수 있게)
- 각 항목은 한 문장

### 3. 목차 생성 및 배치

blueprint.md의 모든 H2 헤딩을 추출하여 목차 구성:

**위치**: "바쁘시면 이것만 보세요!" 직후
**형식**: 
```markdown
## 목차

1. 섹션 1 제목
2. 섹션 2 제목
3. 섹션 N 제목
```

규칙:
- H2 헤딩 텍스트 1:1 매핑
- 번호 형식 (1. 2. 3. ...)
- 본문 H2 순서와 동일

### 4. 본문 스타일 규칙

#### 문체

- **합니다/입니다 체** 전체 준수. ~다/~이다 금지.
- **독자 호칭**: "학생" (학부모 포함 시 "학생, 학부모님")
- **1인칭 고백형 금지**: "저도 처음엔 그랬습니다" → 배코치 전문성 훼손

#### 줄바꿈 리듬 (네이버 트레이드마크)

네이버 포스팅의 가독성과 시각적 리듬은 **줄바꿈 패턴**으로 결정됩니다.

**규칙:**
- 한 문단 = **문장 1~2개 후 반드시 빈 줄**
- 강조 문장 = **단독 줄 + 앞뒤 빈 줄**
- **3문장 이상 이어진 단락 금지**

**예시 (올바름):**
```markdown
최근 연구에 따르면 monarch butterflies는 매년 북미 전역을 이동합니다.

이동 메커니즘은 이렇습니다.

연구자들은 monarchs가 이동 경로 내비게이션을 위해 genetic memory와 environmental cues의 조합에 의존한다는 것을 발견했습니다.

**따라서 butterflies의 이동 능력은 선천적 본능과 환경 신호의 상호작용으로 이루어진 것입니다.**

이것이 이 포스팅의 핵심입니다.
```

**예시 (금지):**
```markdown
최근 연구에 따르면 monarch butterflies는 매년 북미 전역을 이동합니다. 이동 메커니즘은 이렇습니다. 연구자들은 monarchs가 이동 경로 내비게이션을 위해 genetic memory와 environmental cues의 조합에 의존한다는 것을 발견했습니다.
```

#### 코드 블록 (Sequence 라벨)

blueprint.md에 포함된 ```sequence 블록은 그대로 유지:

```
```sequence
[INTRODUCE]
문장 내용...

[EVIDENCE]
문장 내용...
```
```

코드 블록 앞뒤 공백:
- 블록 이전: 빈 줄 1개
- 블록 이후: 빈 줄 1개

### 5. 네이버 고정 포스팅 구조 (순서 필수)

최종 naver.md는 아래 순서로 구성됩니다:

```
① YAML frontmatter (선택적, 네이버 메타)
② 제목 (H1)
③ "이런 분들에게 도움을 드리고자 썼습니다." (## H2)
④ 목차 (## H2)
⑤ "바쁘시면 이것만 보세요!" (## H2)
⑥ 본문 (H2 섹션들)
⑦ 결론
⑧ 참고 출처 (선택적)
⑨ 해시태그
```

### 6. 메타데이터 및 SEO (네이버)

#### YAML Frontmatter (선택적)

네이버 블로그에서 필수는 아니지만, 메타데이터 관리를 위해 포함:

```yaml
---
title: "SAT Inference 문제 지문 구조 분석 — 3가지 시퀀스 패턴"
description: "Inference 유형 126개 지문 분석 결과..."
date: 2026-05-18
slug: sat-inference-sequencing-pattern-analysis
author: SuperfastSAT
category: SAT Reading and Writing
keywords: [Inference, 시퀀스, 지문구조, SAT, Reading]
---
```

#### 제목 (Title)

규칙:
- **25자 이내** (네이버 포스트 제목 가독성)
- **핵심 키워드 앞 배치** (예: "SAT Inference 문제 — ..." X, "SAT Inference 문제 지문 구조 분석 — ..." O)
- 명확한 가치제안 포함 ("3가지 시퀀스 패턴")

#### 해시태그

규칙:
- **5~10개** (네이버 최적화)
- 본문에 **실제로 등장한 핵심 단어** 기준
- 형식: `#SAT #Inference #시퀀스분석`
- **위치**: 포스팅 맨 아래

**예시 (Inference 포스팅):**
```
#SAT #Inference #시퀀스분석 #지문구조 #SAT독서쓰기 #SAT준비 #CollegeBoard #SuperfastSAT
```

### 7. 형식 요소 역산 (본문 완성 후)

본문을 다 쓴 후, 아래를 본문에서 **추출**합니다. 새로 만들지 않습니다.

**독자 가정**: 이 글이 가장 도움이 되는 사람은 누구인가? 본문 내용 기준으로 작성.
**목차**: 본문의 논증 단계를 그대로 추출. 목차 문구 = 본문 헤딩 문구 (1:1 일치).
**요약**: 본문의 핵심 발견 2~3줄. 항목별 줄바꿈. 본문을 읽지 않아도 결론은 알 수 있게.

---

## learnings.md 작성 지침

각 포스팅 후 `wiki/blog/{date-slug}/learnings.md`에 다음을 기록합니다:

**구조:**
```markdown
---
title: {date-slug} 포스팅 — 배운 규칙
type: learnings
date: YYYY-MM-DD
---

# 이번 포스팅에서 배운 규칙

## 콘텐츠 측면

### N. [규칙명]
- **규칙**: [구체적 규칙]
- **금지 예**: [반례]
- **허용 예**: [올바른 예]
- **Why**: [이 규칙이 필요한 이유]

## 포스팅 구조 측면

...

## 플랫폼 전환 측면

...

## 다음 포스팅에 적용할 규칙

...

## 이번 포스팅에서 미흡했던 점

...
```

**목표**: 규칙을 체계화하여 다음 포스팅에서 반복되는 실수를 방지.

---

## patterns.jsonl 업데이트 방법

포스팅 수정 이력을 누적하는 JSONL 파일 (`wiki/blog/patterns.jsonl`):

**구조:**
```json
{"date": "2026-05-18", "slug": "inference-sequencing", "pattern": "rule-name", "count": 1, "notes": "optional"}
```

**언제 업데이트:**
- 포스팅 초안 작성 후: `count: 0` (예정)
- 수정 후 발행: `count: 1` + pattern 기록
- 재수정 필요: `count` 증가

**예시:**
```jsonl
{"date": "2026-05-18", "slug": "inference-sequencing", "pattern": "skill-naming-consistency", "count": 1, "notes": "Inference/Words in Context 공식명 유지"}
{"date": "2026-05-18", "slug": "inference-sequencing", "pattern": "concrete-sequence-examples", "count": 1, "notes": "시퀀스 3개 구체 예시 > 추상 패턴"}
```

**누적 용도:**
- 반복되는 수정 패턴 파악
- 다음 포스팅 체크리스트 생성
- 스킬 고도화 기초 자료

---

## CTA 규칙 (네이버)

**네이버 블로그: 완전 금지**

- 제품 링크, 구매 유도 금지
- 학습 행동만 허용 (예: "지금 이 문제를 풀어보세요")
- 내부 학습 리소스 링크 금지 (중립성 유지)

---

## 데이터 출처 표기 규칙 (필수)

`master_sat_ontology_v2.jsonl` 기반 집계를 인용할 때:

| 구분 | 표기 |
|------|------|
| **올바른 표기** | `College Board Question Bank — [범위/집계 내용], SuperfastSAT 분석 (연도)` |
| **금지 표기** | `SuperfastSAT 문제 데이터베이스` |

**본문 서술:**
```
"College Board Question Bank의 X문제를 SuperfastSAT이 전수 집계했습니다."
```

**참고 출처 섹션:**
```markdown
---

## References

- [College Board Official SAT Suite](https://www.collegeboard.org/sat)
- College Board Question Bank — [범위], SuperfastSAT 분석 (2026)
- [기타 출처](url)
```

---

## 프로젝트 데이터

| 파일 | 용도 |
|------|------|
| `master_sat_ontology_v2.jsonl` | SAT 문제 1,444개 — 분석·예시 추출 |
| `sat_ontology_atlas.json` | skill·난이도 필터링 |
| `assessment_framework.md` | College Board 공식 근거 |

데이터 분석이 필요하면 Python/bash로 실제 집계한다. **가상 수치는 절대 사용하지 않는다.**

---

## 네이버 포스팅 완성 체크리스트

- [ ] blueprint.md에서 모든 마커 변환됨 (:::reader-profile::: / :::quick-summary:::)
- [ ] 줄바꿈 리듬 준수 (문장 1~2개 + 빈 줄)
- [ ] 3문장 이상 이어진 단락 없음
- [ ] "이런 분들에게..." / 목차 / "바쁘시면..." 섹션 포함
- [ ] H2 헤딩 3~5개 (목차와 1:1 매핑)
- [ ] 모든 핵심 주장에 데이터 또는 메커니즘 근거 있음
- [ ] 해시태그 5~10개 (본문 키워드 기반)
- [ ] 제목 25자 이내, 핵심 키워드 앞 배치
- [ ] 참고 출처 최소 3개 (URL 포함)
- [ ] CTA 없음 (학습 행동만 가능)
- [ ] 데이터 출처 "College Board Question Bank — ..., SuperfastSAT 분석" 형식 준수

---

## 파일 저장

`content/posts/YYYY-MM-DD-slug-naver.md`

저장 후:
```
node preview-blog.js → http://localhost:3333 에서 네이버 스타일 확인
```

---

## 트러블슈팅

**Q: blueprint.md에 :::reader-profile::: 마커가 없으면?**
A: 본문을 읽고 독자 가정을 역산. "~이 궁금한 학생" 형식으로 3~5개 작성.

**Q: 줄바꿈 리듬을 어떻게 유지하나?**
A: 각 문장 또는 문장 쌍 뒤에 빈 줄 삽입. 강조 문장은 단독 줄 + 앞뒤 빈 줄.

**Q: 해시태그를 어떻게 결정하나?**
A: 본문에 실제로 등장하는 단어 중 검색 가능성 높은 것. 강제로 추가하지 않음.

**Q: 참고 출처가 2개뿐이면?**
A: 최소 3개 필수. 부족하면 포스팅 재검토 또는 출처 추가.

---

## 다음 포스팅 개선 포인트

1. **첫 번째 포스팅 완료 후** learnings.md를 읽고 규칙 추가
2. **patterns.jsonl 누적**으로 반복 패턴 파악
3. **네이버 줄바꿈 리듬** 자동화 가능성 검토 (스크립트)
4. **SEO 메타** (title/description/keywords) 자동 생성 검토
