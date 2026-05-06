# SAT RW 지문 구조 8가지 패턴으로 수렴

---

이런 분들에게 도움을 드리고자 썼습니다.

- 977가지 시퀀스를 보고 "어디서 시작해야 하지?"라는 생각에 공부 계획을 못 세우는 학생
- SAT RW 지문마다 구조가 달라 보여서 일관된 읽기 방법을 찾지 못하는 학생
- 지문을 읽을 때 논리 전환이 앞에 오는지 뒤에 오는지 매번 새로 파악해야 하는 학생
- College Board가 지문을 몇 가지 구조 유형으로 설계하는지 궁금한 학생

---

**목차**

1. 977가지를 묶는 기준
2. 8가지 패턴 전체 지도
3. 각 패턴의 구조적 특성
4. 같은 패턴, 다른 내용

---

> **바쁘시면 이것만 보세요!**
>
> College Board Question Bank 1,609문제를 SuperfastSAT이 전수 분석한 결과, 977가지 시퀀스는 Ward 군집화를 통해 8가지 패턴으로 수렴합니다.
>
> P1(Compact)과 P2(Short), 두 패턴만으로 전체의 53.4%를 차지합니다.
>
> 지문을 읽을 때 "전환 라벨이 앞에 있나, 뒤에 있나, 없나"를 먼저 파악하면 P1~P8 중 어디에 해당하는지 빠르게 구분할 수 있습니다.

---

## 977가지를 묶는 기준

2편에서 977가지 시퀀스 데이터를 확인한 학생이라면, 공부 계획을 세우려다 노트북을 닫았을 수 있습니다.

977가지를 하나씩 익히는 것은 의미가 없습니다.

**그런데 사실은, 977가지 전부를 다룰 필요가 없습니다.**

College Board Question Bank 1,609문제를 SuperfastSAT이 전수 분석한 결과, 977가지 시퀀스는 Ward 군집화를 통해 8가지 패턴으로 수렴합니다.

(College Board Question Bank — RW 1,609문제 패턴 집계, SuperfastSAT 분석, 2026)

Ward 군집화는 군집 내 분산을 최소화하는 방식으로 작동합니다.

의미적으로 유사한 시퀀스들이 같은 군집 경계 안으로 자연스럽게 수렴합니다.

"비슷한 것끼리 묶는다"는 상관 서술이 아닙니다.

군집 내 분산을 줄이는 방향으로 계산이 진행되기 때문에, 의미적으로 다른 시퀀스는 같은 군집에 들어올 수 없습니다.

결과적으로 8가지 경계가 통계적으로 견고합니다.

---

**"8가지를 외우는 건 결국 암기 아닌가?"라고 생각하는 학생이 있습니다.**

8가지 패턴 이름을 시험장에서 떠올릴 필요는 없습니다.

패턴이 실용적인 이유는 지문 구조를 빠르게 읽는 기준을 제공하기 때문입니다.

"이 지문에 전환 라벨이 있는가, 없는가? 있다면 앞인가, 뒤인가?"

이 한 가지 질문으로 8가지 중 상당수가 걸러집니다.

암기가 아니라 구조 인식입니다.

---

## 8가지 패턴 전체 지도

8가지라고 하면 여전히 많다고 느낄 수 있습니다.

그런데 데이터를 보면 달라집니다.

| 패턴 | 이름 | 건수 | 비율 | 평균 길이 | 전환 위치 |
|------|------|------|------|-----------|-----------|
| P1 | Compact | 415건 | 25.8% | 1.9개 | 없음 |
| P2 | Short | 444건 | 27.6% | 3.1개 | 가능 |
| P3 | Linear | 187건 | 11.6% | 3.9개 | 없음 |
| P4 | Extended | 201건 | 12.5% | 5.8개 | 없음 |
| P5 | End-Turn | 136건 | 8.5% | 3.5개 | 마지막 |
| P6 | Front-Turn | 115건 | 7.1% | 4.4개 | 앞부분 |
| P7 | Mid-Turn | 68건 | 4.2% | 5.9개 | 중간 |
| P8 | Complex | 21건 | 1.3% | 9.0개 | 복합 |

