import { notFound } from 'next/navigation';
import { ReportCover } from './components/ReportCover';
import { ReportExecutiveSummary } from './components/ReportExecutiveSummary';
import { ReportBenchmarkChart } from './components/ReportBenchmarkChart';
import { ReportRadarChart } from './components/ReportRadarChart';
import { ReportBehavioralMatrix } from './components/ReportBehavioralMatrix';
import { ReportVocabularyGap } from './components/ReportVocabularyGap';
import { SectionHeader } from './components/SectionHeader';
import { ChapterNav } from './components/ChapterNav';
import { InsightBlock, GenericInsightBlock } from './components/InsightBlock';
import { CouponCountdown } from './components/CouponCountdown';
import { generateAllInsights, type ReportInsights } from '@/lib/report-insights';
import { mergeInsights, getEditedFieldKeys } from '@/lib/merge-insights';
// REQ-001: Call DB logic directly — no HTTP self-fetch (was crashing on tutoring.superfastsat.com)
import { fetchReportData } from '@/lib/report-data';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ resultId: string }>;
}

const EMPTY_INSIGHTS: ReportInsights = {
  executiveSummary: '',
  sections: {},
  topWeakDomains: [],
  behavioral: '',
  vocabulary: null,
  keyRecommendations: [],
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { resultId } = await params;
  const data = await fetchReportData(resultId);
  if (!data) return { title: 'Report Not Found' };
  return {
    title: `${data.studentName} — SAT Diagnostic Report`,
    description: 'Detailed performance analysis from the SuperfastSAT diagnostic test.',
    openGraph: {
      title: `${data.studentName} — SAT Diagnostic Report`,
      description: 'SuperfastSAT 진단 결과를 확인하세요.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.studentName} — SAT Diagnostic Report`,
      description: 'SuperfastSAT 진단 결과를 확인하세요.',
    },
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { resultId } = await params;
  const data = await fetchReportData(resultId);

  if (!data) notFound();

  // REQ-004: generateAllInsights is guarded — malformed data won't crash the page
  let aiInsights: ReportInsights;
  try {
    aiInsights = generateAllInsights(
      data.sections,
      data.questionDetails,
      data.savedWords ?? [],
      data.timeLimitMinutes,
    );
  } catch (err) {
    console.error('[ReportPage] generateAllInsights failed:', err);
    aiInsights = EMPTY_INSIGHTS;
  }
  const insights = mergeInsights(aiInsights, data.editedInsights);
  const editedKeys = getEditedFieldKeys(data.editedInsights);

  return (
    <div className="pb-16 sm:pb-0" style={{ background: '#F4F5F9', fontFamily: 'var(--font-sans)' }}>

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
        previousScoreStatus={data.previousScoreStatus}
        previousTestDate={data.previousTestDate}
        previousRwScore={data.previousRwScore}
        previousMathScore={data.previousMathScore}
      />

      {/* Chapter navigation — sticky at the very top */}
      <ChapterNav />

      {/* Single-column main content — sm:pt-14 offsets the fixed top nav */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:pt-14 print:py-6">
        <div className="space-y-10 sm:space-y-14 print:space-y-8">

          {/* ── SECTION 01: 전체 성적 ── */}
          <section id="section-01" className="report-section">
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
          <section id="section-02" className="report-section">
            <SectionHeader
              number="02"
              title="비교 성적"
              titleEn="vs. Top 10%"
              subtitle="상위 10%와의 비교 성적"
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
          <section id="section-03" className="report-section">
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
          <section id="section-04" className="report-section">
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

          {/* Coupon Countdown */}
          {data.coupon && (
            <CouponCountdown
              discountPercent={data.coupon.discountPercent}
              expiresAt={data.coupon.expiresAt}
            />
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
