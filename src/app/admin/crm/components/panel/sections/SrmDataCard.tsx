'use client';

import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Loader2, RefreshCw, Search, Link2 } from 'lucide-react';
import type { LearningReport, DayItem } from '@/types/srm-portal';
import { DayCard } from '@/app/portal/[token]/components/LearningReportCards';
import type { V2Profile } from '@/app/api/admin/srm/v2-search/route';
import { SrmBrief } from './SrmBrief';
import { SrmTestCenterTrend } from './SrmTestCenterTrend';
import { SectionCard } from './SectionCard';
import { stripNameSuffix } from './srm-name';

interface Props {
  studentId: string;
  studentName: string;
  adminKey: string;
  autoLoad?: boolean;
  className?: string;
}

type Status = 'idle' | 'loading' | 'loaded' | 'unlinked' | 'error';
type Filter = 'all' | DayItem['type'];

const TYPE_LABELS: Record<DayItem['type'], string> = {
  study_hall: 'Study Hall',
  test_center: '테스트 센터',
  voca: '단어',
  lesson_feedback: '레슨 피드백',
  daily_report: '일간 리포트',
};
const TYPE_ORDER: DayItem['type'][] = ['study_hall', 'test_center', 'voca', 'lesson_feedback', 'daily_report'];

// 마지막 학습일 → "오늘 / 어제 / N일 전" (운영: 학생이 활동 중인지 신호)
function relativeDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return '오늘';
  if (diff === 1) return '어제';
  return `${diff}일 전`;
}

