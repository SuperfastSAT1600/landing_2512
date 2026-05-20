---
name: landing-blog
description: "랜딩 페이지 블로그 포스팅 스킬. Ghost 콘텐츠에 JSON-LD 스키마·Supabase 필드 매핑·CTA 섹션을 추가하여 SEO + 데이터베이스 통합 + 전환을 극대화합니다."
---

# 랜딩 페이지 블로그 포스팅 스킬 (JSON-LD + Supabase + CTA)

## 개요

이 스킬은 **SuperfastSAT 랜딩 페이지 (superfastsat.com) 전용 변환**을 담당합니다. Ghost의 SEO/GEO 기반에 구조화된 데이터와 데이터베이스 통합, 전환 최적화를 추가합니다.

**입력**: `wiki/blog/{date-slug}/blueprint.md` + `content/posts/{date-slug}-ghost.md` (Ghost 버전)
**출력**: `content/posts/{date-slug}-landing.md` (JSON-LD + Supabase 매핑 + CTA)

**사용 플랫폼**: SuperfastSAT 랜딩 페이지 (superfastsat.com/blog/...)

---

## 랜딩 페이지의 역할

Ghost 버전이 **Google 검색 + AI 인용**을 목표라면, 랜딩 페이지는:
1. **직접 방문자 전환**: 포스팅 → 학습 플랫폼 가입
2. **구조화된 데이터**: JSON-LD 스키마로 AI/검색 엔진 신뢰도 ↑
3. **데이터베이스 연계**: Supabase `posts` 테이블과 1:1 매핑
4. **명확한 CTA**: 행동 유도 (지금 배우기, 문제 풀기, 가입하기)

---

## ghost.md → landing.md 변환 규칙

Landing 버전은 **Ghost 콘텐츠를 그대로 포함**하되, 아래 3개 요소를 추가합니다:

### 1. JSON-LD BlogPosting 스키마

포스팅 끝에 구조화된 데이터 블록 추가:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "SAT Inference 문제 지문 구조 분석 — 3가지 시퀀스 패턴",
  "description": "Inference 유형 126개 지문 분석 결과, 가장 많이 나타나는 3가지 시퀀스와 각 시퀀스의 특징을 데이터 기반으로 설명합니다.",
  "datePublished": "2026-05-18",
  "dateModified": "2026-05-18",
  "author": {
    "@type": "Organization",
    "name": "SuperfastSAT",
    "url": "https://superfastsat.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "SuperfastSAT",
    "logo": {
      "@type": "ImageObject",
      "url": "https://superfastsat.com/logo.png"
    }
  },
  "mainEntity": {
    "@type": "Article",
    "headline": "SAT Inference 문제 지문 구조 분석 — 3가지 시퀀스 패턴",
    "articleSection": "SAT Reading and Writing",
    "keywords": ["Inference", "시퀀스", "지문구조", "SAT", "Reading"]
  },
  "image": {
    "@type": "ImageObject",
    "url": "https://superfastsat.com/images/sat-inference-sequencing.png",
    "width": 1200,
    "height": 630
  }
}
```

**위치**: 포스팅 끝, `<script type="application/ld+json">` 태그로 감싸기

**필드 규칙:**

| 필드 | 값 | 출처 |
|------|-----|------|
| `headline` | YAML title | Ghost frontmatter |
| `description` | YAML description | Ghost frontmatter |
| `datePublished` | YAML date | Ghost frontmatter |
| `dateModified` | 현재 날짜 | 수정일 |
| `author.name` | "SuperfastSAT" | 고정값 |
| `articleSection` | YAML category | Ghost frontmatter |
| `keywords` | YAML keywords | Ghost frontmatter |
| `image.url` | YAML og_image | Ghost frontmatter |

### 2. Supabase Posts 테이블 필드 매핑

포스팅 직후, 데이터베이스 통합용 주석 추가:

```markdown
---

## Supabase posts 테이블 필드 매핑

