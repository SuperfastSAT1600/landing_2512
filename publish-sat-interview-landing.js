require('dotenv').config({ path: '.env.local' })
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding({ id, title, content, excerpt, description, featured_image, category, tags, author, date, focus_keyword }) {
  const body = JSON.stringify({
    id, title, content, excerpt, description,
    featured_image: featured_image || null,
    category, tags: tags || [],
    author: author || 'SuperfastSAT',
    date, focus_keyword: focus_keyword || null,
    cta_featured: false
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
          console.log('✅ 랜딩 페이지 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('ID:', post.id)
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

const content = `
<p>3월 SAT 성적이 발표됐습니다.</p>
<p>목표 점수를 받은 학생이 있고, 아깝게 못 받은 학생이 있습니다.<br>
둘의 차이가 오직 공부량에서 온다고 생각한다면, 이 인터뷰가 도움이 될 것입니다.</p>
<p>이번에 1500점을 넘긴 학생과 카카오톡으로 30분 인터뷰를 진행했습니다.<br>
SuperfastSAT 마케터 Jimi가 직접 진행한 첫 번째 학생 인터뷰입니다.</p>
<p>대화는 최대한 원본 그대로 가져오되, 읽기 편하게 일부 표현만 다듬었습니다.</p>

<hr>

<h2>시험 한 달 전, 어떤 상황이었나요</h2>

<p>이 학생의 마지막 SAT는 8월이었습니다.<br>
3월 시험까지 약 7개월의 공백이 있었습니다.</p>

<blockquote>
"시험 한 달 전에는 다시 감을 잡지 못할까봐 불안한 게 컸고,<br>
공부할수록 그래도 시험장에서 집중만 잘하고 컨디션 관리만 잘하면<br>
원하던 점수 받을 수 있겠구나 하는 확신이 조금씩 생기긴 했습니다."
</blockquote>

<p>한두 문제 차이로 목표 점수에 닿지 못한 경험이 있었습니다.<br>
SAT에 운도 작용한다는 걸 알기에 자신이 없었지만, 스스로를 믿는 방향이<br>
멘탈 관리에 더 낫다고 판단했습니다.</p>

<blockquote>
"전날 잠도 잘 자고 모듈 1 보는데 평소보다 집중이 잘돼서 그렇게 느꼈어요."
</blockquote>

<p>시험 당일 컨디션이 좋았다고 했습니다.<br>
우연이 아닙니다. 의도적으로 준비한 결과입니다.</p>

<blockquote>
"저는 제 리딩 실력을 객관적으로 잘 알고 있다고 생각해서<br>
그쪽으로는 일단 믿어보기로 하고 컨디션 관리에 집중했어요.<br>
코치님도 그 부분 가장 강조하셨구요."
</blockquote>

<p>시험 당일 퍼포먼스는 준비한 양이 아니라 그날의 상태에서 결정됩니다.</p>

<p>공부가 쌓여 있어도 수면이 부족하거나 긴장이 지나치면<br>
아는 문제를 틀립니다.<br>
이 학생은 그 사실을 알고 있었고, 그에 맞게 준비 방향을 조정했습니다.</p>

<hr>

<h2>RW에서 가장 어려웠던 유형</h2>

<blockquote>
"신경 쓰인 유형은 RW 중에 Cross-Text Connection이랑 Inference였던 것 같아요.<br>
SAT 옵션들이 crystal clear한 것도 아니고 가끔 gray area가 있는데<br>
그걸 파헤쳐 나가는 데 감이 중요한 것 같았어요."
</blockquote>

<p>Cross-Text Connection과 Inference는 디지털 SAT RW에서<br>
정답의 경계가 가장 얇은 유형입니다.<br>
"다음에 뭘 말할까요?" 형식의 질문은<br>
학생 본인의 논리와 출제자의 논리가 다를 수 있습니다.</p>

<blockquote>
"매번 코치님이랑 inference 오답 리뷰 하면서 열띤 토론을 펼쳤습니다… 매번."
</blockquote>

<p>그러면 이 학생은 이 시험을 '정직한 시험'이라고 생각할까요.</p>

<blockquote>
"저는 한 30%만 동의합니다."
</blockquote>

<p>1500점을 넘긴 학생의 솔직한 답입니다.<br>
점수가 오른 이유가 시험이 공정해서가 아니라는 뜻이기도 합니다.<br>
gray area를 다루는 감각을 훈련했기 때문입니다.</p>

<hr>

<h2>이 시험을 준비하는 학생들에게</h2>

<blockquote>
"입시에 중요한 시험이여서 부담되고 떨리겠지만<br>
저 믿고 마음 편하게 가지려고 노력해보세용 😸"
</blockquote>

<p>부담을 부정하지 않는다는 점이 이 말의 힘입니다.<br>
"괜찮을 거야"가 아니라 "부담스럽다는 걸 안다, 그래도 마음을 고르는 연습을 해"입니다.</p>

<p>인터뷰 중 예상 밖의 답이 나온 순간이 있었습니다.<br>
"이 입시 과정에서 남기고 싶은 것이 있다면?" 이라는 질문에</p>

<blockquote>
"오래도록 제 주변에 남을 좋은 사람들이요."
</blockquote>

<p>점수도 합격도 아니었습니다.</p>

<blockquote>
"성적, 점수, 대학 입시 결과 물론 중요하지만<br>
장기적으로 봤을 때 저에게 가장 중요하고 도움되는 존재가 사람인 것 같아요.<br>
그래서 저도 저보다 어린 친구들이 성적에 너무 눈멀지 않았으면 좋겠습니다."
</blockquote>

<p>인터뷰 말미에 코치에 대한 말도 남겼습니다.</p>

<blockquote>
"벤 코치님께 그동안 답답하셨을텐데 수고 정말 많으셨다고 감사하다고 전해주세요."
</blockquote>

<hr>

<h2>입시를 끝낸 미래의 나에게</h2>

<blockquote>
"이제 시작이다~"
</blockquote>

<p>SAT 준비부터 원서 제출까지 몇 달을 달려온 학생이 남긴 세 글자입니다.</p>

<p>두 가지가 들어 있습니다.</p>

<p>하나는 현실 인식입니다.<br>
대학에 가고 나서도 해야 할 것들이 있다는 것을 알고 있습니다.<br>
입시를 끝으로 보지 않는다는 뜻입니다.</p>

<p>다른 하나는 가벼움입니다.<br>
물결표 하나("~")에 긴장이 풀린 느낌이 담겨 있습니다.<br>
무겁게 끝낸 것이 아니라, 다음을 향해 몸을 돌린 것입니다.</p>

<p>SuperfastSAT에서 학생들을 지켜보면서 반복적으로 확인하는 것이 있습니다.<br>
목표 점수에 도달한 학생들의 공통점은<br>
이 시험에 모든 것을 건 사람이 아니라,<br>
이 시험을 잘 마치고 다음으로 넘어간 사람이라는 것입니다.</p>

<p>이것 기억하세요.</p>

<p>점수는 준비한 양에서만 오지 않습니다.<br>
컨디션을 관리하고, gray area를 훈련하고, 마음을 고르는 연습이<br>
그날 시험장에서의 퍼포먼스를 만듭니다.</p>

<hr>

<h2>자주 묻는 질문</h2>

<p><strong>Q. SAT는 열심히 하면 점수가 오르는 시험인가요?</strong><br>
1500점을 넘긴 이 학생은 "30%만 동의한다"고 답했습니다. 공부량만으로는 설명되지 않는 gray area가 있고, 그것을 다루는 감각은 훈련으로 만들어집니다. 정직한 시험이기도 하고, 준비 방향이 틀리면 공부량이 점수로 이어지지 않는 시험이기도 합니다.</p>

<p><strong>Q. Cross-Text Connection과 Inference는 어떻게 준비해야 하나요?</strong><br>
이 학생이 "gray area를 파헤치는 데 감이 중요하다"고 표현한 유형입니다. 오답 리뷰를 통해 출제자의 논리를 반복적으로 추적하는 훈련이 핵심입니다. 내가 맞다고 생각한 이유와 정답이 다를 때, 그 차이를 분석하는 과정이 실력이 됩니다.</p>

<p><strong>Q. 시험 전날 어떻게 준비하는 것이 좋은가요?</strong><br>
이 학생은 수면과 컨디션 관리를 가장 중요하게 다뤘습니다. 시험 당일 아는 문제를 틀리는 주요 원인 중 하나는 피로와 긴장입니다. 전날은 새로운 공부보다 충분한 수면과 안정적인 루틴 유지가 퍼포먼스에 직접 영향을 줍니다.</p>

<hr>

<p>만약 나의 SAT 공부 스토리, 입시 스토리를 이렇게 남겨보고 싶다면 연락주세요.<br>소정의 선물을 드리겠습니다.</p>

<div style="text-align:center; margin: 32px 0;">
  <a
    href="https://open.kakao.com/o/s858Ajch"
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
    카카오톡으로 인터뷰 신청하기🖐️
  </a>
</div>

<hr>

<p><em>최종 업데이트: 2026년 4월</em></p>
<p><strong>배병윤 (Byungyun Bae)</strong><br>
SuperfastSAT 대표. SAT·AP 온라인 학습 환경 설계 전문가로, 디지털 SAT 채점 구조와 문항 유형별 전략을 연구하고 가르칩니다.<br>
<a href="https://www.linkedin.com/in/%EB%B3%91%EC%9C%A4-%EB%B0%B0-82392a2a5/">LinkedIn</a></p>
`

publishToLanding({
  id: 'sat-1500-student-interview-march-2026',
  title: '1500점 넘긴 학생이 인터뷰에서 꺼낸 말 — "이제 시작이다"',
  content,
  excerpt: '3월 SAT에서 1500점을 넘긴 학생과 카카오톡 인터뷰를 진행했습니다. 공부량보다 컨디션 관리를 선택한 이유, gray area를 30% 동의한다는 솔직한 답, 그리고 "이제 시작이다~"라는 마지막 한 마디.',
  description: '3월 SAT 1500점 학생 인터뷰. 컨디션 관리, RW inference와 cross-text connection 준비 전략, 그리고 입시를 끝낸 후 남긴 메시지를 담았습니다.',
  featured_image: null,
  category: '학생 인터뷰',
  tags: ['SAT', '1500점', '학생 인터뷰', '3월 SAT', 'RW', '컨디션 관리'],
  author: '배병윤',
  date: new Date().toISOString().split('T')[0],
  focus_keyword: 'SAT 1500점 인터뷰'
})
