#!/usr/bin/env node
/**
 * SuperfastSAT 블로그 썸네일 생성기 (Qwen / DashScope)
 * Usage: node generate-thumbnail.js <slug> "<주제>"
 * Example: node generate-thumbnail.js sat-math-m2-time-management "시계와 체크리스트로 표현한 SAT 시간 관리 전략"
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const fs = require('fs')
const crypto = require('crypto')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY

const [slug, topic] = process.argv.slice(2)

if (!slug || !topic) {
  console.error('Usage: node generate-thumbnail.js <slug> "<주제>"')
  process.exit(1)
}

if (!DASHSCOPE_API_KEY) {
  console.error('❌ DASHSCOPE_API_KEY가 .env.local에 없습니다.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function buildStylePrompt(topic) {
  return `당신은 Notion, Slack, Airbnb와 같은 글로벌 IT 기업의 미니멀리즘 일러스트레이션을 전문으로 하는 수석 일러스트레이터입니다.
사용자로부터 입력받은 주제를 바탕으로, 다음 가이드라인을 엄격히 준수하여 시각적으로 세련된 흑백 일러스트레이션을 생성하십시오.

### 1. 스타일 가이드라인 (Style Rules) - 엄격 준수
* **색상 (Color):**
    * **Grayscale Only:** 오직 검정색, 흰색, 그리고 다양한 톤의 회색(Gray)만을 사용하십시오. 유채색은 절대 사용 금지.
    * **Clean Background:** 배경은 깨끗한 흰색(#FFFFFF) 또는 아주 연한 회색 그라데이션으로 처리하여 피사체가 돋보이게 하십시오.
* **라인 및 형태 (Line & Shape):**
    * **Minimalist Line Art:** 깔끔하고 일정한 굵기의 검은색 외곽선(Outline)을 사용하십시오.
    * **Simple Characters:** 인물이나 사물은 복잡한 디테일을 생략하고 상징적인 형태로 단순화하십시오.
    * **Flat Design with Subtle Shading:** 기본적으로 플랫 디자인을 지향하되, 부드러운 회색 음영(Shading)으로 약간의 입체감을 주십시오.
* **구도 및 맥락 (Composition):**
    * **Focus on Topic:** 주제("${topic}")를 가장 잘 나타내는 장면을 구성하십시오.
    * **Negative Space:** 여백의 미를 살려 화면이 너무 꽉 차지 않도록 배치하십시오.
    * **No Text:** 이미지 내부에 텍스트(글자)는 절대 포함하지 말 것.

### 2. 작업 프로세스 (Action)
1. 주제("${topic}")를 분석하여 가장 적절한 미니멀리스트 일러스트레이션 장면을 구상하십시오.
2. 위 스타일 가이드라인을 적용하여 고품질의 흑백 라인 아트 이미지를 생성하십시오.`
}

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'dashscope-intl.aliyuncs.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        ...(bodyStr ? {
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
          'Content-Length': Buffer.byteLength(bodyStr),
        } : {}),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        resolve(JSON.parse(data))
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http')
    mod.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  console.log(`[1/3] Qwen 이미지 생성 중...`)
  console.log(`      주제: ${topic}`)

  const taskRes = await apiRequest('POST', '/api/v1/services/aigc/image-generation/generation', {
    model: 'wan2.7-image-pro',
    input: {
      messages: [{ role: 'user', content: [{ type: 'text', text: buildStylePrompt(topic) }] }]
    },
    parameters: { size: '1792*1024', n: 1 },
  })

  const taskId = taskRes.output?.task_id
  if (!taskId) throw new Error('task_id 없음: ' + JSON.stringify(taskRes))
  console.log(`   task_id: ${taskId}`)

  // 폴링
  let imageUrl = null
  for (let i = 0; i < 30; i++) {
    await sleep(3000)
    process.stdout.write('.')
    const result = await apiRequest('GET', `/api/v1/tasks/${taskId}`, null)
    const status = result.output?.task_status
    if (status === 'SUCCEEDED') {
      const content = result.output.choices?.[0]?.message?.content
      imageUrl = Array.isArray(content)
        ? content.find(c => c.type === 'image')?.image
        : result.output.results?.[0]?.url
      break
    }
    if (status === 'FAILED') throw new Error('생성 실패: ' + JSON.stringify(result))
  }
  console.log()

  if (!imageUrl) throw new Error('이미지 URL을 받지 못했습니다.')
  console.log(`✅ 생성 완료`)

  console.log(`[2/3] 이미지 저장 및 업로드 중...`)
  const imageBuffer = await downloadImage(imageUrl)

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
  const storagePath = `${year}/${month}/${uniqueSuffix}-${slug}-thumbnail.png`

  const localPath = `public/thumbnails/${slug}.png`
  fs.writeFileSync(localPath, imageBuffer)
  console.log(`   로컬 저장: ${localPath}`)

  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('❌ 업로드 실패:', uploadError.message)
    process.exit(1)
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`
  console.log(`✅ 업로드 완료: ${publicUrl}`)

  console.log(`[3/3] featured_image 업데이트 중: ${slug}`)
  const { data, error: patchError } = await supabase
    .from('posts')
    .update({ featured_image: publicUrl })
    .eq('id', slug)
    .select('id, title')

  if (patchError) {
    console.error('❌ DB 업데이트 실패:', patchError.message)
    process.exit(1)
  }

  if (!data || !data.length) {
    console.error(`❌ slug를 찾을 수 없습니다: ${slug}`)
    process.exit(1)
  }

  console.log('✅ 완료!')
  console.log(`   포스팅: ${data[0].title}`)
  console.log(`   썸네일: ${publicUrl}`)
}

run().catch(err => {
  console.error('오류:', err.message)
  process.exit(1)
})
