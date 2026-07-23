/**
 * 이탈 사유(churn_tag) 파싱·집계 — 순수 함수(I/O 없음).
 *
 * churn_tag는 `"{카테고리}: {자유서술}"` 형식의 자유문으로 저장된다.
 *   예: "미결제: 콜 당일 무응답", "환불: AP 종료 후 잔여시간", "회신 없음"
 * 접두 없는 순수 자유문("상담 희망하지 않음")도 존재한다. 완전 일치 집계는
 * 거의 못 잡으므로(대부분 접두 뒤 자유서술이 붙음) 접두 카테고리로 정규화해 집계한다.
 * churn_stage_manual은 현재 전량 null이라 단계 집계는 다루지 않는다.
 */
import type { ChurnType } from '@/types/crm';

export interface ChurnRow {
  churn_tag: string | null;
  churn_type: ChurnType | null;
}

export interface ChurnCategory {
  category: string; // 정규화된 사유 카테고리
  count: number;
  samples: string[]; // 대표 자유서술 사유 (중복·공백 제외, 최대 maxSamples)
}

export interface ChurnBreakdown {
  total: number; // 이탈 리드 총수(태그 유무 무관)
  taggedTotal: number; // churn_tag가 기록된 수 (분모 명시용)
  potential: number; // churn_type=potential (잠재 복귀)
  closed: number; // churn_type=closed (완전 종료)
  categories: ChurnCategory[]; // count 내림차순
}

// 알려진 사유 카테고리 접두. CHURN_TAG_OPTIONS + 환불(별도 플로우).
const KNOWN_CATEGORIES = ['회신 없음', '노쇼', '미응시', '미결제', '환불', '기타'] as const;
const UNCLASSIFIED = '기타/미분류';
const SAMPLE_MAX_LEN = 80; // 대표 사유 표시 길이 상한(프롬프트 블록 간결화)

/** 자유서술 사유를 프롬프트용 한 줄로 정규화(개행·중복 공백 제거, 길이 상한). */
function normalizeDetail(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim();
  return s.length > SAMPLE_MAX_LEN ? `${s.slice(0, SAMPLE_MAX_LEN - 1)}…` : s;
}

/** churn_tag 한 건을 카테고리 + 자유서술로 분해. */
function classify(rawTag: string): { category: string; detail: string | null } {
  const tag = rawTag.trim();
  const idx = tag.indexOf(':');
  const prefix = (idx >= 0 ? tag.slice(0, idx) : tag).trim();
  const afterColon = idx >= 0 ? normalizeDetail(tag.slice(idx + 1)) : '';

  const known = KNOWN_CATEGORIES.find((k) => prefix === k || prefix.startsWith(k));
  if (known) {
    return { category: known, detail: afterColon || null };
  }
  return { category: UNCLASSIFIED, detail: normalizeDetail(tag) || null };
}

/** 이탈 행 목록 → 카테고리별 집계 + 대표 사유. 순수. */
export function aggregateChurn(rows: ChurnRow[], maxSamples = 3): ChurnBreakdown {
  let taggedTotal = 0;
  let potential = 0;
  let closed = 0;
  const map = new Map<string, { count: number; samples: string[] }>();

  for (const r of rows) {
    if (r.churn_type === 'potential') potential++;
    else if (r.churn_type === 'closed') closed++;

    const tag = r.churn_tag?.trim();
    if (!tag) continue;
    taggedTotal++;

    const { category, detail } = classify(tag);
    const entry = map.get(category) ?? { count: 0, samples: [] };
    entry.count++;
    if (detail && entry.samples.length < maxSamples && !entry.samples.includes(detail)) {
      entry.samples.push(detail);
    }
    map.set(category, entry);
  }

  const categories = [...map.entries()]
    .map(([category, v]) => ({ category, count: v.count, samples: v.samples }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  return { total: rows.length, taggedTotal, potential, closed, categories };
}

/**
 * 프롬프트 주입용 이탈 사유 블록 라인. 이탈 리드가 없으면 빈 배열.
 * @param label 코호트 설명(예: "분석 기간 인입 코호트 중", "전체 누적")
 */
export function formatChurnLines(b: ChurnBreakdown, label: string): string[] {
  if (b.total <= 0) return [];

  const lines: string[] = [`[이탈 사유 분석 · ${label} 이탈 ${b.total}명 (사유 기록 ${b.taggedTotal}명)]`];

  if (b.categories.length > 0) {
    lines.push(`- 사유 분포: ${b.categories.map((c) => `${c.category} ${c.count}`).join(' · ')}`);
  } else {
    lines.push('- 사유 분포: 기록 없음(태그 미입력)');
  }

  if (b.potential > 0 || b.closed > 0) {
    lines.push(`- 완전 종료 ${b.closed}명 · 잠재 복귀 ${b.potential}명`);
  }

  const withSamples = b.categories.filter((c) => c.samples.length > 0).slice(0, 3);
  if (withSamples.length > 0) {
    const parts = withSamples.map((c) => `[${c.category}] ${c.samples.map((s) => `"${s}"`).join(' · ')}`);
    lines.push(`- 대표 사유: ${parts.join(' / ')}`);
  }

  return lines;
}
