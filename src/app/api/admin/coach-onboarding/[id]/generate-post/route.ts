import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { readFileSync } from 'fs';
import { join } from 'path';

type Params = { params: Promise<{ id: string }> };

let _teacherIntroSkill: string | null = null;

function getSystemPrompt(): string {
  if (!_teacherIntroSkill) {
    _teacherIntroSkill = readFileSync(
      join(process.cwd(), 'Docs/teacher-intro-skill.md'),
      'utf-8'
    );
  }
  return `당신은 SAT/AP 과외 선생님의 소개 글을 작성하는 전문가입니다.
아래의 스킬 가이드라인을 따라 선생님 소개 페이지를 작성하세요.

${_teacherIntroSkill}`;
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const userInput = formatCoachInput(submission as Record<string, unknown>);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: getSystemPrompt(),
      messages: [{ role: 'user', content: userInput }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Claude API 오류: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const result = await res.json() as { content?: { type: string; text: string }[] };
  const content = result.content?.find(c => c.type === 'text')?.text ?? '';

  return NextResponse.json({ data: { content } });
}
