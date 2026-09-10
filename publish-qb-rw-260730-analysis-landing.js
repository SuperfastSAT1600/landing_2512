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
QB 문제를 새로 받아서 풀었는데, 체감 난이도가 완전히 달랐다는 반응이 많습니다.

평소에 맞히던 문제를 틀리고, 문장 구조가 복잡하게 느껴지고, 시간이 더 걸립니다. "내가 실력이 떨어진 건가"라는 생각이 드는 학생들도 있습니다.

실력이 아닙니다.

College Board가 2026년 7월 30일자로 QB RW 문제를 새로 공개했습니다. SuperfastSAT이 이 150개 문제를 전수 집계한 결과, 4월 공개분과 비교해서 Hard 비율이 대폭 올라간 것을 확인했습니다. 체감이 맞습니다. QB 구조 자체가 바뀐 것입니다.

어느 스킬에서 얼마나 바뀌었는지를 데이터로 정리합니다.

---

> **TL;DR**
>
> 7월 QB RW 150개 문제의 Hard 비율은 56.7%. 4월 공개분(31.3%)의 두 배에 가깝습니다. Boundaries Hard가 11.1%에서 66.7%로, Inferences Hard가 37.5%에서 75%로 급등했습니다. Transitions는 반대로 50%에서 23.8%로 내려갔습니다.

---

## Hard 문제가 절반을 넘었다 — 4월 대비 수치 비교

QB 문제 체감 난이도가 높아진 것은 주관적 인상이 아닙니다.

College Board Question Bank에 7월 30일자로 공개된 RW 문제는 150개입니다. 4월 공개분은 99개였습니다. 문제 수가 52% 늘었는데, 늘어난 문제 대부분이 Hard 영역에 몰렸습니다.

| 난이도 | 4월 공개분 (99개) | 7월 공개분 (150개) | 변화 |
|--------|------------------|--------------------|------|
| Easy | 34개 (34.3%) | 28개 (18.7%) | -15.6%p |
| Medium | 34개 (34.3%) | 37개 (24.7%) | -9.6%p |
| Hard | 31개 (31.3%) | 85개 (56.7%) | +25.4%p |

(출처: College Board Question Bank 260730 QB RW 150문제, SuperfastSAT 전수 집계, 2026-08)

4월 공개분은 Easy : Medium : Hard = 1 : 1 : 1의 균형 구조였습니다.

7월 공개분은 Hard가 전체의 절반을 넘었습니다.

Easy 비율이 34.3%에서 18.7%로 줄었다는 것은 단순히 "어려운 문제가 늘어난 것"이 아닙니다. QB가 점점 더 고득점 변별력 중심으로 설계되고 있다는 College Board의 방향성이 수치로 드러납니다.

