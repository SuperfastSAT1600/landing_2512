/**
 * 학생 프로필 임베딩 — Qwen(DashScope) `text-embedding-v4`.
 *
 * 공급자 전환 이력: OpenAI `text-embedding-3-small`(1536d) → Qwen `text-embedding-v4`(1536d).
 * OpenAI 크레딧 소진(429 insufficient_quota)으로 임베딩이 전면 중단돼 벡터 검색이
 * 조용히 이름 검색으로 폴백하던 것을 끊기 위함. **차원이 1536으로 동일해
 * `students.embedding vector(1536)` 컬럼과 match_students* RPC는 그대로 쓴다.**
 *
 * 주의: 모델이 다르면 벡터 공간이 달라 유사도가 무의미하다. 공급자를 바꿀 때는
 * `scripts/generate-embeddings.ts --all`로 전량 재임베딩해야 한다.
 */
import OpenAI from 'openai';

const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'text-embedding-v4';

/** DB 컬럼 vector(1536)과 일치해야 하는 차원. 불일치는 조용히 넘기지 않고 throw. */
export const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error('QWEN_API_KEY is not set');

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.QWEN_BASE_URL?.trim() || DEFAULT_BASE_URL,
  });

  const res = await client.embeddings.create({
    model: process.env.QWEN_EMBEDDING_MODEL?.trim() || DEFAULT_MODEL,
    input: text.slice(0, 8000), // 토큰 한도 안전 마진
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = res.data[0].embedding;
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `embedding dimension mismatch: ${embedding.length} (expected ${EMBEDDING_DIMENSIONS})`
    );
  }
  return embedding;
}

export function buildEmbeddingText(student: {
  name: string;
  grade?: string | null;
  school_type?: string | null;
  desired_subjects?: string | null;
  campaign_tags?: string[] | null;
  previous_rw_score?: number | null;
  previous_math_score?: number | null;
  target_score?: number | null;
  target_test_date?: string | null;
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
  // 캠페인 태그가 실질적인 과목 의도 신호다(자동 유입은 desired_subjects가 'Both'로 강제됨).
  if (student.campaign_tags?.length) {
    lines.push(`관심/캠페인: ${student.campaign_tags.filter(Boolean).join(', ')}`);
  }

  const rw = student.previous_rw_score;
  const math = student.previous_math_score;
  if (rw != null && math != null) lines.push(`직전 점수: RW ${rw} / Math ${math} (합계 ${rw + math})`);
  else if (rw != null) lines.push(`직전 RW: ${rw}`);
  else if (math != null) lines.push(`직전 Math: ${math}`);
  if (student.target_score) lines.push(`목표 점수: ${student.target_score}`);
  if (student.target_test_date) lines.push(`목표 시험일: ${student.target_test_date}`);

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
    const memoLines = timeline
      .map((entry) => {
        const date = entry.created_at?.slice(0, 10) ?? '';
        const memo = (entry.ai_purified ?? entry.raw_memo ?? '').trim();
        return memo ? `${date}: ${memo}` : null;
      })
      .filter((l): l is string => l !== null);
    if (memoLines.length > 0) {
      lines.push('\n[상담 기록]');
      lines.push(...memoLines);
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
