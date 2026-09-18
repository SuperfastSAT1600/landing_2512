import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { TEACHER_INTRO_SKILL } from '@/lib/coach-intro-skill';

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

function getSystemPrompt(): string {
  return `당신은 SAT/AP 과외 선생님의 소개 글을 작성하는 전문가입니다.
아래의 스킬 가이드라인을 따라 선생님 소개 페이지를 작성하세요.

## 분량 및 깊이 요구사항 (필수)

**과목별 수업 방식 섹션이 이 글의 핵심입니다.** 코치가 제공한 정보가 짧더라도 반드시 다음을 지켜주세요:

- 각 과목/시험 섹션은 **최소 3문단(문단당 3~5문장)** 이상 작성
- 문단 1: 해당 시험의 본질적 구조와 함정 (AI 지식을 적극 활용해 구체적으로)
- 문단 2: 코치의 접근 방법론 + **왜 효과적인지 논리적 근거** (코치 입력이 짧아도 원리·메커니즘을 덧붙여 설득력 있게 확장)
- 문단 3: 학생이 실제로 경험하게 되는 변화와 결과

코치가 "독해 실력을 키운다"처럼 짧게 썼다면, 그것이 **왜** 효과적인지, **어떤 메커니즘**으로 작동하는지, **다른 접근법과 무엇이 다른지**를 AI 지식으로 채워주세요.

**전체 분량**: 최소 1,200자(한글) 이상. 과목이 2개 이상이면 1,800자 이상.

## 발행 규칙

이 글은 작성 즉시 블로그에 발행됩니다. 다음은 절대 포함하지 마세요:
- "보완하면 좋은 정보", "톤·분량 조정" 등 작성 후 안내(스킬 6번)
- 메타 코멘트, 작성자 주석, 괄호 안 보완 요청

출력: 본문 + Excerpt + Meta Description만.

${TEACHER_INTRO_SKILL}`;
}

function formatCoachInput(data: Record<string, unknown>): string {
  const lines: string[] = ['[선생님 초안 정보]', ''];

  if (data.name) lines.push(`이름: ${data.name}`);
  if (data.university) {
    const edu = [data.university as string];
    if (data.undergrad_major) edu.push(`(전공: ${data.undergrad_major})`);
    if (data.enrollment_status) edu.push(data.enrollment_status === 'graduated' ? '졸업' : '재학중');
    lines.push(`대학교: ${edu.join(' ')}`);
  }
  if (data.grad_school) {
    const grad = [data.grad_school as string];
    if (data.grad_major) grad.push(`(전공: ${data.grad_major})`);
    lines.push(`대학원: ${grad.join(' ')}`);
  }
  if (data.high_school) lines.push(`고등학교: ${data.high_school}`);
  if (data.sat_rw_score && data.sat_math_score) {
    const total = (data.sat_rw_score as number) + (data.sat_math_score as number);
    lines.push(`SAT 점수: ${total}점 (RW: ${data.sat_rw_score}, Math: ${data.sat_math_score})`);
  }
  if (data.teaching_years) lines.push(`수업 경력: ${data.teaching_years}년`);
  if (data.teaching_hours_total) lines.push(`누적 수업 시간: ${data.teaching_hours_total}시간`);
  if (data.students_taught) lines.push(`지도한 학생 수: ${data.students_taught}명`);

  const academies = data.past_academies as { name: string; role: string }[] | undefined;
  if (academies && academies.length > 0) {
    lines.push(`과거 근무 학원: ${academies.map(a => `${a.name}(${a.role})`).join(', ')}`);
  }

  const subjects = data.subjects as string[] | undefined;
  if (subjects && subjects.length > 0) {
    lines.push(`담당 과목: ${subjects.join(', ')}`);
  }

  if (data.language_preference) {
    const lang = { english: '영어', korean: '한국어', any: '무관' }[data.language_preference as string] ?? data.language_preference;
    lines.push(`수업 언어: ${lang}`);
  }

  lines.push('');
  if (data.appeal_points) {
    lines.push('[어필 포인트]');
    lines.push(data.appeal_points as string);
    lines.push('');
  }

  if (data.teaching_philosophy) {
    lines.push('[공통 수업 방향성]');
    lines.push(data.teaching_philosophy as string);
    lines.push('');
  }

  const directions = data.subject_directions as Record<string, string> | undefined;
  if (directions && Object.keys(directions).length > 0) {
    lines.push('[과목별 수업 방향성]');
    for (const [subject, dir] of Object.entries(directions)) {
      lines.push(`${subject}:`);
      lines.push(dir);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { data: submission, error } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  const systemPrompt = getSystemPrompt();
  const userInput = formatCoachInput(submission as Record<string, unknown>);

  let content: string;
  let title: string;
  try {
    const client = new OpenAI({ apiKey });
    const [contentRes, titleRes] = await Promise.all([
      client.chat.completions.create({
        model: 'gpt-5.6-luna',
        max_completion_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
      }),
      client.chat.completions.create({
        model: 'gpt-5.6-luna',
        max_completion_tokens: 60,
        messages: [
          {
            role: 'system',
            content: `선생님 정보를 보고 블로그 포스팅 제목을 한 줄로 만드세요.
규칙:
- 선생님의 가장 임팩트 있는 수치/경력을 앞에 배치 (예: SAT 점수, 수업 시간, 경력 연수, 출신 학교)
- 15자 내외, 꺾쇠·따옴표 없이 제목만 출력
- 예시: "1,000시간 수업한 SAT 1580점 선생님", "아이비리그 출신 10년 경력 SAT 강사"`,
          },
          { role: 'user', content: userInput },
        ],
      }),
    ]);
    content = contentRes.choices[0]?.message?.content ?? '';
    title = titleRes.choices[0]?.message?.content?.trim() ?? '';
  } catch (e) {
    console.error('[generate-post] OpenAI API 호출 실패', e);
    return NextResponse.json({ error: `OpenAI API 오류: ${(e as Error).message}` }, { status: 500 });
  }

  return NextResponse.json({ data: { content, title } });
}
