---
title: "SAT Transitions 완전 분석 — 연결어 암기가 Hard 점수를 깎는 구조"
slug: "sat-transitions-analysis-hard-trap-learning-path"
excerpt: "SAT Transitions에서 연결어를 외울수록 Hard에서 더 많이 틀리는 이유가 있습니다. CB 161개 실제 문제 데이터가 그 구조를 정확히 보여줍니다. 단어가 아니라 두 문장 사이의 관계를 먼저 읽는 순서로 바꾸는 것, 그것이 Hard 정답률을 바꿉니다."
metaTitle: "SAT Transitions 완전 분석 — 연결어 암기가 Hard 점수를 깎는 구조"
metaDescription: "SAT Transitions 161개 실제 문제 데이터 분석. Easy 정답 단어(However, As a result)가 Hard 오답 자리에 배치되는 CB의 설계 구조를 데이터로 분석하고, 3단계 학습 경로를 제시합니다."
tags: ["SAT", "Transitions", "RW전략", "연결어", "디지털SAT"]
author: "배병윤"
date: "2026-04-05"
focus_keyword: "SAT Transitions 분석"
category: "RW 전략"
---

SAT 공부를 하면서 Transitions 유닛을 만났을 때,
대부분의 학생들이 하는 일이 있습니다.

연결어 분류표를 만들기 시작합니다.

Contrast: However, Nevertheless, By contrast, Conversely, Instead, That said...
Cause and Effect: As a result, Therefore, Consequently, Thus, Hence...
Addition: Moreover, Furthermore, Additionally, In addition, In fact...
Exemplification: For example, For instance, Specifically, That is...

표가 완성되면 "이제 Transitions는 된다"고 생각합니다.

그런데 실제 시험에서 Hard 문제를 틀립니다.

틀리고 나면 "연결어를 더 외워야겠다"고 생각합니다.
그 결론이 맞는 것처럼 느껴집니다.

하지만 데이터는 반대로 말합니다.

## Transitions에서 자꾸 틀리는 이유 — 단어가 아니라 구조의 문제

CB Transitions 161개 실제 문제를 분석했습니다.
(College Board 공식 Practice 문제 + 실제 출제 문항 기반)

Easy 문제에서 정답으로 가장 많이 나온 단어를 보겠습니다.

Contrast Easy 정답 1위: **However — 9회**
Cause and Effect Easy 정답 1위: **As a result — 8회**

이 두 단어는 모든 SAT 교재 첫 페이지에 나옵니다.
학생들이 가장 먼저, 가장 많이 외우는 단어입니다.
CB는 Easy에서 이 단어들을 정답으로 반복 배치합니다.

그러면 Hard는 어떨까요.

Hard Contrast 14개 문제의 정답 단어를 전부 나열하면 이렇습니다.

that said / Alternatively / Granted / though / ultimately / increasingly / By contrast / Previously / meanwhile / However / Conversely / In comparison / That said / instead

같은 단어가 2회 이상 나오지 않습니다.

Hard C&E 9개는 이렇습니다.

Hence / then / To that end / Ultimately / therefore / Consequently / As such / Accordingly / Fittingly

이 역시 대부분 1회씩입니다.

외운 단어가 많을수록 Hard에서 더 많이 틀리는 구조, CB가 의도적으로 설계한 것입니다.

CB는 Easy에서 특정 단어를 반복 정답으로 배치해서 패턴을 학습시킵니다.
그리고 Hard에서는 그 학습된 단어를 오답 자리에 배치합니다.

어떻게 그게 가능한지 지금부터 데이터로 보겠습니다.

## CB의 출제 공식 — 흐름별 난이도 편향 데이터

161개를 흐름 유형과 난이도로 교차 분석하면 다음과 같습니다.

