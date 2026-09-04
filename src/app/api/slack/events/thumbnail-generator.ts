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
        parameters: { size: '1792*1024', n: 1 },
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
      output?: { task_status?: string; choices?: { message?: { content?: unknown[] } }[]; results?: { url?: string }[] }
    };
    const status = pollData.output?.task_status;
    if (status === 'SUCCEEDED') {
      const content = pollData.output?.choices?.[0]?.message?.content;
      imageUrl = Array.isArray(content)
        ? (content.find((c: { type?: string; image?: string }) => c.type === 'image') as { image?: string })?.image ?? null
        : pollData.output?.results?.[0]?.url ?? null;
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

// Ghost용: 흑백 미니멀 심볼 일러스트
export async function generateGhostThumbnail(focusKeyword: string, slug: string): Promise<string> {
  const prompt = `당신은 Notion, Slack, Airbnb와 같은 글로벌 IT 기업의 미니멀리즘 일러스트레이션을 전문으로 하는 수석 일러스트레이터입니다.
주제: ${focusKeyword}

스타일 규칙:
- Grayscale Only: 오직 검정색, 흰색, 회색만 사용. 유채색 절대 금지.
- Clean Background: 배경은 흰색(#FFFFFF).
- Minimalist Line Art: 깔끔하고 일정한 굵기의 검은색 외곽선. 심볼적이고 단순화된 형태.
- Flat Design with Subtle Shading: 부드러운 회색 음영으로 약간의 입체감.
- Negative Space: 여백의 미. 피사체가 캔버스의 약 70%를 차지.
- No Text: 이미지 내부에 텍스트 절대 금지.`;

  return generateQwenThumbnail(prompt, slug, 'ghost');
}

// 랜딩용: 스토리텔링 씬 일러스트 (인물 + 상황)
export async function generateLandingThumbnail(title: string, slug: string): Promise<string> {
  const prompt = `당신은 Notion, Slack, Airbnb와 같은 글로벌 IT 기업의 미니멀리즘 일러스트레이션을 전문으로 하는 수석 일러스트레이터입니다.
주제: ${title}

스타일 규칙:
- Grayscale Only: 오직 검정색, 흰색, 회색만 사용. 유채색 절대 금지.
- Clean Background: 배경은 흰색(#FFFFFF) 또는 아주 연한 회색.
- Storytelling Scene: 주제를 은유적으로 표현하는 인물 또는 상황 중심의 장면. 에디토리얼 일러스트 스타일.
- Minimalist Line Art: 깔끔한 검은색 외곽선, 회색 음영으로 입체감.
- Wide cinematic composition: 가로형 구도, 좌우 여백 충분히.
- No Text: 이미지 내부에 텍스트 절대 금지.`;

  return generateQwenThumbnail(prompt, slug, 'landing');
}

// 하위 호환
export async function generateAndUploadThumbnail(focusKeyword: string, slug: string): Promise<string> {
  return generateGhostThumbnail(focusKeyword, slug);
}
