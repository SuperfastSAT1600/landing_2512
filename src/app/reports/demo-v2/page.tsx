import { ReportCover } from '../[resultId]/components/ReportCover';
import { ReportExecutiveSummary } from '../[resultId]/components/ReportExecutiveSummary';
import { ReportBenchmarkChart } from '../[resultId]/components/ReportBenchmarkChart';
import { ReportRadarChart } from '../[resultId]/components/ReportRadarChart';
import { ReportBehavioralMatrix } from '../[resultId]/components/ReportBehavioralMatrix';
import { ReportVocabularyGap } from '../[resultId]/components/ReportVocabularyGap';
import { ReportVocabDiagnosis } from '../[resultId]/components/ReportVocabDiagnosis';
import { ReportRWCognition } from '../[resultId]/components/ReportRWCognition';
import { SectionHeader } from '../[resultId]/components/SectionHeader';
import { ChapterNav } from '../[resultId]/components/ChapterNav';
import { InsightBlock, GenericInsightBlock } from '../[resultId]/components/InsightBlock';
import { generateAllInsights } from '@/lib/report-insights';
import { MOCK_REPORT_DATA } from './mock-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '김민준 — SAT Diagnostic Report (Demo v2)',
  robots: 'noindex',
};

export default function DemoV2ReportPage() {
  const data = MOCK_REPORT_DATA;

  let insights;
  try {
    insights = generateAllInsights(
      data.sections,
      data.questionDetails,
      data.savedWords,
      data.timeLimitMinutes,
    );
  } catch {
    insights = {
      executiveSummary: '',
      sections: {},
      topWeakDomains: [],
      behavioral: '',
      vocabulary: null,
      keyRecommendations: [],
    };
  }

  return (
    <div className="pb-16 sm:pb-0" style={{ background: '#F4F5F9', fontFamily: 'var(--font-sans)' }}>

      {/* Demo banner */}
      <div
        className="text-center py-2 text-xs font-semibold text-white print:hidden"
        style={{ background: '#6085FF' }}
      >
        DEMO — 가상 데이터로 생성된 v2 리포트 미리보기
      </div>

      {/* Cover */}
      <ReportCover
        studentName={data.studentName}
        submittedAt={data.submittedAt}
        totalTimeSeconds={data.totalTimeSeconds}
        sections={data.sections}
        previousScoreStatus={data.previousScoreStatus}
      />

      <ChapterNav isV2 />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:pt-14 print:py-6">
        <div className="space-y-10 sm:space-y-14 print:space-y-8">

          {/* ── SECTION 01 ── */}
          <section id="section-01" className="report-section">
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
                <GenericInsightBlock headline="Analyst's Take" body={insights.executiveSummary} icon="✦" />
              </div>
            )}
            <div className="mt-8 space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#6085FF' }}>
                Domain Breakdown
              </p>
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

          {/* ── SECTION 02 ── */}
          <section id="section-02" className="report-section">
            <SectionHeader number="02" title="비교 성적" titleEn="vs. Top 10%" subtitle="상위 10%와의 비교 성적" />
            <ReportBenchmarkChart sections={data.sections} sectionBenchmarks={data.benchmarks.sections} />
            <div className="mt-5 space-y-3">
              {data.sections.map((section) => {
                const insight = insights.sections[section.name];
                if (!insight) return null;
                return <InsightBlock key={section.name} insight={insight} />;
              })}
            </div>
          </section>

          <Divider />

          {/* ── SECTION 03 ── */}
          <section id="section-03" className="report-section">
            <SectionHeader number="03" title="문제 풀이 패턴" titleEn="Test-Taking Patterns" subtitle="시간 배분과 자신감은 어떤 모습인가요?" />
            <ReportBehavioralMatrix questionDetails={data.questionDetails} />
            {insights.behavioral && (
              <div className="mt-5">
                <GenericInsightBlock headline="Pacing & Confidence Pattern" body={insights.behavioral} icon="⟳" />
              </div>
            )}
          </section>

          <Divider />

          {/* ── SECTION 04 ── */}
          <section id="section-04" className="report-section">
            <SectionHeader number="04" title="모르는 단어" titleEn="Vocabulary Gap" subtitle="단어 때문에 틀린 문제가 있었나요?" />
            <ReportVocabularyGap savedWords={data.savedWords} />
            {insights.vocabulary && (
              <div className="mt-5">
                <GenericInsightBlock headline="Vocabulary Strategy" body={insights.vocabulary} icon="≋" />
              </div>
            )}
          </section>

          <Divider />

          {/* ── SECTION 05: 단어 진단 ── */}
          <section id="section-05" className="report-section">
            <SectionHeader number="05" title="단어 진단" titleEn="Vocabulary Check" subtitle="20개 단어를 얼마나 알고 있었나요?" />
            <ReportVocabDiagnosis vocabResults={data.vocabResults!} />
          </section>

          <Divider />

          {/* ── SECTION 06: RW 이해도 ── */}
          <section id="section-06" className="report-section">
            <SectionHeader number="06" title="RW 이해도 분석" titleEn="Reading Comprehension Depth" subtitle="정확히 알고 풀었나요, 아니면 소거법으로 맞췄나요?" />
            <ReportRWCognition rwCognitionData={data.rwCognitionData!} rwStudentProfile={data.rwStudentProfile} />
          </section>

          {/* Key Recommendations */}
          {insights.keyRecommendations.length > 0 && (
            <>
              <Divider />
              <section>
                <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #E8E9F0' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#09090b' }}>
                    Key Recommendations
                  </p>
                  <ol className="space-y-4">
                    {insights.keyRecommendations.map((rec, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white mt-0.5" style={{ background: '#071be9' }}>
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

          {/* About */}
          <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #E8E9F0' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>About This Report</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              이 리포트는 데모 목적으로 생성된 가상 데이터입니다. 실제 학생 데이터와 무관합니다.
            </p>
          </div>

          <footer className="text-center pt-4 pb-10 print:pb-4">
            <p className="text-xs text-slate-400">Generated by SuperfastSAT · Demo v2 Report</p>
          </footer>

        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-200 print:border-slate-300" />;
}
