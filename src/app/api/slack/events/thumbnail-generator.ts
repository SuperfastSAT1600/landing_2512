import OpenAI from 'openai';

async function generateDalleUrl(focusKeyword: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Minimalist monochrome illustration for a blog thumbnail.
Subject: ${focusKeyword}
Style rules (strictly follow):
- Grayscale only — black, white, and gray tones. Zero color.
- Clean white (#FFFFFF) background with generous negative space.
- Consistent-weight black outline, flat design with soft gray shading for subtle depth.
- Symbolic, simplified forms — no complex detail.
- No text, no labels, no letters anywhere in the image.
Aesthetic reference: Notion, Slack, Airbnb product illustration style.`;

  const res = await client.images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1792x1024',
    quality: 'standard',
    n: 1,
  });

  const url = res.data?.[0]?.url;
  if (!url) throw new Error('DALL-E 3 이미지 URL을 받지 못했습니다.');
  return url;
}

async function uploadToSupabase(imageUrl: string, slug: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const imgRes = await fetch(imageUrl);
  const buffer = await imgRes.arrayBuffer();

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
  const dalleUrl = await generateDalleUrl(focusKeyword);
  return uploadToSupabase(dalleUrl, slug);
}