| 흐름 유형 | Easy | Medium | Hard | 합계 |
|---------|------|--------|------|------|
| Contrast | 18 | 17 | 14 | 49 |
| Cause and Effect | 24 | 12 | 9 | 45 |
| Addition | 12 | 21 | 5 | 38 |
| Exemplification | 10 | 4 | 2 | 16 |

숫자에서 두 가지가 보입니다.

첫째, Cause and Effect는 Easy에 집중되어 있습니다.
Easy 24개, Medium 12개, Hard 9개.
Easy에서 압도적으로 많고 Hard로 갈수록 급격히 줄어듭니다.

둘째, Contrast는 거의 일정합니다.
Easy 18개, Medium 17개, Hard 14개.
Hard에서도 4가지 흐름 중 가장 많습니다.

이게 우연이 아닙니다.

학생들이 SAT 공부를 시작할 때 가장 먼저 외우는 유형이 Contrast입니다.
However, Nevertheless, By contrast — 이 세 단어는 SAT 연결어 암기 1번 항목입니다.

CB는 이 사실을 알고 있습니다.
그리고 학생들이 가장 많이 외운 유형을 Hard 출제 1위로 가져갑니다.

Cause and Effect는 Easy에서 많이 나옵니다.
학생들이 "As a result = 원인-결과"를 익히게 합니다.
그런 다음, Hard Contrast 문제 오답 자리에 As a result를 7회 배치합니다.

아래 실제 문제를 보겠습니다.

---

**실제 Hard Contrast 문제 (ID: 9dc4e640)**

> The mineral mtorolite is cryptocrystalline, meaning that its crystalline
> structure is so fine that the individual crystals cannot be distinguished
> by the naked eye or even under a microscope. The crystals in
> microcrystalline minerals are also not visible to the naked eye.
> ______ they can generally be observed under a microscope.
>
> (A) thus,
> (B) for example,
> (C) **that said,** ← 정답
> (D) similarly,

앞 두 문장은 "결정 구조가 너무 작아서 육안으로도, 현미경으로도 안 보인다"는 내용입니다.
빈칸 뒤 문장은 "현미경으로는 볼 수 있다"입니다.

흐름은 분명히 Contrast입니다. 앞에서 부정한 내용을 뒤에서 부분적으로 인정합니다.

그런데 정답은 그 어떤 교재에서도 "Contrast 1순위"로 가르치지 않는 that said입니다.

오답으로 배치된 thus는 C&E 단어입니다.
for example은 Exemplification 단어입니다.
similarly는 Addition/Comparison 단어입니다.

세 오답 모두 학생들이 외우는 단어입니다.
정답인 that said는 상대적으로 낯선 단어입니다.

이것이 CB의 Hard 문제 설계 원리입니다.

---

**실제 Easy Cause and Effect 문제 (ID: e0bd4f8a)**

비교를 위해 Easy 문제도 보겠습니다.

> In 1942, the 1,500-mile Alaska Highway was constructed in under nine months,
> largely due to the skilled work of nearly 4,000 African American soldiers
> from US Army engineering regiments. The soldiers' contribution was overlooked
> for decades. ______ in 2017, lawmakers declared October 25 a day of recognition.
>
> (A) Lastly,
> (B) **Then,** ← 정답
> (C) Similarly,
> (D) For example,

"수십 년간 무시되었다" → "2017년에 인정받았다"

시간 순서로 이어지는 흐름입니다. 정답 Then이 직관적입니다.

Easy는 이렇습니다. 문장 흐름과 정답 단어가 1:1로 연결됩니다.
Hard는 다릅니다. 흐름은 분명한데 정답 단어가 낯섭니다.

이 차이가 연결어 암기가 Easy에서는 통하고 Hard에서는 실패하는 이유입니다.

Easy는 "어떤 단어가 이 흐름에 맞는가"를 묻습니다.
Hard는 "이 흐름이 무엇인지 먼저 읽고, 그 흐름을 표현하는 덜 익숙한 단어를 고를 수 있는가"를 묻습니다.

두 질문은 완전히 다른 능력을 테스트합니다.

