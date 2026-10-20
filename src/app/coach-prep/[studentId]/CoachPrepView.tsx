'use client';

import { useState } from 'react';
import type { WeeklySlot } from '@/types/crm';
import type { TcSession } from '@/lib/coach-prep-test-center';
import { TestCenterSection } from './TestCenterSection';
import { AvailabilitySchedule } from './AvailabilitySchedule';
import { CoachDeadlineBanner } from './CoachDeadlineBanner';
import { CoachResponseForm } from './CoachResponseForm';
import type { CoachRequestInfo } from '@/types/coach-prep';
import type { AvailabilitySummary } from '@/lib/student-availability';

// 서버 파일(API route, page.tsx)에서 import하면 서버 전용 모듈이 클라이언트 번들에 포함됨 — 인라인 정의
interface DiagnosticData {
  submitted_at: string;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  total_time_seconds: number | null;
  edited_insights: {
    executiveSummary?: string;
    topWeakDomains?: Array<{ domain: string; delta: number; note: string }>;
    keyRecommendations?: string[];
  } | null;
}

interface CoachViewData {
  id: string;
  name: string;
  grade: string;
  school_type: string | null;
  desired_subjects: string | null;
  preferred_language: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  target_score: number | null;
  target_test_date: string | null;
  target_score_2: number | null;
  target_test_date_2: string | null;
  ot_datetime: string | null;
  weekly_schedule: WeeklySlot[] | null;
  parent_timezone: string | null;
  coach_history_entries: Array<{
    id: string;
    created_at: string;
    content: string;
    author?: string;
    is_raw?: boolean;
  }>;
  diagnostic: DiagnosticData | null;
}

export interface SrmBriefData {
  headline: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendation: string;
}

export interface SrmSkill {
  skill: string;
  sh_accuracy: number | null;
  sh_total: number;
  tc_accuracy: number | null;
  tc_total: number;
}

type ExamScore = { exam_month: string; rw_score: number | null; math_score: number | null; note: string | null };

type ExtendedData = CoachViewData & {
  exam_scores: ExamScore[];
  srm_skills: SrmSkill[] | null;
  srm_tc_sessions: TcSession[];
  availability: AvailabilitySummary | null;
  coach_request: CoachRequestInfo | null;
  srm_brief: SrmBriefData | null;
  sfv2_profile_id: string | null;
  diagnostic_result_id: string | null;
};

// ────────────────────────────────────────────
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const SUBJECT_LABELS: Record<string, string> = {
  RW: 'Reading & Writing',
  Math: 'Math',
  Both: 'RW + Math',
};

const LANGUAGE_LABELS: Record<string, string> = {
  korean: '한국어',
  english: 'English',
  any: '한/영 혼용',
};

const LANGUAGE_COLORS: Record<string, string> = {
  korean: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  english: 'bg-blue-50 text-blue-700 border-blue-200',
  any: 'bg-purple-50 text-purple-700 border-purple-200',
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
}

function formatScheduleTime(slot: WeeklySlot): string {
  const h = slot.hour.toString().padStart(2, '0');
  const m = slot.minute.toString().padStart(2, '0');
  return `${h}:${m}`;
}

function ScoreBar({ label, score, max = 800 }: { label: string; score: number | null; max?: number }) {
  const pct = score != null ? Math.round((score / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono font-semibold text-gray-900">{score ?? '-'}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${accent ?? 'border-gray-200'}`}>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

interface ConfirmItemProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  value: React.ReactNode;
}

function ConfirmItem({ checked, onChange, label, value }: ConfirmItemProps) {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
        checked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <div className="text-sm font-medium text-gray-900">{value}</div>
      </div>
      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'
      }`}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ── 테스트센터 점수 추이 ──────────────────────
function ExamScoresSection({ scores, tcSessions }: { scores: ExamScore[]; tcSessions: TcSession[] }) {
  const hasRealScores = scores.length > 0;
  const hasTcSessions = tcSessions.length > 0;

  if (!hasRealScores && !hasTcSessions) {
    return <p className="text-sm text-gray-400">응시 이력 없음</p>;
  }

  const maxTotal = scores.reduce((m, s) => {
    const t = (s.rw_score ?? 0) + (s.math_score ?? 0);
    return t > m ? t : m;
  }, 400);

  return (
    <div className="space-y-5">
      {/* 실제 SAT 점수 */}
      {hasRealScores && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">실제 SAT 점수</p>
          <div className="space-y-3">
            {scores.map((s, i) => {
              const total = s.rw_score != null && s.math_score != null ? s.rw_score + s.math_score : null;
              const prev = i > 0 ? scores[i - 1] : null;
              const prevTotal = prev?.rw_score != null && prev?.math_score != null ? prev.rw_score + prev.math_score : null;
              const delta = total != null && prevTotal != null ? total - prevTotal : null;
              const pct = total != null ? Math.max(Math.round(((total - 400) / Math.max(maxTotal - 400, 1)) * 100), 2) : 2;
              return (
                <div key={s.exam_month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-mono">{s.exam_month}</span>
                    <div className="flex items-center gap-3">
                      {s.rw_score != null && <span className="text-gray-500">RW <span className="text-gray-800 font-semibold">{s.rw_score}</span></span>}
                      {s.math_score != null && <span className="text-gray-500">M <span className="text-gray-800 font-semibold">{s.math_score}</span></span>}
                      {total != null && <span className="text-gray-900 font-bold font-mono">{total}</span>}
                      {delta != null && (
                        <span className={`font-semibold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SRM 모의고사 세션 */}
      {hasTcSessions && (
        <div className={hasRealScores ? 'border-t border-gray-200 pt-4' : ''}>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">SRM 모의고사</p>
          <TestCenterSection sessions={tcSessions} />
        </div>
      )}
    </div>
  );
}

