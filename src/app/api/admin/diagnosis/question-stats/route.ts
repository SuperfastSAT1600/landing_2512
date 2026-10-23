import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { normalizeFormatId } from '@/lib/diagnosis-attempts';
import { aggregateByQuestion } from '@/lib/diagnosis-aggregate';
import { buildQuestionStats } from '@/lib/diagnosis-analysis';
import { loadComboContext, loadFormatResults, toResultAttempts } from '@/lib/diagnosis-combo-data';

/**
 * GET /api/admin/diagnosis/question-stats?testId=<format>&versionId=<set uuid>
 * 선택한 문제 세트의 문항별 통계. 문항은 세트 간에 반복 사용되므로
 * 같은 테스트 형식의 모든 세트 제출을 문항 단위로 합산한 값이다.
 * versionId를 생략하면 현재 세트를 쓴다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const testIdParam = searchParams.get('testId');
    const versionId = searchParams.get('versionId');

    const ctx = await loadComboContext();
    const set = versionId
      ? ctx.sets.get(versionId)
      : [...ctx.sets.values()].find((s) => s.isCurrent && normalizeFormatId(s.testId) === normalizeFormatId(testIdParam));
    // 형식을 명시하지 않으면 세트가 속한 형식을 따른다
    const format = normalizeFormatId(testIdParam ?? set?.testId ?? null);
    if (!set) {
      return versionId
        ? NextResponse.json({ error: 'Version not found' }, { status: 404 })
        : NextResponse.json({ stats: [], totalResults: 0 }, { status: 200 });
    }

    const results = await loadFormatResults(format);
    const aggs = aggregateByQuestion(toResultAttempts(results, ctx));
    const stats = buildQuestionStats(set.questions, aggs, format);
    const comboResults = results.filter((r) => r.test_version_id === set.id).length;

    return NextResponse.json(
      { stats, totalResults: comboResults, pooledResults: results.length, versionId: set.id, testId: format },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error computing question stats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