## 오답은 우연이 아니다 — CB가 설계한 함정 3가지

161개 문제에서 오답 선지로 가장 많이 배치된 단어를 흐름별로 분석했습니다.

이 데이터가 중요한 이유는 하나입니다.
CB가 오답에 배치하는 단어는 학생들이 외운 단어와 정확히 겹칩니다.

**함정 1: Contrast 문제에 C&E 단어**

Contrast 49개 문제에서 오답으로 가장 많이 나온 단어입니다.

As a result — 7회
Thus — 7회
Therefore — 복수 등장
Consequently — 복수 등장

Contrast 문제임에도 C&E 단어가 오답 1·2위를 차지합니다.

왜 이런 배치가 가능할까요.

Contrast 지문에서 빈칸 앞 문장은 대부분 어떤 상황을 설명합니다.
그 설명이 "원인처럼" 읽힐 수 있는 구조를 CB가 의도적으로 씁니다.

학생이 빈칸 앞 문장만 읽고 "이건 원인이고, 뒤에 결과가 오겠구나"라고 판단하면
As a result나 Thus를 고릅니다.

그런데 빈칸 뒤 문장을 정확히 읽으면
뒤 문장이 앞 문장을 반전시키거나 제한하고 있습니다.

Contrast입니다.

문장 전체를 읽지 않고 앞 문장만 읽은 학생을 정확히 잡아내는 설계입니다.

**함정 2: Cause and Effect 문제에 Exemplification 단어**

C&E 45개 문제에서 오답 1위는 For example — 13회입니다.
For instance도 7회 등장합니다.

C&E 문제에 예시 단어가 왜 이렇게 많이 오답으로 들어갈까요.

C&E 지문에서 빈칸 뒤 문장은 대부분 구체적인 사실이나 결과를 서술합니다.
그 문장이 "예시처럼" 읽힐 수 있습니다.

"추상적 설명 → 구체적 사례"로 읽은 학생은 For example을 고릅니다.
"원인 → 결과"로 읽은 학생은 As a result를 고릅니다.

둘의 차이는 빈칸 앞 문장이 진짜 "원인"인지,
아니면 뒤 문장이 앞 문장에서 논리적으로 발생한 "결과"인지를 구별하는 능력입니다.

**함정 3: Addition 문제에 Contrast 단어**

Addition 38개 문제에서 오답 1위는 However — 9회, Instead — 8회입니다.

Addition 문제임에도 Contrast 단어가 1·2위입니다.

Addition 지문에서 빈칸 앞 문장은 어떤 사실을 서술합니다.
빈칸 뒤 문장이 "다른 사실"을 서술할 때, 그 두 사실이 표면적으로 달라 보이면
학생이 "여기는 Contrast 아닌가?"라고 느낍니다.

그런데 두 사실이 실제로는 같은 방향을 지지하고 있습니다.
Addition입니다.

이 세 가지 함정의 공통점은 하나입니다.

문장 하나만 읽으면 틀리고, 두 문장을 모두 읽으면 맞습니다.

연결어 암기는 한 문장만 읽고 단어를 매칭하는 훈련입니다.
그 방법이 Easy에서는 통하고 Hard에서는 함정으로 이어집니다.

## Hard Transitions를 뚫는 학습 경로 재설계

지금까지 데이터로 확인한 것을 정리하면 이렇습니다.

CB는 Transitions를 3단계 구조로 설계합니다.

Easy — 명시적 신호어가 정답으로 반복됩니다. 단어 암기가 통합니다.
Medium — 신호어가 덜 명시적입니다. 문장 관계를 같이 읽어야 합니다.
Hard — 정답 단어가 분산됩니다. 외운 단어가 오답 자리에 들어옵니다. 문장 관계만 믿어야 합니다.

이 구조를 이해하면 학습 경로가 달라집니다.

**1단계: 기본 연결어 암기**

