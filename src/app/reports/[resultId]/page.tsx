import { notFound } from 'next/navigation';
import { ReportCover } from './components/ReportCover';
import { ReportExecutiveSummary } from './components/ReportExecutiveSummary';
import { ReportBenchmarkChart } from './components/ReportBenchmarkChart';
import { ReportRadarChart } from './components/ReportRadarChart';
import { ReportBehavioralMatrix } from './components/ReportBehavioralMatrix';
import { ReportVocabularyGap } from './components/ReportVocabularyGap';
import { ReportShareBar } from './components/ReportShareBar';
import { SectionHeader } from './components/SectionHeader';
import { ChapterNav } from './components/ChapterNav';
import { InsightBlock, GenericInsightBlock } from './components/InsightBlock';
import { generateAllInsights } from '@/lib/report-insights';
import { mergeInsights, getEditedFieldKeys } from '@/lib/merge-insights';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ resultId: string }>;
}

async function getReportData(resultId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/reports/${resultId}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { resultId } = await params;
  const data = await getReportData(resultId);
  if (!data) return { title: 'Report Not Found' };
  return {
    title: `${data.studentName} — SAT Diagnostic Report`,
    description: 'Detailed performance analysis from the SuperfastSAT diagnostic test.',
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { resultId } = await params;
  const data = await getReportData(resultId);

  if (!data) notFound();

  const aiInsights = generateAllInsights(
    data.sections,
    data.questionDetails,
    data.savedWords ?? [],
  );
  const insights = mergeInsights(aiInsights, data.editedInsights);
  const editedKeys = getEditedFieldKeys(data.editedInsights);

  return (
    <div style={{ background: '#F4F5F9', fontFamily: 'var(--font-sans)' }}>

      {/* Print-only header */}
      <div className="hidden print:flex print:items-center print:justify-between px-8 py-5 border-b border-slate-200">
        <div>
          <span className="font-bold text-[#09090b] text-lg">SuperfastSAT</span>
          <span className="text-slate-400 text-sm ml-2">· SAT Diagnostic Report</span>
        </div>
        <span className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US')}</span>
      </div>

      {/* Cover */}
      <ReportCover
        studentName={data.studentName}
        submittedAt={data.submittedAt}
        totalTimeSeconds={data.totalTimeSeconds}
        sections={data.sections}
      />

      {/* Toolbar */}
      <div
        className="sticky top-0 z-30 print:hidden"
        style={{ background: '#09090b', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white">SuperfastSAT</span>
            <span className="text-slate-600 text-sm">·</span>
            <span className="text-slate-400 text-sm hidden sm:inline">Diagnostic Report</span>
          </div>
          <ReportShareBar />
        </div>
      </div>

      {/* Chapter navigation */}
      <ChapterNav />

      {/* Single-column main content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 print:py-6">
        <div className="space-y-10 sm:space-y-14 print:space-y-8">

          {/* ── SECTION 01: 전체 성적 ── */}
          <section id="section-01" style={{ scrollMarginTop: 96 }}>
            <SectionHeader
              number="01"
              title="전체 성적"
              titleEn="Overall Score"
              subtitle="이번 시험에서 몇 문제나 맞았나요?"
            />
            <ReportExecutiveSummary
              studentName={data.studentName}
              submittedAt={data.submittedAt}
              totalTimeSeconds={data.totalTimeSeconds}
              sections={data.sections}
              sectionBenchmarks={data.benchmarks.sections}
            />
            <div className="mt-5">
              <GenericInsightBlock
                headline="Analyst's Take"
                body={insights.executiveSummary}
                icon="✦"
                tutor={editedKeys.has('executiveSummary')}
              />
            </div>

            {/* Domain Breakdown — tier 2 within Section 01 */}
            <div className="mt-8 space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#6085FF' }}>
                Domain Breakdown
              </p>
              <ReportRadarChart
                sections={data.sections}
                domainBenchmarks={data.benchmarks.domains}
              />
              {insights.topWeakDomains.length > 0 && (
                <div className="mt-5">
                  <GenericInsightBlock
                    headline="Highest-Leverage Domains"
                    body={insights.topWeakDomains
                      .map((d) => `${d.domain}: ${d.note}`)
                      .join('  ·  ')}
                    icon="◎"
                  />
                </div>
              )}
            </div>
          </section>

          <Divider />

          {/* ── SECTION 02: 상위 10%와의 차이 ── */}
          <section id="section-02" style={{ scrollMarginTop: 96 }}>
            <SectionHeader
              number="02"
              title="상위 10%와의 차이"
              titleEn="vs. Top 10%"
              subtitle="우리 아이는 상위권과 얼마나 다른가요?"
            />
            <ReportBenchmarkChart
              sections={data.sections}
              sectionBenchmarks={data.benchmarks.sections}
            />
            <div className="mt-5 space-y-3">
              {data.sections.map((section: { name: string; accuracy: number; correctCount: number; totalQuestions: number; domainBreakdown: { domain: string; accuracy: number; total: number }[] }) => {
                const insight = insights.sections[section.name];
                if (!insight) return null;
                return <InsightBlock key={section.name} insight={insight} />;
              })}
            </div>
          </section>

          <Divider />

          {/* ── SECTION 03: 문제 풀이 패턴 ── */}
          <section id="section-03" style={{ scrollMarginTop: 96 }}>
            <SectionHeader
              number="03"
              title="문제 풀이 패턴"
              titleEn="Test-Taking Patterns"
              subtitle="시간 배분과 자신감은 어떤 모습인가요?"
            />
            <ReportBehavioralMatrix questionDetails={data.questionDetails} />
            {insights.behavioral && (
              <div className="mt-5">
                <GenericInsightBlock
                  headline="Pacing & Confidence Pattern"
                  body={insights.behavioral}
                  icon="⟳"
                  tutor={editedKeys.has('behavioral')}
                />
              </div>
            )}
          </section>

          <Divider />

          {/* ── SECTION 04: 모르는 단어 ── */}
          <section id="section-04" style={{ scrollMarginTop: 96 }}>
            <SectionHeader
              number="04"
              title="모르는 단어"
              titleEn="Vocabulary Gap"
              subtitle="단어 때문에 틀린 문제가 있었나요?"
            />
            <ReportVocabularyGap savedWords={data.savedWords} />
            {insights.vocabulary && (
              <div className="mt-5">
                <GenericInsightBlock
                  headline="Vocabulary Strategy"
                  body={insights.vocabulary}
                  icon="≋"
                  tutor={editedKeys.has('vocabulary')}
                />
              </div>
            )}
          </section>

          {/* Key Recommendations */}
          {insights.keyRecommendations.length > 0 && (
            <>
              <Divider />
              <section>
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'white', border: '1px solid #E8E9F0' }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-4"
                    style={{ color: '#09090b' }}
                  >
                    Key Recommendations
                  </p>
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

          {/* About This Report */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'white', border: '1px solid #E8E9F0' }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: '#64748B' }}
            >
              About This Report
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Insights are generated algorithmically based on performance benchmarks from SuperfastSAT diagnostic data.
              Top-10% thresholds are estimated from the current student cohort and will be refined as more students complete the assessment.
            </p>
          </div>

          {/* Footer */}
          <footer className="text-center pt-4 pb-10 print:pb-4">
            <p className="text-xs text-slate-400">
              Generated by SuperfastSAT · Report ID: {resultId}
            </p>
          </footer>

        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-200 print:border-slate-300" />;
}
