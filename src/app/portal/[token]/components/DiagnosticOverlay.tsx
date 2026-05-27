'use client';

import { useState, useEffect, useRef } from 'react';
import type { ReportData } from '@/lib/report-data';
import { generateAllInsights, type ReportInsights } from '@/lib/report-insights';
import { mergeInsights, getEditedFieldKeys } from '@/lib/merge-insights';
import { ReportCover } from '@/app/reports/[resultId]/components/ReportCover';
import { ReportExecutiveSummary } from '@/app/reports/[resultId]/components/ReportExecutiveSummary';
import { ReportBenchmarkChart } from '@/app/reports/[resultId]/components/ReportBenchmarkChart';
import { ReportRadarChart } from '@/app/reports/[resultId]/components/ReportRadarChart';
import { ReportBehavioralMatrix } from '@/app/reports/[resultId]/components/ReportBehavioralMatrix';
import { ReportVocabularyGap } from '@/app/reports/[resultId]/components/ReportVocabularyGap';
import { SectionHeader } from '@/app/reports/[resultId]/components/SectionHeader';
import { InsightBlock, GenericInsightBlock } from '@/app/reports/[resultId]/components/InsightBlock';

interface Props {
  resultId: string;
}

const EMPTY_INSIGHTS: ReportInsights = {
  executiveSummary: '',
  sections: {},
  topWeakDomains: [],
  behavioral: '',
  vocabulary: null,
  keyRecommendations: [],
};

const CHAPTERS = [
  { id: 'diag-section-01', label: '전체 성적' },
  { id: 'diag-section-02', label: '비교 성적' },
  { id: 'diag-section-03', label: '풀이 패턴' },
  { id: 'diag-section-04', label: '단어 상태' },
] as const;

function Divider() {
  return <div className="h-px bg-slate-200 my-10" />;
}

function scrollToSection(id: string, containerRef: React.RefObject<HTMLDivElement | null>) {
  const el = document.getElementById(id);
  const container = containerRef.current;
  if (!el || !container) return;
  const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 52;
  container.scrollTo({ top, behavior: 'smooth' });
}

