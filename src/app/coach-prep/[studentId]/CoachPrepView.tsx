'use client';

import type { CoachViewData } from '@/app/api/admin/srm/student/crm/[crmStudentId]/coach-view/route';
import type { WeeklySlot } from '@/types/crm';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const SUBJECT_LABELS: Record<string, string> = {
  RW: 'Reading & Writing',
  Math: 'Math',
  Both: 'RW + Math',
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
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
        <span className="text-gray-400">{label}</span>
        <span className="font-mono font-semibold text-white">{score ?? '-'}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

export function CoachPrepView({ data }: { data: CoachViewData }) {
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">코치 준비 자료</p>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white">{data.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{data.grade} · {data.school_type ?? 'AP'}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {data.desired_subjects && (
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm font-medium rounded-full border border-blue-500/30">
                  {SUBJECT_LABELS[data.desired_subjects] ?? data.desired_subjects}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scores */}
        <SectionCard title="점수 현황">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-3">초기 / 진단 점수</p>
              <div className="space-y-3">
                <ScoreBar label="Reading & Writing" score={data.previous_rw_score} />
                <ScoreBar label="Math" score={data.previous_math_score} />
              </div>
              {totalPrevious != null && (
                <p className="text-right text-sm text-gray-400 mt-2">
                  합계 <span className="font-mono font-bold text-white">{totalPrevious}</span>
                </p>
              )}
            </div>
            {data.target_score != null && (
              <div className="border-t border-gray-700 pt-4">
                <p className="text-xs text-gray-500 mb-2">목표</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-400">{data.target_score}</span>
                  {data.target_test_date && (
                    <span className="text-sm text-gray-400">{formatDate(data.target_test_date)}</span>
                  )}
                </div>
                {totalPrevious != null && (
                  <p className="text-xs text-gray-500 mt-1">
                    목표까지 +{data.target_score - totalPrevious}점
                  </p>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Diagnostic */}
        {data.diagnostic && (
          <SectionCard title="진단테스트 결과">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">제출일</span>
                <span>{formatDate(data.diagnostic.submitted_at)}</span>
              </div>
              {data.diagnostic.previous_rw_score != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">RW (자기 보고)</span>
                  <span className="font-mono">{data.diagnostic.previous_rw_score}</span>
                </div>
              )}
              {data.diagnostic.previous_math_score != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Math (자기 보고)</span>
                  <span className="font-mono">{data.diagnostic.previous_math_score}</span>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Schedule */}
        <SectionCard title="수업 스케줄">
          {data.ot_datetime && (
            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">OT 일시</p>
              <p className="text-sm font-medium">{formatDate(data.ot_datetime)}</p>
            </div>
          )}
          {activeDays.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">
                타임존: {data.parent_timezone ?? 'UTC'}
              </p>
              {activeDays.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-medium text-gray-300">
                    {DAY_LABELS[day]}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {scheduleByDay[day].sort((a, b) => a.hour - b.hour || a.minute - b.minute).map((slot, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-700 rounded text-xs font-mono text-gray-200"
                      >
                        {formatScheduleTime(slot)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">스케줄 미입력</p>
          )}
        </SectionCard>

        {/* Coach History */}
        <SectionCard title="학습 이력 & 코치 메모">
          {data.coach_history_entries.length > 0 ? (
            <div className="space-y-4">
              {data.coach_history_entries.map((entry) => (
                <div key={entry.id} className="border-l-2 border-blue-500/40 pl-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                    {entry.author && (
                      <span className="text-xs text-gray-600">· {entry.author}</span>
                    )}
                    {entry.is_raw && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/15 text-yellow-500 rounded">
                        상담 메모 원본
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">코치 메모 없음</p>
          )}
        </SectionCard>

      </div>
    </div>
  );
}
