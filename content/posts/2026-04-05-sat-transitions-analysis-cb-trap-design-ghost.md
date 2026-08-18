---
title: "SAT Transitions 분석 — CB가 Easy와 Hard에서 다른 단어를 쓰는 이유"
slug: "sat-transitions-analysis-cb-trap-design"
excerpt: "SAT Transitions에서 연결어를 외웠는데도 Hard 문제를 틀린다면, 이 데이터를 보시면 이유가 분명해집니다. 161개 실제 문제 분석 결과, Easy 정답 1위 단어(However, As a result)가 Hard 오답 자리에 정확히 배치됩니다. CB의 함정 설계 구조를 흐름별로 분해했습니다."
metaTitle: "SAT Transitions 분석 — CB가 Easy와 Hard에서 다른 단어를 쓰는 이유"
metaDescription: "SAT Transitions 161개 실제 문제 분석. Contrast가 Hard에서 가장 많이 나오는 이유, Easy 정답 단어가 Hard 오답이 되는 구조, CB의 Distractor Pull 패턴을 데이터로 확인합니다."
tags: ["SAT", "Transitions", "RW전략", "연결어", "디지털SAT"]
author: "배병윤"
date: "2026-04-05"
focus_keyword: "SAT Transitions 분석"
---

연결어를 외웠는데 Hard에서 계속 틀린다면, 문제는 단어가 아닙니다. CB가 어떻게 그 단어들을 함정으로 설계하는지, 161개 실제 문제 데이터로 확인합니다.

## CB가 Transitions를 어떤 흐름으로, 얼마나 출제하는가

SAT Transitions 문제는 논리 흐름이 4가지입니다.

[College Board 공식 분류 기준](https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec.pdf)으로 나누면 Contrast, Cause and Effect, Addition, Exemplification입니다.

161개 실제 문제를 분석한 결과는 아래와 같습니다.

| 흐름 유형 | Easy | Medium | Hard | 합계 |
|---------|------|--------|------|------|
| Contrast | 18 | 17 | 14 | 49 |
| Cause and Effect | 24 | 12 | 9 | 45 |
| Addition | 12 | 21 | 5 | 38 |
| Exemplification | 10 | 4 | 2 | 16 |

숫자를 보면 흥미로운 패턴이 보입니다.

Cause and Effect는 Easy에서 압도적입니다. 24개로 Easy 문제 3개 중 1개꼴이 C&E 흐름입니다.

반면 Addition은 Medium에서 21개로 몰려 있습니다. Exemplification은 Easy에서 10개, Hard에서 단 2개입니다.

그런데 Contrast는 다릅니다.

Easy 18개, Medium 17개, Hard 14개. 난이도가 올라가도 꾸준히 출제됩니다. Hard에서 4가지 흐름 중 가장 많은 유형입니다.

이 데이터에서 CB의 출제 의도를 읽을 수 있습니다.

Cause and Effect는 Easy에서 "이건 이런 거야"라고 학생에게 알려줍니다. Contrast는 Hard까지 끌고 갑니다.

왜 그럴까요.

학생들은 보통 Contrast를 가장 먼저, 가장 열심히 외웁니다. However, Nevertheless, By contrast, Conversely. 이 단어들은 SAT prep 교재 첫 페이지에 나옵니다.

CB는 그 사실을 알고 있습니다.

## Easy에서 외운 단어가 Hard에서 함정이 되는 이유

Easy 문제에서 정답으로 가장 자주 나온 단어를 보겠습니다.

Contrast Easy 정답 1위: However — 9회
Cause and Effect Easy 정답 1위: As a result — 8회

이 두 단어는 모든 SAT 교재에 반드시 나오는 단어입니다. 학생들이 가장 먼저 외우는 단어이기도 합니다.

CB는 Easy에서 이 단어들을 정답으로 반복 배치합니다. 학생들이 "아, 이 흐름엔 이 단어"라고 느끼게 만듭니다.

그다음 Hard로 넘어가 보겠습니다.

Hard Contrast 정답 14개를 보면 놀라운 사실이 나옵니다.

that said — 1회
Alternatively — 1회
Granted — 1회
though — 1회
Increasingly — 1회

