'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LearningReport as LearningReportType, DayItem, StudyHallSkill, TestCenterLesson } from '@/types/srm-portal';

const ACCENT = '#6085FF';
const BG = '#09090b';

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
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  });
}

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  reading_and_writing: { bg: '#EFF6FF', text: '#1D4ED8' },
  math:                { bg: '#F0FDF4', text: '#15803D' },
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function SkillBadge({ skill }: { skill: StudyHallSkill }) {
  const color = DOMAIN_COLORS[skill.domain] ?? { bg: '#F8FAFC', text: '#475569' };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: color.bg, color: color.text, border: `1px solid ${color.bg}` }}>
      {skill.skill}
      <span className="opacity-60">{skill.total}문항</span>
    </span>
  );
}

function StudyHallCard({ item }: { item: Extract<DayItem, { type: 'study_hall' }> }) {
  const sortedSkills = item.skills ? [...item.skills].sort((a, b) => b.total - a.total) : [];
  return (
    <div className="space-y-2.5">
      {/* 수치 라인 */}
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span>실제 {formatDuration(item.durationMinutes)}</span>
        {item.totalProblems > 0 && (
          <>
            <span className="text-slate-300">·</span>
            <span>정답률 {item.accuracy}%</span>
            <span className="text-xs font-normal text-slate-400">({item.correctCount}/{item.totalProblems})</span>
          </>
        )}
      </div>
      {/* 스킬 배지 */}
      {sortedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sortedSkills.map(s => <SkillBadge key={s.skill} skill={s} />)}
        </div>
      )}
      {/* AI 서술 */}
      <p className="text-sm text-slate-600 leading-relaxed">{item.aiNarrative}</p>
    </div>
  );
}

function LessonRow({ lesson, index }: { lesson: TestCenterLesson; index: number }) {
  const pct = lesson.total > 0 ? Math.round((lesson.score / lesson.total) * 100) : 0;
  const color = pct >= 85 ? '#15803D' : pct >= 70 ? '#B45309' : '#B91C1C';
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-600 flex-1 truncate">
        {lesson.title ?? `Module ${index + 1}`}
      </span>
      <span className="text-xs font-semibold tabular-nums flex-shrink-0" style={{ color }}>
        {lesson.score}/{lesson.total}
        <span className="ml-1 font-normal text-slate-400">({pct}%)</span>
      </span>
    </div>
  );
}

function TestCenterCard({ item }: { item: Extract<DayItem, { type: 'test_center' }> }) {
  const totalPct = item.totalProblems > 0
    ? Math.round((item.totalScore / item.totalProblems) * 100)
    : 0;
  return (
    <div className="space-y-2.5">
      {/* 커리큘럼 헤더 */}
      {item.curriculumTitle && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{item.curriculumTitle}</span>
          {item.curriculumDomain && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
              {item.curriculumDomain === 'reading_and_writing' ? 'RW' : item.curriculumDomain === 'math' ? 'Math' : item.curriculumDomain}
            </span>
          )}
        </div>
      )}
      {/* 수치 라인 */}
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span>총 {item.totalScore}/{item.totalProblems}</span>
        <span className="text-slate-300">·</span>
        <span>{totalPct}%</span>
      </div>
      {/* 레슨별 점수 */}
      {item.lessons.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="px-3 py-1">
            {item.lessons.map((l, i) => <LessonRow key={i} lesson={l} index={i} />)}
          </div>
        </div>
      )}
      {/* AI 서술 */}
      {item.aiNarrative && (
        <p className="text-sm text-slate-600 leading-relaxed">{item.aiNarrative}</p>
      )}
    </div>
  );
}

function DailyReportCard({ item }: { item: Extract<DayItem, { type: 'daily_report' }> }) {
  const [expanded, setExpanded] = useState(false);
  const cleanedLines = item.reportMd
    .split('\n')
    .map(l => l.replace(/^[📊👤📅🕒💡🎯✅⚠🧠🚀──]+\s*/u, '').trim())
    .filter(Boolean);
  const previewLines = cleanedLines.slice(0, 4);
  return (
    <div>
      <div className="space-y-1">
        {(expanded ? cleanedLines : previewLines).map((line, i) => (
          <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
        ))}
      </div>
      {cleanedLines.length > 4 && (
        <button onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors">
          {expanded ? '접기' : '더 보기'}
        </button>
      )}
    </div>
  );
}

function DayCard({ day }: { day: LearningReportType['days'][number] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E2E8F0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
          <span className="text-sm font-medium text-slate-700">{formatDate(day.date)}</span>
          <div className="flex items-center gap-1.5">
            {day.items.map((item, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: ITEM_COLORS[item.type].bg, color: ITEM_COLORS[item.type].text }}>
                {ITEM_LABELS[item.type]}
              </span>
            ))}
          </div>
        </div>
        {open
          ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="divide-y divide-slate-100">
          {day.items.map((item, i) => {
            const color = ITEM_COLORS[item.type];
            return (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color.dot }} />
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: color.bg, color: color.text }}>
                    {ITEM_LABELS[item.type]}
                  </span>
                </div>
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
      )}
    </div>
  );
}

interface Props {
  token: string;
  studentName: string;
  studentCreatedAt: string | null;
}

export default function LearningReport({ token, studentName, studentCreatedAt }: Props) {
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

  const allItems = data?.days.flatMap(d => d.items) ?? [];
  const totalProblems = allItems.reduce((sum, i) => {
    if (i.type === 'study_hall' || i.type === 'test_center') return sum + i.totalProblems;
    return sum;
  }, 0);
  const totalVocab = allItems.reduce((sum, i) => {
    if (i.type === 'voca') return sum + i.masteredCount;
    return sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pt-12" style={{ background: '#F4F5F9' }}>

      {/* Dark header */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 40%)',
        }} />
        <div className="relative max-w-5xl mx-auto px-[6%] py-10 sm:py-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 max-w-[40px]" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>학습 리포트</p>
          </div>
          <h1 className="text-white mb-1 leading-tight"
            style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {studentName} 학생
          </h1>
          {studentCreatedAt && (
            <p className="text-slate-400 text-sm mb-8">
              {new Date(studentCreatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 시작
            </p>
          )}

          {/* 2 stat cards */}
          <div className="flex flex-row gap-3">
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)' }}>
              <span className="text-5xl font-bold leading-none" style={{ color: ACCENT }}>
                {loading ? '—' : totalProblems}
              </span>
              <span className="text-slate-300 text-xs mt-1.5 tracking-widest text-center">푼 문제 수</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-5xl font-bold leading-none text-white">
                {loading ? '—' : totalVocab}
              </span>
              <span className="text-slate-300 text-xs mt-1.5 tracking-widest text-center">마스터 단어</span>
            </div>
          </div>
        </div>
      </div>

      {/* Light content */}
      <div style={{ background: '#F4F5F9' }}>
        <div className="max-w-5xl mx-auto px-[6%] py-8 pb-16">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl animate-pulse bg-white" style={{ border: '1px solid #E2E8F0' }} />
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-400 text-center py-8">{error}</p>}
          {!loading && !error && (!data || data.days.length === 0) && (
            <div className="rounded-2xl px-5 py-10 text-center bg-white" style={{ border: '1px solid #E2E8F0' }}>
              <p className="text-slate-400 text-sm">아직 학습 기록이 없습니다.</p>
            </div>
          )}
          {!loading && !error && data && data.days.length > 0 && (
            <div className="space-y-3">
              {data.days.map(day => <DayCard key={day.date} day={day} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
