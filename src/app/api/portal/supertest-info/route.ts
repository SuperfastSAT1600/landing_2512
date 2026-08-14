import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { SupertestConfig } from '@/lib/config';

const DEFAULT: SupertestConfig = {
  remainingSpots: 30,
  nextTestDate: '',
  testTime: '09:00',
  maxFreeSlots: 10,
  portalApplicantCount: 0,
};

export async function GET() {
  const { data } = await supabaseAdmin
    .from('site_config')
    .select('config')
    .eq('id', 'supertest')
    .single();

  const config: SupertestConfig = data?.config ?? DEFAULT;

  const testDatetime = config.nextTestDate
    ? `${config.nextTestDate}T${config.testTime ?? '09:00'}:00+09:00`
    : null;

  return NextResponse.json({
    testDatetime,
    maxFreeSlots: config.maxFreeSlots ?? 10,
    applicantCount: config.portalApplicantCount ?? 0,
    slotsAvailable: (config.maxFreeSlots ?? 10) - (config.portalApplicantCount ?? 0),
  });
}
