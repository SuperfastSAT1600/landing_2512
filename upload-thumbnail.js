#!/usr/bin/env node
/**
 * 썸네일 업로드 스크립트
 * Usage: node scripts/upload-thumbnail.js <slug> <svg-path>
 * Example: node scripts/upload-thumbnail.js columbia-sat-required-all-ivy-league public/thumbnails/columbia-sat-thumbnail.svg
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const [slug, svgPath] = process.argv.slice(2)

if (!slug || !svgPath) {
  console.error('Usage: node scripts/upload-thumbnail.js <slug> <svg-path>')
  process.exit(1)
}

if (!fs.existsSync(svgPath)) {
  console.error(`파일을 찾을 수 없습니다: ${svgPath}`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const svgContent = fs.readFileSync(svgPath)
  const filename = path.basename(svgPath)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
  const storagePath = `${year}/${month}/${uniqueSuffix}-${filename}`

  // 1. Supabase storage 업로드
  console.log(`[1/2] 업로드 중: ${storagePath}`)
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(storagePath, svgContent, { contentType: 'image/svg+xml', upsert: true })

  if (uploadError) {
    console.error('❌ 업로드 실패:', uploadError.message)
    process.exit(1)
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`
  console.log('✅ 업로드 완료:', publicUrl)

  // 2. posts 테이블 featured_image 업데이트
  console.log(`[2/2] featured_image 업데이트 중: ${slug}`)
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

  console.log('✅ featured_image 업데이트 완료!')
  console.log('   포스팅:', data[0].title)
  console.log('   URL:', publicUrl)
}

run().catch(err => {
  console.error('오류:', err.message)
  process.exit(1)
})
