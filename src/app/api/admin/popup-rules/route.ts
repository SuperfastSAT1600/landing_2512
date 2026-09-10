import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const postId = new URL(request.url).searchParams.get('post_id');

  const query = supabaseAdmin
    .from('popup_rules')
    .select(`
      id, post_id, target_post_id, is_active, created_at,
      source:posts!popup_rules_post_id_fkey(id, title),
      target:posts!popup_rules_target_post_id_fkey(id, title, featured_image, feature_image)
    `)
    .order('created_at', { ascending: false });

  if (postId) query.eq('post_id', postId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, rules: data });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { post_id, target_post_id, is_active = true } = body;

  if (!post_id || !target_post_id) {
    return NextResponse.json({ success: false, error: 'post_id and target_post_id required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('popup_rules')
    .upsert({ post_id, target_post_id, is_active, updated_at: new Date().toISOString() }, { onConflict: 'post_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, rule: data });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const postId = new URL(request.url).searchParams.get('post_id');
  if (!postId) {
    return NextResponse.json({ success: false, error: 'post_id required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('popup_rules')
    .delete()
    .eq('post_id', postId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
