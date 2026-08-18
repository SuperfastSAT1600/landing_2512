import { NextRequest, NextResponse } from 'next/server';
import { loadCorpus } from '../../../../lib/ontology';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!/^[0-9a-f]{8}$/i.test(id)) {
    return NextResponse.json(
      { error: { code: 'INVALID_ID', message: 'ID must be an 8-character hex string' } },
      { status: 400 },
    );
  }

  const corpus = await loadCorpus();
  const question = corpus.find((q) => q.id === id.toLowerCase());

  if (!question) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Question not found' } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: question });
}
