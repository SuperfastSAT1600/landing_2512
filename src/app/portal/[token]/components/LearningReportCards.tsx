'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LearningReport as LearningReportType, DayItem, StudyHallSkill, TestCenterLesson } from '@/types/srm-portal';

export const ACCENT = '#6085FF';

const ITEM_LABELS: Record<DayItem['type'], string> = {
  study_hall:      'Study Hall',
  test_center:     '테스트 센터',
  daily_report:    '일간 리포트',
  voca:            '단어',
  lesson_feedback: '레슨 피드백',
};

const ITEM_COLORS: Record<DayItem['type'], { bg: string; text: string; dot: string }> = {
  study_hall:      { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  test_center:     { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  daily_report:    { bg: '#F8FAFC', text: '#475569', dot: '#94A3B8' },
  voca:            { bg: '#FAF5FF', text: '#7E22CE', dot: '#A855F7' },
  lesson_feedback: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
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

function VocaCard({ item }: { item: Extract<DayItem, { type: 'voca' }> }) {
  return (
    <div className="space-y-2.5">
      {/* 수치 라인 */}
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span>단어 {item.wordCount}개</span>
        {item.gradedCount > 0 && (
          <>
            <span className="text-slate-300">·</span>
            <span>정답률 {item.accuracy}%</span>
            <span className="text-xs font-normal text-slate-400">({item.correctCount}/{item.gradedCount})</span>
          </>
        )}
        {item.masteredCount > 0 && (
          <>
            <span className="text-slate-300">·</span>
            <span style={{ color: '#7E22CE' }}>마스터 {item.masteredCount}개</span>
          </>
        )}
      </div>
      {/* 복습 단어 배지 */}
      {item.missedTerms.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400">복습 단어</span>
          {item.missedTerms.map(term => (
            <span key={term} className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: '#FAF5FF', color: '#7E22CE', border: '1px solid #F3E8FF' }}>
              {term}
            </span>
          ))}
        </div>
      )}
      {/* AI 서술 */}
      {item.aiNarrative && (
        <p className="text-sm text-slate-600 leading-relaxed">{item.aiNarrative}</p>
      )}
    </div>
  );
}

function LessonFeedbackCard({ item }: { item: Extract<DayItem, { type: 'lesson_feedback' }> }) {
  const [expanded, setExpanded] = useState(false);
  const lines = item.feedback.split('\n').map(l => l.trim()).filter(Boolean);
  const previewLines = lines.slice(0, 4);
  const timeStr = new Date(item.startsAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{timeStr}</span>
        {item.coachName && (
          <>
            <span>·</span>
            <span>{item.coachName} 코치</span>
          </>
        )}
      </div>
      <div className="space-y-1">
        {(expanded ? lines : previewLines).map((line, i) => (
          <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
        ))}
      </div>
      {lines.length > 4 && (
        <button onClick={() => setExpanded(e => !e)}
          className="text-xs text-orange-500 hover:text-orange-700 transition-colors">
          {expanded ? '접기' : '더 보기'}
        </button>
      )}
    </div>
  );
}

export function DayCard({ day }: { day: LearningReportType['days'][number] }) {
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
                {item.type === 'voca' && <VocaCard item={item} />}
                {item.type === 'lesson_feedback' && <LessonFeedbackCard item={item} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