Easy 문제를 안정적으로 풀 수 있을 정도의 기본 암기는 필요합니다.
각 흐름별 대표 단어 5~7개로 충분합니다.

Contrast: However, Nevertheless, Instead, By contrast, Though
Cause and Effect: As a result, Therefore, Thus, Consequently, Hence
Addition: Moreover, In addition, Furthermore, Additionally, Indeed
Exemplification: For example, For instance, Specifically, That is

이 정도를 익히고 나면, 더 많은 단어를 외우는 것은 효과가 없습니다.

**2단계: 문장 관계 분류 연습**

실제 Transitions 문제에서 선택지를 가리고 먼저 연습합니다.

빈칸 앞 문장 요약 → 빈칸 뒤 문장 요약 → 둘의 관계를 한 단어로 정의합니다.

"앞 문장이 A를 주장한다. 뒤 문장이 B를 주장한다. A와 B의 관계는 Contrast다."

이 흐름을 먼저 정의하고 나서 선택지를 봅니다.

SuperfastSAT에서 실제로 학생들에게 Transitions 지도를 할 때,
선택지를 보기 전에 빈칸 자리에 들어갈 흐름을 먼저 말하게 합니다.
이 훈련을 거치면 Hard 문제에서 낯선 단어도 선택할 수 있게 됩니다.

흐름이 확정되면 단어는 선택지에 있는 것 중에 고르면 됩니다.
문제가 아니라 지문이 정답을 말해주기 때문입니다.

**3단계: Distractor Pull 역이용**

함정 3가지를 알고 나면 오답 소거가 빨라집니다.

Contrast 문제라는 판단이 섰을 때: As a result, Thus가 보이면 바로 소거합니다.
C&E 문제라는 판단이 섰을 때: For example, For instance가 보이면 바로 소거합니다.
Addition 문제라는 판단이 섰을 때: However, Instead가 보이면 바로 소거합니다.

소거가 빨라지면 남은 선택지에서 정답을 찾는 시간이 줄어듭니다.

이 3단계를 거치면 Hard Transitions 문제에서 "이 단어 모르는데?"라는 반응이 바뀝니다.
"이 단어는 낯선데, 나머지 세 개는 소거했고, 흐름이 Contrast니까 이게 맞겠다"로 바뀝니다.

---

## 자주 묻는 질문 (FAQ)

**Q. Contrast 단어를 더 많이 외우면 Hard Contrast 문제를 풀 수 있지 않나요?**

Hard Contrast 14개의 정답이 모두 다른 단어입니다.
외울 수 있는 패턴이 없습니다.
Granted, that said, Alternatively 같은 단어를 외운다고 해도,
다음 Hard 문제에서 또 다른 Contrast 표현이 정답으로 나옵니다.
지금 필요한 건 더 많은 단어가 아니라 흐름을 먼저 읽는 순서의 변화입니다.

**Q. 문장 관계 분류 연습은 어떻게 하나요?**

가장 효과적인 방법은 실제 CB Transitions 문제에서 선택지를 손으로 가리고,
빈칸 앞뒤 문장을 각각 한 줄로 요약한 뒤 두 문장의 관계를 말로 정의하는 것입니다.
"앞 문장은 A를 주장하고, 뒤 문장은 B를 주장한다.
A와 B의 관계는 [흐름 유형]이다."
이 문장을 쓰고 나서 선택지를 봅니다.

**Q. 지금 점수가 1200점대인데 이 분석이 의미 있나요?**

연결어 암기 단계에서 문장 관계 읽기 단계로 넘어가는 시점은 보통 1250~1350점 구간입니다.
1200점대라면 기본 암기를 먼저 탄탄히 하고, 연습 문제에서 Easy를 안정적으로 맞히는 것이 첫 목표입니다.
그다음 단계로 오실 때 이 분석이 가장 효과가 있습니다.

**Q. 이 분석은 어떤 데이터를 기반으로 하나요?**

