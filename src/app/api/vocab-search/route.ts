import { NextRequest, NextResponse } from 'next/server';
import { loadWordConcordance, normalizeLemma } from '@/lib/word-concordance';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const word = request.nextUrl.searchParams.get('word')?.trim() ?? '';

  if (!word) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAM', message: 'word 쿼리 파라미터가 필요합니다.' } },
      { status: 400 },
    );
  }

  const { index } = await loadWordConcordance();
  const lemma = await normalizeLemma(word);
  const entry = index[lemma];

  if (!entry) {
    return NextResponse.json({
      data: { query: word, lemma, count: 0, surface_forms: {}, examples: [], truncated: false },
      meta: { requestId },
    });
  }

  return NextResponse.json({
    data: {
      query: word,
      lemma: entry.lemma,
      count: entry.count,
      surface_forms: entry.surface_forms,
      examples: entry.examples,
      truncated: entry.truncated,
    },
    meta: { requestId },
  });
}
