---
name: ghost-blog
description: "Ghost 블로그 플랫폼 최적화 스킬. blueprint.md를 받아 SEO 메타·FAQ·TL;DR·GEO 최적화를 적용하여 Google 검색 + AI 인용 가시성을 극대화합니다."
---

# Ghost 블로그 포스팅 스킬 (SEO/GEO 최적화)

## 개요

이 스킬은 **Ghost 블로그 플랫폼 전용 변환**을 담당합니다. SEO (Google 검색) 와 GEO (AI 인용) 최적화에 중점을 둡니다.

**입력**: `wiki/blog/{date-slug}/blueprint.md` (플랫폼 중립 핵심 콘텐츠)
**출력**: `content/posts/{date-slug}-ghost.md` (SEO/GEO 최적화)

**사용 플랫폼**: Ghost CMS (superfastsat.com 블로그 엔진)

---

## Ghost 플랫폼 특성

Ghost는 **AI 검색 엔진 친화적** 콘텐츠 플랫폼입니다:
- Google AI Overviews, ChatGPT, Perplexity 등이 직접 인용 가능한 구조
- 명확한 메타 태그 + FAQ 스키마 자동 생성
- OG 태그로 소셜 공유 최적화

이 스킬은 이 특성을 활용하여:
1. **SEO (Google 검색)**: 키워드 배치, 메타 설명, 제목 최적화
2. **GEO (AI 인용)**: Quote capsules (80%+ 섹션), FAQ (60%+ 섹션), TL;DR 박스
3. **내부 링크**: 컨텍스트형 링크로 도메인 authority 축적

---

## blueprint.md → ghost.md 변환 규칙

### 1. YAML Frontmatter (Ghost 메타)

Ghost는 frontmatter로 메타데이터를 관리합니다:

```yaml
---
title: "SAT Inference 문제 지문 구조 분석 — 3가지 시퀀스 패턴"
description: "Inference 유형 126개 지문 분석 결과, 가장 많이 나타나는 3가지 시퀀스와 각 시퀀스의 특징을 데이터 기반으로 설명합니다."
slug: sat-inference-sequencing-pattern-analysis
canonical: https://superfastsat.com/blog/sat-inference-sequencing-pattern-analysis
date: 2026-05-18
author: SuperfastSAT
category: SAT Reading and Writing
keywords: [Inference, 시퀀스, 지문구조, SAT, Reading]
og_image: https://superfastsat.com/images/sat-inference-sequencing.png
schema_type: BlogPosting
focus_keyword: Inference 시퀀스 패턴
---
```

**각 필드 규칙:**

#### title (60자 이내)
- **규칙**: 핵심 키워드 앞 배치, 수치/데이터 포함 가능
- **Good**: "SAT Inference 문제 지문 구조 분석 — 3가지 시퀀스 패턴"
- **Bad**: "Inference 문제를 풀 때 알아야 할 것"

#### description (155자 이내)
- **규칙**: 요약 문장 1~2개, 수치 필수 포함, answer-first 형식
- **Good**: "Inference 유형 126개 지문 분석 결과, 가장 많이 나타나는 3가지 시퀀스와 각 시퀀스의 특징을 데이터 기반으로 설명합니다."
- **구조**: [주장] + [숫자/근거] + [다음 스텝]

#### slug (URL 경로)
- **규칙**: 소문자, 하이픈 구분, 날짜 없음, 키워드 포함
- **Good**: `sat-inference-sequencing-pattern-analysis`
- **Bad**: `2026-05-18-sat-inference` (날짜 포함), `satInference` (camelCase)

#### canonical
- **규칙**: 절대 URL, 중복 콘텐츠 방지
- **Format**: `https://superfastsat.com/blog/{slug}`

#### keywords
- **규칙**: 5~8개, 본문 등장 키워드 기반
- **Format**: 배열 형식 `[keyword1, keyword2, ...]`

#### og_image
- **규칙**: 1200×630px 이상, 포스팅별 고유 이미지
- **Format**: 절대 URL

