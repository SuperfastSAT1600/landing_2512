import { NextRequest, NextResponse } from 'next/server';
import { fetchDailyLearning } from '@/lib/learning-data';
import { isAuthenticated } from '@/lib/server-auth';
export type { StudyHallResult, TestCenterResult, VocabResult, StudentDayResult, DailyLearningResponse } from '@/lib/learning-data';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const namesParam = searchParams.get('names');
  const names = namesParam ? namesParam.split(',').map(n => n.trim()).filter(Boolean) : [];

  try {
    const data = await fetchDailyLearning(names, date);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