(College Board Question Bank — RW 1,609문제 패턴 집계, SuperfastSAT 분석, 2026)

**P1과 P2, 단 두 가지 패턴이 전체의 53.4%를 차지합니다.**

8가지 패턴을 균등하게 공부할 필요가 없다는 뜻입니다.

---

**"그래도 나머지 6개는 공부해야 하지 않나요?"라는 질문이 있습니다.**

P7(Mid-Turn)과 P8(Complex)의 합산 비율은 5.5%입니다.

100문제가 출제된다면 P7과 P8을 합쳐 5~6문제 수준입니다.

P3~P6은 각각 7.1~12.5% 범위이므로 무시할 수는 없습니다.

그러나 P1과 P2에서 기반을 잡은 뒤 P3~P6으로 확장하는 것이 데이터가 보여주는 자연스러운 순서입니다.

---

## 각 패턴의 구조적 특성

8가지 패턴은 두 가지 기준으로 나뉩니다.

**전환 라벨(PIVOT·PROBLEM·QUALIFY)이 있는가, 없는가.**

그리고 있다면 **어느 위치에 있는가.**

P1과 P2, P3, P4는 전환 없이 직선으로 전개됩니다.

P5, P6, P7은 전환이 있되 위치가 다릅니다.

P8은 복합 전환을 포함하는 가장 복잡한 구조입니다.

### 전환 없는 패턴: P1~P4

P1은 평균 1.9개 라벨로 구성됩니다.

1~2개 라벨만으로 완결되는 매우 짧은 지문 구조입니다.

P2는 3~5개 라벨, P3은 3~6개 라벨입니다.

표면적으로 비슷해 보이지만 P2와 P3의 차이는 전환 가능 여부에 있습니다.

P4는 평균 5.8개 라벨로, 전환 없이 선형으로 전개되는 긴 지문입니다.

### 전환 있는 패턴: P5·P6·P7

전환 패턴(P5·P6·P7)의 합산 비율은 19.8%입니다.

5문제 중 1문제꼴로 전환 구조가 등장한다는 의미입니다.

**P5(End-Turn)**: 전환 라벨이 지문 마지막에 위치합니다.

지문을 읽는 동안 방향이 유지되다가, 끝에서 갑자기 전환됩니다.

**P6(Front-Turn)**: 전환 라벨이 지문 앞부분에 위치합니다.

시작부터 전환을 제시하고 이후 그 방향을 전개합니다.

**P7(Mid-Turn)**: 전환이 지문 중간에 위치합니다.

가장 복잡한 전환 구조입니다.

### P4와 주제 분포

패턴은 주제가 아닌 구조로 나눴습니다.

그런데 결과를 보면 흥미로운 경향이 있습니다.

P4(Extended)에는 Literature 지문이 55건, 전체 201건 중 27.4%를 차지합니다.

다른 패턴 대비 Literature 비중이 높습니다.

이는 Literature 장르가 구조적으로 유사한 방식으로 쓰이는 경향이 있다는 것을 시사합니다.

서사적 전개가 긴 선형 구조를 자연스럽게 만들어내는 것으로 보입니다.

P8에는 Social Science가 6건/21건으로 28.6%를 차지하는 경향도 발견됩니다.

---

## 같은 패턴, 다른 내용

패턴이 같으면 내용이 달라도 읽기 방식이 유사합니다.

P2(Short) 패턴의 실제 지문 두 개를 비교합니다.

---

**예시 A — CLAIM → EXAMPLE → FEATURE** (Literature 지문)

> *"Seminole/Muscogee director Sterlin Harjo ______ television's tendency to situate Native characters in the distant past: this rejection is evident in his series Reservation Dogs, which revolves around teenagers who dress in contemporary styles and..."*

구조: 핵심 주장(CLAIM) → 예시로 지지(EXAMPLE) → 특징 기술(FEATURE)

