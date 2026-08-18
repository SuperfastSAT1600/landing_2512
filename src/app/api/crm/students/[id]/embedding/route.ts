import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embedding';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('id, name, grade, school_type, desired_subjects, previous_rw_score, previous_math_score, target_score, churn_type, churn_tag, inquiry_channel, traffic_source, b2b_partner, lead_status, consultation_timeline, reactivation_log')
    .eq('id', id)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
  }

  const text = buildEmbeddingText(student);
  const embedding = await generateEmbedding(text);

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', id);

  if (updateError) {
    console.error('[embedding POST]', updateError);
    return NextResponse.json({ error: '임베딩 저장 실패' }, { status: 500 });
  }

  return NextResponse.json({ data: { id, dims: embedding.length } });
}
