'use client';

import { useState, useEffect } from 'react';
import type { LearningReport as LearningReportType, DayItem } from '@/types/srm-portal';

const ITEM_LABELS: Record<DayItem['type'], string> = {
  study_hall: 'Study Hall',
  test_center: '테스트 센터',
  daily_report: '레슨 피드백',
  voca: 'VOCA',
};

const ITEM_COLORS: Record<DayItem['type'], { bg: string; text: string; dot: string }> = {
  study_hall:   { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  test_center:  { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  daily_report: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  voca:         { bg: '#FAF5FF', text: '#7E22CE', dot: '#A855F7' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function StudyHallCard({ item }: { item: Extract<DayItem, { type: 'study_hall' }> }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2 text-xs text-slate-500">
        <span>{item.durationMinutes}분</span>
        {item.totalProblems > 0 && (
          <>
            <span>·</span>
            <span>{item.totalProblems}문제</span>
            <span>·</span>
            <span className="font-medium text-slate-700">{item.accuracy}% 정답</span>
          </>
        )}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{item.aiNarrative}</p>
    </div>
  );
}

function TestCenterCard({ item }: { item: Extract<DayItem, { type: 'test_center' }> }) {
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {item.sections.map((s, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
          >
            {s.score}/{s.total}
          </span>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        총 {item.totalScore}/{item.totalProblems}문제 완료
      </p>
    </div>
  );
}

function DailyReportCard({ item }: { item: Extract<DayItem, { type: 'daily_report' }> }) {
  const [expanded, setExpanded] = useState(false);

  // Slack 마크다운 → 읽기 좋은 텍스트로 변환
  const cleanedLines = item.reportMd
    .split('\n')
    .map(l => l.replace(/^[📊👤📅🕒💡🎯✅⚠🧠🚀──]+\s*/u, '').trim())
    .filter(Boolean);

  const previewLines = cleanedLines.slice(0, 4);
  const hasMore = cleanedLines.length > 4;

  return (
    <div>
      <div className="space-y-1">
        {(expanded ? cleanedLines : previewLines).map((line, i) => (
          <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors"
        >
          {expanded ? '접기' : '더 보기'}
        </button>
      )}
    </div>
  );
}

function DayCard({ day }: { day: LearningReportType['days'][number] }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
      {/* 날짜 헤더 */}
      <div className="px-4 py-3" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <span className="text-sm font-semibold text-slate-700">{formatDate(day.date)}</span>
      </div>

      {/* 항목들 */}
      <div className="divide-y divide-slate-100">
        {day.items.map((item, i) => {
          const color = ITEM_COLORS[item.type];
          return (
            <div key={i} className="px-4 py-4">
              {/* 타입 배지 */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: color.dot }}
                />
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: color.bg, color: color.text }}
                >
                  {ITEM_LABELS[item.type]}
                </span>
              </div>

              {/* 내용 */}
              {item.type === 'study_hall' && <StudyHallCard item={item} />}
              {item.type === 'test_center' && <TestCenterCard item={item} />}
              {item.type === 'daily_report' && <DailyReportCard item={item} />}
              {item.type === 'voca' && (
                <p className="text-sm text-slate-600">
                  {item.totalSessions}세션 · {item.correctCount}개 정답 · {item.masteredCount}개 마스터
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LearningReport({ token }: { token: string }) {
  const [data, setData] = useState<LearningReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/portal/${token}/srm-report`)
      .then(r => { if (!r.ok) throw new Error('failed'); return r.json(); })
      .then(setData)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: '#F1F5F9' }} />
        ))}
      </div>
    );
  }

  if (error) return <p className="text-sm text-red-400 text-center py-8">{error}</p>;

  if (!data || data.days.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 text-sm">아직 학습 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.days.map(day => <DayCard key={day.date} day={day} />)}
    </div>
  );
}
