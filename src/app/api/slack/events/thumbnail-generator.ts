import OpenAI from 'openai';

async function uploadBuffer(buffer: Uint8Array, slug: string, prefix: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const path = `${year}/${month}/${prefix}-${slug}-${Date.now()}.png`;

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
    throw new Error(`Supabase Storage 업로드 실패: ${uploadRes.status} ${err}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
}

// Ghost용: 흑백 미니멀 AI 일러스트
export async function generateGhostThumbnail(focusKeyword: string, slug: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Minimalist monochrome illustration for a blog thumbnail.
Subject: ${focusKeyword}
Style rules (strictly follow):
- Grayscale only — black, white, and gray tones. Zero color.
- Clean white (#FFFFFF) background with generous negative space.
- Consistent-weight black outline, flat design with soft gray shading for subtle depth.
- Symbolic, simplified forms — no complex detail.
- No text, no labels, no letters anywhere in the image.
- Scale: the illustrated subject must occupy approximately 70% of the canvas area. Leave wide white margins on all sides so the illustration feels smaller and more centered.
Aesthetic reference: Notion, Slack, Airbnb product illustration style.`;

  const res = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1536x1024',
    n: 1,
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('gpt-image-1 이미지 데이터를 받지 못했습니다.');
  const buffer = Buffer.from(b64, 'base64');
  return uploadBuffer(buffer, slug, 'ghost');
}

// 랜딩용: 스토리텔링 씬 일러스트 (인물 + 상황 중심)
export async function generateLandingThumbnail(title: string, slug: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Minimalist monochrome scene illustration for a blog thumbnail.
Topic: ${title}
Style rules (strictly follow):
- Grayscale only — black, white, and light gray. Zero color.
- Clean white (#FFFFFF) background with soft light gray (#F5F5F5) ground plane.
- Black outline, flat design with gray shadow for depth.
- Storytelling scene: show a person or people in a situation that metaphorically represents the topic. Think editorial illustration style.
- No text, no labels, no letters anywhere in the image.
- Wide cinematic composition (landscape). Generous negative space on left and right.
- Subject occupies the center 60% of the canvas.
Aesthetic reference: New Yorker editorial sketch, Notion illustration, Medium blog header art.`;

  const res = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1536x1024',
    n: 1,
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('gpt-image-1 랜딩 이미지 데이터를 받지 못했습니다.');
  const buffer = Buffer.from(b64, 'base64');
  return uploadBuffer(buffer, slug, 'landing');
}

// 하위 호환 — Ghost 썸네일 생성 (기존 호출부 유지)
export async function generateAndUploadThumbnail(focusKeyword: string, slug: string): Promise<string> {
  return generateGhostThumbnail(focusKeyword, slug);
}
