#!/usr/bin/env node
'use strict';
/**
 * SAT 성적표 포스팅 업데이트
 * Ghost POST ID: 6a9ca8751d49c30001e6fcc9
 * Supabase POST ID: how-to-read-sat-score-report
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// ─── Markdown → HTML ──────────────────────────────────────────────────────────
function mdToHtml(md) {
  const lines = md.split('\n');
  const blocks = [];
  let current = [];

  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length) {
        blocks.push(current.join('\n'));
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join('\n'));

  return blocks
    .map(block => {
      const t = block.trim();
      if (!t) return '';

      if (/^# (.+)$/.test(t)) return `<h1>${t.replace(/^# /, '')}</h1>`;
      if (/^## (.+)$/.test(t)) return `<h2>${t.replace(/^## /, '')}</h2>`;
      if (/^### (.+)$/.test(t)) return `<h3>${t.replace(/^### /, '')}</h3>`;
      if (/^---$/.test(t)) return '<hr>';

      // Process inline elements
      let html = t
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

      if (/^<(h[1-3]|hr)/.test(html)) return html;

      // Multi-line paragraph: join with space
      html = html.replace(/\n/g, ' ');
      return `<p>${html}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

// ─── Strip frontmatter ────────────────────────────────────────────────────────
function stripFrontmatter(content) {
  const match = content.match(/^---\n[\s\S]+?\n---\n?([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function httpRequest(method, hostname, pathname, headers, bodyStr) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: pathname,
      method,
      headers: {
        ...headers,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Ghost JWT ────────────────────────────────────────────────────────────────
function ghostJwt() {
  const [id, secret] = (process.env.GHOST_ADMIN_KEY || '').split(':');
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', kid: id, typ: 'JWT' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
  const sig     = crypto.createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

// ─── Ghost: GET current post (for updated_at) ─────────────────────────────────
async function ghostGet(postId) {
  const ghostUrl = new URL(process.env.GHOST_URL);
  const pathname = `/ghost/api/admin/posts/${postId}/`;
  const { status, body } = await httpRequest('GET', ghostUrl.hostname, pathname, {
    Authorization: `Ghost ${ghostJwt()}`,
    'Content-Type': 'application/json',
  }, null);
  if (status !== 200) throw new Error(`Ghost GET ${status}: ${body.slice(0, 300)}`);
  return JSON.parse(body).posts[0];
}

// ─── Ghost: PUT update post ───────────────────────────────────────────────────
async function ghostUpdate(postId, html, updatedAt) {
  const CTA_HTML = `
<div style="text-align:center;margin-top:2rem;">
  <a id="kakao-openchat-btn" href="https://open.kakao.com/o/s858Ajch" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#071be9;color:#ffffff;font-weight:600;text-decoration:none;">
    카카오톡으로 수업 상담 신청하기🖐️
  </a>
</div>`;

  const ghostUrl = new URL(process.env.GHOST_URL);
  const pathname = `/ghost/api/admin/posts/${postId}/?source=html`;
  const bodyObj = {
    posts: [{
      html: html + CTA_HTML,
      updated_at: updatedAt,
    }],
  };
  const bodyStr = JSON.stringify(bodyObj);
  const { status, body } = await httpRequest('PUT', ghostUrl.hostname, pathname, {
    Authorization: `Ghost ${ghostJwt()}`,
    'Content-Type': 'application/json',
  }, bodyStr);

  if (status !== 200) throw new Error(`Ghost PUT ${status}: ${body.slice(0, 400)}`);
  return JSON.parse(body).posts[0];
}

// ─── Supabase: PATCH post ─────────────────────────────────────────────────────
async function supabaseUpdate(postId, content) {
  const supaUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const pathname = `/rest/v1/posts?id=eq.${postId}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bodyStr = JSON.stringify({ content });

  const { status, body } = await httpRequest('PATCH', supaUrl.hostname, pathname, {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }, bodyStr);

  if (status !== 200 && status !== 204) {
    throw new Error(`Supabase PATCH ${status}: ${body.slice(0, 400)}`);
  }
  return status;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const GHOST_POST_ID   = '6a9ca8751d49c30001e6fcc9';
  const SUPABASE_POST_ID = 'how-to-read-sat-score-report';

  const ghostMdPath   = path.join(__dirname, '../posts/how-to-read-sat-score-report-ghost.md');
  const landingMdPath = path.join(__dirname, '../posts/how-to-read-sat-score-report-landing.md');

  const ghostRaw   = fs.readFileSync(ghostMdPath, 'utf-8');
  const landingRaw = fs.readFileSync(landingMdPath, 'utf-8');

  const ghostBody   = stripFrontmatter(ghostRaw);
  const landingBody = landingRaw.trim(); // no frontmatter

  const ghostHtml   = mdToHtml(ghostBody);
  const landingHtml = mdToHtml(landingBody);

  // 1. Ghost update
  console.log('[1/2] Ghost 포스트 업데이트 시작...');
  const currentPost = await ghostGet(GHOST_POST_ID);
  const updatedAt = currentPost.updated_at;
  console.log(`      현재 updated_at: ${updatedAt}`);

  const ghostResult = await ghostUpdate(GHOST_POST_ID, ghostHtml, updatedAt);
  console.log(`[1/2] Ghost 업데이트 완료: ${ghostResult.url}`);

  // 2. Supabase update
  console.log('[2/2] Supabase 랜딩 포스트 업데이트 시작...');
  const supaStatus = await supabaseUpdate(SUPABASE_POST_ID, landingHtml);
  console.log(`[2/2] Supabase 업데이트 완료 (HTTP ${supaStatus})`);

  console.log('\n완료. 두 플랫폼 모두 업데이트되었습니다.');
  console.log(`  Ghost:    ${process.env.GHOST_URL}/how-to-read-sat-score-report`);
  console.log(`  Supabase: https://superfastsat.com/blog/${SUPABASE_POST_ID}`);
}

main().catch(err => {
  console.error('[오류]', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