// 선택한 항목 타입의 집계 요약 (운영: 항목별 한눈에 확인)
function categorySummary(items: DayItem[], type: DayItem['type']): { label: string; value: string }[] {
  const of = items.filter((i) => i.type === type);
  if (type === 'study_hall') {
    const list = of as Extract<DayItem, { type: 'study_hall' }>[];
    const min = list.reduce((s, i) => s + i.durationMinutes, 0);
    const prob = list.reduce((s, i) => s + i.totalProblems, 0);
    const correct = list.reduce((s, i) => s + i.correctCount, 0);
    return [
      { label: '총 학습시간', value: min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min}분` },
      { label: '문제', value: `${prob}` },
      { label: '정답률', value: prob ? `${Math.round((correct / prob) * 100)}%` : '-' },
    ];
  }
  if (type === 'test_center') {
    const list = of as Extract<DayItem, { type: 'test_center' }>[];
    const score = list.reduce((s, i) => s + i.totalScore, 0);
    const prob = list.reduce((s, i) => s + i.totalProblems, 0);
    return [
      { label: '세션', value: `${list.length}` },
      { label: '문제', value: `${prob}` },
      { label: '평균 정답률', value: prob ? `${Math.round((score / prob) * 100)}%` : '-' },
    ];
  }
  if (type === 'voca') {
    const list = of as Extract<DayItem, { type: 'voca' }>[];
    const words = list.reduce((s, i) => s + i.wordCount, 0);
    const mastered = list.reduce((s, i) => s + i.masteredCount, 0);
    const graded = list.reduce((s, i) => s + i.gradedCount, 0);
    const correct = list.reduce((s, i) => s + i.correctCount, 0);
    return [
      { label: '학습 단어', value: `${words}` },
      { label: '마스터', value: `${mastered}` },
      { label: '정답률', value: graded ? `${Math.round((correct / graded) * 100)}%` : '-' },
    ];
  }
  return [{ label: TYPE_LABELS[type], value: `${of.length}건` }];
}

interface SkillStat { skill: string; acc: number; total: number }

// study_hall + test_center 스킬을 합산해 정답률 기준 강점/약점 스킬 도출 (한눈에 스캔)
function computeSkillRanking(report: LearningReport): { strengths: SkillStat[]; weaknesses: SkillStat[] } {
  const map = new Map<string, { correct: number; total: number }>();
  for (const d of report.days) {
    for (const it of d.items) {
      const skills = it.type === 'study_hall' || it.type === 'test_center' ? it.skills : undefined;
      for (const sk of skills ?? []) {
        const e = map.get(sk.skill) ?? { correct: 0, total: 0 };
        e.correct += sk.correct; e.total += sk.total; map.set(sk.skill, e);
      }
    }
  }
  const ranked: SkillStat[] = [...map.entries()]
    .filter(([, v]) => v.total >= 5)
    .map(([skill, v]) => ({ skill, acc: Math.round((v.correct / v.total) * 100), total: v.total }));
  return {
    strengths: ranked.filter((r) => r.acc >= 80).sort((a, b) => b.acc - a.acc).slice(0, 4),
    weaknesses: ranked.filter((r) => r.acc < 65).sort((a, b) => a.acc - b.acc).slice(0, 4),
  };
}

function SkillChips({ label, items, tone }: { label: string; items: SkillStat[]; tone: 'emerald' | 'amber' }) {
  const c = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100';
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((s) => (
          <span key={s.skill} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${c}`}>
            {s.skill} <span className="opacity-70 tabular-nums">{s.acc}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// CRM 학생 패널 왼쪽 카드 — v2 학습 플랫폼의 SRM 데이터(일별 학습 리포트).
// buildSrmReport가 무거우므로 버튼 클릭(온디맨드)으로만 로딩한다.
export function SrmDataCard({ studentId, studentName, adminKey, autoLoad, className }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [report, setReport] = useState<LearningReport | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const headers = { 'x-admin-key': adminKey };

  const load = useCallback(async () => {
    setStatus('loading');
    setFilter('all');
    try {
      const res = await fetch(`/api/crm/students/${studentId}/srm-report`, { headers });
      if (res.status === 404) {
        const j = await res.json().catch(() => ({}));
        setStatus(j.error === 'no_v2_profile' ? 'unlinked' : 'error');
        return;
      }
      if (!res.ok) { setStatus('error'); return; }
      const json = await res.json();
      setReport(json.report as LearningReport);
      setStatus('loaded');
    } catch {
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, adminKey]);

  useEffect(() => {
    if (autoLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  // ── 연결(미연결 상태) ──
  // CRM 이름의 동명이인 접미사(예: "박시연03")를 떼고 프리필 → v2 순수 이름과 매칭
  const [q, setQ] = useState(() => stripNameSuffix(studentName));
  const [candidates, setCandidates] = useState<V2Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (status !== 'unlinked') return;
    const term = q.trim();
    if (!term) { setCandidates([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/srm/v2-search?q=${encodeURIComponent(term)}`, { headers });
        const json = await res.json();
        setCandidates(json.data ?? []);
      } catch {
        setCandidates([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, adminKey]);

  async function handleLink(profile: V2Profile) {
    if (linking) return;
    setLinking(true);
    try {
      const res = await fetch('/api/admin/srm/link', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sfv2ProfileId: profile.id, crmStudentId: studentId }),
      });
      if (res.ok) await load();
    } finally {
      setLinking(false);
    }
  }

  const allItems = report?.days.flatMap((d) => d.items) ?? [];

  return (
    <div className={className ?? "relative hidden lg:flex w-full max-w-[420px] bg-white border-l border-gray-200 flex-col h-full overflow-hidden shadow-xl"}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <GraduationCap size={16} className="text-blue-500" />
        <span className="text-sm font-semibold text-gray-800">SRM 학습 데이터</span>
        {status === 'loaded' && (
          <button
            onClick={load}
            className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors"
          >
            <RefreshCw size={12} /> 새로고침
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {status === 'idle' && (
          <div className="text-center py-10">
            <p className="text-xs text-gray-400 mb-3">v2 학습 플랫폼의 일별 학습 리포트를 불러옵니다.</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
            >
              <GraduationCap size={14} /> SRM 리포트 불러오기
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중…
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-10 space-y-2">
            <p className="text-sm text-red-500">데이터를 불러오지 못했습니다.</p>
            <button onClick={load} className="text-xs text-blue-500 hover:text-blue-700">다시 시도</button>
          </div>
        )}

        {status === 'unlinked' && (
          <div className="space-y-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-700 mb-1">SRM 프로필 미연결</p>
              <p className="text-[11px] text-orange-600">학습 리포트를 보려면 v2 프로필을 연결하세요.</p>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="v2에서 이름 검색…"
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-500"
              />
            </div>
            {searching && <p className="text-xs text-gray-400">검색 중…</p>}
            <div className="space-y-1">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleLink(c)}
                  disabled={linking}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-md border border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 transition-colors disabled:opacity-50"
                >
                  <Link2 size={13} className="text-gray-400 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-700 truncate">{c.full_name}</span>
                    {(c.email || c.phone) && (
                      <span className="block text-[11px] text-gray-400 truncate">{c.email ?? c.phone}</span>
                    )}
                  </span>
                </button>
              ))}
              {!searching && q.trim() && candidates.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">일치하는 프로필이 없습니다.</p>
              )}
            </div>
          </div>
        )}

        {status === 'loaded' && report && (() => {
          const presentTypes = TYPE_ORDER.filter((t) => allItems.some((i) => i.type === t));
          const typeCount = (t: DayItem['type']) => allItems.filter((i) => i.type === t).length;
          const lastDate = report.days[0]?.date;
          const filteredDays = filter === 'all'
            ? report.days
            : report.days
                .map((d) => ({ ...d, items: d.items.filter((i) => i.type === filter) }))
                .filter((d) => d.items.length > 0);

          // 즉시(클라 계산) KPI — LLM 불필요
          const acc = (items: DayItem[], type: DayItem['type']): string => {
            if (type === 'study_hall') {
              const l = items.filter((i): i is Extract<DayItem, { type: 'study_hall' }> => i.type === 'study_hall');
              const p = l.reduce((s, i) => s + i.totalProblems, 0), c = l.reduce((s, i) => s + i.correctCount, 0);
              return p ? `${Math.round((c / p) * 100)}%` : '-';
            }
            const l = items.filter((i): i is Extract<DayItem, { type: 'test_center' }> => i.type === 'test_center');
            const p = l.reduce((s, i) => s + i.totalProblems, 0), c = l.reduce((s, i) => s + i.totalScore, 0);
            return p ? `${Math.round((c / p) * 100)}%` : '-';
          };
          const vc = allItems.filter((i): i is Extract<DayItem, { type: 'voca' }> => i.type === 'voca');
          const vGraded = vc.reduce((s, i) => s + i.gradedCount, 0), vCorrect = vc.reduce((s, i) => s + i.correctCount, 0);
          const kpis: { label: string; value: string }[] = [
            { label: '학습일수', value: `${report.days.length}일` },
            { label: '마지막 학습', value: lastDate ? relativeDay(lastDate) : '-' },
          ];
          if (allItems.some((i) => i.type === 'study_hall')) kpis.push({ label: 'Study Hall 정답률', value: acc(allItems, 'study_hall') });
          if (allItems.some((i) => i.type === 'test_center')) kpis.push({ label: '테스트센터 평균', value: acc(allItems, 'test_center') });
          if (vc.length) kpis.push({ label: '단어 정답률', value: vGraded ? `${Math.round((vCorrect / vGraded) * 100)}%` : '-' });
          if (vc.length) kpis.push({ label: '단어 마스터', value: `${vc.reduce((s, i) => s + i.masteredCount, 0)}개` });
          const ranking = computeSkillRanking(report);

          return (
            <div className="space-y-3">
              {/* AI 현황 브리핑 (자동 생성) */}
              <SrmBrief studentId={studentId} adminKey={adminKey} />

              {/* KPI 대시보드 (즉시) */}
              <div className="grid grid-cols-3 gap-1.5">
                {kpis.map((k) => (
                  <div key={k.label} className="rounded-lg bg-gray-50 border border-gray-100 px-2 py-1.5">
                    <p className="text-[10px] text-gray-400 leading-tight">{k.label}</p>
                    <p className="text-sm font-semibold text-gray-800 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>

              {/* 강점/약점 스킬 (즉시) */}
              {(ranking.strengths.length > 0 || ranking.weaknesses.length > 0) && (
                <div className="space-y-2">
                  {ranking.strengths.length > 0 && <SkillChips label="강점 스킬" items={ranking.strengths} tone="emerald" />}
                  {ranking.weaknesses.length > 0 && <SkillChips label="취약 스킬" items={ranking.weaknesses} tone="amber" />}
                </div>
              )}

              {/* 테스트센터 점수 + 연습 vs 실전 추이 그래프 */}
              <SrmTestCenterTrend report={report} />

              {/* 자세히 보기 — 항목별 탭 + 일별 상세 (기본 접힘) */}
              <SectionCard title="자세히 보기 · 일별 학습" count={report.days.length} defaultOpen={false} bodyClassName="pt-2 space-y-3">
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${filter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    전체
                  </button>
                  {presentTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilter(t)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${filter === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      {TYPE_LABELS[t]} <span className="opacity-60">{typeCount(t)}</span>
                    </button>
                  ))}
                </div>

                {filter !== 'all' && (
                  <div className="flex gap-5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                    {categorySummary(allItems, filter).map((s) => (
                      <div key={s.label}>
                        <p className="text-[10px] text-gray-400">{s.label}</p>
                        <p className="text-sm font-semibold text-gray-800 tabular-nums">{s.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {filteredDays.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">학습 기록이 없습니다.</p>
                ) : (
                  filteredDays.map((day) => <DayCard key={day.date} day={day} />)
                )}
              </SectionCard>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
