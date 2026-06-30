#!/usr/bin/env node
/**
 * 매일 블로그 주제 3개를 제안하고 Slack DM으로 전송하는 스크립트
 * 우선순위: SAT 캘린더 → 학생 데이터 → 코치 인사이트
 *
 * 실행: node blog-post/scripts/suggest-topics.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DATA_DIR = join(__dirname, '../data');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const V2_URL = process.env.SUPERFASTSAT_V2_SUPABASE_URL;
const V2_KEY = process.env.SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY;
const SLACK_USER_ID = 'C0A28EJQA7P'; // 블로그 주제 알림 채널

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function diffDays(targetDateStr, fromDate = new Date()) {
  const target = new Date(targetDateStr);
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - from) / (1000 * 60 * 60 * 24));
}

function loadPostedTopics() {
  const path = join(DATA_DIR, 'posted-topics.json');
  if (!existsSync(path)) {
    writeFileSync(path, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function isAlreadyPosted(title, postedTopics) {
  return postedTopics.some(
    (p) => p.title.toLowerCase().trim() === title.toLowerCase().trim()
  );
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

// ─── 키워드 추출 ─────────────────────────────────────────────────────────────

function extractKeyword(topic) {
  if (topic.source === 'calendar') {
    // "SAT August 2026 D-61 전략 ..." → test name from rationale
    const match = topic.rationale.match(/^(SAT \w+ \d{4})/);
    return match ? match[1] : 'SAT test prep';
  }
  if (topic.source === 'student_data') {
    // "SAT Words in Context — 학생들이..." → "SAT Words in Context"
    const match = topic.title.match(/^(SAT [^—–]+)/);
    return match ? match[1].trim() : 'SAT prep';
  }
  if (topic.source === 'coach_insight') {
    const keywordMap = {
      '점수가 오르지 않는': 'SAT score improvement',
      '코치가 문제를': 'SAT tutor',
      'RW는 지문을': 'SAT Reading Writing',
      '틀렸다는 말이': 'SAT wrong answer analysis',
      '스터디홀에서': 'SAT test anxiety',
      '단어 암기를': 'SAT vocabulary',
      '준비 첫 번째': 'SAT prep guide',
      '스킬 단위로': 'SAT skill improvement',
      '한 사이클': 'SAT study plan',
      '학습 리포트': 'SAT score report',
    };
    for (const [phrase, keyword] of Object.entries(keywordMap)) {
      if (topic.title.includes(phrase)) return keyword;
    }
    return 'SAT prep';
  }
  return 'SAT prep';
}

// ─── 소스 1: SAT 캘린더 ──────────────────────────────────────────────────────

function getCalendarTopics(postedTopics) {
  const calendar = JSON.parse(
    readFileSync(join(DATA_DIR, 'sat-calendar.json'), 'utf-8')
  );
  const today = new Date();
  const results = [];

  for (const test of calendar.tests) {
    const days = diffDays(test.date, today);

    let bracket = null;
    if (days >= 0 && days <= 7) bracket = 'D7';
    else if (days > 7 && days <= 14) bracket = 'D14';
    else if (days > 14 && days <= 30) bracket = 'D30';
    else if (days < 0 && days >= -7) bracket = 'D7_after';

    if (!bracket) continue;

    const hints = test.topic_hints[bracket] || [];
    for (const hint of hints) {
      if (!isAlreadyPosted(hint, postedTopics)) {
        const label =
          days >= 0
            ? `D-${days} (${test.name})`
            : `D+${Math.abs(days)} (${test.name} 직후)`;
        const topic = {
          title: hint,
          source: 'calendar',
          rationale: `${test.name} ${label} — 독자 관심도 최고 구간`,
          point: '시험 임박 독자 유입 + 브랜드 신뢰도 구축',
        };
        topic.keyword = extractKeyword(topic);
        results.push(topic);
      }
    }

    if (results.length >= 2) break;
  }

  return results;
}

// ─── 소스 2: 학생 데이터 (Supabase V2) ──────────────────────────────────────

async function getStudentDataTopics(postedTopics) {
  if (!V2_URL || !V2_KEY) return [];

  try {
    const supabase = createClient(V2_URL, V2_KEY);
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const { data, error } = await supabase
      .from('diagnostic_test_results')
      .select('skill_scores, created_at')
      .gte('created_at', since.toISOString())
      .limit(100);

    if (error || !data || data.length === 0) return [];

    // 스킬별 오답 집계
    const skillErrors = {};
    for (const row of data) {
      const scores = row.skill_scores;
      if (!scores || typeof scores !== 'object') continue;
      for (const [skill, score] of Object.entries(scores)) {
        if (!skillErrors[skill]) skillErrors[skill] = { total: 0, errors: 0 };
        skillErrors[skill].total++;
        if (typeof score === 'number' && score < 0.6) {
          skillErrors[skill].errors++;
        }
      }
    }

    // 오답률 상위 스킬 추출
    const ranked = Object.entries(skillErrors)
      .filter(([, v]) => v.total >= 3)
      .map(([skill, v]) => ({ skill, errorRate: v.errors / v.total }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 3);

    const topics = [];
    for (const { skill, errorRate } of ranked) {
      const pct = Math.round(errorRate * 100);
      const title = `SAT ${skill} — 학생들이 가장 많이 틀리는 이유`;
      if (!isAlreadyPosted(title, postedTopics)) {
        const topic = {
          title,
          source: 'student_data',
          rationale: `최근 2주 수강생 오답률 ${pct}% — 실제 데이터 기반 주제`,
          point: '검증된 학습 데이터로 신뢰도 극대화, 독자 공감 유발',
        };
        topic.keyword = extractKeyword(topic);
        topics.push(topic);
      }
      if (topics.length >= 2) break;
    }

    return topics;
  } catch {
    return [];
  }
}

// ─── 소스 3: 코치 인사이트 (철학 문서) ──────────────────────────────────────

function getCoachInsightTopics(postedTopics) {
  const philosophyPath = join(ROOT, 'srm/superfastsat-coaching-philosophy.md');
  if (!existsSync(philosophyPath)) return [];

  const content = readFileSync(philosophyPath, 'utf-8');
  const sections = content.split(/^##+ /m).filter((s) => s.trim());

  const topicMap = {
    '우리가 생각하는 학생': {
      title: 'SAT 점수가 오르지 않는 진짜 이유 — 노력이 아닌 방법의 문제',
      point: '학원 철학을 콘텐츠로 전환, 상담 전환율 향상',
    },
    '코치의 역할': {
      title: 'SAT 코치가 문제를 풀어주지 않는 이유',
      point: '코치 포지셔닝 명확화, 프리미엄 서비스 차별화',
    },
    '내용 암기보다 구조 인식': {
      title: 'SAT RW는 지문을 많이 읽는다고 점수가 오르지 않는 이유',
      point: '독자 기존 학습법 반박 → 새 방법론 제시 → 전환율',
    },
    '오류 유형이 분석의 단위': {
      title: '"틀렸다"는 말이 왜 쓸모없는가 — SAT 오답 분석의 기준',
      point: '데이터 기반 코칭 차별화 포인트 부각',
    },
    '연습과 검증은 다른 행위다': {
      title: '스터디홀에서 잘 되는데 실전에서 무너지는 이유',
      point: '독자가 경험한 좌절감과 직결, 즉각 공감 유발',
    },
    '단어는 진단 후 처방이다': {
      title: 'SAT 단어 암기를 시작하기 전에 반드시 해야 할 것',
      point: 'vocab 콘텐츠 진입점, 단어장 제품 연결 가능',
    },
    '진단에서 시작한다': {
      title: 'SAT 준비 첫 번째 단계가 문제풀이가 되면 안 되는 이유',
      point: '진단 테스트 상품 연결 + 차별화 커리큘럼 소개',
    },
    '스킬 단위로 쌓는다': {
      title: 'SAT 점수를 스킬 단위로 관리해야 하는 이유',
      point: '체계적 접근법 시각화, 학습 로드맵 콘텐츠',
    },
    '한 사이클의 단위': {
      title: 'SuperfastSAT 한 사이클이란 무엇인가 — 학습 단위 설계 원칙',
      point: '커리큘럼 투명성 공개, 신뢰 구축',
    },
    '리포트가 이 철학을 구현하는 방식': {
      title: 'SAT 학습 리포트를 제대로 읽는 법',
      point: '기존 수강생 재참여 + 잠재 고객에게 시스템 소개',
    },
  };

  const topics = [];
  for (const [key, topic] of Object.entries(topicMap)) {
    if (
      sections.some((s) => s.startsWith(key)) &&
      !isAlreadyPosted(topic.title, postedTopics)
    ) {
      const t = {
        title: topic.title,
        source: 'coach_insight',
        rationale: `코칭 철학 "${key}" 섹션 기반 — 경쟁사가 쓸 수 없는 관점`,
        point: topic.point,
      };
      t.keyword = extractKeyword(t);
      topics.push(t);
    }
    if (topics.length >= 5) break;
  }

  return topics;
}

// ─── Slack ───────────────────────────────────────────────────────────────────

async function sendSlackMessage(channelId, text) {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: channelId, text }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`chat.postMessage failed: ${data.error}`);
  return data;
}

function buildMessage(topics) {
  const dateStr = formatDate();
  let msg = `[오늘의 블로그 주제 제안 — ${dateStr}]\n\n`;

  topics.forEach((t, i) => {
    msg += `${i + 1}. ${t.title}\n`;
    msg += `   근거: ${t.rationale}\n`;
    msg += `   포인트: ${t.point}\n`;
    if (i < topics.length - 1) msg += '\n';
  });

  msg += '\n\n→ 번호 선택 후 "N번 써줘" 라고 하면 바로 시작합니다. 마음에 드는 주제가 없으면 "다시 추천해줘" 라고 하세요.';
  return msg;
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  const postedTopics = loadPostedTopics();
  const topics = [];

  // 1. SAT 캘린더 (최우선)
  const calendarTopics = getCalendarTopics(postedTopics);
  topics.push(...calendarTopics);

  // 2. 학생 데이터
  if (topics.length < 5) {
    const studentTopics = await getStudentDataTopics(postedTopics);
    topics.push(...studentTopics);
  }

  // 3. 코치 인사이트 (채우기)
  if (topics.length < 5) {
    const coachTopics = getCoachInsightTopics(postedTopics);
    topics.push(...coachTopics);
  }

  const final = topics.slice(0, 5);

  if (final.length === 0) {
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify([]));
    } else {
      console.log('주제 후보가 없습니다. posted-topics.json을 초기화하세요.');
    }
    return;
  }

  // --json 모드: Slack 발송 없이 JSON만 출력 (크론 에이전트가 트렌드 enrichment 후 발송)
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(final, null, 2));
    return;
  }

  const message = buildMessage(final);
  console.log('─'.repeat(60));
  console.log(message);
  console.log('─'.repeat(60));

  if (!SLACK_BOT_TOKEN) {
    console.log('SLACK_BOT_TOKEN 없음 — 콘솔 출력만 수행');
    return;
  }

  try {
    await sendSlackMessage(SLACK_USER_ID, message);
    console.log(`Slack DM 발송 완료 → ${SLACK_USER_ID}`);
  } catch (err) {
    console.error('Slack 발송 실패:', err.message);
    process.exit(1);
  }
}

main();