모두 다른 단어입니다. 같은 단어가 2회 이상 나오지 않습니다.

CB는 Easy에서 패턴을 가르쳐주고, Hard에서 그 패턴으로 함정을 팝니다.

Hard C&E도 마찬가지입니다. Easy에서 8회 나온 As a result는 Hard에서 정답에 없습니다. 대신 Hence(2회), To that end(1회), Ultimately(1회)가 정답입니다.

여기서 메커니즘이 분명해집니다.

Easy에서 반복 노출된 단어는 학생의 뇌에 "이 흐름 = 이 단어"로 각인됩니다. Hard에서 CB는 그 각인을 역이용합니다.

As a result를 보면 손이 갑니다. 그런데 그 선택지를 고르면 틀립니다.

아래는 실제 Hard Contrast 문제입니다.

> The mineral mtorolite is cryptocrystalline, meaning its crystalline structure is so fine that
> the individual crystals cannot be distinguished by the naked eye or even under a microscope.
> The crystals in microcrystalline minerals are also not visible to the naked eye. ______
> they can generally be observed under a microscope.
>
> (A) thus, (B) for example, (C) **that said,** (D) similarly,

앞 문장은 "육안으로도 현미경으로도 안 보인다"입니다. 뒤 문장은 "현미경으로는 볼 수 있다"입니다.

흐름이 분명히 Contrast입니다.

그런데 정답이 However가 아니라 that said입니다. 그리고 thus, for example, similarly가 오답으로 배치되어 있습니다.

Easy에서 "그러므로" 흐름을 외운 학생은 thus를 고를 수 있습니다. "예를 들어"가 익숙한 학생은 for example을 고를 수 있습니다.

익숙한 단어일수록 오답으로 끌리는 구조입니다.

SuperfastSAT에서 실제로 학생들에게 Transitions를 지도할 때, 이 패턴을 처음 보여주면 대부분 이렇게 반응합니다. "그럼 외운 게 오히려 독이었던 건가요?" 맞습니다. Easy 수준의 암기로 Hard 문제에 들어가면 외운 단어가 함정으로 작동합니다.

## CB가 오답에 심는 "가짜 흐름" — Distractor Pull 분석

각 흐름 유형별로 CB가 오답 선지에 배치하는 단어를 분석했습니다.

Contrast 문제 오답 TOP 5를 보겠습니다.

As a result, Thus — 각 7회
For example, Similarly — 각 8회
Moreover, Specifically — 각 5회

Contrast 문제인데 오답에 C&E 단어(As a result, Thus)와 Exemplification 단어(For example, Specifically)가 가장 많이 들어 있습니다.

Cause and Effect 문제에서는 반대입니다.

For example이 오답 1위(13회), Similarly(11회), However(6회) 순입니다. C&E 문제에 Exemplification 단어가 가장 많이 심겨 있습니다.

Addition 문제는 또 다릅니다.

However가 오답 1위(9회), Instead(8회)입니다. Addition 문제인데 Contrast 단어가 가장 많이 오답으로 배치됩니다.

이 패턴을 "Distractor Pull"이라고 부를 수 있습니다. 각 흐름 유형이 인접한 다른 흐름의 단어를 오답으로 끌어당기는 구조입니다.

| 진짜 흐름 | CB가 가장 많이 심는 가짜 흐름 | 대표 오답 단어 |
|---------|--------------------------|------------|
| Contrast | Cause and Effect | As a result, Thus |
| Cause and Effect | Exemplification | For example, Similarly |
| Addition | Contrast | However, Instead |

이 표를 보면 한 가지가 분명해집니다.

CB는 무작위로 오답을 고르지 않습니다. 학생이 문장을 제대로 읽지 않고 "이 단어가 여기 어울릴 것 같은데"라고 느낄 수 있는 인접 카테고리 단어를 정확히 골라 오답에 심습니다.

Contrast 지문에서 원인-결과가 느껴지도록 유도하고, As a result를 선택지에 넣습니다. C&E 지문에서 예시처럼 읽힐 수 있는 부분을 살리고, For example을 선택지에 넣습니다.