[College Board SAT Suite of Assessments 공식 페이지](https://satsuite.collegeboard.org/sat)에서 QB 접근 방법을 확인할 수 있습니다.

> **인용 캡슐**: "260730 QB RW 150개 문제의 Hard 비율은 56.7%입니다. 4월 공개분의 Hard 비율 31.3%와 비교하면 25.4%p 상승했습니다." (SuperfastSAT 전수 집계, 2026-08)

---

## Boundaries — 11.1%에서 66.7%로, 가장 극적인 변화

스킬별로 변화의 폭이 다릅니다.

그중 가장 극적으로 달라진 스킬은 Boundaries입니다.

| 항목 | 4월 공개분 | 7월 공개분 |
|------|-----------|-----------|
| 총 문제 수 | 9개 | 21개 |
| Hard 문제 수 | 1개 | 14개 |
| Hard 비율 | 11.1% | 66.7% |

4월에는 Boundaries Hard 문제가 단 1개였습니다. 7월에는 21개 중 14개가 Hard입니다.

Boundaries는 문장 경계를 다루는 문법 스킬입니다. 마침표, 세미콜론, 쉼표, 대시 등으로 독립절과 종속절을 구분하는 유형입니다. 많은 학생이 "규칙만 외우면 풀리는 스킬"로 인식합니다.

Hard 단계의 Boundaries는 그렇지 않습니다.

College Board는 Hard Boundaries 문제에서 선택지 4개 중 3개에 문법적으로 허용 가능한 구두점을 배치합니다. "세미콜론이 맞는지 틀린지"를 묻는 구조가 아니라, 어떤 연결 방식이 지문의 문장 구조와 논리적으로 가장 적합한지를 묻는 구조입니다.

규칙을 안다는 것과 Hard Boundaries를 풀 수 있다는 것은 다른 문제입니다.

Boundaries Hard가 14개로 늘어난 것은 SEC(Standard English Conventions) 영역의 난이도가 전반적으로 올라간 흐름과 일치합니다.

[College Board의 SAT Digital Test Specifications 문서](https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec.pdf)에서 Boundaries 스킬의 공식 정의를 확인할 수 있습니다.

> **인용 캡슐**: "Boundaries Hard 비율이 11.1%에서 66.7%로 뛰었습니다. 규칙 암기로 접근하던 스킬이 논리 판단 기반의 고난이도 유형으로 재편됐습니다." (SuperfastSAT 분석, 2026-08)

---

## Inferences와 Words in Context — Hard 중심으로 이동

Boundaries만의 변화가 아닙니다.

Reading 영역의 핵심 스킬들도 Hard 중심으로 이동했습니다.

**Inferences**

| 항목 | 4월 공개분 | 7월 공개분 |
|------|-----------|-----------|
| 총 문제 수 | 8개 | 16개 |
| Hard 문제 수 | 3개 | 12개 |
| Hard 비율 | 37.5% | 75.0% |

Inferences는 문제 수가 두 배로 늘면서, Hard 비율도 37.5%에서 75.0%로 올랐습니다.

지문에서 명시되지 않은 정보를 추론해야 하는 유형입니다. 16개 중 12개가 Hard라는 것은, QB에서 Inferences를 연습하는 학생 대부분이 Hard 문제와 마주친다는 의미입니다.

Inferences Hard 문제는 지문이 말하는 것과 말하지 않는 것의 경계에서 작동합니다. "지문 어딘가에 있는 내용 아닌가"라는 생각으로 접근하면 Out of Scope 함정에 걸립니다.

**Words in Context**

| 항목 | 4월 공개분 | 7월 공개분 |
|------|-----------|-----------|
| 총 문제 수 | 15개 | 18개 |
| Hard 문제 수 | 4개 | 10개 |
| Hard 비율 | 26.7% | 55.6% |

WIC(Words in Context)에서도 Hard가 4개에서 10개로 늘었고, 비율이 26.7%에서 55.6%로 올랐습니다.

WIC는 "단어 뜻을 아는지"가 아니라 "문맥에서 어떤 뉘앙스가 맞는지"를 묻는 유형입니다. Hard WIC는 정답 선지와 오답 선지가 의미상 매우 가까운 단어로 구성되는 경우가 많습니다.

두 스킬 모두 총 문제 수 자체도 늘었고, 늘어난 문제 대부분이 Hard에 집중됐습니다. QB에서 Inferences나 WIC를 연습하면 자동으로 Hard 중심 연습이 됩니다.

> **인용 캡슐**: "Inferences Hard 비율이 37.5%에서 75.0%로 올랐습니다. 16개 중 12개가 Hard로, QB Inferences 연습은 곧 Hard 연습입니다." (SuperfastSAT 분석, 2026-08)

---

## 반전 — Transitions는 오히려 쉬워졌다

여기서 중요한 반전이 있습니다.

"Transitions가 어렵다"는 학생들이 있습니다. 그런데 7월 QB RW에서 Transitions는 다른 방향으로 움직였습니다.

| 항목 | 4월 공개분 | 7월 공개분 |
|------|-----------|-----------|
| 총 문제 수 | 12개 | 21개 |
| Hard 문제 수 | 6개 | 5개 |
| Hard 비율 | 50.0% | 23.8% |

문제 수는 12개에서 21개로 대폭 늘었습니다. 그런데 Hard 문제 수는 오히려 6개에서 5개로 줄었습니다.

Easy 8개 + Medium 8개 + Hard 5개의 분산 구조입니다.

4월에는 Transitions 절반이 Hard였습니다. 7월에는 Hard가 전체의 23.8%입니다.

이것이 왜 중요한가 하면, QB에서 Transitions가 어렵다고 느끼는 학생이라도 7월 공개분에서는 Easy, Medium 비율이 훨씬 높습니다. "Transitions가 어렵다"는 인식이 있다면, 실제로 어려움을 느끼는 것은 다른 스킬에서 오는 것일 가능성이 높습니다.

체감 난이도와 실제 구조가 다를 수 있습니다.

> **인용 캡슐**: "Transitions Hard 비율이 50%에서 23.8%로 감소했습니다. 7월 QB에서 Transitions는 오히려 Easy, Medium 비중이 높아진 스킬입니다." (SuperfastSAT 분석, 2026-08)

---

## Command of Evidence — 두 종류로 명시 분리

구조적 변화도 있습니다.

4월 공개분에서는 "Command of Evidence"로 하나로 묶여 있었습니다.

7월 공개분에서는 명시적으로 두 종류로 분리됐습니다.

| 유형 | 특징 | 7월 문제 수 | Hard 비율 |
|------|------|------------|-----------|
| Command of Evidence - Textual | 지문 인용, 시/산문 근거 선택 | 10개 | 80.0% |
| Command of Evidence - Quantitative | 표, 그래프, 데이터 수치 해석 | 8개 | 62.5% |

Textual은 10개 중 8개가 Hard입니다. Hard 비율 80%.

Quantitative는 표나 그래프에 제시된 데이터를 지문과 연결해 해석하는 유형입니다. 수치 해석 능력만으로 풀리는 것이 아닙니다. 지문의 주장과 데이터 사이의 논리적 관계를 파악해야 합니다.

두 유형이 명시적으로 분리된 것 자체가 신호입니다. College Board가 이 두 스킬을 시험에서 구분해서 다루겠다는 뜻입니다.

CoE 문제를 연습할 때, Textual인지 Quantitative인지를 구분해서 접근하는 것이 필요합니다. 같은 "Command of Evidence"라는 이름이지만 요구하는 능력이 다릅니다.

[College Board Question Bank 공식 접속 경로](https://qbank.collegeboard.org/)에서 유형별 문제를 직접 확인할 수 있습니다.

> **인용 캡슐**: "CoE가 Textual(Hard 80%)과 Quantitative(Hard 62.5%)로 명시 분리됐습니다. 같은 이름이지만 요구하는 능력이 다르고, 난이도도 다릅니다." (SuperfastSAT 분석, 2026-08)

---

## 7월 QB RW 전체 스킬별 Hard 비율 — 완전 정리

7월 QB RW 150개 문제에서 Hard는 85개, 전체의 56.7%입니다.

스킬별 Hard 비율을 전부 정리합니다.

| 스킬 | Hard 수 | Hard 비율 |
|------|---------|-----------|
| Cross-Text Connections | 3/3 | 100% |
| Command of Evidence - Textual | 8/10 | 80% |
| Inferences | 12/16 | 75% |
| Command of Evidence - Quantitative | 5/8 | 63% |
| Boundaries | 14/21 | 67% |
| Central Ideas and Details | 8/13 | 62% |
| Words in Context | 10/18 | 56% |
| Text Structure and Purpose | 6/11 | 55% |
| Rhetorical Synthesis | 6/12 | 50% |
| Form, Structure, and Sense | 8/17 | 47% |
| Transitions | 5/21 | 24% |

(출처: College Board Question Bank 260730 QB RW 150문제, SuperfastSAT 전수 집계, 2026-08)

Cross-Text Connections는 3문제 전부 Hard입니다. 표본이 적으니 주의가 필요하지만, College Board가 이 스킬의 Hard 비율을 높게 설계하고 있다는 방향은 일관됩니다.

Transitions는 24%로 유일하게 Hard 비율이 낮습니다. 나머지 10개 스킬 모두 Hard 비율이 47% 이상입니다.

이 표가 7월 QB의 실제 구조입니다.

QB로 특정 스킬을 연습한다는 것은, 이 비율에 해당하는 비중의 Hard 문제와 마주친다는 뜻입니다. Inferences를 QB로 연습하면 그 중 75%가 Hard입니다. Boundaries를 QB로 연습하면 66.7%가 Hard입니다.

QB 연습의 난이도를 조절하고 싶다면 어느 스킬을 선택해서 연습하는지를 결정하면 됩니다.

---

## 자주 묻는 질문 (FAQ)

### 260730 QB RW는 왜 더 어렵게 느껴지나요?

Hard 비율이 31.3%에서 56.7%로 올랐기 때문입니다. 4월 공개분은 Easy:Medium:Hard가 1:1:1이었는데, 7월 공개분은 Hard가 전체 절반을 넘었습니다. 체감이 맞습니다. QB 구조 자체가 바뀐 것입니다.

### Boundaries 문제가 갑자기 어려워진 이유는 무엇인가요?

Hard 비율이 11.1%에서 66.7%로 올랐습니다. Hard Boundaries는 규칙 암기로 풀리는 구조가 아닙니다. 선택지 4개 중 3개가 문법적으로 허용 가능한 구두점이고, 지문의 논리 구조와 가장 맞는 연결 방식을 판단해야 합니다.

### 7월 QB에서 가장 중요한 스킬은 무엇인가요?

Hard 비율이 가장 높은 스킬은 Cross-Text Connections(100%), CoE-Textual(80%), Inferences(75%), Boundaries(67%), CoE-Quantitative(63%)입니다. 다만 문제 수도 고려해야 합니다. Inferences 16개, Boundaries 21개로 문제 수가 많으면서 Hard 비율도 높은 스킬이 실질적으로 중요합니다.

### Transitions는 쉬워진 건가요?

7월 QB 기준으로는 Hard 비율이 50%에서 23.8%로 줄었습니다. Easy 8개, Medium 8개, Hard 5개로 상대적으로 균형잡힌 구성입니다. 하지만 Transitions 자체의 개념과 함정이 사라진 것은 아닙니다. QB 문제 구성이 다양해진 것입니다.

### Command of Evidence Textual과 Quantitative는 어떻게 다른가요?

Textual은 지문의 특정 부분이나 시/산문 인용이 어떤 주장의 근거가 되는지를 파악합니다. Quantitative는 표나 그래프의 데이터가 지문의 주장을 어떻게 뒷받침하거나 반박하는지를 판단합니다. 둘 다 Hard 비율이 높지만(Textual 80%, Quantitative 63%), 접근 방식이 다릅니다.

---

## QB 연습을 어떻게 활용할 것인가

7월 QB RW의 구조를 알았다면, 이것이 연습에 어떤 의미인지를 생각해 볼 필요가 있습니다.

Hard 위주로 집중 연습하고 싶다면 Inferences, Boundaries, CoE-Textual, CoE-Quantitative, Central Ideas and Details를 선택합니다. 이 스킬들의 Hard 비율이 62~80%입니다.

Easy-Medium 위주로 개념을 다지고 싶다면 Transitions, Form Structure and Sense 중심으로 접근합니다.

QB는 College Board가 직접 공개한 문제입니다. 실제 시험에서 나오는 문제와 가장 가까운 연습 자료입니다. 다만 7월 QB는 Hard 비율이 높게 설계되어 있습니다. QB 점수가 낮다고 느껴진다면, QB 자체의 난이도 구성을 먼저 이해하는 것이 출발점입니다.

현재 스킬별로 어디서 막히는지 파악하고, QB를 활용한 스킬 집중 연습이 필요하다면 SuperfastSAT 상담을 통해 학습 방향을 점검할 수 있습니다.

---

**저자**: 배병윤 (Byungyun Bae)
**소속**: SuperfastSAT 대표
SAT Reading and Writing 섹션의 스킬별 출제 구조와 QB 난이도 패턴을 분석합니다.
[LinkedIn](https://www.linkedin.com/in/%EB%B3%91%EC%9C%A4-%EB%B0%B0-82392a2a5/)

**마지막 업데이트**: 2026-08-04
`

const html = marked(markdownBody)

console.log(`[Landing] 모드: ${isDraft ? 'draft (is_published=false)' : 'publish (is_published=true)'}`)

publishToLanding({
  id: 'qb-rw-260730-analysis',
  title: '260730 QB RW 분석 — Hard 문제가 56.7%인 이유',
  content: html,
  excerpt: 'College Board가 2026년 7월 30일 공개한 QB RW 150개 문제 전수 분석. Hard 비율이 31.3%에서 56.7%로 급등했고, Boundaries는 11.1%에서 66.7%로 뛰었습니다. 데이터가 말하는 QB 구조 변화를 정리합니다.',
  description: '2026년 7월 QB RW 150문제 전수 분석. Hard 56.7%, Boundaries Hard 66.7%, Inferences Hard 75%, CoE-Textual Hard 80%. 4월 대비 무엇이 얼마나 바뀌었는지 스킬별 데이터로 확인합니다.',
  featured_image: null,
  category: 'SAT 분석',
  tags: ['SAT', 'SAT QB', 'College Board QB', 'SAT RW', 'SAT 난이도', 'QB 분석', 'Boundaries', 'Inferences'],
  author: '배병윤',
  date: '2026-08-04',
  focus_keyword: 'SAT QB',
  is_published: !isDraft
})
