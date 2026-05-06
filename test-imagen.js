require('dotenv').config({ path: '.env.local' })
const https = require('https')

async function generateThumbnail(topic) {
  const apiKey = process.env.GEMINI_API_KEY
  
  const stylePrompt = `
    당신은 Notion, Slack, Airbnb와 같은 글로벌 IT 기업의 미니멀리즘 일러스트레이션을 전문으로 하는 수석 일러스트레이터입니다.
    주제: "${topic}"
    
    규칙:
    - Grayscale Only (흑백만 사용)
    - 깨끗한 흰색 배경
    - 미니멀리스트 라인 아트
    - 이미지 내부에 텍스트 절대 포함 금지
    - 여백의 미를 살린 구도
  `

  const body = JSON.stringify({
    contents: [{
      parts: [{ text: stylePrompt }]
    }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      aspectRatio: '16:9'
    }
  })

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        console.log('상태코드:', res.statusCode)
        if (res.statusCode === 200) {
          const result = JSON.parse(data)
          const parts = result.candidates[0].content.parts
          const imagePart = parts.find(p => p.inlineData)
          if (imagePart) {
            console.log('✅ 썸네일 생성 성공!')
            console.log('이미지 크기:', imagePart.inlineData.data.length, 'bytes')
            resolve(imagePart.inlineData.data)
          } else {
            console.log('❌ 이미지 없음:', data.substring(0, 300))
            reject(new Error('이미지 없음'))
          }
        } else {
          console.log('❌ 실패:', data.substring(0, 300))
          reject(new Error(data))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

generateThumbnail('3월 SAT시험')