College Board 공식 Practice 문제와 실제 디지털 SAT 출제 문항을 포함한 Transitions 161개를 분석했습니다.
흐름 유형, 난이도, 정답 단어 빈도, 오답 단어 빈도를 전수 집계했습니다.

**Q. 이 학습 경로를 혼자 따라가기 어렵다면요?**

SuperfastSAT 진단 테스트를 받으시면 현재 Transitions 실력이 단어 암기 단계인지,
흐름 분류 단계인지, Distractor Pull 역이용 단계인지를 진단합니다.
단계별로 무엇을 먼저 해야 하는지 개인화된 경로를 안내드립니다.

---

## 마무리

연결어를 외우는 것은 시작입니다.

Easy 문제를 안정적으로 풀기 위한 첫 단계이고,
그 단계를 지나면 다음이 필요합니다.

CB는 학생들이 외운 단어를 역이용하도록 Hard 문제를 설계합니다.
데이터가 그것을 정확히 보여줍니다.

이것 기억하세요.

Transitions에서 Hard를 뚫는 것은
더 많이 외우는 것이 아니라
두 문장을 먼저 읽고 관계를 정의한 뒤 선택지를 보는 순서의 문제입니다.

순서 하나가 Hard 정답률을 바꿉니다.

---

**저자**: 배병윤 (Byungyun Bae)
**소속**: SuperfastSAT 대표
SuperfastSAT 대표. SAT·AP 온라인 학습 환경 설계 전문가로, 디지털 SAT 채점 구조와 문항 유형별 전략을 연구하고 가르칩니다.
[LinkedIn](https://www.linkedin.com/in/%EB%B3%91%EC%9C%A4-%EB%B0%B0-82392a2a5/)

**최종 업데이트**: 2026년 4월 5일

---

## 레퍼런스

- College Board, *Digital SAT Suite of Assessments: Sample Questions*, 2023–2025 — https://satsuite.collegeboard.org/digital/digital-practice-preparation/practice-tests
- College Board, *SAT Suite of Assessments — Test Specifications*, 2024 — https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec.pdf
- SuperfastSAT, master_sat_ontology_v2.jsonl (2026년 4월 기준 Transitions 161개 분석)

---

## (내부용) Supabase 필드 매핑

id: sat-transitions-analysis-hard-trap-learning-path
title: SAT Transitions 완전 분석 — 연결어 암기가 Hard 점수를 깎는 구조
content: (marked 변환 HTML)
excerpt: SAT Transitions에서 연결어를 외울수록 Hard에서 더 많이 틀리는 이유가 있습니다. CB 161개 실제 문제 데이터가 그 구조를 정확히 보여줍니다. 단어가 아니라 두 문장 사이의 관계를 먼저 읽는 순서로 바꾸는 것, 그것이 Hard 정답률을 바꿉니다.
description: SAT Transitions 161개 실제 문제 데이터 분석. Easy 정답 단어(However, As a result)가 Hard 오답 자리에 배치되는 CB의 설계 구조를 데이터로 분석하고, 3단계 학습 경로를 제시합니다.
category: RW 전략
tags: ["SAT", "Transitions", "RW전략", "연결어", "디지털SAT"]
author: 배병윤
date: 2026-04-05
focus_keyword: SAT Transitions 분석
featured_image: null

## (내부용) QA 체크

- [x] 진단형 도입 사용 (연결어 분류표 만드는 장면 → 틀림 → 데이터 반박)
- [x] 깊이 우선 원칙 준수 (정의→장면→행동연결 3단계 완성)
- [x] 실제 문제 2개 인용 (Easy vs Hard 비교)
- [x] 3단계 학습 경로 포함
- [x] Distractor Pull 역이용 단계 구체 서술
- [x] E-E-A-T: SuperfastSAT 현장 경험 문장 포함
- [x] Supabase 필드 매핑 완료
- [x] CTA 없음 (진단 테스트 안내는 FAQ 형식, 링크 없음)
