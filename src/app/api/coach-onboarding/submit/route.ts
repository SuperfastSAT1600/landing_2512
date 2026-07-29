import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import {
  calculateCompletenessScore,
  calculateHeadCoachCriteria,
  countCriteriaMet,
  HEAD_COACH_ELIGIBLE_THRESHOLD,
} from '@/lib/coach-onboarding-score';
import type { CoachOnboardingSubmission } from '@/types/coach-onboarding';

export const maxDuration = 60;

type FormData = Omit<CoachOnboardingSubmission, 'id' | 'invite_id' | 'completeness_score' | 'head_coach_criteria' | 'head_coach_criteria_met' | 'is_head_coach_eligible' | 'status' | 'reviewed_at' | 'reviewed_by' | 'created_at'>;

async function generateBlogDraft(data: FormData): Promise<string> {
  const client = new Anthropic();

  const subjectList = data.subjects.join(', ');
  const academyList = data.past_academies && data.past_academies.length > 0
    ? data.past_academies.map(a => `${a.name}(${a.role === 'instructor' ? '강사' : a.role === 'ta' ? 'TA' : '기타'})`).join(', ')
    : '없음';
  const satScore = data.sat_rw_score && data.sat_math_score
    ? `RW ${data.sat_rw_score} + Math ${data.sat_math_score} = ${data.sat_rw_score + data.sat_math_score}점`
    : '미입력';
  const gradInfo = data.grad_school ? `${data.grad_school} ${data.grad_major ?? ''}` : '';
  const enrollmentLabel = data.enrollment_status === 'graduated' ? '졸업' : '재학중';

  const prompt = `아래 코치 정보를 바탕으로 SuperfastSAT 공식 블로그에 게재할 코치 소개 포스팅 초안을 한국어로 작성해줘.

## 코치 정보
- 이름: ${data.name}
- 학력: ${data.university} ${data.undergrad_major} (${data.university_entry_year}년 입학, ${enrollmentLabel})${gradInfo ? ` / 대학원: ${gradInfo}` : ''}
- SAT 점수: ${satScore}
- 수업 경력: ${data.teaching_years}년, 누적 ${data.teaching_hours_total}시간, 지도 학생 ${data.students_taught}명
- 근무 학원: ${academyList}
- 수업 가능 과목: ${subjectList}
- 수업 언어: ${data.language_preference === 'english' ? '영어 선호' : data.language_preference === 'korean' ? '우리말 선호' : '상관없음'}
- 어필 포인트 및 수업 방향성: ${data.teaching_philosophy}
${data.subject_directions && Object.keys(data.subject_directions).length > 0
  ? `- 과목별 방향성:\n${Object.entries(data.subject_directions).map(([s, d]) => `  - ${s}: ${d}`).join('\n')}`
  : ''}

## 작성 지침
- 구조: 리드 문단(훅) → 학력/경력 → 수업 방향성 → 학부모에게 전하는 말 → CTA
- 어조: 학부모·학생에게 신뢰감을 주는 전문가 톤. 과장 없이 팩트 기반.
- 분량: 700~1000자 내외
- 마크다운 형식(## 제목, **강조** 사용)
- CTA 마지막 줄: "SuperfastSAT에서 ${data.name} 코치를 만나보세요."`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  return content.type === 'text' ? content.text : '';
}

// POST /api/coach-onboarding/submit
export async function POST(request: NextRequest) {
  let body: { token: string; data: FormData };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, data: formData } = body;
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('coach_onboarding_invites')
    .select('id, expires_at, used_at')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: 'already_used' }, { status: 409 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  const completeness_score = calculateCompletenessScore(formData);
  const head_coach_criteria = calculateHeadCoachCriteria(formData);
  const head_coach_criteria_met = countCriteriaMet(head_coach_criteria);
  const is_head_coach_eligible = head_coach_criteria_met >= HEAD_COACH_ELIGIBLE_THRESHOLD;

  const { data: submission, error: insertError } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .insert({
      invite_id: invite.id,
      ...formData,
      completeness_score,
      head_coach_criteria,
      head_coach_criteria_met,
      is_head_coach_eligible,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[submit POST]', insertError);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  await supabaseAdmin
    .from('coach_onboarding_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id);

  // AI 블로그 초안 생성 (실패해도 제출은 성공으로 처리)
  try {
    const draft = await generateBlogDraft(formData);
    if (draft) {
      await supabaseAdmin
        .from('coach_onboarding_submissions')
        .update({ blog_post_draft: draft })
        .eq('id', submission.id);
    }
  } catch (e) {
    console.error('[submit] blog draft generation failed', e);
  }

  return NextResponse.json({
    data: {
      id: submission.id,
      completeness_score,
      head_coach_criteria_met,
      is_head_coach_eligible,
    },
  });
}