#### focus_keyword (Ghost SEO 플러그인용)
- **규칙**: 주요 키워드 1개, 제목/메타에 포함된 핵심 키워드
- **Example**: `Inference 시퀀스 패턴`

### 2. TL;DR (Too Long; Didn't Read) 박스

도입부 직후, 본문 시작 전에 배치합니다:

**형식:**
```markdown
> **TL;DR (핵심 요약)**
> 
> 결론 1 (한 문장)
> 결론 2 (한 문장)
> 결론 3 (한 문장, 선택)
```

**규칙:**
- **위치**: H1 제목 직후, 첫 번째 H2 섹션 이전
- **길이**: 40~60자 (짧을수록 AI 인용 가능성 높음)
- **내용**: 본문 핵심 3줄 (answer-first)
- **형식**: Blockquote (> 기호)

**예시 (Inference 포스팅):**
```markdown
> **TL;DR (핵심 요약)**
>
> SAT Inference 문제 126개 분석 결과, 일관된 패턴이 거의 없습니다.
> 가장 자주 나타나는 3가지 시퀀스도 각각 2회씩만 출현합니다.
> 학생은 패턴보다 각 지문의 논리 흐름 자체를 감지하는 능력을 키워야 합니다.
```

### 3. FAQ 섹션 (Google PAA + AI 인용)

Google "People Also Ask"와 AI 검색 대비 필수 요소입니다.

**구조:**
```markdown
## 자주 하는 질문 (FAQ)

### Q1. [의문형 질문]?
[60~100자 answer-first 답변]

### Q2. [의문형 질문]?
[60~100자 answer-first 답변]

### Q3. [의문형 질문]?
[60~100자 answer-first 답변]
```

**규칙:**

#### 질문 형식 (H3 형식: ###)
- **의문형 필수**: "그럼 어떻게...?", "왜 그런가?", "~인가요?"
- 명령형 금지: "이렇게 하세요" (X)
- **한국어 종결**: "...는가?", "...입니까?" (공식적) 또는 "...나요?" (자연스러움)

**예시 (Inference 포스팅):**
```markdown
### Q1. 이 3가지 시퀀스만 나타나나요?
아니오. 상위 3가지 시퀀스가 각 2회씩만 나타나며, 나머지 대부분은 각기 다른 독특한 구조를 따릅니다. 따라서 "패턴을 찾으면 다 풀린다"는 기대는 현실적이지 않습니다.

### Q2. 그럼 어떻게 Inference 문제를 잘 풀어야 하나요?
지문을 읽을 때마다 "이 문장은 어떤 역할을 하는가? (INTRODUCE/EVIDENCE/PIVOT/IMPLICATION)"를 스스로에게 물어보세요. 각 라벨의 관계를 파악하면 Inference 포인트가 자동으로 떠오릅니다.

### Q3. 126개가 전수인가요?
College Board Question Bank의 공개 Inference 문제 전수를 분석했습니다. 더 광범위한 데이터를 원하면 최근 SAT 시험지들을 추가 수집해서 검증할 수 있습니다.
```

#### 답변 형식 (answer-first)
- **첫 문장이 질문에 직접 답해야 함**
- 60~100자 (AI 인용 최적 범위)
- 단락 나누지 않기 (한 문단)

**AI 인용 예시:**
> "Inference 문제 126개 분석 결과, 일관된 패턴이 거의 없습니다." — SuperfastSAT

### 4. Quote Capsules (인용 캡슐)

각 H2 섹션에 **자립적으로 인용 가능한 문단**을 배치합니다.

**규칙:**
- **길이**: 60~100자 (한두 문장)
- **독립성**: 그 문단만 읽어도 의미 완성
- **위치**: 각 H2 섹션 내 최소 1회 (80%+ 섹션에 포함)

