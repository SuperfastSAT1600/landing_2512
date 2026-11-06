import { NextResponse } from 'next/server';
import { getListedCoaches } from '@/lib/coaches-data';

export const revalidate = 3600;

export async function GET() {
  const coaches = await getListedCoaches();
  const headCoaches = coaches.filter(c => c.isHeadCoach);
  return NextResponse.json(headCoaches);
}
