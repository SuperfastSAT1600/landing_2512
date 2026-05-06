import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { ReportInsights } from '@/lib/report-insights';

/**
 * PATCH /api/admin/diagnosis/results/[id]/insights
 * Partial-merge incoming fields into the stored edited_insights.
 * Fields set to explicit null are removed (reset to AI).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Result ID is required' }, { status: 400 });
  }

  let incoming: Partial<ReportInsights>;
  try {
    incoming = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Fetch current edited_insights
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('edited_insights')
    .eq('id', id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 });
  }

  const current: Partial<ReportInsights> = (row.edited_insights as Partial<ReportInsights>) ?? {};

  // Merge: null values in incoming remove the key; other values override
  const merged: Partial<ReportInsights> = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null) {
      delete merged[key as keyof ReportInsights];
    } else {
      // For nested sections, merge per-section
      if (key === 'sections' && typeof value === 'object') {
        const currentSections = (merged.sections ?? {}) as ReportInsights['sections'];
        const incomingSections = value as Partial<ReportInsights['sections']>;
        const mergedSections = { ...currentSections };
        for (const [sectionName, sectionOverride] of Object.entries(incomingSections)) {
          if (sectionOverride === null) {
            delete mergedSections[sectionName];
          } else if (sectionOverride) {
            mergedSections[sectionName] = { ...currentSections[sectionName], ...sectionOverride };
          }
        }
        merged.sections = mergedSections;
      } else {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  // If nothing remains, store null
  const toStore = Object.keys(merged).length === 0 ? null : merged;

  const { error: updateError } = await supabaseAdmin
    .from('diagnostic_test_results')
    .update({ edited_insights: toStore })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save insights' }, { status: 500 });
  }

  return NextResponse.json({ editedInsights: toStore });
}
