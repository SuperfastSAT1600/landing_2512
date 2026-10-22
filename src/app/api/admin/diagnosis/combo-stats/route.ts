import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { aggregateByQuestion, rollupCombo } from '@/lib/diagnosis-aggregate';
import { loadComboContext, loadFormatResults, toResultAttempts } from '@/lib/diagnosis-combo-data';

const FORMATS = ['diagnostic-test-1', 'diagnostic-test-2'];

/**
 * GET /api/admin/diagnosis/combo-stats
 * (테스트 형식, 문제 세트) 조합별 평가. 문항 단위 집계를 형식 안에서 합산한 뒤
 * 각 세트의 문항으로 섹션/도메인 롤업한다. 제출이 있는 조합만 돌려준다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ctx = await loadComboContext();
    const combos = [];
    for (const format of FORMATS) {
      const results = await loadFormatResults(format);
      const aggs = aggregateByQuestion(toResultAttempts(results, ctx));
      for (const set of ctx.sets.values()) {
        const sampleSize = results.filter((r) => r.test_version_id === set.id).length;
        if (sampleSize === 0) continue;
        const rollup = rollupCombo(format, set.questions, aggs);
        combos.push({
          format,
          versionId: set.id,
          setNumber: set.setNumber,
          sampleSize,
          pooledSampleSize: results.length,
          sections: rollup.sections,
          domains: rollup.domains,
        });
      }
    }
    combos.sort((a, b) => a.format.localeCompare(b.format) || (a.setNumber ?? 0) - (b.setNumber ?? 0));
    return NextResponse.json({ combos }, { status: 200 });
  } catch (err) {
    console.error('Error computing combo stats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
