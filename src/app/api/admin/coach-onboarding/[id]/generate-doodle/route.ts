import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import OpenAI from 'openai';
import { toFile } from 'openai';

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const DOODLE_PROMPT = `Convert this photo into a rough hand-drawn doodle / caricature portrait.

Style rules (strictly follow):
- Rough hand-drawn doodle / caricature style.
- Only black lines (#000000) on a pure white (#FFFFFF) background. No gray, no color fill, no shading, no gradient.
- Lines look quickly sketched — like a black marker doodle.
- Avoid perfect circles or smooth vector lines; corners may slightly overshoot.
- The figure should be a friendly caricature: slightly exaggerated facial features that still resemble the person.
- Pose: casual standing or half-body portrait, facing slightly toward the viewer.
- Clean white background with generous empty space around the figure.
- Absolutely no text, letters, words, or numbers anywhere in the image.
- Overall mood: approachable, professional, warm.
- The doodle MUST resemble the actual person in the photo.`;

async function generateDoodle(imageUrl: string): Promise<Uint8Array> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`원본 이미지 다운로드 실패: ${imgRes.status}`);
  const imgBuffer = await imgRes.arrayBuffer();
  const mimeType = (imgRes.headers.get('content-type') ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';

  const imageFile = await toFile(Buffer.from(imgBuffer), 'profile.png', { type: mimeType });

  const response = await client.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt: DOODLE_PROMPT,
    n: 1,
    size: '1024x1024',
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI 응답에 이미지 데이터가 없습니다.');

  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function uploadToSupabase(buffer: Uint8Array, slug: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const path = `${year}/${month}/coach-doodle-${slug}-${Date.now()}.png`;

  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/uploads/${path}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'image/png',
      'x-upsert': 'false',
    },
    body: buffer as BodyInit,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Supabase 업로드 실패: ${uploadRes.status} ${err.slice(0, 200)}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { data: submission, error } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .select('name, profile_image_url, invite_id')
    .eq('id', id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const profileImageUrl = (submission as { profile_image_url?: string | null }).profile_image_url;
  if (!profileImageUrl) {
    return NextResponse.json({ error: '프로필 이미지가 없습니다.' }, { status: 400 });
  }

  const coachName = (submission as { name?: string }).name ?? 'coach';
  const slug = coachName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    || id.slice(0, 8);
  const safeSlug = slug + '-' + id.slice(0, 6);

  let buffer: Uint8Array;
  try {
    buffer = await generateDoodle(profileImageUrl);
  } catch (e) {
    console.error('[generate-doodle] 생성 실패', e);
    return NextResponse.json({ error: `두들 이미지 생성에 실패했습니다: ${(e as Error).message}` }, { status: 500 });
  }

  let url: string;
  try {
    url = await uploadToSupabase(buffer, safeSlug);
  } catch (e) {
    console.error('[generate-doodle] Supabase 업로드 실패', e);
    return NextResponse.json({ error: `이미지 업로드에 실패했습니다: ${(e as Error).message}` }, { status: 500 });
  }

  return NextResponse.json({ data: { url } });
}