지문이 먼저 주장을 던지고, 그 주장을 뒷받침하는 예시로 나아갑니다.

마지막 FEATURE에서 예시의 구체적 특성을 기술합니다.

---

**예시 B — BACKGROUND → CLAIM → IMPLICATION** (History 지문)

> *"Whether the reign of a French monarch such as Hugh Capet or Henry I was historically consequential or relatively uneventful, its trajectory was shaped by questions of legitimacy and therefore cannot be understood without a corollary understanding of..."*

구조: 배경 제시(BACKGROUND) → 핵심 주장(CLAIM) → 함의 도출(IMPLICATION)

지문이 먼저 역사적 배경을 제시하고, 그 배경에서 주장을 도출합니다.

마지막 IMPLICATION에서 논리적 귀결을 이끌어냅니다.

---

두 지문의 주제는 완전히 다릅니다.

하나는 미국 원주민 감독의 드라마, 다른 하나는 중세 프랑스 왕권 정당성입니다.

**그러나 둘 다 P2 패턴입니다.**

3개 라벨, 전환 없이 직선으로 전개됩니다.

지문 읽기 방식이 유사합니다.

---

**"패턴을 알면 실제로 문제 풀 때 뭐가 달라지나요?"라는 질문이 있습니다.**

P5(End-Turn)에서 그 차이가 가장 명확하게 드러납니다.

---

**P5 End-Turn 예시 — INTRODUCE → EVIDENCE → PIVOT**

> *"It is by no means ______ to recognize the influence of Dutch painter Hieronymus Bosch on Ali Banisadr's paintings; indeed, Banisadr himself cites Bosch as an inspiration. However, some scholars have suggested that the ancient Mesopotamian poem Epic of Gilgamesh may have had a far greater impact on..."*

이 지문은 INTRODUCE로 시작해 EVIDENCE로 Bosch의 영향을 뒷받침하다가, 마지막에 PIVOT(However)이 등장합니다.

빈칸은 첫 문장에 있습니다.

지문 끝의 PIVOT이 "Bosch 영향을 인정하는 것"을 한계로 보고 있기 때문에, 빈칸에는 "그 인정이 이상하지 않다"는 방향의 단어가 필요합니다.

P5 패턴이라는 것을 인식하면 "PIVOT이 마지막에 오고 빈칸은 PIVOT 이전 방향에 있다"는 구조가 먼저 보입니다.

구조를 모르면 "However" 이후 내용이 가리키는 방향에 끌려 틀리는 경우가 생깁니다.

패턴 인식은 빈칸 위치와 전환 위치의 관계를 빠르게 계산하게 해줍니다.

---

## 이것 기억하세요.

College Board Question Bank 1,609문제를 SuperfastSAT이 전수 분석한 결과, 977가지 시퀀스는 8가지 패턴으로 수렴합니다.

P1(Compact)과 P2(Short) 두 패턴이 53.4%를 차지합니다.

전환 패턴(P5·P6·P7)은 19.8%로, 5문제 중 1문제꼴입니다.

지문을 읽을 때 "전환 라벨이 앞에 있나, 뒤에 있나, 없나"를 기준으로 P1~P8 어디에 해당하는지 파악하는 것이 기능 독해의 세 번째 단계입니다.

1편(15가지 기능 라벨) → 2편(977가지 시퀀스) → 3편(8가지 패턴)으로 이어지는 이 구조가 SAT RW 지문 독해의 실질적 단위입니다.

이것 기억하세요.

---

**레퍼런스**

- College Board Question Bank — RW 1,609문제 패턴 집계, SuperfastSAT 분석 (2026)
- [College Board SAT 공식 문제은행](https://satsuite.collegeboard.org/digital/digital-practice-preparation/practice-tests/linear)
- [College Board SAT Assessment Framework](https://satsuite.collegeboard.org/sat/scores/understanding-scores/structure)

---

**마지막 업데이트**: 2026년 5월 5일

---

#SAT #SATRW #SAT지문분석 #SAT패턴 #디지털SAT #SAT커리큘럼