```
id: uuid (auto-generated)
title: "SAT Inference 문제 지문 구조 분석 — 3가지 시퀀스 패턴"
content: [전체 본문 HTML 또는 Markdown]
excerpt: "Inference 유형 126개 지문 분석 결과, 가장 많이 나타나는 3가지 시퀀스와 각 시퀀스의 특징을 데이터 기반으로 설명합니다."
description: "Inference 문제의 시퀀스 패턴 분석"
category: "SAT Reading and Writing"
tags: ["Inference", "시퀀스", "지문구조", "패턴분석"]
focus_keyword: "Inference 시퀀스 패턴"
author_id: "superfastsat"
published_at: "2026-05-18"
updated_at: "2026-05-18"
slug: "sat-inference-sequencing-pattern-analysis"
canonical_url: "https://superfastsat.com/blog/sat-inference-sequencing-pattern-analysis"
og_image_url: "https://superfastsat.com/images/sat-inference-sequencing.png"
status: "published"
```
```

**매핑 규칙:**

| posts 필드 | 값 | 출처 | 필수 |
|-----------|-----|------|-----|
| `id` | auto-generated UUID | Supabase | O |
| `title` | YAML title (전체) | Ghost | O |
| `content` | 본문 전체 HTML/MD | 포스팅 | O |
| `excerpt` | YAML description | Ghost | O |
| `description` | 콘텐츠 주제 요약 | 역산 | O |
| `category` | YAML category | Ghost | O |
| `tags` | YAML keywords | Ghost | O |
| `focus_keyword` | YAML focus_keyword | Ghost | O |
| `author_id` | "superfastsat" | 고정값 | O |
| `published_at` | YAML date | Ghost | O |
| `updated_at` | 현재 날짜 | 수정일 | O |
| `slug` | YAML slug | Ghost | O |
| `canonical_url` | YAML canonical | Ghost | O |
| `og_image_url` | YAML og_image | Ghost | O |
| `status` | "published" / "draft" | 상태 | O |

### 3. CTA 섹션 (행동 유도)

포스팅 끝에서 JSON-LD 직전, **명확한 CTA** 배치:

```markdown
---

## 다음 스텝: Inference 마스터 로드맵

SuperfastSAT의 Inference 스킬 완전 정복 과정:

1. **[현재]** 시퀀스 패턴 이해 (이 포스팅)
2. **실전 문제 풀이** — 시퀀스 분석 워크북 (준비 중)
3. **고급 전략** — 모호한 지문의 추론 포인트 찾기 (준비 중)
4. **모의고사 실전 분석** — 최근 시험 트렌드 분석 (준비 중)

**지금 바로 시작하고 싶다면?** SuperfastSAT 학습 플랫폼에서 Inference 실전 문제 세트에 접근하세요. 수십 개의 실제 College Board 문제로 이번 포스팅의 개념을 즉시 적용할 수 있습니다.

[→ Inference 실전 문제 풀기 시작하기](/learn/sat-rw/inference-questions)
```

**CTA 규칙:**

#### 위치
- 본문과 JSON-LD 사이
- "## 다음 스텝" 또는 "## 로드맵" H2 섹션

#### 내용 구조
1. **학습 로드맵** (다음 단계 명시)
   - 현재 포스팅의 위치 표시
   - 향후 예정된 콘텐츠 3~5개

2. **행동 유도** (1문단, 자연스러움)
   - 포스팅과의 연결 명시
   - 행동의 이점 설명

3. **버튼형 링크** (1회만)
   - 형식: `[→ 텍스트](/경로)`
   - 목표: 학습 플랫폼 진입

#### 언어 규칙
- "지금 바로 시작하고 싶다면?" 형식 (능동적)
- CTA 텍스트에 화살표 (→) 포함
- 긴급성 X, 자연스러움 O

#### CTA 대상
- 주 대상: 학습 플랫폼 가입 / 무료 문제 풀이
- 이부작 시리즈: 다음 편 포스팅 링크 (최소)
- 금지: 결제 유도, 이메일 구독

---

## 랜딩 페이지 콘텐츠 규칙

### 글자 수
- **8,000자 이상** (Ghost 5,000~8,000자보다 1,000자 이상 추가)
- 초과분은 주로:
  - 더 상세한 예시
  - 전문 개념 설명 심화
  - 학습 맥락 강화

### 도입부 (Diagnostic Style)

랜딩 페이지는 **진단형 도입**으로 시작합니다:

```markdown
# [Skill명] 문제는 왜 어려울까?

