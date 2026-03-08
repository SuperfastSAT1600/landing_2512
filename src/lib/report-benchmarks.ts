/**
 * Mock benchmark data for diagnostic report comparisons.
 * Replace with real aggregate data once sufficient results exist.
 */

export interface BenchmarkTier {
  accuracy: number; // 0–1
  avgTimeSeconds: number;
  avgConfidence: number; // 1–5
}

export interface SectionBenchmarks {
  globalAverage: BenchmarkTier;
  top10: BenchmarkTier;
}

export interface DomainBenchmark {
  globalAverage: number; // accuracy 0–1
  top10: number;
}

export const SECTION_BENCHMARKS: Record<string, SectionBenchmarks> = {
  'Reading and Writing': {
    globalAverage: { accuracy: 0.58, avgTimeSeconds: 72, avgConfidence: 2.8 },
    top10: { accuracy: 0.89, avgTimeSeconds: 44, avgConfidence: 4.2 },
  },
  Math: {
    globalAverage: { accuracy: 0.52, avgTimeSeconds: 88, avgConfidence: 2.5 },
    top10: { accuracy: 0.91, avgTimeSeconds: 54, avgConfidence: 4.3 },
  },
};

export const DOMAIN_BENCHMARKS: Record<string, DomainBenchmark> = {
  'Craft and Structure':              { globalAverage: 0.55, top10: 0.88 },
  'Information and Ideas':            { globalAverage: 0.60, top10: 0.90 },
  'Standard English Conventions':     { globalAverage: 0.62, top10: 0.91 },
  'Expression of Ideas':              { globalAverage: 0.57, top10: 0.87 },
  'Algebra':                          { globalAverage: 0.54, top10: 0.92 },
  'Advanced Math':                    { globalAverage: 0.48, top10: 0.88 },
  'Problem-Solving and Data Analysis':{ globalAverage: 0.53, top10: 0.89 },
  'Geometry and Trigonometry':        { globalAverage: 0.50, top10: 0.86 },
};