**예시:**
```markdown
## 2. 가장 많이 나타나는 시퀀스 1: [INTRODUCE, EVIDENCE, IMPLICATION]

이 시퀀스는 전형적인 논증 구조입니다: 주제를 소개하고, 그 주제에 대한 증거나 사례를 제시한 후, 그 증거가 의미하는 바를 설명합니다.

**[이 문단이 quote capsule]**
College Board SAT Inference 문제에서 [INTRODUCE, EVIDENCE, IMPLICATION] 시퀀스는 가장 기본 형태입니다. 이 구조에서 추론의 핵심은 증거(EVIDENCE) 섹션이며, 학생은 "주제가 주어졌을 때, 이런 증거가 제시되면 어떤 함의에 도달할 수 있을까?"를 파악해야 합니다.

이 구조에서 **Inference의 핵심은 EVIDENCE 섹션**입니다.
```

### 5. 비교 테이블 (AI 인용율 ↑47%)

데이터 비교가 필요하면 마크다운 테이블 사용:

```markdown
| 시퀀스 | 구조 | 출현 빈도 | 추론 난이도 |
|--------|------|----------|-----------|
| [INTRODUCE, EVIDENCE, IMPLICATION] | 단순 | 2회 | 낮음 |
| [INTRODUCE, FINDING, PIVOT, IMPLICATION] | 복잡 | 2회 | 중상 |
| [INTRODUCE, PIVOT, IMPLICATION] | 가장 간결 | 2회 | 높음 |
```

규칙:
- **AI 인용 가능성**: 테이블 형식이 단순 문단보다 47% 높은 인용율
- **최대 5행** (가독성)
- **각 셀 15자 이내** (간결성)

### 6. 내부 링크 (컨텍스트형)

**규칙:**
- **3~8개** (너무 많으면 spammy로 판정)
- **앵커 텍스트**: 목적지 페이지 주제와 일치
- **컨텍스트**: 링크 전후 문장이 자연스러워야 함

**Good:**
```markdown
Inference 문제 외에도 [Words in Context는 비슷한 패턴](/blog/sat-words-in-context-pattern)을 따릅니다.
```

**Bad:**
```markdown
또 다른 관련 기사는 [여기](/blog/something)를 참고하세요.
```

### 7. 본문 구조

blueprint.md를 거의 그대로 포함:
- H1 제목
- YAML frontmatter 이후 TL;DR
- 모든 H2 섹션 (blueprint와 동일)
- 각 섹션 내 quote capsules 80%+ 포함
- 결론부

**추가 요소:**
- FAQ 섹션 (H2 "자주 하는 질문")
- 내부 링크 (컨텍스트형)
- "마지막 업데이트: YYYY-MM-DD" (끝부분)

### 8. 날짜 갱신 표기

포스팅 끝에 명시:

```markdown
---

**마지막 업데이트**: 2026-05-18
```

Ghost의 `updated_at` 필드와 동기화하여 AI 검색 엔진에 신선도 신호 전달.

---

## GEO 검증 체크리스트

발행 전에 반드시 확인:

### Quote Capsules (80%+ 필수)
- [ ] H2 섹션 총 개수: ___개
- [ ] Quote capsule 포함 섹션: ___개
- [ ] 달성율: ___%
- **Pass 기준**: 80% 이상

### FAQ (60%+ 필수)
- [ ] H2 섹션 중 질문 형식: ___개
- [ ] FAQ 섹션 포함: Yes / No
- [ ] 달성율: ___%
- **Pass 기준**: 60% 이상

### TL;DR 박스
- [ ] 포함: Yes / No
- [ ] 길이: ___자 (40~60자 범위)

### 내부 링크
- [ ] 링크 개수: ___개 (3~8개 범위)
- [ ] 앵커 텍스트와 목적지 일치: Yes / No

### SEO 메타
- [ ] Title: ___자 (60자 이내)
- [ ] Description: ___자 (155자 이내)
- [ ] Keywords: ___개 (5~8개)
- [ ] OG Image: 1200×630+ : Yes / No
- [ ] Canonical URL: 절대 URL : Yes / No