D-43이라는 숫자가 낯설지 않다면, 당신은 이미 SAT Inference 문제로 고민한 경험이 있습니다.

D-43은 College Board가 SAT Reading and Writing 시험지에서 부여하는 난이도 표시입니다. D급(어려움)이면서도 43번 문제라는 뜻은, 이 문제가 **같은 시험 범위에서 가장 어려운 Inference 문제** 중 하나라는 의미입니다.

혼란스러운가요? **이 포스팅이 정확히 그 혼란을 해결하기 위해 작성되었습니다.**
```

**도입부 규칙:**
- 구체적인 데이터/숫자로 시작 (D-43, 126개, 2회 등)
- "낯설지 않다면", "당신은" 등 독자 호칭
- 혼란→인식→해결 의 3단계 구조

### 전문 개념 소개 (3단계 필수)

신규 개념 도입 시 3단계 필수:

```markdown
### 1. 정의
College Board는 이 문제의 난이도를 [INTRODUCE, EVIDENCE, IMPLICATION] 시퀀스라고 부릅니다.

### 2. 학습 장면
Inference 문제를 풀 때, 당신이 자주 겪는 패턴은 이렇습니다:
- 지문을 읽는다
- 답을 선택한다
- 틀렸다
- "왜 이게 틀렸는지 모르겠다"

