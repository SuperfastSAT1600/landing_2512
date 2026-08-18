import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILES = 10;

// POST /api/coach-onboarding/upload
// Public (token-authenticated): get signed upload URLs for screenshots
export async function POST(request: NextRequest) {
  let body: { token: string; files: Array<{ filename: string; contentType: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, files } = body;
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  if (!files?.length) return NextResponse.json({ error: 'files required' }, { status: 400 });
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `최대 ${MAX_FILES}장까지 업로드 가능합니다` }, { status: 400 });
  }

  // Validate token
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('coach_onboarding_invites')
    .select('id, expires_at, used_at')
    .eq('token', token)
    .single();

  if (inviteError || !invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const results: Array<{ signedUrl: string; path: string; publicUrl: string }> = [];

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.contentType)) {
      return NextResponse.json({ error: `${file.filename}: jpg/png/webp만 업로드 가능합니다` }, { status: 400 });
    }

    const safeName = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${token.slice(0, 8)}/${Date.now()}-${safeName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('coach-onboarding')
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('coach-onboarding')
      .getPublicUrl(path);

    results.push({ signedUrl: data.signedUrl, path, publicUrl: urlData.publicUrl });
  }

  return NextResponse.json({ data: results });
}
