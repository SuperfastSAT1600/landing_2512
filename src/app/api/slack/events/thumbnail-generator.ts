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

async function generateQwenThumbnail(prompt: string, slug: string, prefix: string): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY가 설정되지 않았습니다.');

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
        parameters: { size: '1376*768', n: 1 },
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Qwen 태스크 생성 실패: ${createRes.status} ${err}`);
  }

  const createData = await createRes.json() as { output?: { task_id?: string } };
  const taskId = createData.output?.task_id;
  if (!taskId) throw new Error('Qwen task_id를 받지 못했습니다.');

  // 폴링 (최대 90초, 3초 간격)
  let imageUrl: string | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(
      `https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const pollData = await pollRes.json() as {
      output?: { task_status?: string; choices?: { message?: { content?: { type?: string; image?: string }[] } }[]; results?: { url?: string }[] }
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

  if (!imageUrl) throw new Error('Qwen 이미지 URL을 받지 못했습니다.');

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  return uploadBuffer(buffer, slug, prefix);
}

// Qwen으로 제목 → 썸네일용 2줄 요약
async function summarizeTitleToLines(title: string): Promise<{ line1: string; line2: string }> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');

  const res = await fetch(
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen-turbo',
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: `다음 블로그 제목을 썸네일 이미지에 들어갈 임팩트 있는 2줄 텍스트로 요약해줘.
규칙: 각 줄 한글 12자 이내, 핵심 키워드 중심, 구어체 금지, 숫자/영어 활용 권장.
JSON만 반환 (다른 텍스트 없이): {"line1":"...","line2":"..."}
제목: ${title}`,
        }],
      }),
    }
  );
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('2줄 요약 JSON 파싱 실패: ' + text);
  return JSON.parse(match[0]) as { line1: string; line2: string };
}

// Ghost용: Qwen 2줄 요약 → /api/og?ghost=true 렌더링 → Supabase 업로드
export async function generateGhostThumbnail(title: string, slug: string): Promise<string> {
  const { line1, line2 } = await summarizeTitleToLines(title);
  console.log(`[thumbnail] Ghost 2줄 요약: "${line1}" / "${line2}"`);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutoring.superfastsat.com';
  const ogUrl = `${baseUrl}/api/og?ghost=true&line1=${encodeURIComponent(line1)}&line2=${encodeURIComponent(line2)}`;

  const res = await fetch(ogUrl);
  if (!res.ok) throw new Error(`OG 이미지 fetch 실패: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  return uploadBuffer(buffer, slug, 'ghost');
}

// 제목 → 핵심 소재(1) + 부소재(2~3) 추출
async function extractThumbnailSubjects(title: string): Promise<{ primary: string; supporting: string[] }> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');

  const res = await fetch(
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen-turbo',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Extract thumbnail illustration subjects from this Korean SAT blog title. Return in English.

Context: This blog targets Korean parents and students preparing for the SAT exam.

Rules:
- primary: ONE human figure showing an emotional moment or decision (e.g. "a parent sitting, hand on chin, looking worried", "a student with furrowed brows staring at a paper"). Must be a PERSON in a specific pose.
- supporting: 2 concrete objects or silhouette figures that represent the options or context (short noun phrases, e.g. "profile silhouette of a young tutor", "score report paper")
- If the title is about SELECTING or COMPARING, primary = the person deciding, supporting = what they are choosing between
- If the title is about STRATEGY or METHOD, primary = student in action, supporting = the tools/documents
- Return JSON only: {"primary":"...","supporting":["...","..."]}

Title: ${title}`,
        }],
      }),
    }
  );
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('소재 추출 JSON 파싱 실패: ' + text);
  return JSON.parse(match[0]) as { primary: string; supporting: string[] };
}

// 랜딩용: 제목에서 소재 자동 추출 → 중앙 구도 doodle 일러스트
export async function generateLandingThumbnail(title: string, slug: string): Promise<string> {
  const subjects = await extractThumbnailSubjects(title);
  console.log(`[thumbnail] 소재 추출: primary="${subjects.primary}", supporting=[${subjects.supporting.join(', ')}]`);

  const prompt = `A thumbnail illustration.

Composition (strictly follow):
- Primary subject at the exact center: ${subjects.primary}
- Supporting elements around it (one on the left, one on the right${subjects.supporting.length > 2 ? ', one below' : ''}): ${subjects.supporting.join(', ')}
- All figures together must occupy approximately 40% of the total canvas area. The remaining 60% is empty white space.
- Leave 20% margin on the top and 20% on the bottom. Leave visible margins on both left and right sides.
- The figures should feel small and well-spaced within the large white canvas — do not fill the frame.

Style rules:
- Rough hand-drawn doodle icon style.
- Only black lines (#000000) on a white (#FFFFFF) background. No gray, no color, no shading, no fill, no gradient.
- Lines must look like they were drawn quickly in a single stroke — like a marker doodle.
- Avoid perfect circles, perfect straight lines, or any smooth vector feel.
- Line ends may slightly overshoot or leave gaps. Corners may overlap or be slightly misaligned.
- Overall feel: rough, wobbly, hand-scribbled marker sketch.
- Absolutely no text, letters, words, or numbers anywhere in the image.`;

  return generateQwenThumbnail(prompt, slug, 'landing');
}

// 하위 호환
export async function generateAndUploadThumbnail(title: string, slug: string): Promise<string> {
  return generateGhostThumbnail(title, slug);
}
