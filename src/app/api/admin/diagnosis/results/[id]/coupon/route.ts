import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

interface CouponPayload {
  discountPercent: number;
  expiresAt: string; // ISO datetime string
}

/**
 * POST /api/admin/diagnosis/results/[id]/coupon
 * Publish (or update) a discount coupon for this result's report.
 * The coupon appears as a countdown banner at the bottom of the report page.
 *
 * DELETE /api/admin/diagnosis/results/[id]/coupon
 * Remove the coupon.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let body: CouponPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { discountPercent, expiresAt } = body;

  if (
    typeof discountPercent !== 'number' ||
    discountPercent < 1 ||
    discountPercent > 100 ||
    !expiresAt ||
    isNaN(new Date(expiresAt).getTime())
  ) {
    return NextResponse.json(
      { error: 'discountPercent (1-100) and valid expiresAt are required' },
      { status: 400 },
    );
  }

  if (new Date(expiresAt) <= new Date()) {
    return NextResponse.json(
      { error: 'expiresAt must be in the future' },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from('diagnostic_test_results')
    .update({ coupon: { discountPercent, expiresAt } })
    .eq('id', id);

  if (error) {
    console.error('Error setting coupon:', error);
    return NextResponse.json({ error: 'Failed to save coupon' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coupon: { discountPercent, expiresAt } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('diagnostic_test_results')
    .update({ coupon: null })
    .eq('id', id);

  if (error) {
    console.error('Error removing coupon:', error);
    return NextResponse.json({ error: 'Failed to remove coupon' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
