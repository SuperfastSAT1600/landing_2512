/**
 * LLM 재랭킹용 후보 프로필 텍스트. (구 ai-pool-search의 buildStudentProfile을 이관·보강)
 *
 * 보강 내용: 캠페인 태그(과목 의도의 정본 신호)·학제·목표 시험일·규칙 신호 요약을 넣고,
 * 신뢰할 수 없는 `desired_subjects`는 아예 넣지 않는다(자동 유입에서 'Both' 강제).
 * 상담 메모는 최근 6건·건당 400자로 제한한다 — 25명을 한 프롬프트에 넣기 때문에 상한이 필요하다.
 */
import type { WinbackSignal } from '@/types/crm';

const MAX_MEMOS = 6;
const MAX_MEMO_LEN = 400;

export interface WinbackProfileStudent {
  id: string;
  name: string;
  grade?: string | null;
  school_type?: string | null;
  campaign_tags?: string[] | null;
  churn_type?: string | null;
  churn_tag?: string | null;
  previous_rw_score?: number | null;
  previous_math_score?: number | null;
  target_score?: number | null;
  target_test_date?: string | null;
  lead_status?: string | null;
  last_contacted_at?: string | null;
  updated_at: string;
  consultation_timeline?: Array<{ raw_memo?: string; ai_purified?: string; created_at?: string }> | null;
  reactivation_log?: Array<{ strategy?: string; outcome?: string }> | null;
  paid_categories?: string[];
}

function scoreLine(s: WinbackProfileStudent): string {
  const rw = s.previous_rw_score;
  const math = s.previous_math_score;
  if (rw != null && math != null) return `직전 ${rw + math}점 (RW ${rw} / Math ${math})`;
  if (rw != null) return `직전 RW ${rw}`;
  if (math != null) return `직전 Math ${math}`;
  return '직전 점수 기록 없음';
}

function recentMemos(s: WinbackProfileStudent): string[] {
  return (s.consultation_timeline ?? [])
    .slice()
    .sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? 1 : -1))
    .slice(0, MAX_MEMOS)
    .map((e) => {
      const date = e.created_at?.slice(0, 10) ?? '';
      const memo = (e.ai_purified ?? e.raw_memo ?? '').replace(/\s+/g, ' ').trim();
      return memo ? `  [${date}] ${memo.slice(0, MAX_MEMO_LEN)}` : null;
    })
    .filter((l): l is string => l !== null)
    .reverse(); // 오래된 것 → 최신 순으로 읽히게
}

export function buildCandidateProfile(
  s: WinbackProfileStudent,
  meta: { rule_score: number; similarity: number | null; signals: WinbackSignal[]; churnedDays: number }
): string {
  const lines = [
    `ID: ${s.id}`,
    `${s.name} | ${s.grade ?? '학년 미상'} | 학제 ${s.school_type ?? '미상'}`,
    `이탈: ${s.churn_type ?? '-'} / ${s.churn_tag ?? '사유 기록 없음'} (약 ${Math.round(meta.churnedDays)}일 경과)`,
    scoreLine(s),
  ];

  if (s.target_score) lines.push(`목표 점수: ${s.target_score}`);
  if (s.target_test_date) lines.push(`목표 시험일: ${s.target_test_date}`);
  if (s.campaign_tags?.length) lines.push(`캠페인/관심 태그: ${s.campaign_tags.filter(Boolean).join(', ')}`);
  if (s.paid_categories?.length) lines.push(`과거 결제: ${[...new Set(s.paid_categories)].join(', ')}`);

  const reactivations = (s.reactivation_log ?? [])
    .map((r) => `${r.strategy ?? '?'}(${r.outcome ?? '?'})`)
    .join(', ');
  if (reactivations) lines.push(`재활성화 시도: ${reactivations}`);

  lines.push(
    `규칙 점수 ${meta.rule_score}${meta.similarity != null ? ` · 프로필 유사도 ${meta.similarity.toFixed(2)}` : ''}`
  );
  if (meta.signals.length > 0) {
    lines.push(`규칙 신호: ${meta.signals.map((sig) => `${sig.label}(${sig.delta > 0 ? '+' : ''}${sig.delta})`).join(', ')}`);
  }

  const memos = recentMemos(s);
  if (memos.length > 0) {
    lines.push('상담 기록:');
    lines.push(...memos);
  }

  return lines.join('\n');
}