### 3. 행동 연결
이 3단계 시퀀스를 이해하면, 이제 당신은 "왜 틀렸는지"를 분석할 수 있습니다.
```

**규칙:**
- **정의**: "~라고 부릅니다", "~입니다" (객관적)
- **학습 장면**: "당신이 자주", "겪는 패턴" (독자 공감)
- **행동 연결**: "이해하면", "할 수 있습니다" (능동적)

### 본문 심화

Ghost 버전보다 **1,000자 이상 추가**:

| 요소 | Ghost | Landing | 추가분 |
|------|-------|---------|--------|
| 본문 | 5,000~8,000자 | 8,000자+ | +1,000자 |
| 예시 | 3개 | 4~5개 | +1~2개 |
| 데이터 상세도 | 기본 | 심화 | 세부 분석 추가 |
| 학습 맥락 | 기본 | 심화 | 시험 전략 연결 |

---

## JSON-LD 스키마 검증

발행 전 필수 확인:

- [ ] `@type` = "BlogPosting" (고정)
- [ ] `headline` = YAML title와 동일
- [ ] `datePublished` = ISO 8601 형식 (YYYY-MM-DD)
- [ ] `author.name` = "SuperfastSAT"
- [ ] `image.width` = 1200px 이상
- [ ] `image.height` = 630px 이상
- [ ] `articleSection` = YAML category

**검증 도구:** [schema.org validator](https://validator.schema.org/) 또는 Google Search Console

---

## Supabase 매핑 검증

데이터베이스 삽입 전 필수 확인:

- [ ] 모든 필수 필드 채워짐 (id 제외)
- [ ] `published_at` = `updated_at` (초기 발행 시)
- [ ] `slug` = URL-safe (소문자, 하이픈)
- [ ] `canonical_url` = 절대 URL
- [ ] `tags` = 배열 형식 [tag1, tag2, ...]

---

## CTA 최적화

전환율을 높이기 위한 규칙:

### CTA 텍스트
- **능동형**: "지금 시작하기" O, "관심이 있으신가요?" X
- **구체성**: "Inference 실전 문제 풀기" O, "더 배우기" X
- **화살표**: "→" 포함으로 시각적 유도

### 링크 대상
- 주 목표: `/learn/sat-rw/inference-questions` (학습 플랫폼)
- 차선: `/blog/...` (다음 편 포스팅)
- 금지: 외부 사이트, 결제 페이지

### 배치 전략
- **1회만** (너무 많으면 spammy)
- **포스팅과 관계 명시** ("이 포스팅의 개념을 즉시 적용할 수 있습니다")
- **행동 결과 명시** ("수십 개의 실제 College Board 문제로")

---

## 랜딩 페이지 완성 체크리스트

### 콘텐츠
- [ ] Ghost 요소 전체 포함 (YAML/TL;DR/FAQ/본문)
- [ ] 글자 수 8,000자 이상
- [ ] 도입부 진단형 스타일 (D-43 형식)
- [ ] 전문 개념 3단계 설명 (정의→학습→행동) 2회 이상
- [ ] 더 상세한 예시 4~5개
- [ ] 비교 테이블 또는 인포그래픽

### 구조화된 데이터
- [ ] JSON-LD 블록 포함
- [ ] @type = BlogPosting
- [ ] 모든 권장 필드 채워짐
- [ ] schema.org validator 통과

### 데이터베이스 연계
- [ ] Supabase 매핑 섹션 포함
- [ ] 모든 필수 필드 명시
- [ ] slug/canonical_url 정확함
- [ ] tags 배열 형식

### CTA
- [ ] "다음 스텝" 또는 로드맵 섹션 포함
- [ ] 로드맵 3~5개 단계 명시
- [ ] 행동 유도 문단 자연스러움
- [ ] 버튼형 링크 1개 (→ 포함)
- [ ] 링크 대상 `/learn/` 또는 관련 블로그

### SEO/GEO
- [ ] Ghost 모든 SEO 요소 포함
- [ ] OG 이미지 1200×630+
- [ ] Canonical URL 절대 주소
- [ ] Quote capsules 80%+

---

## 파일 저장

`content/posts/YYYY-MM-DD-slug-landing.md`

---

## 트러블슈팅

**Q: JSON-LD는 HTML에 포함되나, Markdown에 보이나?**
A: Markdown에서 ` ```json ``` ` 코드 블록으로 표시. 배포 시 HTML `<script type="application/ld+json">` 태그로 변환.

**Q: Supabase 매핑 섹션이 보여도 되나?**
A: 프론트엔드에서 숨김 처리 (CSS `display: none` 또는 주석 형식). 개발자용 메타데이터.

**Q: CTA 링크를 여러 개 넣으면?**
A: 금지. 1개 초과 시 "spammy"로 판정되어 SEO 페널티. 로드맵 섹션은 텍스트 리스트만 (링크 X).

**Q: Ghost 버전과 Landing 버전의 차이는?**
A:
- **Ghost**: SEO 우선 (5,000~8,000자, quote capsules, FAQ)
- **Landing**: 전환 우선 (8,000자+, JSON-LD, CTA, Supabase 연계)

**Q: 도입부 "D-43" 같은 예시는 꼭 필요한가?**
A: 필수. 진단형 도입으로 "나의 문제다"를 인식시키는 Hook 역할. 추상적 도입 금지.

---

## 다음 포스팅 개선 포인트

1. **JSON-LD 자동 생성 스크립트** (Ghost frontmatter → JSON-LD)
2. **Supabase 매핑 자동 생성** (필드 순서 자동화)
3. **CTA 템플릿 라이브러리** (스킬별 로드맵 템플릿)
4. **진단형 도입부 생성** (데이터 기반 자동 작성)
5. **8,000자 달성도 체커** (본문 길이 자동 점검)

---

## 관련 스킬

- **ghost-blog**: SEO/GEO 기본
- **naver-blog**: 네이버 플랫폼 스타일
- **geo-schema**: JSON-LD 심화 가이드
- **prompt-engineering**: CTA 텍스트 최적화
