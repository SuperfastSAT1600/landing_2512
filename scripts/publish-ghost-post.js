const crypto = require('crypto');
const https = require('https');

const GHOST_URL = 'https://superfastsat.ghost.io';
const [id, secret] = '69bc14addcd9c80001ba2004:41f1414b2578a9d6e98aa785a9003f18fbf8f5d4046b1ee02be742ab4a0c785f'.split(':');

// JWT 생성
const iat = Math.floor(Date.now() / 1000);
const payload = {
  iat: iat,
  exp: iat + (30 * 60), // 30분 유효
  aud: '/admin/'
};

// JWT 헤더와 페이로드 인코딩
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const body = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

// 서명 생성
const signature = crypto
  .createHmac('sha256', Buffer.from(secret, 'hex'))
  .update(`${header}.${body}`)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

const token = `${header}.${body}.${signature}`;

const postData = JSON.stringify({
  posts: [{
    title: 'SAT 모의 시험 "Super Test"가 효과적인 이유',
    html: `<h2>SAT 모의 시험이 실제 시험과 다른 이유</h2>

<p>SuperfastSAT의 모의 시험 "Super Test"는 공식 문제집과는 다르게 설계되었습니다. 왜일까요?</p>

<h3>1. 시험 환경의 중요성</h3>

<p>심리학 연구에 따르면, 문제를 혼자 풀어본 것과 시험을 본 것은 같은 경험이 아닙니다. 긴장과 시간 압박이라는 요소가 학생의 실력 발휘에 큰 영향을 미칩니다. 이를 설명하는 Yerkes-Dodson 법칙에 따르면, 적정 수준의 각성이 최고의 성능을 만듭니다.</p>

<h3>2. 의도적인 난이도 상향 설계</h3>

<p>Super Test는 실제 SAT 난이도를 의도적으로 높게 설정합니다. 이는 인지심리학자 Robert Bjork의 '바람직한 어려움(Desirable Difficulties)' 개념을 기반으로 합니다:</p>

<ul>
<li>약한 부분을 더 명확하게 파악할 수 있음</li>
<li>어려운 시뮬레이션 후 실제 시험이 더 쉽게 느껴짐</li>
</ul>

<h3>3. Super Test의 이점</h3>

<ul>
<li><strong>약점 진단:</strong> 지식 격차를 더 정확하게 식별</li>
<li><strong>시간 여유:</strong> 실제 시험에서 더 여유 있는 시간 관리 가능</li>
<li><strong>심리적 준비:</strong> 스트레스 상황에 대한 적응</li>
</ul>

<h3>4. College Board 공식 문제집만으로 충분할까?</h3>

<p>College Board의 공식 연습 문제는 우수한 품질이지만, 다음의 한계가 있습니다:</p>

<ul>
<li>시험 환경의 스트레스를 재현하지 못함</li>
<li>포괄적인 준비를 위한 난이도 조정 부재</li>
</ul>

<p><strong>Super Test는 기초 준비를 마친 학생들에게 이상적입니다.</strong> 이미 SAT의 기본 개념을 이해하고 있는 학생이라면, Super Test를 통해 한 단계 높은 수준의 준비가 가능합니다.</p>

<p>더 깊이 있는 SAT 준비 전략을 원하신다면 저희 블로그의 다른 포스팅을 참고하세요.</p>`,
    status: 'published'
  }]
});

const options = {
  hostname: 'superfastsat.ghost.io',
  path: '/ghost/api/admin/posts/?source=html',
  method: 'POST',
  headers: {
    'Authorization': `Ghost ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('✓ Ghost 블로그에 포스트 게시 완료!');
        console.log('포스트 URL:', result.posts[0].url);
        console.log('포스트 제목:', result.posts[0].title);
      } else {
        console.error('✗ 게시 실패 (상태코드:', res.statusCode + ')');
        console.error('응답:', result);
      }
    } catch (e) {
      console.error('응답 파싱 실패:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('요청 에러:', e.message);
});

req.write(postData);
req.end();
