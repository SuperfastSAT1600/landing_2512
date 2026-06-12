import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('srm_communications')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { studentId, studentName, target, channel, content, author } = body;

  if (!studentId || !target || !channel || !content) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('srm_communications')
    .insert({ student_id: studentId, student_name: studentName, target, channel, content, author })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
