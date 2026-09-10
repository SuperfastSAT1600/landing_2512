require('dotenv').config({ path: '.env.local' })
const https = require('https')
const { marked } = require('marked')

const isDraft = !process.argv.includes('--publish')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding({ id, title, content, excerpt, description, featured_image, category, tags, author, date, focus_keyword, is_published }) {
  const body = JSON.stringify({
    id,
    title,
    content,
    excerpt,
    description,
    featured_image: featured_image || null,
    category,
    tags: tags || [],
    author: author || 'SuperfastSAT',
    date,
    focus_keyword: focus_keyword || null,
    cta_featured: false,
    is_published
  })

  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/posts`)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 201) {
          const post = JSON.parse(data)[0]
          console.log('랜딩 페이지 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('ID:', post.id)
          console.log('is_published:', post.is_published)
          resolve(post)
        } else {
          console.error('실패:', res.statusCode, data)
          reject(new Error(data))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

const markdownBody = `
"이번 시험은 뭔가 달랐던 것 같아요."

8월 시험장에서 나온 자녀분들이 가장 많이 한 말이었습니다.

기출 모의고사는 꾸준히 풀어온 학생들이었습니다.

지문이 특별히 어려운 것도 아니었다고 합니다.

그런데 시험이 끝나고 나서 "평소랑 느낌이 달랐다"는 반응이 나왔습니다.

**무엇이 달랐을까요.**

저희는 2026년 8월 SAT Reading & Writing 전체 문제를 College Board 기출 데이터베이스 1,556개 문항과 4개 층위에서 직접 비교했습니다.

결론을 먼저 말씀드리겠습니다.

지문 내용은 54개 중 53개가 완전히 새 것이었습니다.

그런데 **지문이 흘러가는 방식의 85%는 기존과 동일**했습니다.

달라진 것은 딱 하나였습니다.

**"기존 통설을 새 연구가 뒤집는 구조"의 지문이 기존 대비 10배 급증**했습니다.

---

> **TL;DR**
>
> - 8월 SAT RW 지문의 53/54개는 기존 DB에 없는 완전 신규 지문입니다. 내용 암기로 대비할 수 없습니다.
> - 단, 지문이 전개되는 구조 패턴의 85%는 기존과 동일합니다. College Board는 내용은 바꾸되 틀은 재사용합니다.
> - 이번 시험만의 특이점은 "A라고 알려져 있었는데, 새 연구에 따르면 사실은 B"라는 반전 구조 지문이 기존 대비 10배 증가(2% → 20%)한 것입니다.

---

## 이런 분들에게 도움을 드리고자 썼습니다

- 8월 SAT에서 자녀가 "뭔가 달랐다"고 했는데 무엇이 달랐는지 알고 싶은 학부모님
- 기출 풀이는 잘 됐는데 실제 시험에서 낯설게 느낀 학생
- College Board가 출제 방식을 바꾸고 있는지 궁금한 학부모님
- 이번 시험 결과를 해석하기 위해 시험 구조를 이해하려는 분

---

## 목차

1. 지문 내용은 전부 새 것이었습니다 — 단 한 가지 예외와 함께
2. 지문이 흘러가는 방식의 85%는 그대로였습니다
3. 이번 시험에서 달랐던 딱 한 가지 — "뒤집히는 지문"의 급증
4. 실제 지문으로 보는 반전 구조
5. 자주 묻는 질문 (FAQ)

---

## 지문 내용은 전부 새 것이었습니다 — 단 한 가지 예외와 함께

8월 SAT Reading & Writing에 등장한 지문을 College Board 기출 데이터베이스 전체와 텍스트 레벨로 직접 비교했습니다.

결과는 명확했습니다.

**54개 지문 중 53개가 기존 데이터베이스에 없는 완전 신규 지문**이었습니다.

파란 구멍(Blue holes), 야생 딩고, 소행성 베누, 로마 사치 금지법, 자카르타 교통 제한.

이런 주제들을 미리 알고 시험장에 들어갈 수는 없습니다.

College Board는 매 시험마다 지문 내용을 교체합니다.

이것은 이미 알려진 사실이고, 이번 시험도 예외가 아니었습니다.

---

그런데 **단 1개의 예외**가 있었습니다.

이것이 중요한 발견입니다.

기존 데이터베이스에 이런 문제가 있었습니다.

> *"Cat and Plum Blossoms는 일본화(Nihonga)의 중요한 작품입니다. 서양 유화 기법을 채용한 Kuroda Seiki와 달리, Hishida Shunsō는 전통 일본 방식을 ______ 했습니다."*

8월 시험에는 이런 문제가 나왔습니다.

> *"Tabby Cat은 일본화(Nihonga)의 중요한 작품입니다. 서양 유화 기법을 채용한 Saeki Yūzō와 달리, Takeuchi Seihō는 전통 일본 방식을 ______ 했습니다."*

두 문제를 나란히 놓으면 구조가 동일합니다.

문장 길이, 빈칸 위치, 질문 형식, 정답이 들어가야 하는 논리적 관계.

바뀐 것은 그림 제목, 화가 이름뿐입니다.

**College Board는 지문 내용은 교체하지만, 출제 틀은 재사용합니다.**

이번 시험에서 직접 확인된 증거입니다.

---

## 지문이 흘러가는 방식의 85%는 그대로였습니다

"지문이 전부 새 것이라면, 기출 문제 풀이는 의미가 없는 것 아닌가요?"

이런 질문을 받습니다.

**사실은 반대입니다.**

저희는 이번 8월 시험의 핵심 지문 27개에서 각각의 논리 전개 패턴을 추출했습니다.

그리고 같은 방식으로 분류된 기존 데이터베이스 1,556개 문항의 패턴과 대조했습니다.

결과: **27개 중 23개(85%)가 기존 데이터베이스에 이미 존재하는 패턴**과 일치했습니다.

---

여기서 말하는 "패턴"이란 무엇인지 간단히 설명드리겠습니다.

SAT RW 지문은 내용과 무관하게 논리가 흘러가는 방식이 반복됩니다.

예를 들어 가장 흔한 유형 중 하나는 이런 흐름입니다.

> **배경 정보 → 추가 정보 → 추가 정보 → 결론**

이 흐름에 어떤 내용을 담느냐는 매번 바뀝니다.

야생동물이 될 수도 있고, 로마 역사가 될 수도 있고, 재료 공학이 될 수도 있습니다.

그런데 **논리가 흐르는 순서 자체는 반복**됩니다.

---

이번 8월 시험의 대표적인 새 지문들도 마찬가지였습니다.

"도시 공원의 생물 다양성(BioBlitz)" 지문: 배경 설명 → 추가 정보 → 결론.

"긍정적 표현 글쓰기(Positive Expressive Writing)" 지문: 개념 설명 → 구체 방법 → 연구 결론.

"나비 행동(Butterfly Behavior)" 지문: 연구 배경 → 연구 방법 → 결과.

지문 주제는 전혀 다르지만, 논리 흐름은 기존 데이터베이스에서 수백 번 반복된 패턴과 동일합니다.

College Board는 내용은 바꾸고, 틀은 재사용합니다.

이것이 기출 문제 훈련이 의미를 갖는 이유입니다.

지문 주제를 외우는 것이 아니라, 지문이 전개되는 방식에 익숙해지는 것이 훈련의 본질입니다.

---

## 이번 시험에서 달랐던 딱 한 가지 — "뒤집히는 지문"의 급증

그렇다면 자녀분들이 "뭔가 달랐다"고 느낀 이유는 무엇이었을까요.

데이터가 하나의 답을 가리킵니다.

기존 데이터베이스 1,556개 문항 중 특정 구조의 지문은 **31개(2.0%)**였습니다.

이번 8월 시험에서는 분석 가능한 30개 지문 중 **6개(20%)**가 이 구조였습니다.

**10배 급증**입니다.

---

이 구조를 학부모님이 이해하기 쉽게 설명하겠습니다.

이 구조의 지문은 이렇게 시작합니다.

> *"A라고 알려져 있습니다. A라는 것이 일반적인 설명이었습니다."*

그리고 이렇게 이어집니다.

> *"그런데 새 연구에 따르면 사실은 B입니다. A라는 설명은 맞지 않습니다."*

첫 문장이 마치 정답처럼 느껴집니다.

그런데 지문 전체가 끝나면 첫 문장이 뒤집혀 있습니다.

**SAT는 이 구조에서 뒤집힌 이후의 내용을 이해했는지를 묻습니다.**

---

이 구조가 왜 어렵게 느껴질 수 있는지는 College Board의 설계 의도와 연결됩니다.

지문의 첫 내용은 친숙하고 그럴듯합니다.

"상어는 변온동물입니다" — 과학 시간에 배운 것 같습니다.

"딩고 개체군이 나뉜 이유는 울타리 때문입니다" — 논리적으로 들립니다.

첫 문장을 읽고 "이게 지문의 핵심이겠구나"라고 판단하면, 그 이후 전개되는 반전을 놓칠 수 있습니다.

College Board는 이 지문 구조에서 **"첫 문장의 내용"이 아니라 "뒤집힌 이후의 내용"을 기준으로 정답을 설계**합니다.

기존에는 1,556개 문항 중 31개(2%)에서만 등장하던 구조가, 이번 시험에서는 전체의 20%를 차지했습니다.

---

어디에서 등장했는지도 중요합니다.

이 구조는 이번 시험에서 두 유형에 걸쳐 나타났습니다.

**Words in Context(어휘 선택) 유형**: 상어 지문, 화물트럭 지문, 니켈 오염 정화 지문.

**Inferences(추론) 유형**: 미국 독립선언서 지문, 딩고 지문, 차탈회위크 신석기 마을 지문.

단어 선택 문제와 추론 문제 모두에서 같은 구조가 집중적으로 쓰였습니다.

---

## 실제 지문으로 보는 반전 구조

실제 8월 시험에 등장한 지문을 하나 살펴보겠습니다.

상어 관련 Words in Context 문제입니다.

> *"The swordfish is an ectothermic (cold-blooded) fish, whereas the southern bluefin tuna is a regional endotherm. The basking shark had been classified as a full ectotherm, but researchers Haley R. Dolton et al. found that its body temperature remains 1.0 to 1.5°C above ambient, which is ______ that classification."*

(황새치는 변온동물, 참다랑어는 지역 내온동물입니다. 돌묵상어는 완전한 변온동물로 분류되었지만, Dolton 연구팀은 체온이 주변 수온보다 높다는 것을 발견했습니다. 이는 기존 분류와 ______ 합니다.)

지문의 첫 정보는 "돌묵상어 = 변온동물"입니다.

그런데 지문이 끝나는 지점에서 그 분류가 맞지 않는다는 연구 결과가 나옵니다.

정답 선지는 "incongruous with(기존 분류와 맞지 않는)" 이었습니다.

"indicative of(기존 분류를 가리키는)"를 고르면 틀립니다.

지문의 첫 내용(변온동물 분류)을 그대로 가져가면 오답이 됩니다.

---

딩고 지문(Inferences 유형)은 구조가 더 명확합니다.

> *"호주의 현대 딩고 개체군은 두 유전적으로 다른 집단으로 나뉜다. 많은 연구자들이 이를 약 150년 전 설치된 딩고 방어 울타리 때문이라고 설명해왔다. 그러나 고대 딩고 표본 DNA를 분석한 Wasef 연구팀은 이 설명을 거부한다."*

문제: "Wasef 연구팀이 기존 설명을 거부하는 이유를 직접 설명하는 발견은?"

정답은 "고대 딩고의 개체군 구조가 이미 2,000년 전에 지금과 같았다"는 것입니다.

울타리가 설치된 건 150년 전인데, 개체군 분리는 이미 2,000년 전에 완료됐다면 울타리 때문이라는 설명이 성립하지 않습니다.

지문의 구조가 이 논리를 담고 있습니다.

**"일반적 설명 → 새 연구의 반박"**

이 구조를 파악하고 있으면 문제의 방향이 보입니다.

---

## 자주 묻는 질문 (FAQ)

### 지문이 새 것이면 기출 공부가 의미 없는 것 아닌가요?

지문 내용을 암기하는 방식의 기출 공부는 의미가 없습니다.

그러나 이번 분석에서 확인된 것처럼, **지문이 전개되는 논리 구조의 85%는 기존과 동일**합니다.

College Board는 새 주제를 담은 지문을 만들 때도 반복적인 논리 전개 방식을 씁니다.

이 패턴에 익숙해지는 훈련은 새 지문 앞에서도 유효합니다.

### 이번 시험에서 반전 구조 지문이 많았던 것은 일시적인 것 아닌가요?

한 회차 데이터만으로 경향성을 단정하기는 어렵습니다.

다만 기존 데이터베이스에서 2%에 불과하던 구조가 이번 시험에서 20%로 나타난 것은 통계적으로 유의미한 변화입니다.

College Board가 이 구조를 점진적으로 더 많이 활용하고 있을 가능성이 있습니다.

다음 시험까지 이 구조에 대한 준비를 해두는 것은 합리적입니다.

### 이번 분석에서 제외된 내용이 있나요?

네, 스킬별 출제 비중 변화(각 문항 유형이 몇 개씩 나왔는지)는 이번 포스팅에서 다루지 않았습니다.

또한 구체적인 학습 전략(어떻게 공부할 것인가)도 이 포스팅의 범위 밖입니다.

이번 포스팅은 이번 시험과 기존 시험이 구조적으로 어떻게 달랐는지를 데이터로 확인하는 데 집중했습니다.

### 이번 시험의 난이도는 어땠나요?

이번 분석은 난이도 측정이 아니라 구조 비교를 목적으로 했습니다.

다만 반전 구조 지문의 급증은, 지문 자체가 어려운 것과는 다른 종류의 어려움을 만들 수 있습니다.

"지문을 읽었는데 무슨 말인지 모르겠다"가 아니라 "읽었는데 처음 이해한 내용이 틀렸다"는 혼란입니다.

자녀분이 "지문은 읽혔는데 답이 이상했다"고 했다면, 반전 구조 지문에서 이 혼란을 경험한 것일 수 있습니다.

---

## 이것 기억하세요

이번 8월 SAT RW에서 확인된 것은 세 가지입니다.

**첫째**, 지문 내용은 54개 중 53개가 완전히 새 것이었습니다. College Board는 내용을 계속 교체합니다.

**둘째**, 지문이 전개되는 논리 구조의 85%는 기존과 동일했습니다. College Board는 틀은 재사용합니다.

**셋째**, "기존 통설을 새 연구가 뒤집는 구조"의 지문이 기존 2%에서 20%로 10배 급증했습니다. 이것이 이번 시험에서 달랐던 단 하나의 핵심이었습니다.

---

자녀분이 이번 시험 직후 "뭔가 달랐다"고 했다면, 지문 내용이 어려웠다기보다 지문이 처음 제시하는 정보와 실제 정답이 가리키는 방향이 반대였던 경험을 한 것일 수 있습니다.

이 구조는 익숙해지면 오히려 방향을 잡기 쉽습니다.

지문이 "A라고 알려져 있습니다"로 시작한다면, 뒤에 반전이 올 수 있다는 신호로 읽을 수 있기 때문입니다.

College Board 기출 1,556개 문항과 이번 8월 시험 전체를 분석한 자료를 바탕으로, SuperfastSAT에서는 이 구조를 포함한 지문 패턴 훈련을 진행하고 있습니다.

---

## 레퍼런스

1. College Board. *SAT Question Bank — Reading & Writing (Official Released Items)*. College Board, 2026. [https://satsuite.collegeboard.org/sat/practice-preparation/practice-tests](https://satsuite.collegeboard.org/sat/practice-preparation/practice-tests)
2. College Board Question Bank — RW 전체 1,556개 문항 지문 구조 분석, SuperfastSAT 분석 (2026). 분석 방법: CP(Content Point) 라벨링 v2 시스템, I/C/CL 3분류.
3. August 2026 SAT RW 문제 세트. 출처: t.me/SATGoddess (수험생 공유 로그 재구성). 분석: SuperfastSAT (2026-08-24).
`

const html = marked(markdownBody)

console.log(`[Landing] 모드: ${isDraft ? 'draft (is_published=false)' : 'publish (is_published=true)'}`)

publishToLanding({
  id: 'august-2026-sat-rw-analysis',
  title: '2026년 8월 SAT RW 분석 — 기존 시험과 무엇이 달랐나',
  content: html,
  excerpt: '이번 8월 SAT, 자녀가 \'뭔가 달랐다\'고 했다면 이유가 있습니다. 지문 내용은 전부 새 것이었지만, 지문 구조의 85%는 기존과 동일했습니다. 달라진 단 하나의 핵심을 분석합니다.',
  description: '2026년 8월 SAT RW 전체 지문을 기존 1,556개 문항과 비교 분석했습니다. 지문 내용은 100% 새 것이지만 흐름 패턴 85%는 동일. 달라진 한 가지 구조를 데이터로 확인합니다.',
  featured_image: null,
  category: 'SAT 시험 분석',
  tags: ['2026년 8월 SAT', 'SAT RW 분석', 'Digital SAT', 'SAT 지문 구조', 'SAT 시험 분석', 'College Board', 'SAT 독해', '학부모 SAT'],
  author: '배병윤',
  date: '2026-08-24',
  focus_keyword: '2026년 8월 SAT 분석',
  is_published: !isDraft
})
