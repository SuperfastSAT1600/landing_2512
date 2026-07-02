import OpenAI from 'openai';

export async function generateThumbnailUrl(focusKeyword: string): Promise<string> {
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
