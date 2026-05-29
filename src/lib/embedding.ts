import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // 토큰 한도 안전 마진
  });
  return res.data[0].embedding;
}

export function buildEmbeddingText(student: {
  name: string;
  grade?: string | null;
  school_type?: string | null;
  desired_subjects?: string | null;
  previous_rw_score?: number | null;
  previous_math_score?: number | null;
  target_score?: number | null;
  churn_type?: string | null;
  churn_tag?: string | null;
  inquiry_channel?: string | null;
  traffic_source?: string | null;
  b2b_partner?: string | null;
  lead_status?: string | null;
  consultation_timeline?: Array<{ raw_memo?: string; ai_purified?: string; created_at?: string }> | null;
  reactivation_log?: Array<{ strategy?: string; outcome?: string }> | null;
}): string {
  const lines: string[] = [];

  lines.push(`이름: ${student.name}`);
  if (student.grade) lines.push(`학년: ${student.grade}`);
  if (student.school_type) lines.push(`학제: ${student.school_type}`);
  if (student.desired_subjects) lines.push(`과목: ${student.desired_subjects}`);

  const rw = student.previous_rw_score;
  const math = student.previous_math_score;
  if (rw != null && math != null) lines.push(`직전 점수: RW ${rw} / Math ${math} (합계 ${rw + math})`);
  else if (rw != null) lines.push(`직전 RW: ${rw}`);
  else if (math != null) lines.push(`직전 Math: ${math}`);
  if (student.target_score) lines.push(`목표 점수: ${student.target_score}`);

  if (student.churn_type || student.churn_tag) {
    lines.push(`이탈: ${student.churn_type ?? '-'} / ${student.churn_tag ?? '-'}`);
  }
  if (student.lead_status) lines.push(`상태: ${student.lead_status}`);
  if (student.traffic_source) lines.push(`유입: ${student.traffic_source}`);
  if (student.inquiry_channel) lines.push(`채널: ${student.inquiry_channel}`);
  if (student.b2b_partner) lines.push(`B2B: ${student.b2b_partner}`);

  // 전체 상담 내용
  const timeline = (student.consultation_timeline ?? [])
    .sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1));

  if (timeline.length > 0) {
    lines.push('\n[상담 기록]');
    for (const entry of timeline) {
      const date = entry.created_at?.slice(0, 10) ?? '';
      const memo = (entry.ai_purified ?? entry.raw_memo ?? '').trim();
      if (memo) lines.push(`${date}: ${memo}`);
    }
  }

  if ((student.reactivation_log ?? []).length > 0) {
    lines.push('\n[재활성화 시도]');
    for (const r of student.reactivation_log!) {
      lines.push(`${r.strategy ?? ''} → ${r.outcome ?? ''}`);
    }
  }

  return lines.join('\n');
}