export default function DiagnosticOverlay({ resultId }: Props) {
  const [data, setData] = useState<ReportData | null>(null);
  const [insights, setInsights] = useState<ReportInsights>(EMPTY_INSIGHTS);
  const [editedKeys, setEditedKeys] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChapter, setActiveChapter] = useState<string>(CHAPTERS[0].id);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/reports/${resultId}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((d: ReportData) => {
        setData(d);
        try {
          const ai = generateAllInsights(d.sections, d.questionDetails, d.savedWords ?? [], d.timeLimitMinutes);
          const merged = mergeInsights(ai, d.editedInsights);
          setInsights(merged);
          setEditedKeys(getEditedFieldKeys(d.editedInsights));
        } catch { /* insights stay empty */ }
        setLoading(false);
      })
      .catch(() => { setError('리포트를 불러올 수 없습니다.'); setLoading(false); });
  }, [resultId]);

  // Scroll progress
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function update() {
      if (!container) return;
      const total = container.scrollHeight - container.clientHeight;
      setScrollProgress(total > 0 ? Math.min(container.scrollTop / total, 1) : 0);
    }
    container.addEventListener('scroll', update, { passive: true });
    return () => container.removeEventListener('scroll', update);
  }, []);

  // IntersectionObserver for active chapter tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data) return;

    const els = CHAPTERS.map(c => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveChapter(visible[0].target.id);
      },
      { root: container, rootMargin: '-52px 0px -60% 0px', threshold: 0 },
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [data]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 overflow-y-auto pt-12 pb-16 sm:pb-0" style={{ background: '#F4F5F9', fontFamily: 'var(--font-sans)' }}>

      {/* Progress bar — top of viewport */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ height: 2, background: '#E2E8F0' }}>
        <div style={{ height: '100%', width: `${scrollProgress * 100}%`, background: '#6085FF', transition: 'width 0.1s linear' }} />
      </div>

      {/* Desktop sticky chapter nav — sticks below portal nav (top-12) */}
      <nav
        className="hidden sm:block sticky top-0 z-40"
        style={{ background: 'white', borderBottom: '1px solid #E2E8F0' }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-2 py-2">
            {CHAPTERS.map(ch => {
              const isActive = activeChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => scrollToSection(ch.id, containerRef)}
                  className="flex-shrink-0 rounded-full transition-colors"
                  style={{
                    padding: '4px 14px',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? '#09090b' : '#F1F5F9',
                    color: isActive ? '#ffffff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile fixed bottom chapter nav */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'white', borderTop: '1px solid #E2E8F0', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {CHAPTERS.map(ch => {
            const isActive = activeChapter === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => scrollToSection(ch.id, containerRef)}
                className="flex-1 flex flex-col items-center justify-center transition-colors"
                style={{
                  paddingTop: 18,
                  paddingBottom: 18,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#09090b' : '#94A3B8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderTop: isActive ? '2px solid #071be9' : '2px solid transparent',
                }}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#6085FF', borderTopColor: 'transparent' }} />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-32">
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      )}

      {/* Report content */}
      {data && (
        <>
          <ReportCover
            studentName={data.studentName}
            submittedAt={data.submittedAt}
            totalTimeSeconds={data.totalTimeSeconds}
            sections={data.sections}
            previousScoreStatus={data.previousScoreStatus}
            previousTestDate={data.previousTestDate}
            previousRwScore={data.previousRwScore}
            previousMathScore={data.previousMathScore}
          />

          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:pt-14">
            <div className="space-y-10 sm:space-y-14">

              {/* 01 전체 성적 */}
              <section id="diag-section-01">
                <SectionHeader number="01" title="전체 성적" titleEn="Overall Score" subtitle="이번 시험에서 몇 문제나 맞았나요?" />
                <ReportExecutiveSummary
                  studentName={data.studentName}
                  submittedAt={data.submittedAt}
                  totalTimeSeconds={data.totalTimeSeconds}
                  sections={data.sections}
                  sectionBenchmarks={data.benchmarks.sections}
                />
                {insights.executiveSummary && (
                  <div className="mt-5">
                    <GenericInsightBlock headline="Analyst's Take" body={insights.executiveSummary} icon="✦" tutor={editedKeys.has('executiveSummary')} />
                  </div>
                )}
                <div className="mt-8 space-y-5">
                  <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#6085FF' }}>Domain Breakdown</p>
                  <ReportRadarChart sections={data.sections} domainBenchmarks={data.benchmarks.domains} />
                  {insights.topWeakDomains.length > 0 && (
                    <div className="mt-5">
                      <GenericInsightBlock
                        headline="Highest-Leverage Domains"
                        body={insights.topWeakDomains.map(d => `${d.domain}: ${d.note}`).join('  ·  ')}
                        icon="◎"
                      />
                    </div>
                  )}
                </div>
              </section>

              <Divider />

              {/* 02 비교 성적 */}
              <section id="diag-section-02">
                <SectionHeader number="02" title="비교 성적" titleEn="vs. Top 10%" subtitle="상위 10%와의 비교 성적" />
                <ReportBenchmarkChart sections={data.sections} sectionBenchmarks={data.benchmarks.sections} />
                <div className="mt-5 space-y-3">
                  {data.sections.map(section => {
                    const insight = insights.sections[section.name];
                    if (!insight) return null;
                    return <InsightBlock key={section.name} insight={insight} />;
                  })}
                </div>
              </section>

              <Divider />

              {/* 03 풀이 패턴 */}
              <section id="diag-section-03">
                <SectionHeader number="03" title="문제 풀이 패턴" titleEn="Test-Taking Patterns" subtitle="시간 배분과 자신감은 어떤 모습인가요?" />
                <ReportBehavioralMatrix questionDetails={data.questionDetails} />
                {insights.behavioral && (
                  <div className="mt-5">
                    <GenericInsightBlock headline="Pacing & Confidence Pattern" body={insights.behavioral} icon="⟳" tutor={editedKeys.has('behavioral')} />
                  </div>
                )}
              </section>

              <Divider />

              {/* 04 단어 상태 */}
              <section id="diag-section-04">
                <SectionHeader number="04" title="모르는 단어" titleEn="Vocabulary Gap" subtitle="단어 때문에 틀린 문제가 있었나요?" />
                <ReportVocabularyGap savedWords={data.savedWords} />
                {insights.vocabulary && (
                  <div className="mt-5">
                    <GenericInsightBlock headline="Vocabulary Strategy" body={insights.vocabulary} icon="≋" tutor={editedKeys.has('vocabulary')} />
                  </div>
                )}
              </section>

              {insights.keyRecommendations.length > 0 && (
                <>
                  <Divider />
                  <section>
                    <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #E8E9F0' }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#09090b' }}>Key Recommendations</p>
                      <ol className="space-y-4">
                        {insights.keyRecommendations.map((rec, i) => (
                          <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                            <span
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white mt-0.5"
                              style={{ background: '#071be9' }}
                            >
                              {i + 1}
                            </span>
                            {rec}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </section>
                </>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}
