require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')
const https = require('https')

const isDraft = !process.argv.includes('--publish')

const [id, secret] = process.env.GHOST_ADMIN_KEY.split(':')

function getToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: id, typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url')
  const signature = crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

const CTA_HTML = `
<div style="text-align:center;">
  <a
    id="kakao-openchat-btn"
    href="https://superfastsat.com/api/kakao-redirect?source=ghost"
    target="_blank"
    rel="noopener noreferrer"
    style="
      display:inline-block;
      padding:14px 22px;
      border-radius:10px;
      background:#071be9;
      color:#ffffff;
      font-weight:600;
      text-decoration:none;
    "
  >
    카카오톡으로 수업 상담 신청하기🖐️
  </a>
</div>
`

async function publishToGhost({ title, html, excerpt, slug, metaTitle, metaDescription, tags }) {
  const token = getToken()
  const status = isDraft ? 'draft' : 'published'
  const body = JSON.stringify({
    posts: [{
      title,
      html: html + CTA_HTML,
      custom_excerpt: excerpt,
      slug,
      meta_title: metaTitle,
      meta_description: metaDescription,
      tags: tags.map(t => ({ name: t })),
      status
    }]
  })

  return new Promise((resolve, reject) => {
    const url = new URL(`${process.env.GHOST_URL}/ghost/api/admin/posts/`)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 201) {
          const post = JSON.parse(data).posts[0]
          console.log('✅ Ghost 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('URL:', post.url)
          resolve(post)
        } else {
          console.error('❌ 실패:', res.statusCode, data)
          reject(new Error(data))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

const POST_HTML = `
<blockquote>
  <strong>TL;DR</strong><br>
  5월 SAT는 새 개념 없음. RW에서 <em>that</em> 식별이 킬러 문제로 등장, Rhetorical Synthesis 교차검증이 1→3문제로 급증. 수학은 이차함수 모델링 확대, Problem-Solving 비중 상승.
</blockquote>

<p><em>마지막 업데이트: 2026-05-05</em></p>

<p style="text-align: left;">분석자료를 읽기 전에 앞서서, Adaptive test이기 때문에 저희가 풀어본 문제가 동일하게 나오지는 않을 것입니다. 따라서 "같은 문제가 시험에 나왔을 가능성은 매우 낮습니다". 대신, 저희가 풀어본 문제도 학생이 풀어본 문제도 모두 동일한 출제 원리과 방향성에 따라 만들어진 시험이기 때문에<strong> 이번 SAT시험에 대한 방향성에 초점</strong>을 맞춰서 분석자료를 보시면 보다 더 도움이 될 것 같습니다.</p>

<h2 style="text-align: left;">5월 RW 시험, 무엇이 바뀌었을까?</h2>

<p style="text-align: left;">새 개념은 출제되지 않았습니다. 3월에 등장했던 출제 경향이 그대로 유지되었고, 일부 영역에서는 <strong>지문 길이</strong>와 <strong>함정 보기의 정교함</strong>이 한 단계 더 올라갔습니다.</p>

<table style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1" style="text-align: center;"><p style="text-align: center;">영역</p></th><th colspan="1" rowspan="1" style="text-align: center;"><p style="text-align: center;">3월 대비 변화</p></th></tr><tr><td colspan="1" rowspan="1" style="text-align: center;"><p style="text-align: center;">Standard English Convention</p></td><td colspan="1" rowspan="1" style="text-align: left;"><p style="text-align: left;">새 개념 없음, 지문 길이↑</p></td></tr><tr><td colspan="1" rowspan="1" style="text-align: center;"><p style="text-align: center;">Expression of Ideas</p></td><td colspan="1" rowspan="1" style="text-align: left;"><p style="text-align: left;">비중 1-2문제↓, Transition phrase 출제↑, Rhetorical Synthesis 교차검증 문제↑</p></td></tr><tr><td colspan="1" rowspan="1" style="text-align: center;"><p style="text-align: center;">Craft and Structure</p></td><td colspan="1" rowspan="1" style="text-align: left;"><p style="text-align: left;">지문 난이도 동일, 어휘 난이도 소폭↑, 인문/사회 지문 비중↑</p></td></tr><tr><td colspan="1" rowspan="1" style="text-align: center;"><p style="text-align: center;">Information and Ideas</p></td><td colspan="1" rowspan="1" style="text-align: left;"><p style="text-align: left;">지문 난이도 동일, 인문/사회 지문 비중↑, 그래프 문항 위치 동일</p></td></tr></tbody></table>

<h3 style="text-align: justify;"><strong>1. SEC(Standard English Convention): 개념은 그대로, 지문은 더 길게</strong></h3>

<p style="text-align: justify;">5월 SEC에서 새로운 개념은 등장하지 않았습니다. Subject-Verb Agreement, Verb Forms, Subject-Modifier Placement, Plural and Possessive Nouns, Pronoun-Antecedent Agreement — 이 다섯 개념이 각각 1개 이상씩 골고루 출제되었습니다.</p>

<p style="text-align: justify;">이 중 가장 많이 나온 것은 <strong>Verb Forms</strong>, 그 안에서도 finite verb와 infinite verb를 구분하는 유형이었습니다. 3월에도 같은 개념이 출제되었지만, 5월에는 빈칸이 들어간 문장이 더 길어지고 수식어구가 더 많아졌습니다. 개념이 달라진 것이 아니라 <strong>같은 개념을 더 긴 문장 안에서 판단하도록 요구한 것</strong>입니다.</p>

<p style="text-align: justify;">Linking Clauses, Supplements, Punctuation도 각각 1개 이상 골고루 출제되었습니다. 이 중에서 <strong>Punctuation 영역에서 <em>that</em>의 쓰임새를 식별해야 풀 수 있는 문제</strong>가 이번 시험의 킬러 문제였습니다. <em>that</em>이 관계대명사인지, 접속사인지, 동격인지를 구분해야만 보기 4개 중 정답 하나를 가릴 수 있는 구조였습니다. 3월 시험에는 <em>that</em> 식별 자체가 킬러 문제로 분류되지 않았는데, 5월에는 이 부분이 정답률을 가르는 변별 포인트로 올라왔습니다.</p>

<img src="https://ualucbrrfvysmfytkdew.supabase.co/storage/v1/object/public/uploads/2026/05/1777881177903-e1a00a73-_____2026-05-04_165249.png" alt="supplements: essential element vs. non-essential element 구별하기">

<h3 style="text-align: justify;"><strong>2. EOI(Expression of Ideas): Rhetorical Synthesis 난이도 상승</strong></h3>

<p style="text-align: justify;">EOI 영역의 큰 그림은 3월과 같습니다. <strong>전체 비중이 1-2문제 줄어든 흐름</strong>이 5월에도 그대로 이어졌습니다.</p>

<p style="text-align: justify;">다만 안에서 두 가지가 달라졌습니다.</p>

<p style="text-align: justify;">첫째, <strong>Transition phrase가 보기로 나오는 문제가 늘었습니다</strong>. 3월까지는 <em>however</em>, <em>therefore</em> 같은 단어 수준의 보기가 주를 이뤘다면, 5월에는 <em>Contrary to this phenomenon</em>, <em>Undermining this explanation</em>, <em>Confirming this hypothesis</em> 같은 phrase 보기가 모듈 1·2에서 각각 1문제씩 늘어났습니다.</p>

<p style="text-align: justify;">함정 보기도 정교해졌습니다. 같은 부연설명 기능처럼 보이는 <em>specifically</em>와 <em>in turn</em>의 차이를 물었습니다. 지문 난이도 자체는 오르지 않았기 때문에 난이도 변화는 크지 않은 것으로 보이지만, 보기 수준에서의 함정은 3월보다 한 단계 올라온 것입니다.</p>

<p style="text-align: justify;">둘째, <strong>Rhetorical Synthesis에서 교차검증 문제가 늘었습니다</strong>. 이전에는 질문과 보기만 보고 빠르게 답을 구할 수 있는 "점수를 주는 문제"라고 여겨졌는데, 이제는 질문과 보기만 봐서는 풀리지 않고 노트의 정보를 비교하거나 종합해야 풀 수 있는 문제가 되었고 이렇게 교차 검증을 해야 하는 문제가<strong> 1문제에서 5월 3문제로</strong> 늘어났습니다. 평균 1문제당 시간이 최소 15초, 최대 30초씩 빠듯해집니다.</p>

<img src="https://ualucbrrfvysmfytkdew.supabase.co/storage/v1/object/public/uploads/2026/05/1777881367918-e8b64266-_____2026-05-04_165600.png" alt="교차검증이 필요한 Rhetorical Synthesis 문제">

<h3 style="text-align: justify;">Words in Context &amp; Module 2: 고정관념을 깨는 어휘와 전략적 시간 배분</h3>

<p style="text-align: justify;"><strong>Words in Context</strong>는 단순히 어려운 단어를 암기했는지가 아니라, 문맥에 따라 변화하는 단어의 '다양한 스펙트럼'을 포착할 수 있는지를 엄중히 물었습니다. reddit쪽 분위기로 보충 설명하자면 이전에는 "이런 단어는 처음 본다"는 식의 생소함을 토로하는 분위기였는데, 이번에는 "내가 알던 뜻이 이 맥락에서 통하지 않는다"는 반응이 가장 두드러졌습니다.</p>

<p style="text-align: justify;">환경이 아닌 '내재적 속성'을 뜻하는 <strong>Nature</strong>, 주소가 아닌 '역점을 두다'의 <strong>Address</strong>, 물질이 아닌 '유연한 적응력'을 의미하는 <strong>Plastic</strong>, 그리고 동사로 쓰여 '강조하다'라는 의미를 담은 <strong>Foreground</strong> 등이 대표적입니다. 그리고 지문 자체는 평이했어도, 보기에 배치된 Substantiate나 Preclude 같은 고난도 어휘들이 3월 대비 상향 평준화되면서 정답을 확정 짓는 데 더 많은 에너지를 소모하게 만들었습니다.</p>

<p style="text-align: justify;">이러한 어휘적 압박은 <strong>Module 2의 변별력 설계</strong>와 맞물려 시너지를 냈습니다. 상대적으로 논리가 명확한 과학 지문 비중이 줄어든 대신, 화자의 뉘앙스를 섬세하게 읽어야 하는 <strong>인문·사회 지문</strong>이 늘어난 점이 특징입니다. 특히 고득점군이 포진한 <strong>Hard Module 2</strong>에서는 어휘 문제로 시간을 갉아먹은 직후, 데이터 해석과 논증이 결합된 그래프 문제 3개를 연속으로 배치했습니다. 이는 단순 수치 확인을 넘어, 그래프의 특정 데이터가 지문의 가설을 어떻게 약화하거나 지지하는지 묻는 텍스트 헤비형 문항들이었으며, 결국 RW 섹션 후반부의 '타임 어택'을 결정짓는 핵심 변수가 되었습니다.</p>

<h2 style="text-align: left;">5월 Math 시험, 무엇이 바뀌었을까?</h2>

<h3 style="text-align: left;"><strong>1. 일차함수 모델링에서 이차함수 모델링으로</strong></h3>

<img src="https://ualucbrrfvysmfytkdew.supabase.co/storage/v1/object/public/uploads/2026/05/1777879456172-04bff5be-_____2026-05-04_162400.png" alt="w2e">

<p style="text-align: left;">기존에 2~3문장이던 문제 설명이 4~5문장으로 늘어난 모습이 눈에 띄었습니다. 평소 연습할 때 문제를 끝까지 읽지 않고 일부만 보면서 "이건 이런 유형이겠지"하고 <strong>유형 학습에 집중했던 학생이라면, 오히려 그 습관이 독이 되어 "생소한 유형"으로 느꼈을 가능성</strong>이 있습니다. 아래와 같은 문제에서 딱 2~3문장이 늘어난 형태가 M2에서 대거(4문제) 출제되었습니다.</p>

<h3 style="text-align: left;"><strong>2. W2E 문제에서 Word Part가 길어졌습니다.</strong></h3>

<p style="text-align: left;">기존에 2~3문장으로 설명을 하던 파트가 4~5문장으로 늘어난 모습을 볼 수 있었습니다. 평소 연습을 할 때, 문제를 다 읽지 않고 일부분만 보면서 "이 문제는 이런 문제겠지?"하고 &lt;유형 학습&gt;을 집중적으로 했다면 이것이 되려 독이 되어, "생소한 유형"으로 다가왔을 가능성이 있습니다. 아래와 같은 문제에서 딱 2~3문장 늘어난 문제가 M2에서 대거(4문제) 출제되었습니다.</p>

<img src="https://ualucbrrfvysmfytkdew.supabase.co/storage/v1/object/public/uploads/2026/05/1777879890998-0e919fe8-_____2026-05-04_163121.png" alt="4월 14일 공개된 c78bb2b8 문제">

<h3 style="text-align: left;"><strong>3. Algebra 비중 하락, Problem-Solving Data Analysis 비중 상승</strong></h3>

<p style="text-align: justify;"><strong>익숙한 개념을 생소한 방식으로 보여주겠다는 기조</strong>에 정확히 맞아떨진 변화였습니다. 일차함수의 기울기와 절편을 아예 Problem-Solving &amp; Data Analysis 쪽에 붙이고, Algebra에서는 연립일차방정식의 기하학적 해석만 묻는 구조로 가면, 두 영역 사이에 <strong>중복되는 출제 범위가 완전히 사라지게</strong> 됩니다.</p>

<img src="https://ualucbrrfvysmfytkdew.supabase.co/storage/v1/object/public/uploads/2026/05/1777880294862-eeb6f3b8-_____2026-05-04_163802.png" alt="기울기 개념을 묻는 Problem-Solving and Data Analysis">

<p style="text-align: left;">이런 흐름이 이어진다면, 하반기에는 <strong>그래프 해석 능력을 전제로 한 문제</strong>가 나올 수 있다고 예상합니다.</p>

<p style="text-align: left;">지금까지의 출제 패턴을 보면, 연립일차방정식은 도형과 엮어서 출제되었고, 일차식과 이차식 사이의 연립은 단순 연산 능력을 묻는 방식으로 나왔습니다. 하지만 앞으로는 <strong>solution의 개수를 판별식이 아닌 그래프 해석에 기반하여 묻는 문제</strong>가 등장할 수 있다고 봅니다.</p>

<p style="text-align: left;">구체적으로는 f(x) &gt; 0인 구간을 묻거나 D &lt; 0일 때의 의미를 그래프 위에서 판단하게 하는 유형이 가장 유력하며, 이때 <strong>함수에 변형(계수 조작, 평행이동 등)을 가한 상태</strong>에서 출제될 가능성이 높습니다.</p>

<h2>자주 묻는 질문</h2>

<h3>2026년 5월 SAT에서 새로운 개념이 출제되었나요?</h3>
<p>아닙니다. 5월 SAT는 3월에 등장한 출제 경향이 그대로 유지되었습니다. 달라진 것은 지문 길이, 함정 보기의 정교함, 영역별 비중입니다.</p>

<h3>5월 SAT RW에서 가장 큰 변화는 무엇인가요?</h3>
<p>두 가지입니다. 첫째, Punctuation 영역에서 <em>that</em>의 쓰임새(관계대명사·접속사·동격)를 식별해야 풀 수 있는 킬러 문제가 등장했습니다. 둘째, Rhetorical Synthesis 교차검증 문제가 1문제에서 3문제로 늘어 시간 압박이 커졌습니다.</p>

<h3>5월 SAT 수학에서 달라진 점은 무엇인가요?</h3>
<p>일차함수 모델링에서 이차함수 모델링으로 확대되었고, W2E 문제의 지문 길이가 2~3문장에서 4~5문장으로 늘었습니다. Algebra 비중이 하락하고 Problem-Solving &amp; Data Analysis 비중이 상승했습니다.</p>

<h3>Rhetorical Synthesis 교차검증 문제란 무엇인가요?</h3>
<p>질문과 보기만 보고 빠르게 답을 구하던 기존 방식과 달리, 노트의 정보를 비교·종합해야 정답을 구할 수 있는 유형입니다. 문제당 추가 소요 시간이 15~30초로, 3문제 연속 출제 시 전체 타임 배분에 직접적인 영향을 줍니다.</p>

<h3>6월 SAT 대비 시 5월 분석에서 가장 중요한 시사점은 무엇인가요?</h3>
<p>세 가지입니다. RW에서는 <em>that</em> 식별 훈련 강화, Rhetorical Synthesis에서 노트 교차검증 연습 필수. 수학에서는 이차함수 모델링 문제와 W2E 긴 지문 유형을 중점 연습해야 합니다.</p>
`

console.log(`[Ghost] 모드: ${isDraft ? 'draft' : 'published'}`)

publishToGhost({
  title: '2026년 5월 SAT 시험 분석 — RW·수학 출제 변화 완전 정리',
  html: POST_HTML,
  excerpt: '2026년 5월 SAT 시험에서 바뀐 출제 방향을 RW·수학 섹션별로 정리했습니다.',
  slug: 'may-sat-2026-trend-analysis',
  metaTitle: '2026년 5월 SAT 시험 분석 — RW·수학 출제 변화 완전 정리',
  metaDescription: '2026년 5월 SAT, 새 개념 없이 난이도가 올라갔습니다. RW에서 that 식별 킬러 등장, Rhetorical Synthesis 교차검증 3문제로 급증. 수학은 이차함수 모델링 확대.',
  tags: ['SAT', '5월SAT', 'SAT분석', 'SATRW', 'SAT수학']
})
