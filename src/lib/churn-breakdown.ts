export interface ChurnRow {
  churn_tag: string | null;
  churn_type: string | null;
}

export interface ChurnBreakdown {
  total: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  topCategory: string | null;
}

/** churn_tag의 "{카테고리}: {서술}" 접두 패턴을 파싱해 카테고리별·유형별 분포를 집계한다. */
export function aggregateChurn(rows: ChurnRow[]): ChurnBreakdown {
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const row of rows) {
    if (row.churn_tag) {
      const colonIdx = row.churn_tag.indexOf(':');
      const category = colonIdx > 0 ? row.churn_tag.slice(0, colonIdx).trim() : '기타';
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }
    if (row.churn_type) {
      byType[row.churn_type] = (byType[row.churn_type] ?? 0) + 1;
    }
  }

  const topCategory =
    Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { total: rows.length, byCategory, byType, topCategory };
}

/** 전략 에이전트 컨텍스트 블록에 삽입할 이탈 분석 라인 배열을 반환한다. */
export function formatChurnLines(churn: ChurnBreakdown, label: string): string[] {
  if (churn.total === 0) return [];

  const lines: string[] = [`- ${label} 이탈 총계: ${churn.total}명`];

  const categoryEntries = Object.entries(churn.byCategory).sort((a, b) => b[1] - a[1]);
  if (categoryEntries.length > 0) {
    lines.push(`- 이탈 사유 카테고리 (상위): ${categoryEntries
      .slice(0, 5)
      .map(([cat, n]) => `${cat} ${n}명`)
      .join(' / ')}`);
  }

  const typeEntries = Object.entries(churn.byType).sort((a, b) => b[1] - a[1]);
  if (typeEntries.length > 0) {
    lines.push(`- 이탈 유형: ${typeEntries
      .map(([t, n]) => `${t} ${n}명`)
      .join(' / ')}`);
  }

  return lines;
}
