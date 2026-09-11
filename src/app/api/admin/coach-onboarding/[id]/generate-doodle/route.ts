import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

const DOODLE_STYLE = `Style rules (strictly follow):
- Rough hand-drawn doodle / caricature style.
- Only black lines (#000000) on a pure white (#FFFFFF) background. No gray, no color fill, no shading, no gradient.
- Lines look quickly sketched — like a black marker doodle.
- Avoid perfect circles or smooth vector lines; corners may slightly overshoot.
- The figure should be a friendly caricature: slightly exaggerated facial features that still resemble the person.
- Pose: casual standing or half-body portrait, facing slightly toward the viewer.
- Clean white background with generous empty space around the figure.
- Absolutely no text, letters, words, or numbers anywhere in the image.
- Overall mood: approachable, professional, warm.`;

async function analyzePhotoWithGPT4o(imageUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this person\'s appearance for a caricature artist. Include: gender, approximate age, hair style and color, face shape, notable features (glasses, beard, etc.), skin tone, and overall expression. Be specific and concise. English only. 3-5 sentences max.',
          },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPT-4o Vision 오류: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? 'A person with a friendly expression';
}

async function generateQwenDoodle(prompt: string): Promise<Uint8Array> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY not configured');

  const createRes = await fetch(
    'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image-generation/generation',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wan2.7-image-pro',
        input: {
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
        },
        parameters: { size: '768*1024', n: 1 },
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Qwen 태스크 생성 실패: ${createRes.status} ${err.slice(0, 200)}`);
  }

  const createData = await createRes.json() as { output?: { task_id?: string } };
  const taskId = createData.output?.task_id;
  if (!taskId) throw new Error('Qwen task_id를 받지 못했습니다.');

  let imageUrl: string | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const pollRes = await fetch(
      `https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const pollData = await pollRes.json() as {
      output?: {
        task_status?: string;
        choices?: { message?: { content?: { type?: string; image?: string }[] } }[];
        results?: { url?: string }[];
      }
    };
    const status = pollData.output?.task_status;
    if (status === 'SUCCEEDED') {
      const content = pollData.output?.choices?.[0]?.message?.content;
      imageUrl = content?.find(c => c.type === 'image')?.image
        ?? pollData.output?.results?.[0]?.url
        ?? null;
      break;
    }
    if (status === 'FAILED') throw new Error('Qwen 이미지 생성 실패: ' + JSON.stringify(pollData));
  }

  if (!imageUrl) throw new Error('Qwen 이미지 URL을 받지 못했습니다 (타임아웃).');

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
  return new Uint8Array(await imgRes.arrayBuffer());
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
  const slug = coachName.toLowerCase().replace(/\s+/g, '-') + '-' + id.slice(0, 6);

  // Step 1: Analyze photo with GPT-4o
  let appearanceDescription: string;
  try {
    appearanceDescription = await analyzePhotoWithGPT4o(profileImageUrl);
  } catch (err) {
    appearanceDescription = 'A friendly-looking person with a warm smile';
    console.warn('[generate-doodle] GPT-4o 분석 실패, 기본값 사용:', err);
  }

  // Step 2: Build doodle prompt
  const doodlePrompt = `A hand-drawn doodle caricature portrait of a person.

Appearance: ${appearanceDescription}

Composition:
- Single figure centered in the frame, roughly half-body or 3/4 view.
- The figure occupies about 50% of the canvas height; the rest is white space.
- Simple white background with no shadows or patterns.

${DOODLE_STYLE}`;

  // Step 3: Generate with Qwen
  const buffer = await generateQwenDoodle(doodlePrompt);

  // Step 4: Upload to Supabase
  const url = await uploadToSupabase(buffer, slug);

  return NextResponse.json({ data: { url } });
}
