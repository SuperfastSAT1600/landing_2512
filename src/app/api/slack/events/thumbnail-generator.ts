import OpenAI from 'openai';

async function generateImageB64(focusKeyword: string): Promise<string> {
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

  // gpt-image-1은 b64_json 반환
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('gpt-image-1 이미지 데이터를 받지 못했습니다.');
  return b64;
}

async function uploadToSupabase(b64: string, slug: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const buffer = Buffer.from(b64, 'base64');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const path = `${year}/${month}/thumbnail-${slug}-${Date.now()}.png`;

  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/uploads/${path}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'image/png',
      'x-upsert': 'false',
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Supabase Storage 업로드 실패: ${uploadRes.status} ${err}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
}

export async function generateAndUploadThumbnail(focusKeyword: string, slug: string): Promise<string> {
  const b64 = await generateImageB64(focusKeyword);
  return uploadToSupabase(b64, slug);
}