단어를 외운 학생은 오히려 그 단어들에 끌립니다. 문장 관계를 읽는 학생만 그 함정을 피합니다.

이 구조가 Hard에서 Contrast가 14개나 나오는 이유입니다. Contrast는 학생들이 가장 많이 외우는 카테고리이고, 그 외운 단어들을 역이용하기 가장 좋은 흐름이기 때문입니다.

연결어 암기는 Easy를 안정적으로 푸는 데 효과가 있습니다. 그런데 거기서 멈추면, 공부를 더 할수록 Hard에서 더 많이 틀리는 구조가 됩니다.

오늘 틀린 Transitions 문제에서 한 가지만 확인해 보시면 됩니다.

내가 고른 오답이 인접 카테고리 단어였는가. 그리고 정답은 내가 외운 적 없는 단어였는가.

그렇다면 지금 CB의 설계대로 틀리고 있는 것입니다. 다음 단계는 단어를 더 외우는 게 아닙니다.

Transitions Hard 문제에서 연결어를 고르는 게 아니라 앞 문장과 뒤 문장 사이의 관계를 먼저 읽는 것, 이것 기억하세요.

---

## 레퍼런스

- [College Board, *Digital SAT Suite of Assessments: Sample Questions*, 2023–2025](https://satsuite.collegeboard.org/digital/digital-practice-preparation/practice-tests)
- [College Board, *SAT Suite of Assessments — Test Specifications*, 2024](https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec.pdf)
- SuperfastSAT, master_sat_ontology_v2.jsonl (2026년 4월 기준 Transitions 161개 분석)

---

## 자주 묻는 질문 (FAQ)

**Q. Transitions 연결어 암기를 아예 안 해도 되나요?**

Easy 문제를 안정적으로 풀려면 기본 연결어 암기는 필요합니다. 문제는 거기서 학습을 멈추는 것입니다. Easy 수준의 연결어가 익숙해진 이후에는 단어 추가 암기보다 문장 관계 분류 연습이 더 효과적입니다.

**Q. Contrast가 Hard에서 가장 많다면, Contrast 단어를 더 많이 외우면 되지 않나요?**

데이터를 보면 Hard Contrast 14개의 정답이 모두 다른 단어입니다. 외울 수 있는 단어 세트가 없습니다. Hard Contrast를 푸는 핵심은 단어가 아니라 앞뒤 문장에서 반전 관계를 직접 읽어내는 것입니다.

**Q. Distractor Pull이 실제로 학생 실수에 영향을 미치나요?**

CB가 인접 카테고리 단어를 오답에 배치하는 것은 데이터에서 분명히 확인됩니다. 예를 들어 Contrast 문제 오답에 As a result가 7회, C&E 문제 오답에 For example이 13회 등장합니다. 이 단어들은 모두 학생들이 자주 외우는 단어입니다.

**Q. 이 분석은 실제 CB 문제를 기반으로 한 건가요?**

[College Board 공식 Practice 문제](https://satsuite.collegeboard.org/digital/digital-practice-preparation/practice-tests)와 실제 시험 출제 문항을 포함한 161개 Transitions 문제를 분석한 결과입니다.

---

**저자**: 배병윤 (Byungyun Bae)
SuperfastSAT 대표. SAT·AP 온라인 학습 환경 설계 전문가로, 디지털 SAT 채점 구조와 문항 유형별 전략을 연구하고 가르칩니다.
[LinkedIn](https://www.linkedin.com/in/%EB%B3%91%EC%9C%A4-%EB%B0%B0-82392a2a5/)

**최종 업데이트**: 2026년 4월 5일

---

## (내부용) QA 체크

- [x] Experience 문장 포함 (SuperfastSAT 지도 현장 문장)
- [x] 저자 바이오 삽입
- [x] 외부 소스 URL 하이퍼링크 삽입 (College Board 2개)
- [x] FAQ 섹션 포함 (4개)
- [x] Excerpt ≠ Meta Description (표현 다름)
- [x] 합니다/입니다 체 준수
- [x] CTA 없음 (스크립트가 자동 삽입)
- [x] 라벨 금지 준수
