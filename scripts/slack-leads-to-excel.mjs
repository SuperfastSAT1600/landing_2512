import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as XLSX from 'xlsx';

function loadEnv() {
  try {
    const lines = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnv();

const CHANNEL_ID = 'C07FK85V9PD';
const TOKEN = process.env.SLACK_BOT_TOKEN;

if (!TOKEN) {
  console.error('SLACK_BOT_TOKEN is not set.');
  process.exit(1);
}

async function fetchAllMessages(channelId) {
  const messages = [];
  let cursor;
  do {
    const params = new URLSearchParams({ channel: channelId, limit: '200' });
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`https://slack.com/api/conversations.history?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const data = await res.json();
    if (!data.ok) { console.error('Slack API error:', data.error); process.exit(1); }
    messages.push(...(data.messages || []));
    cursor = data.response_metadata?.next_cursor || null;
  } while (cursor);
  return messages;
}

// Slack 마크업 제거 (<URL|text> → text, <tel:...|text> → text, <@U...> → '')
function cleanText(text) {
  return text
    .replace(/<tel:[^|>]*\|([^>]*)>/g, '$1')
    .replace(/<https?:[^|>]*\|([^>]*)>/g, '$1')
    .replace(/<https?:[^>]*>/g, '')
    .replace(/<@[A-Z0-9]+>/g, '')
    .replace(/_\[LINK\]_/g, '')
    .trim();
}

// 전화번호 정리: 여러 개 쉼표 구분 시 +82 or 마지막 값 선택
function cleanPhone(raw) {
  if (!raw) return '';
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  const withPlus = parts.find(p => p.startsWith('+'));
  const result = withPlus || parts[parts.length - 1] || '';
  return result.replace(/^p:/, '').trim();
}

// ─── 포맷 C (현재): "작성일 :" 포함 ───────────────────────────────────────
function parseFormatC(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.includes('zapier.com'));
  const result = {};
  for (const line of lines) {
    let key, value;
    const spaceColon = line.indexOf(' : ');
    if (spaceColon !== -1) {
      key = line.slice(0, spaceColon).trim();
      value = line.slice(spaceColon + 3).trim();
    } else {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      key = line.slice(0, colon).trim();
      value = line.slice(colon + 1).trim();
    }
    result[key] = value;
  }
  return {
    작성일: result['작성일'] || '',
    이름: result['이름'] || '',
    크리에이티브: result['크리에이티브'] || '',
    캠페인: result['캠페인'] || '',
    학년: result['학년'] || '',
    희망시험날짜: result['Supertest 희망 시험 날짜'] || '',
    목표점수: result['목표점수'] || result['목표점수 시험'] || '',
    연락처: cleanPhone(result['연락처']),
    국가: '',
  };
}

// ─── 포맷 B (숫자 레이블): "인입 시간" 또는 "학생 학년" 포함 ──────────────
function parseFormatB(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.includes('zapier.com'));
  const map = {};
  for (const line of lines) {
    // "1.이름 :  값" 또는 "1.이름 : 값"
    const m = line.match(/^\d+\.\s*([^:：]+?)\s*[:：]\s*(.*)$/);
    if (m) {
      map[m[1].trim()] = m[2].trim();
    }
  }
  const creative = map['크리에이티브'] || map['광고 지역과 크리에이티브'] || '';
  const region = map['광고 지역'] || '';
  const phone = map['전화 번호'] || '';
  return {
    작성일: map['인입 시간'] || '',
    이름: map['이름'] || '',
    크리에이티브: creative,
    캠페인: region,
    학년: map['학생 학년'] || '',
    희망시험날짜: '',
    목표점수: '',
    연락처: cleanPhone(phone),
    국가: map['국가'] || '',
  };
}

// ─── 포맷 A (위치 기반, 2025-06~07): ISO날짜\n크리에이티브\n전화\n학년\n국가 ─
function parseFormatA(text) {
  const lines = text.split('\n')
    .map(l => cleanText(l).trim())
    .filter(l => l && !l.startsWith('Sent by'));
  // 첫 줄이 ISO 날짜이면 포맷 A
  const isoDate = lines[0]?.match(/^\d{4}-\d{2}-\d{2}T[\d:+]+/)?.[0] || '';
  const creative = isoDate ? lines[1] : lines[0];
  const phone = isoDate ? lines[2] : lines[1];
  const grade = isoDate ? lines[3] : lines[2];
  const country = isoDate ? lines[4] : lines[3];
  return {
    작성일: isoDate,
    이름: '',
    크리에이티브: creative || '',
    캠페인: '',
    학년: grade || '',
    희망시험날짜: '',
    목표점수: '',
    연락처: cleanPhone(phone),
    국가: country || '',
  };
}

function detectAndParse(rawText) {
  const text = cleanText(rawText);
  if (rawText.includes('작성일')) return parseFormatC(rawText);
  if (rawText.includes('인입 시간') || rawText.includes('학생 학년')) return parseFormatB(text);
  return parseFormatA(rawText);
}

function isLeadMessage(text) {
  if (!text) return false;
  return (
    text.includes('작성일') ||
    text.includes('인입 시간') ||
    text.includes('학생 학년') ||
    // 포맷 A: ISO 날짜 + zapier 링크
    (text.includes('zapier.com') &&
      /\d{4}-\d{2}-\d{2}T/.test(text) &&
      !text.includes('typeform'))
  );
}

function tsToKST(ts) {
  return new Date(parseFloat(ts) * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

async function main() {
  console.log('메시지 수집 중...');
  const messages = await fetchAllMessages(CHANNEL_ID);
  console.log(`총 ${messages.length}개 메시지`);

  const leads = messages.filter(m => isLeadMessage(m.text));
  console.log(`리드 메시지: ${leads.length}개`);

  leads.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

  const rows = leads.map(msg => {
    const parsed = detectAndParse(msg.text);
    return {
      '메시지 수신 날짜': tsToKST(msg.ts),
      '작성일': parsed.작성일,
      '이름': parsed.이름,
      '크리에이티브': parsed.크리에이티브,
      '캠페인_광고지역': parsed.캠페인,
      '학년': parsed.학년,
      '희망 시험 날짜': parsed.희망시험날짜,
      '목표점수': parsed.목표점수,
      '연락처': parsed.연락처,
      '국가': parsed.국가,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 36 },
    { wch: 28 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '리드');

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outputPath = resolve(process.cwd(), `leads_${today}.xlsx`);
  XLSX.writeFile(wb, outputPath);

  console.log(`\n✓ 저장 완료: ${outputPath}`);
  console.log(`  총 ${rows.length}행`);

  // 월별 분포 출력
  const byMonth = {};
  leads.forEach(m => {
    const month = new Date(parseFloat(m.ts)*1000).toISOString().slice(0,7);
    byMonth[month] = (byMonth[month]||0)+1;
  });
  console.log('\n월별 분포:');
  Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b))
    .forEach(([m,c]) => console.log(`  ${m}: ${c}개`));
}

main();
