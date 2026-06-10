#!/usr/bin/env node
// One-time migration: load META ad spend data from CSV into marketing_ad_spend table

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function parseKoreanDate(str) {
  // "25년 07월 13일" → "2025-07-13"
  // "26년 01월 01일" → "2026-01-01"
  const m = str.trim().match(/(\d+)년\s+(\d+)월\s+(\d+)일/);
  if (!m) return null;
  const year = 2000 + parseInt(m[1], 10);
  const month = m[2].padStart(2, '0');
  const day = m[3].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseAmount(str) {
  // " ₩ 99,563 " → 99563
  // " ₩ -   " → 0
  const cleaned = str.replace(/[₩\s,]/g, '');
  if (cleaned === '-' || cleaned === '') return 0;
  return parseInt(cleaned, 10) || 0;
}

function main() {
  const csvPath = path.join(__dirname, '../marketing/마케팅 업무_25년.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split('\n').slice(1); // skip header

  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // Parse CSV respecting quoted fields
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur);

    if (cols.length < 4) continue;

    const dateStr = cols[1]?.trim();
    const amountStr = cols[3]?.trim();

    if (!dateStr) continue; // empty date rows at end of file

    const date = parseKoreanDate(dateStr);
    if (!date) continue;

    const amount = parseAmount(amountStr || '');
    if (amount <= 0) continue; // skip zero-spend days

    rows.push({ date, channel_group: 'META', amount });
  }

  console.log(`Parsed ${rows.length} rows to insert`);
  console.log('Date range:', rows[0]?.date, '~', rows[rows.length - 1]?.date);

  return rows;
}

async function run() {
  const rows = main();

  // Upsert in batches of 100
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('marketing_ad_spend')
      .upsert(batch, { onConflict: 'date,channel_group' });
    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${rows.length}...`);
  }

  console.log(`Done. ${inserted} rows upserted into marketing_ad_spend.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
