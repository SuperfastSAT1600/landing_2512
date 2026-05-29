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

// 마크다운 본문 (frontmatter 제외)
const markdownBody = `
5월 SAT가 끝났습니다.

시험 직후 분석 자료를 보면 "이런 게 나왔구나" 하고 넘어가게 됩니다. 그런데 그 분석이 지금 내가 풀어야 할 문제와 어떻게 연결되는지 명확하지 않으면, 분석은 읽고 끝나는 정보에 그칩니다.

이 글은 5월 SAT 분석 결과를 sub-skill 단위로 쪼개서, 6월 시험 전까지 어떤 문제 유형을 집중적으로 연습해야 하는지 목록 형태로 정리합니다.

---

> **TL;DR**
>
> - RW: **that 식별 훈련**, **Rhetorical Synthesis 교차검증**, **문맥 어휘(Words in Context)** 3가지가 핵심
> - 수학: **이차함수 모델링**, **W2E 긴 지문 읽기**, **기울기·그래프 해석(PSDA)** 3가지가 핵심
> - 5월에서 난이도가 올라간 sub-skill은 6월에도 동일한 방식으로 출제될 가능성이 높습니다

---

## RW 대비: 3개 영역, 6개 sub-skill

### 1. SEC — Standard English Convention

#### Sub-skill 1: Verb Forms (finite vs. infinite)

5월 SEC에서 가장 많이 출제된 개념입니다. 새로운 개념이 아닙니다. 달라진 것은 **빈칸이 포함된 문장의 길이**입니다. 수식어구가 많아진 긴 문장 안에서 finite verb와 infinite verb를 판단해야 합니다.

연습할 문제 유형:
- 주어와 동사 사이에 수식어구(분사구, 관계절)가 2개 이상 들어간 문장의 동사 형태 선택
- 병렬 구조에서 finite/infinite 일치 여부 판단
- College Board QB에서 Verb Forms 태그 문제, Medium-Hard 위주

#### Sub-skill 2: that 식별 (관계대명사 / 접속사 / 동격)

5월 시험의 킬러 문제였습니다. *that*이 어떤 역할을 하는지 구분하지 못하면 Punctuation 문제 전체가 흔들립니다.

세 가지를 구분할 수 있어야 합니다:

| that의 역할 | 예시 | 판단 기준 |
|---|---|---|
| 관계대명사 | the book *that* I read | 선행사(명사) + that + 불완전 문장 |
| 접속사 (명사절) | She said *that* she left | 동사 + that + 완전 문장 |
| 동격 | the fact *that* he lied | 추상명사 + that + 완전 문장 |

연습할 문제 유형:
- 보기 4개 모두 다른 that 구조가 있는 Punctuation 문제
- that 절의 앞뒤 쉼표 유무를 묻는 문제
- 관계대명사 which와 that 교체 가능 여부 판단

#### Sub-skill 3: Supplements — essential vs. non-essential

5월에도 각 1문제 이상 출제되었습니다. 수식어구가 문장에 필수적인지 부수적인지 판단해야 쉼표 사용 여부를 결정할 수 있습니다.

연습할 문제 유형:
- 삽입구·삽입절의 쉼표·대시 처리
- 관계절에서 제한적(restrictive) vs. 비제한적(non-restrictive) 구분

---

### 2. EOI — Expression of Ideas

#### Sub-skill 4: Transition Phrase (단어 → phrase 수준)

3월까지는 *however*, *therefore* 같은 단어 보기가 주였습니다. 5월에는 *Contrary to this phenomenon*, *Undermining this explanation* 같은 phrase 보기가 늘었습니다.

같은 기능처럼 보이는 phrase 사이의 미세한 차이를 구분해야 합니다. 예: *specifically*와 *in turn*의 차이, *contrary to*와 *despite*의 차이.

연습할 문제 유형:
- 보기가 모두 phrase 형태인 Transition 문제
- 부연설명(elaboration) 기능의 phrase vs. 대조(contrast) 기능의 phrase 구분
- QB에서 Transitions 태그 문제, Hard 집중

#### Sub-skill 5: Rhetorical Synthesis 교차검증

5월에 가장 크게 변한 sub-skill입니다. 1문제에서 3문제로 늘었습니다. 질문과 보기만 봐서는 풀리지 않고, **노트 2~3개의 정보를 비교·종합**해야 합니다.

교차검증이 필요한 문제의 특징:
- "두 노트 모두를 활용하여" 또는 "다음 정보를 바탕으로" 같은 지시어
- 보기가 특정 노트 하나만 인용하면 오답인 경우
- 노트 간 정보 방향이 다를 때 어느 쪽에 가중치를 두는지 묻는 경우

연습할 문제 유형:
- 노트 3개 이상 포함된 Rhetorical Synthesis 문제
- 보기가 노트 조합 방식에 따라 나뉘는 문제
- 문제당 시간 제한을 45~60초로 설정하고 연습

---

### 3. Craft & Structure / Information & Ideas

#### Sub-skill 6: Words in Context — 문맥적 의미 변화

5월에서 가장 많은 반응을 일으킨 유형입니다. 단어 자체는 알고 있는데, **이 문맥에서 그 뜻이 통하지 않는다**는 상황이 반복되었습니다.

5월에 출제된 대표 사례:

| 단어 | 일반적인 뜻 | 5월에 쓰인 의미 |
|---|---|---|
| Nature | 자연 | 내재적 속성 |
| Address | 주소 | 역점을 두다 / 다루다 |
| Plastic | 플라스틱 | 유연한 적응력 |
| Foreground | 전경 | 강조하다 (동사) |

연습 방법:
- 단어 암기보다 **같은 단어의 다른 쓰임새** 예문 수집
- QB에서 Words in Context Hard 문제 풀 때, 보기 4개 중 내가 아는 뜻과 다른 보기가 정답일 가능성을 먼저 의심
- *Substantiate*, *Preclude* 등 보기에 배치된 고난도 어휘 별도 정리

---

## 수학 대비: 3개 sub-skill

### Sub-skill 1: 이차함수 모델링

5월 수학의 핵심 변화입니다. 기존 일차함수 중심의 모델링 문제가 이차함수로 확대되었습니다.

연습할 문제 유형:
- 이차함수 f(x) = ax² + bx + c에서 a, b, c 의미 해석
- 꼭짓점 형태 f(x) = a(x-h)² + k에서 최솟값·최댓값 문맥 연결
- 이차함수 그래프와 현실 상황(포물선 경로, 이익 최대화 등) 연결
- 판별식 D < 0, D = 0, D > 0의 의미를 그래프 위에서 판단하는 유형

추가 준비:
- 이차함수와 일차함수의 연립 (교점 개수 판단)
- f(x) > 0인 x의 범위 구하기 (그래프 해석 기반)

### Sub-skill 2: W2E — Word to Equation, 긴 지문

5월에 W2E 문제의 지문이 2~3문장에서 4~5문장으로 늘었습니다. 유형 학습에 집중해 문제를 끝까지 읽지 않는 습관이 있다면 이 변화가 직격탄이 됩니다.

연습 방향:
- W2E 문제를 풀 때 지문 전체를 읽고 식 세우는 연습
- 핵심 수치가 문장 중간에 묻혀 있는 경우를 의도적으로 연습
- QB에서 W2E 태그 Medium-Hard 문제 15개 이상, 지문 전체 읽기 의무화

### Sub-skill 3: Problem-Solving & Data Analysis — 기울기·그래프 해석

5월에 Algebra 비중이 낮아지고 PSDA 비중이 올라갔습니다. 특히 기울기 개념이 PSDA 쪽에 편입되었습니다.

연습할 문제 유형:
- 그래프에서 기울기를 읽고 단위 변화율로 해석하는 문제
- 그래프의 특정 구간에서 증가·감소·최솟값 판단
- 산점도(scatter plot)에서 선형 관계의 방향·강도 해석
- 데이터 해석과 텍스트 논증이 결합된 그래프 문제 (지문 읽기 + 수치 판단 동시)

---

## 연습 우선순위 정리

6월 시험까지 남은 시간이 촉박하다면, 다음 순서로 집중하세요.

| 우선순위 | Sub-skill | 이유 |
|---|---|---|
| 1 | Rhetorical Synthesis 교차검증 | 5월에 가장 크게 늘었고 시간 소모가 가장 큼 |
| 2 | that 식별 | 킬러 문제로 등장, 한 번 틀리면 연쇄 오답 가능성 |
| 3 | 이차함수 모델링 | 수학 Module 2에서 4문제 이상 출제 |
| 4 | Words in Context Hard | 아는 단어인데 틀리는 함정, 체감 난이도 높음 |
| 5 | W2E 긴 지문 | 지문 길이 적응에 연습량 필요 |
| 6 | PSDA 기울기·그래프 | 개념은 같지만 출제 위치가 바뀐 것에 적응 |

---

## 한 가지만 기억한다면

5월 SAT는 새 개념을 내지 않았습니다. **같은 개념을 더 긴 문장, 더 정교한 함정, 더 많은 교차검증으로 포장**했습니다.

6월 시험도 같은 방향일 가능성이 높습니다. 새로운 개념을 찾아 공부하는 것보다, 이미 알고 있는 개념을 **더 복잡한 문장 구조, 더 긴 지문 안에서 정확하게 적용**하는 연습에 집중하는 것이 실질적입니다.

각 sub-skill의 Hard 문제를 College Board QB에서 골라 시간 제한을 걸고 풀어보세요. 틀렸을 때 "왜 틀렸는가"보다 "이 함정이 어디서 왔는가"를 분석하는 것이 6월 대비의 핵심입니다.

---

## 자주 묻는 질문

### 6월 SAT는 5월과 같은 유형이 나오나요?

정확히 같은 문제는 나오지 않습니다. 하지만 출제 방향성과 난이도 설계 기조는 연속성이 있습니다. 5월에 킬러 문제로 등장한 that 식별, Rhetorical Synthesis 교차검증 3문제 구조는 6월에도 유지되거나 강화될 가능성이 높습니다.

### Words in Context 어휘는 어떻게 외우나요?

외우는 접근이 맞지 않습니다. 5월 시험의 핵심은 "아는 단어인데 이 문맥에서 그 뜻이 통하지 않는다"는 상황이었습니다. 단어의 기본 뜻 외에 문맥에 따른 확장 의미를 예문으로 익히는 것이 효과적입니다. 특히 동사로 쓰이는 명사, 추상적 의미로 쓰이는 구체적 단어에 집중하세요.

### 수학 Module 2가 어렵다면 어디서 시작해야 하나요?

이차함수 모델링과 W2E 긴 지문부터 시작하세요. 이 두 유형이 5월 Hard Module 2에서 집중 출제되었고, 둘 다 개념 자체는 어렵지 않지만 문제 읽기 훈련이 부족하면 틀리는 유형입니다.
`

const html = marked(markdownBody)

console.log(`[Landing] 모드: ${isDraft ? 'draft (is_published=false)' : 'publish (is_published=true)'}`)

publishToLanding({
  id: 'june-sat-subskill-practice-guide',
  title: '6월 SAT 대비 — 5월 시험 분석으로 찾은 sub-skill별 핵심 연습 목록',
  content: html,
  excerpt: '5월 SAT 분석 결과를 sub-skill 단위로 쪼갰습니다. 6월 시험 전 남은 시간에 어떤 문제 유형을 집중 연습해야 하는지 RW와 수학으로 나눠 정리합니다.',
  description: '5월 SAT에서 변한 것: that 식별, Rhetorical Synthesis 교차검증 3문제, 이차함수 모델링 확대. 6월 시험 전 집중해야 할 RW·수학 sub-skill 목록을 정리합니다.',
  featured_image: null,
  category: 'SAT 시험 분석',
  tags: ['SAT', '6월SAT', 'SAT대비', 'sub-skill', 'SAT RW', 'SAT수학'],
  author: '배병윤',
  date: '2026-05-23',
  focus_keyword: '6월 SAT 대비',
  is_published: !isDraft
})