// ── AI 현황 브리핑 ──────────────────────────────
function SrmBriefCard({ brief, hasProfile }: { brief: SrmBriefData | null; hasProfile: boolean }) {
  if (!hasProfile) return null;
  if (!brief) {
    return (
      <p className="text-sm text-gray-400">
        CRM에서 AI 브리핑을 먼저 생성하면 여기에 표시됩니다.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
        <p className="text-sm font-semibold text-violet-800">{brief.headline}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">강점</p>
          <ul className="space-y-1">
            {brief.strengths.map((s, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-emerald-500 shrink-0">+</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-2">취약</p>
          <ul className="space-y-1">
            {brief.weaknesses.map((s, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-red-400 shrink-0">–</span>{s}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {brief.risks.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-2">리스크</p>
          <ul className="space-y-1">
            {brief.risks.map((s, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-amber-500 shrink-0">!</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="pt-2 border-t border-gray-200">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">권장 액션</p>
        <p className="text-sm text-gray-800">{brief.recommendation}</p>
      </div>
    </div>
  );
}

// ── 강점 / 취약 스킬 ──────────────────────────
function SkillsSection({ skills }: { skills: SrmSkill[] }) {
  if (skills.length === 0) return <p className="text-sm text-gray-400">학습 기록 없음 (SRM 데이터 로딩 후 표시됩니다)</p>;

  const ranked = [...skills].sort((a, b) => {
    const aAcc = a.sh_accuracy ?? a.tc_accuracy ?? 100;
    const bAcc = b.sh_accuracy ?? b.tc_accuracy ?? 100;
    return aAcc - bAcc;
  });
  const weak = ranked.slice(0, 4);
  const strong = [...ranked].reverse().slice(0, 4);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-3">취약 스킬</p>
        <div className="space-y-3">
          {weak.map((sk) => <SkillBarRow key={sk.skill} sk={sk} highlight="weak" />)}
        </div>
      </div>
      <div className="border-t border-gray-200 pt-4">
        <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-3">강점 스킬</p>
        <div className="space-y-3">
          {strong.map((sk) => <SkillBarRow key={sk.skill} sk={sk} highlight="strong" />)}
        </div>
      </div>
    </div>
  );
}

function SkillBarRow({ sk, highlight }: { sk: SrmSkill; highlight: 'weak' | 'strong' }) {
  const primary = sk.sh_accuracy ?? sk.tc_accuracy ?? 0;
  const barColor = highlight === 'weak' ? 'bg-red-400' : 'bg-emerald-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-700 truncate max-w-[60%]">{sk.skill}</span>
        <div className="flex items-center gap-2">
          {sk.sh_accuracy != null && <span className="text-gray-400">연습 <span className="text-gray-700">{sk.sh_accuracy}%</span></span>}
          {sk.tc_accuracy != null && <span className="text-gray-400">실전 <span className="text-gray-700">{sk.tc_accuracy}%</span></span>}
        </div>
      </div>
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${primary}%` }} />
      </div>
    </div>
  );
}

// ── 진단테스트 결과 ───────────────────────────
function DiagnosticSection({ diagnostic, resultId }: { diagnostic: DiagnosticData; resultId: string | null }) {
  const insights = diagnostic.edited_insights;
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">제출일</span>
          <span className="text-gray-900">{formatDate(diagnostic.submitted_at)}</span>
        </div>
        {diagnostic.total_time_seconds != null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">소요 시간</span>
            <span className="font-mono text-gray-900">{formatDuration(diagnostic.total_time_seconds)}</span>
          </div>
        )}
        {diagnostic.previous_rw_score != null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">RW (자기 보고)</span>
            <span className="font-mono text-gray-900">{diagnostic.previous_rw_score}</span>
          </div>
        )}
        {diagnostic.previous_math_score != null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Math (자기 보고)</span>
            <span className="font-mono text-gray-900">{diagnostic.previous_math_score}</span>
          </div>
        )}
      </div>

      {insights?.executiveSummary && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">진단 요약</p>
          <p className="text-sm text-gray-700 leading-relaxed">{insights.executiveSummary}</p>
        </div>
      )}

      {insights?.topWeakDomains && insights.topWeakDomains.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-3">취약 영역</p>
          <div className="space-y-2">
            {insights.topWeakDomains.slice(0, 4).map((d) => (
              <div key={d.domain} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate max-w-[60%]">{d.domain}</span>
                <span className="text-red-500 font-mono">{d.delta > 0 ? `+${d.delta}` : d.delta}%p</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights?.keyRecommendations && insights.keyRecommendations.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-2">핵심 권장사항</p>
          <ul className="space-y-1.5">
            {insights.keyRecommendations.map((r, i) => (
              <li key={i} className="text-xs text-gray-700 flex gap-2">
                <span className="text-blue-500 shrink-0 font-bold">{i + 1}.</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultId && (
        <div className="border-t border-gray-200 pt-4">
          <a
            href={`/reports/${resultId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 text-sm font-medium transition-all"
          >
            전체 진단 리포트 보기
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main View ─────────────────────────────────
export function CoachPrepView({ data }: { data: ExtendedData }) {
  const [confirmedScore, setConfirmedScore] = useState(false);
  const [confirmedTargetDate, setConfirmedTargetDate] = useState(false);
  const [confirmedLanguage, setConfirmedLanguage] = useState(false);

  const allConfirmed = confirmedScore && confirmedTargetDate && confirmedLanguage;

  const totalPrevious =
    data.previous_rw_score != null && data.previous_math_score != null
      ? data.previous_rw_score + data.previous_math_score
      : null;

  const scheduleByDay = (data.weekly_schedule ?? []).reduce<Record<number, WeeklySlot[]>>((acc, slot) => {
    if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {});

  const activeDays = Object.keys(scheduleByDay).map(Number).sort();

  const scoreValue = (() => {
    if (data.previous_rw_score == null && data.previous_math_score == null) return '점수 정보 없음';
    const parts: string[] = [];
    if (data.previous_rw_score != null) parts.push(`RW ${data.previous_rw_score}`);
    if (data.previous_math_score != null) parts.push(`Math ${data.previous_math_score}`);
    const total = totalPrevious != null ? ` (합계 ${totalPrevious})` : '';
    return parts.join(' / ') + total;
  })();

  const targetDateValue = (() => {
    const parts: string[] = [];
    if (data.target_test_date) parts.push(`1차 ${formatDate(data.target_test_date)}${data.target_score != null ? ` (목표 ${data.target_score})` : ''}`);
    if (data.target_test_date_2) parts.push(`2차 ${formatDate(data.target_test_date_2)}${data.target_score_2 != null ? ` (목표 ${data.target_score_2})` : ''}`);
    return parts.length > 0 ? parts.join('\n') : '목표 시험일 미입력';
  })();

  const languageValue = data.preferred_language
    ? LANGUAGE_LABELS[data.preferred_language] ?? data.preferred_language
    : '언어 미입력';

  const languageColor = data.preferred_language
    ? LANGUAGE_COLORS[data.preferred_language]
    : 'bg-gray-100 text-gray-600 border-gray-300';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* 응답 마감 (코치별 링크로 들어온 경우) */}
        {data.coach_request && <CoachDeadlineBanner info={data.coach_request} />}

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">코치 준비 자료</p>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{data.grade} · {data.school_type ?? 'AP'}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {data.desired_subjects && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200">
                  {SUBJECT_LABELS[data.desired_subjects] ?? data.desired_subjects}
                </span>
              )}
              {data.preferred_language && (
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${languageColor}`}>
                  {languageValue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 수업 전 필수 확인 */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-amber-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </span>
            <h2 className="text-sm font-bold text-amber-700">수업 전 필수 확인</h2>
            {allConfirmed && (
              <span className="ml-auto text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                모두 확인 완료
              </span>
            )}
          </div>
          <div className="space-y-3">
            <ConfirmItem checked={confirmedScore} onChange={setConfirmedScore} label="이전 시험 점수" value={scoreValue} />
            <ConfirmItem checked={confirmedTargetDate} onChange={setConfirmedTargetDate} label="목표 시험 시점" value={targetDateValue} />
            <ConfirmItem
              checked={confirmedLanguage}
              onChange={setConfirmedLanguage}
              label="수업 희망 언어"
              value={
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${languageColor}`}>
                  {languageValue}
                </span>
              }
            />
          </div>
          {!allConfirmed && (
            <p className="mt-4 text-xs text-gray-500 text-center">위 3가지 항목을 모두 확인한 후 상세 자료가 공개됩니다.</p>
          )}
        </div>

        {/* 상세 섹션 */}
        {allConfirmed && (
          <>
            {/* 테스트센터 점수 추이 */}
            <SectionCard title="테스트센터 점수 추이" accent="border-violet-200">
              <ExamScoresSection scores={data.exam_scores} tcSessions={data.srm_tc_sessions} />
            </SectionCard>

            {/* AI 현황 브리핑 */}
            {data.sfv2_profile_id && (
              <SectionCard title="AI 현황 브리핑" accent="border-violet-200">
                <SrmBriefCard brief={data.srm_brief} hasProfile={!!data.sfv2_profile_id} />
              </SectionCard>
            )}

            {/* 강점 / 취약 스킬 */}
            {data.sfv2_profile_id && data.srm_skills !== null && (
              <SectionCard title="스킬 분석">
                <SkillsSection skills={data.srm_skills} />
              </SectionCard>
            )}

            {/* 진단테스트 결과 */}
            {data.diagnostic && (
              <SectionCard title="진단테스트 결과">
                <DiagnosticSection diagnostic={data.diagnostic} resultId={data.diagnostic_result_id} />
              </SectionCard>
            )}

            {/* 점수 현황 */}
            <SectionCard title="점수 현황">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-3">초기 / 진단 점수</p>
                  <div className="space-y-3">
                    <ScoreBar label="Reading & Writing" score={data.previous_rw_score} />
                    <ScoreBar label="Math" score={data.previous_math_score} />
                  </div>
                  {totalPrevious != null && (
                    <p className="text-right text-sm text-gray-500 mt-2">합계 <span className="font-mono font-bold text-gray-900">{totalPrevious}</span></p>
                  )}
                </div>
                {(data.target_score != null || data.target_score_2 != null) && (
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <p className="text-xs text-gray-400">목표</p>
                    {data.target_score != null && (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-gray-400 mr-1.5">1차</span>
                          <span className="text-lg font-bold text-emerald-600">{data.target_score}</span>
                          {totalPrevious != null && <span className="text-xs text-gray-400 ml-2">+{data.target_score - totalPrevious}점</span>}
                        </div>
                        {data.target_test_date && <span className="text-sm text-gray-500">{formatDate(data.target_test_date)}</span>}
                      </div>
                    )}
                    {data.target_score_2 != null && (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-gray-400 mr-1.5">2차</span>
                          <span className="text-lg font-bold text-emerald-500">{data.target_score_2}</span>
                          {totalPrevious != null && <span className="text-xs text-gray-400 ml-2">+{data.target_score_2 - totalPrevious}점</span>}
                        </div>
                        {data.target_test_date_2 && <span className="text-sm text-gray-500">{formatDate(data.target_test_date_2)}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* 수업 스케줄 */}
            <SectionCard title="수업 스케줄">
              {data.ot_datetime && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">OT 일시</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(data.ot_datetime)}</p>
                </div>
              )}
              {data.availability ? (
                <AvailabilitySchedule availability={data.availability} />
              ) : activeDays.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-3">타임존: {data.parent_timezone ?? 'UTC'}</p>
                  {activeDays.map((day) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-medium text-gray-600">{DAY_LABELS[day]}</span>
                      <div className="flex gap-2 flex-wrap">
                        {scheduleByDay[day].sort((a, b) => a.hour - b.hour || a.minute - b.minute).map((slot, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-700">
                            {formatScheduleTime(slot)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">스케줄 미입력</p>
              )}
            </SectionCard>

            {/* 학습 이력 & 코치 메모 */}
            <SectionCard title="학습 이력 & 코치 메모">
              {data.coach_history_entries.length > 0 ? (
                <div className="space-y-4">
                  {data.coach_history_entries.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-blue-400 pl-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs text-gray-400">{formatDate(entry.created_at)}</span>
                        {entry.author && <span className="text-xs text-gray-400">· {entry.author}</span>}
                        {entry.is_raw && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded">상담 메모 원본</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">코치 메모 없음</p>
              )}
            </SectionCard>

            {/* 수업 가능 여부 응답 */}
            {data.coach_request && <CoachResponseForm info={data.coach_request} />}
          </>
        )}
      </div>
    </div>
  );
}
