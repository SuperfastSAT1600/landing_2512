import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { CreateCompanyInput } from '@/types/crm';

// GET /api/crm/companies?active=true
// B2B 업체(파트너) 목록. active=true면 is_active만.
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeOnly = new URL(request.url).searchParams.get('active') === 'true';

  let query = supabaseAdmin
    .from('companies')
    .select('*')
    .order('name', { ascending: true });

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;

  if (error) {
    console.error('[companies GET]', error);
    return NextResponse.json({ error: '업체 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/crm/companies
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreateCompanyInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '업체명을 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('companies')
    .insert({
      name: body.name.trim(),
      contact_person: body.contact_person?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
      contact_email: body.contact_email?.trim() || null,
      contract_terms: body.contract_terms?.trim() || null,
      notes: body.notes?.trim() || null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation (동일 업체명 존재)
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 업체명입니다.' }, { status: 409 });
    }
    console.error('[companies POST]', error);
    return NextResponse.json({ error: '업체 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