### 글자 수
- [ ] 총 글자: ___자 (5,000~8,000자)

**결과:**
- **모든 항목 Pass** → 발행 준비 완료
- **1개 이상 Fail** → 수정 후 재체크

---

## SEO 메타 자동 생성 규칙

blueprint.md의 제목과 요약에서 자동 생성:

### Title Tag (60자 이내)
```
{skill명} {도메인} {주장 데이터} — {가치제안}
예: "SAT Inference 문제 지문 구조 분석 — 3가지 시퀀스 패턴"
```

### Meta Description (155자 이내)
```
{범위} {데이터} 분석 결과, {핵심 발견}. {추가 맥락}.
예: "Inference 유형 126개 지문 분석 결과, 가장 많이 나타나는 3가지 시퀀스와 각 시퀀스의 특징을 데이터 기반으로 설명합니다."
```

### Keywords (5~8개)
본문에 실제로 등장하는 단어 추출:
- 주요 키워드 (skill명 포함)
- 데이터 범주
- 학습 맥락
- 출처명 (SAT, College Board)

---

## 데이터 출처 표기 규칙 (필수)

blueprint과 동일하게 유지:

```markdown
## References

- [College Board Official SAT Suite](https://www.collegeboard.org/sat)
- College Board Question Bank — [범위], SuperfastSAT 분석 (2026)
- [기타 출처](url)
```

---

## CTA 규칙 (Ghost)

**Ghost 블로그: 제한적 허용**

- 직접 판매/구매 CTA 금지
- 이부작 시리즈 1편이면 2편 랜딩 페이지 링크 1회 허용
- 형식: 문단 형태 (버튼 X)

**예시:**
```markdown
---

다음 편에서는 이 시퀀스 패턴을 실제로 적용하는 전략을 다룹니다.

[→ Inference 문제 풀이 전략 보기](/blog/sat-inference-strategy)
```

---

## Ghost 포스팅 완성 체크리스트

- [ ] YAML frontmatter 모두 작성 (title/description/slug/canonical 필수)
- [ ] TL;DR 박스 40~60자 범위
- [ ] FAQ 섹션 3~5개 (의문형 질문)
- [ ] 각 FAQ 답변 answer-first 형식
- [ ] Quote capsules 80%+ 섹션에 포함
- [ ] 비교 테이블 (해당하면)
- [ ] 내부 링크 3~8개
- [ ] 글자 수 5,000~8,000자
- [ ] "마지막 업데이트: YYYY-MM-DD" 포함
- [ ] 데이터 출처 "College Board Question Bank — ..., SuperfastSAT 분석" 형식
- [ ] OG Image 1200×630+ 준비
- [ ] CTA 없음 (또는 1회만, 이부작 2편 링크)

---

## 파일 저장

`content/posts/YYYY-MM-DD-slug-ghost.md`

---

## 트러블슈팅

**Q: Quote capsule을 어디에 배치하나?**
A: 각 H2 섹션에서 가장 핵심적인 문장 또는 그룹. 그 부분만 읽어도 섹션의 의미가 전달되어야 함.

**Q: FAQ 답변이 60자보다 길면?**
A: 이상적은 60~100자 범위. 더 길면 첫 문장만 추출하여 answer-first 원칙 지킬 것.

**Q: 내부 링크가 3개보다 적으면?**
A: 보유 콘텐츠가 부족하면 외부 신뢰 출처(College Board, 학술 논문)로 대체 가능.

**Q: TL;DR은 왜 필요한가?**
A: AI 검색 엔진 (ChatGPT, Perplexity)이 요약으로 인용하는 구간. 명확한 요약이 인용 가능성을 높임.

---

## 다음 포스팅 개선 포인트

1. **SEO 메타 자동 생성 스크립트** 개발 고려
2. **Quote capsule 감지 스크립트** (80% 달성도 자동 체크)
3. **FAQ 생성 자동화** (blueprint의 반론 지도에서 추출)
4. **내부 링크 추천 시스템** (기존 포스팅 기반)
