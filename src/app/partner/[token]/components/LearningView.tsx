'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, FlaskConical, Library, RefreshCw } from 'lucide-react';
import type {
  DailyLearningResponse,
  CumulativeResponse,
  StudentDayResult,
  StudyHallResult,
  TestCenterResult,
  VocabResult,
} from '@/lib/learning-data';
import { StudentDetailPanel } from './StudentDetailPanel';

const DEFAULT_DATE = '2026-06-16';


// ── Notion data-table-cell tokens ────────────────────────────────────────────

const TH: React.CSSProperties = {
  background: '#f6f5f4',
  padding: '12px 16px',
  borderBottom: '1px solid #e6e6e6',
  borderRight: '1px solid #e6e6e6',
  fontWeight: 'normal',
  textAlign: 'left',
};

const TD: React.CSSProperties = {
  background: '#fff',
  padding: '12px 16px',
  borderBottom: '1px solid #e6e6e6',
  borderRight: '1px solid #e6e6e6',
  verticalAlign: 'top',
  textAlign: 'left',
};

const EYEBROW: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#615d59',
  letterSpacing: '0.125px',
  textTransform: 'uppercase',
};

// ── AccBadge ─────────────────────────────────────────────────────────────────

function AccBadge({ pct }: { pct: number }) {
  const color =
    pct >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    pct >= 70 ? 'bg-blue-50 text-blue-700 border-blue-200' :
    pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded border ${color}`}>{pct}%</span>;
}

// ── Cell: 단어 ────────────────────────────────────────────────────────────────

function VocabCell({ data }: { data: VocabResult }) {
  return (
    <td style={TD}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <AccBadge pct={data.accuracy} />
        <span style={{ fontSize: 12, color: '#31302e' }}>
          {data.wordCount}개 학습 · {data.correctCount}/{data.gradedCount} 정답
        </span>
        {data.masteredCount > 0 && (
          <span style={{ fontSize: 11, color: '#1aae39', fontWeight: 600 }}>
            마스터 {data.masteredCount}개
          </span>
        )}
        {data.missedTerms.length > 0 && (
          <div style={{ paddingTop: 4, borderTop: '1px solid #e6e6e6' }}>
            <span style={{ fontSize: 11, color: '#a39e98', display: 'block', marginBottom: 2 }}>복습 필요</span>
            <span style={{ fontSize: 11, color: '#615d59', lineHeight: 1.5 }}>
              {data.missedTerms.join(', ')}
            </span>
          </div>
        )}
      </div>
    </td>
  );
}

// ── Cell: 테스트센터 ──────────────────────────────────────────────────────────

function TestCenterCell({ items }: { items: TestCenterResult[] }) {
  return (
    <td style={TD}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((tc, i) => {
          const acc = tc.totalProblems > 0
            ? Math.round((tc.totalScore / tc.totalProblems) * 100)
            : 0;
          const domain =
            tc.curriculumDomain === 'reading_and_writing' ? 'RW' :
            tc.curriculumDomain === 'math' ? 'Math' :
            tc.curriculumDomain ?? '';
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {i > 0 && <div style={{ borderTop: '1px solid #e6e6e6', marginBottom: 4 }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                {domain && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#3b82f6',
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 3, padding: '1px 5px',
                  }}>
                    {domain}
                  </span>
                )}
                <AccBadge pct={acc} />
              </div>
              {tc.curriculumTitle && (
                <span style={{ fontSize: 11, color: '#615d59', lineHeight: 1.4 }}>
                  {tc.curriculumTitle}
                </span>
              )}
              <span style={{ fontSize: 12, color: '#31302e' }}>
                {tc.totalScore}/{tc.totalProblems} 정답
              </span>
              {tc.lessons.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 4, borderTop: '1px solid #e6e6e6' }}>
                  {tc.lessons.map((l, j) => {
                    const la = l.total > 0 ? Math.round((l.score / l.total) * 100) : 0;
                    return (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#a39e98', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.title ?? `Module ${j + 1}`}
                        </span>
                        <span style={{ fontSize: 11, color: '#a39e98', whiteSpace: 'nowrap' }}>
                          {l.score}/{l.total}
                        </span>
                        <AccBadge pct={la} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </td>
  );
}

// ── Cell: 스터디홀 ────────────────────────────────────────────────────────────

function StudyHallCell({ data }: { data: StudyHallResult }) {
  const sorted = [...data.skills].sort((a, b) => b.total - a.total);
  return (
    <td style={TD}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <AccBadge pct={data.accuracy} />
        <span style={{ fontSize: 12, color: '#31302e' }}>
          {data.durationMinutes}분 · 총 {data.totalProblems}문
        </span>
        <span style={{ fontSize: 12, color: '#615d59' }}>
          {data.correctCount}/{data.totalProblems} 정답
        </span>
        {sorted.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid #e6e6e6' }}>
            {sorted.map(sk => {
              const acc = sk.total > 0 ? Math.round((sk.correct / sk.total) * 100) : 0;
              return (
                <div key={sk.skill} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#615d59', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sk.skill}
                  </span>
                  <span style={{ fontSize: 11, color: '#a39e98', whiteSpace: 'nowrap' }}>
                    {sk.correct}/{sk.total}
                  </span>
                  <AccBadge pct={acc} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </td>
  );
}

// ── Cell: 누적 단어 ───────────────────────────────────────────────────────────

function VocabCumulativeCell({ data }: { data: VocabResult }) {
  return (
    <td style={TD}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <AccBadge pct={data.accuracy} />
        <span style={{ fontSize: 12, color: '#31302e', fontWeight: 600 }}>
          총 {data.wordCount.toLocaleString()}개
        </span>
        <span style={{ fontSize: 11, color: '#615d59' }}>
          {data.correctCount.toLocaleString()}/{data.gradedCount.toLocaleString()} 정답
        </span>
        {data.masteredCount > 0 && (
          <span style={{ fontSize: 11, color: '#1aae39', fontWeight: 600 }}>
            마스터 {data.masteredCount.toLocaleString()}개
          </span>
        )}
      </div>
    </td>
  );
}

// ── Cell: 누적 테스트센터 ─────────────────────────────────────────────────────

function TestCenterCumulativeCell({ items }: { items: TestCenterResult[] }) {
  const totalProblems = items.reduce((a, v) => a + v.totalProblems, 0);
  const totalScore = items.reduce((a, v) => a + v.totalScore, 0);
  const acc = totalProblems > 0 ? Math.round((totalScore / totalProblems) * 100) : 0;
  return (
    <td style={TD}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <AccBadge pct={acc} />
        <span style={{ fontSize: 12, color: '#31302e', fontWeight: 600 }}>
          총 {totalProblems.toLocaleString()}문
        </span>
        <span style={{ fontSize: 11, color: '#615d59' }}>
          {totalScore.toLocaleString()}/{totalProblems.toLocaleString()} 정답
        </span>
      </div>
    </td>
  );
}

// ── Cell: 누적 스터디홀 ───────────────────────────────────────────────────────

function StudyHallCumulativeCell({ data }: { data: StudyHallResult }) {
  const hours = Math.floor(data.durationMinutes / 60);
  const mins = data.durationMinutes % 60;
  const timeLabel = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  return (
    <td style={TD}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <AccBadge pct={data.accuracy} />
        <span style={{ fontSize: 12, color: '#31302e', fontWeight: 600 }}>
          총 {timeLabel}
        </span>
        <span style={{ fontSize: 11, color: '#615d59' }}>
          {data.correctCount.toLocaleString()}/{data.totalProblems.toLocaleString()} 정답
        </span>
      </div>
    </td>
  );
}

// ── Empty cell ────────────────────────────────────────────────────────────────

function EmptyCell() {
  return (
    <td style={{ ...TD, textAlign: 'center', verticalAlign: 'middle' }}>
      <span style={{ fontSize: 14, color: '#e6e6e6' }}>—</span>
    </td>
  );
}

// ── Row label ─────────────────────────────────────────────────────────────────

function RowLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <th scope="row" style={{ ...TH, whiteSpace: 'nowrap', width: 136 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span style={EYEBROW}>{label}</span>
      </div>
    </th>
  );
}

// ── Student header row (shared) ───────────────────────────────────────────────

interface SelectedStudent { studentToken: string; studentName: string; }

function StudentHeaderRow({
  students,
  onSelect,
}: {
  students: StudentDayResult[];
  onSelect: (s: SelectedStudent) => void;
}) {
  return (
    <tr>
      <th style={{ ...TH, width: 136 }} />
      {students.map((s) => {
        const hasAny = s.studyHall || s.testCenter.length > 0 || s.vocab;
        return (
          <th key={s.name} scope="col" style={{ ...TH, textAlign: 'center', minWidth: 180 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {s.portalToken ? (
                <button
                  onClick={() => onSelect({ studentToken: s.portalToken!, studentName: s.name })}
                  style={{ fontSize: 13, fontWeight: 700, color: '#000', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  {s.name}
                  <span style={{ fontSize: 12, color: '#a39e98', fontWeight: 400 }}>›</span>
                </button>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{s.name}</span>
              )}
              {!hasAny && (
                <span style={{ fontSize: 11, color: '#a39e98' }}>기록 없음</span>
              )}
            </div>
          </th>
        );
      })}
    </tr>
  );
}

// ── Pivot table: 일별 ────────────────────────────────────────────────────────

function DailyPivotTable({
  students,
  startIndex,
  onSelect,
  faded,
}: {
  students: StudentDayResult[];
  startIndex: number;
  onSelect: (s: SelectedStudent) => void;
  faded?: boolean;
}) {
  return (
    <div style={{ overflowX: 'auto', opacity: faded ? 0.55 : 1 }}>
      <table style={{ borderCollapse: 'collapse', minWidth: students.length * 180 + 136 }}>
        <thead>
          <StudentHeaderRow students={students} onSelect={onSelect} />
        </thead>
        <tbody>
          <tr>
            <RowLabel icon={<BookOpen size={12} color="#d97706" />} label="단어" />
            {students.map(s => s.vocab
              ? <VocabCell key={s.name} data={s.vocab} />
              : <EmptyCell key={s.name} />
            )}
          </tr>
          <tr>
            <RowLabel icon={<FlaskConical size={12} color="#3b82f6" />} label="테스트센터" />
            {students.map(s => s.testCenter.length > 0
              ? <TestCenterCell key={s.name} items={s.testCenter} />
              : <EmptyCell key={s.name} />
            )}
          </tr>
          <tr>
            <RowLabel icon={<Library size={12} color="#a855f7" />} label="스터디홀" />
            {students.map(s => s.studyHall
              ? <StudyHallCell key={s.name} data={s.studyHall} />
              : <EmptyCell key={s.name} />
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Pivot table: 전체 누적 ───────────────────────────────────────────────────

function CumulativePivotTable({
  students,
  startIndex,
  onSelect,
  faded,
}: {
  students: StudentDayResult[];
  startIndex: number;
  onSelect: (s: SelectedStudent) => void;
  faded?: boolean;
}) {
  return (
    <div style={{ overflowX: 'auto', opacity: faded ? 0.55 : 1 }}>
      <table style={{ borderCollapse: 'collapse', minWidth: students.length * 180 + 136 }}>
        <thead>
          <StudentHeaderRow students={students} onSelect={onSelect} />
        </thead>
        <tbody>
          <tr>
            <RowLabel icon={<BookOpen size={12} color="#d97706" />} label="단어" />
            {students.map(s => s.vocab
              ? <VocabCumulativeCell key={s.name} data={s.vocab} />
              : <EmptyCell key={s.name} />
            )}
          </tr>
          <tr>
            <RowLabel icon={<FlaskConical size={12} color="#3b82f6" />} label="테스트센터" />
            {students.map(s => s.testCenter.length > 0
              ? <TestCenterCumulativeCell key={s.name} items={s.testCenter} />
              : <EmptyCell key={s.name} />
            )}
          </tr>
          <tr>
            <RowLabel icon={<Library size={12} color="#a855f7" />} label="스터디홀" />
            {students.map(s => s.studyHall
              ? <StudyHallCumulativeCell key={s.name} data={s.studyHall} />
              : <EmptyCell key={s.name} />
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Skeleton table ────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr>
            {[136, 180, 180, 180, 180].map((w, i) => (
              <th key={i} style={{ ...TH, width: w }}>
                <div className="h-10 bg-[#e6e6e6] rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map(row => (
            <tr key={row}>
              {[136, 180, 180, 180, 180].map((w, col) => (
                <td key={col} style={{ ...TD, width: w }}>
                  <div className="h-16 bg-[#f6f5f4] rounded animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

type ViewTab = 'cumulative' | 'daily';

export function LearningView({ token, adminKey }: { token: string; adminKey?: string }) {
  const [tab, setTab] = useState<ViewTab>('cumulative');
  const [date, setDate] = useState(DEFAULT_DATE);

  const [cumData, setCumData] = useState<CumulativeResponse | null>(null);
  const [cumLoading, setCumLoading] = useState(false);
  const [cumError, setCumError] = useState<string | null>(null);

  const [dailyData, setDailyData] = useState<DailyLearningResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);

  const headers: HeadersInit = adminKey ? { 'x-admin-key': adminKey } : {};

  const loadCumulative = useCallback(async () => {
    setCumLoading(true);
    setCumError(null);
    try {
      const res = await fetch(`/api/partner/${token}/cumulative`, { headers });
      if (!res.ok) throw new Error(`데이터를 불러오지 못했습니다 (${res.status})`);
      setCumData(await res.json());
    } catch (e) {
      setCumError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setCumLoading(false);
    }
  }, [token, adminKey]);

  const loadDaily = useCallback(async (targetDate: string) => {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const res = await fetch(`/api/partner/${token}/learning?date=${targetDate}`, { headers });
      if (!res.ok) throw new Error(`데이터를 불러오지 못했습니다 (${res.status})`);
      setDailyData(await res.json());
    } catch (e) {
      setDailyError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setDailyLoading(false);
    }
  }, [token, adminKey]);

  useEffect(() => { loadCumulative(); }, [loadCumulative]);
  useEffect(() => {
    if (tab === 'daily' && !dailyData) loadDaily(date);
  }, [tab]);

  const dateLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    : '';

  function renderStudentGroups(
    students: StudentDayResult[],
    TableComponent: typeof DailyPivotTable | typeof CumulativePivotTable,
  ) {
    const active = students.filter(s => s.isActive !== false);
    const inactive = students.filter(s => s.isActive === false);
    return (
      <div className="space-y-10">
        {active.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1aae39] inline-block" />
              <span className="text-xs font-semibold text-[#31302e]">수업 중</span>
              <span className="text-xs text-[#a39e98]">{active.length}명</span>
            </div>
            <TableComponent students={active} startIndex={0} onSelect={setSelectedStudent} />
          </div>
        )}
        {inactive.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a39e98] inline-block" />
              <span className="text-xs font-semibold text-[#a39e98]">수업 종료</span>
              <span className="text-xs text-[#a39e98]">{inactive.length}명</span>
            </div>
            <TableComponent students={inactive} startIndex={active.length} onSelect={setSelectedStudent} faded />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f5f4]">
      {/* ── Header ── */}
      <header className="bg-white border-b border-[#e6e6e6] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-xs font-semibold text-[#0075de] bg-white border border-[#e6e6e6] px-2 py-0.5 rounded-full"
                style={{ letterSpacing: '0.125px' }}
              >
                SuperfastSAT
              </span>
              <span className="text-xs text-[#a39e98]">파트너 리포트</span>
            </div>
            <h1 className="text-lg font-bold text-[#000]">학습 현황</h1>
          </div>
          {tab === 'daily' && (
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); loadDaily(e.target.value); }}
                className="bg-white border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm text-[#31302e] focus:outline-none focus:border-[#0075de]"
              />
              <button
                onClick={() => loadDaily(date)}
                disabled={dailyLoading}
                className="flex items-center gap-2 px-3 py-2 bg-[#0075de] hover:bg-[#005bab] rounded-lg text-sm text-white disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={14} className={dailyLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── 탭 ── */}
      <div className="bg-white border-b border-[#e6e6e6]">
        <div className="max-w-6xl mx-auto px-6 flex">
          {([
            { key: 'cumulative' as ViewTab, label: '전체 누적' },
            { key: 'daily' as ViewTab, label: '날짜별' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-[#0075de] text-[#0075de]'
                  : 'border-transparent text-[#615d59] hover:text-[#31302e]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* ── 정답률 범례 ── */}
        <div className="flex items-center gap-3 mb-6 text-xs text-[#a39e98]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-200 inline-block" />≥85%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-200 inline-block" />70–84%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-200 inline-block" />50–69%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-200 inline-block" />&lt;50%</span>
        </div>

        {/* ── 전체 누적 탭 ── */}
        {tab === 'cumulative' && (
          <>
            {cumError && (
              <div className="mb-4 p-3 bg-white border border-[#e6e6e6] rounded-lg text-sm text-red-600">{cumError}</div>
            )}
            {cumLoading && <SkeletonTable />}
            {!cumLoading && cumData && renderStudentGroups(cumData.students, CumulativePivotTable)}
          </>
        )}

        {/* ── 날짜별 탭 ── */}
        {tab === 'daily' && (
          <>
            <p className="text-sm text-[#615d59] mb-6">{dateLabel}</p>
            {dailyError && (
              <div className="mb-4 p-3 bg-white border border-[#e6e6e6] rounded-lg text-sm text-red-600">{dailyError}</div>
            )}
            {dailyLoading && <SkeletonTable />}
            {!dailyLoading && dailyData && renderStudentGroups(dailyData.students, DailyPivotTable)}
          </>
        )}
      </main>

      <footer className="mt-12 pb-6 text-center">
        <p className="text-xs text-[#a39e98]">SuperfastSAT · 학습 현황 리포트</p>
      </footer>

      {selectedStudent && (
        <StudentDetailPanel
          partnerToken={token}
          studentToken={selectedStudent.studentToken}
          studentName={selectedStudent.studentName}
          adminKey={adminKey}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
