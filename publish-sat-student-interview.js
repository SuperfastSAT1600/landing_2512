require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')
const https = require('https')

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
    카카오톡으로 즉시 상담받기🖐️
  </a>
</div>
`

const html = `
<p>시험이 끝나고 나면 학생들이 조금 달라집니다.</p>
<p>준비하는 동안에는 점수, 문제 유형, 시간 배분 이야기밖에 안 하다가<br>막상 끝나고 나면 전혀 다른 말을 꺼냅니다.</p>
<p>이 학생도 그랬습니다.</p>
<p>SAT와 미국 대입 과정을 마친 후, 카카오톡으로 짧은 인터뷰를 진행했습니다.<br>몇 가지 질문을 드렸는데, 마지막 두 질문의 답이 인상 깊어서 여기에 남깁니다.</p>

<hr>

<h2>다른 학생들에게 전하는 말</h2>

<blockquote>"입시에 중요한 시험이여서 부담되고 떨리겠지만<br>저 믿고 마음 편하게 가지려고 노력해보세용"</blockquote>

<p>한 줄짜리 답이지만, 두 가지가 들어 있습니다.</p>
<p>부담감을 부정하지 않는다는 것.<br>그리고 그럼에도 불구하고 마음을 놓는 연습이 필요하다는 것.</p>
<p>SAT를 준비하는 학생들이 가장 많이 겪는 어려움 중 하나는<br>"열심히 하는데 실력이 안 느는 것 같다"는 불안감입니다.<br>그 불안이 쌓이면 시험장에서 아는 문제도 틀리게 됩니다.</p>
<p>이 학생이 "마음 편하게 가지려고 노력해봐"라고 말한 건<br>낭만적인 조언이 아닙니다.</p>
<p>시험 당일 퍼포먼스는<br>얼마나 많이 공부했느냐 못지않게<br>그날 얼마나 평정심을 유지했느냐에 달려 있다는 걸<br>몸으로 겪어본 사람의 말입니다.</p>

<hr>

<h2>입시를 끝낸 미래의 나에게</h2>

<blockquote>"이제 시작이다~"</blockquote>

<p>세 글자입니다.</p>
<p>SAT 준비부터 원서 제출까지, 몇 달을 그것만 바라보고 달려왔을 텐데<br>막상 끝나고 나서 꺼낸 말이 "이제 시작이다"입니다.</p>
<p>이 말이 의미하는 건 두 가지입니다.</p>
<p>첫째, 입시는 끝이 아니라는 것.<br>대학에 가고 나서도 해야 할 것들이 기다리고 있고,<br>그 준비를 지금부터 해야 한다는 현실 인식입니다.</p>
<p>둘째, 그럼에도 불구하고 가볍다는 것.<br>물결표 하나("~")에 긴장이 풀린 느낌이 담겨 있습니다.<br>무겁게 끝낸 게 아니라, 다음을 향해 몸을 돌린 느낌입니다.</p>
<p>SuperfastSAT에서 학생들을 지켜보면서 느끼는 게 있습니다.<br>목표 점수를 받은 학생들의 공통점은<br>"이 시험에 모든 걸 걸었다"가 아니라<br>"이 시험을 잘 끝내고 다음으로 넘어갔다"는 것입니다.</p>
<p>입시는 인생의 전부가 아닙니다.<br>하지만 준비하는 동안 전부처럼 다룰 줄 알아야<br>끝났을 때 "이제 시작이다"라고 말할 수 있습니다.</p>

<hr>

<p>이것 기억하세요.</p>
<p>시험이 부담스러운 건 당연합니다.<br>그 부담을 안고도 마음을 고르는 연습이<br>점수를 만들고, 입시를 끝낸 뒤 다음을 볼 수 있게 합니다.</p>

<hr>

<h2>자주 묻는 질문</h2>

<p><strong>Q. SAT 시험 당일에 긴장을 줄이는 방법이 있나요?</strong><br>연습 시험을 실제 시험과 동일한 환경에서 반복한 학생일수록 시험 당일 긴장도가 낮습니다. 낯선 상황에서 긴장하는 것은 자연스러운 반응이므로, 환경 자체를 익숙하게 만드는 것이 가장 효과적입니다.</p>
<p><strong>Q. 마음을 편하게 가지라는 조언이 실제로 점수에 영향을 미치나요?</strong><br>테스트 불안(test anxiety)은 작업 기억(working memory)을 일시적으로 감소시킨다는 연구가 있습니다. 아는 문제를 틀리는 경우의 상당 부분은 실력이 아니라 긴장에서 비롯됩니다. 평정심 유지는 선택이 아니라 퍼포먼스 전략입니다.</p>
<p><strong>Q. SAT가 끝난 후 대학 생활 준비는 어떻게 해야 하나요?</strong><br>SAT 이후에는 에세이, 인터뷰, 그리고 대학 입학 후 필요한 학습 기초를 점검할 시간입니다. SAT에서 길렀던 독해와 수학 사고력은 대학 수업에도 직결됩니다.</p>

<hr>

<p><em>최종 업데이트: 2026년 4월</em></p>
<p><strong>배병윤 (Byungyun Bae)</strong><br>SuperfastSAT 대표. SAT·AP 온라인 학습 환경 설계 전문가로, 디지털 SAT 채점 구조와 문항 유형별 전략을 연구하고 가르칩니다.<br><a href="https://www.linkedin.com/in/%EB%B3%91%EC%9C%A4-%EB%B0%B0-82392a2a5/">LinkedIn</a></p>
`

async function publishToGhost({ title, html, excerpt, slug, metaTitle, metaDescription, tags }) {
  const token = getToken()
  const body = JSON.stringify({
    posts: [{
      title,
      html: html + CTA_HTML,
      custom_excerpt: excerpt,
      slug,
      meta_title: metaTitle,
      meta_description: metaDescription,
      tags: tags.map(t => ({ name: t })),
      status: 'draft'
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
          console.log('Ghost 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('URL:', post.url)
          console.log('상태:', post.status)
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

publishToGhost({
  title: 'SAT 끝낸 학생이 남긴 한마디 — "이제 시작이다"',
  html,
  excerpt: 'SAT를 끝낸 학생에게 두 가지를 물었습니다. "다른 학생들에게 한마디"와 "미래의 나에게 전하는 메시지". 돌아온 답은 짧았지만, 담긴 무게는 달랐습니다.',
  slug: 'sat-student-interview-message-after-college-admission',
  metaTitle: 'SAT 끝낸 학생이 남긴 한마디 — "이제 시작이다"',
  metaDescription: 'SAT와 미국 대입을 마친 학생에게 마지막으로 두 가지를 물었습니다. 다른 수험생들에게 전하는 말, 그리고 미래의 자신에게 보내는 메시지. 카카오톡으로 나눈 실제 대화입니다.',
  tags: ['SAT', '수험생 인터뷰', '미국 대입', '합격 후기']
})
