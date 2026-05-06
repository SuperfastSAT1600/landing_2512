require('dotenv').config({ path: '.env.local' })
const https = require('https')
const crypto = require('crypto')

const [id, secret] = process.env.GHOST_ADMIN_KEY.split(':')

const token = (() => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: id, typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url')
  const signature = crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
})()

const url = `${process.env.GHOST_URL}/ghost/api/admin/posts/?limit=1`
const options = {
  headers: { 'Authorization': `Ghost ${token}` }
}

https.get(url, options, (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Ghost 연결 성공!')
    } else {
      console.log('❌ 실패:', res.statusCode, data)
    }
  })
}).on('error', (e) => console.error('❌ 에러:', e.message))