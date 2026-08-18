/**
 * Real benchmark data exported from SMS Diagnostic Test #1.
 * Generated: 2026-03-08T11:02:56.059Z
 * Sample size: 76 students
 *
 * Re-generate: node scripts/export-question-benchmarks.mjs
 *
 * NOTE: Top-10% thresholds are estimated from the 76-student cohort.
 * Global Average has been removed — only Top 10% is shown as aspirational benchmark.
 */

export interface BenchmarkTier {
  accuracy: number;         // 0–1
  avgTimeSeconds: number | null;
  avgConfidence: number | null;
}

export interface SectionBenchmarks {
  top10: BenchmarkTier;
}

export interface DomainBenchmark {
  top10: number;  // accuracy 0–1
}

export interface QuestionBenchmark {
  accuracy: number;        // 0–1  correct / total
  avgTimeSeconds: number | null;
  avgConfidence: number | null;  // 0–100 percentage scale
  sampleSize: number;
}

/** Per-section aggregate accuracy — Top 10% threshold across 76 students */
export const SECTION_BENCHMARKS: Record<string, SectionBenchmarks> = {
  "Diagnostic": {
    "top10": {
      "accuracy": 0.80,
      "avgTimeSeconds": 175,
      "avgConfidence": 73.0
    }
  },
  "Reading and Writing": {
    "top10": {
      "accuracy": 0.82,
      "avgTimeSeconds": 168,
      "avgConfidence": 74.0
    }
  },
  "Math": {
    "top10": {
      "accuracy": 0.78,
      "avgTimeSeconds": 182,
      "avgConfidence": 72.0
    }
  }
};

/** Per-domain accuracy — Top 10% threshold across 76 students */
export const DOMAIN_BENCHMARKS: Record<string, DomainBenchmark> = {
  "Craft and Structure": { "top10": 0.82 },
  "Information and Ideas": { "top10": 0.80 },
  "Standard English Conventions": { "top10": 0.79 },
  "Expression of Ideas": { "top10": 0.81 },
  "Advanced Math": { "top10": 0.77 },
  "Geometry and Trigonometry": { "top10": 0.78 },
  "Problem-Solving and Data Analysis": { "top10": 0.76 },
  "Algebra": { "top10": 0.75 }
};

/** Per-question accuracy (by question UUID) across 76 students */
export const QUESTION_BENCHMARKS: Record<string, QuestionBenchmark> = {
  "mgvrzka1gnn2i3zcwyw": {
    "accuracy": 0.5,
    "avgTimeSeconds": 103,
    "avgConfidence": 61.8,
    "sampleSize": 72
  },
  "mgvrmdcw615lsklbnhb": {
    "accuracy": 0.575,
    "avgTimeSeconds": 323,
    "avgConfidence": 53.4,
    "sampleSize": 73
  },
  "mgvut0aebsi92wnjcns": {
    "accuracy": 0.462,
    "avgTimeSeconds": 110,
    "avgConfidence": 53.2,
    "sampleSize": 39
  },
  "mgvrq6kazbko6a2y29": {
    "accuracy": 0.548,
    "avgTimeSeconds": 296,
    "avgConfidence": 56.2,
    "sampleSize": 73
  },
  "mgvrvjwgbf2vll4mvjc": {
    "accuracy": 0.535,
    "avgTimeSeconds": 256,
    "avgConfidence": 59.2,
    "sampleSize": 71
  },
  "mgvu93jxz30mcefakqj": {
    "accuracy": 0.393,
    "avgTimeSeconds": 149,
    "avgConfidence": 66.4,
    "sampleSize": 61
  },
  "mgvrod9kcv4rcrilfx8": {
    "accuracy": 0.644,
    "avgTimeSeconds": 232,
    "avgConfidence": 62.7,
    "sampleSize": 73
  },
  "mgvtkvmel1vgbdbhc6c": {
    "accuracy": 0.437,
    "avgTimeSeconds": 373,
    "avgConfidence": 51.4,
    "sampleSize": 71
  },
  "mgvshq35rslfsngk3ad": {
    "accuracy": 0.351,
    "avgTimeSeconds": 580,
    "avgConfidence": 58.3,
    "sampleSize": 57
  },
  "mgvsdwuje94vms43wso": {
    "accuracy": 0.493,
    "avgTimeSeconds": 589,
    "avgConfidence": 59.7,
    "sampleSize": 67
  },
  "mgvrtdqe2z4y82vbetm": {
    "accuracy": 0.534,
    "avgTimeSeconds": 316,
    "avgConfidence": 47.6,
    "sampleSize": 73
  },
  "mgvtuzddb69wmkk9o58": {
    "accuracy": 0.525,
    "avgTimeSeconds": 159,
    "avgConfidence": 42.4,
    "sampleSize": 59
  },
  "mgvuno3ir3exg3j16t": {
    "accuracy": 0.306,
    "avgTimeSeconds": 415,
    "avgConfidence": 52.1,
    "sampleSize": 36
  },
  "mgvrwzoidwjhbp8eprm": {
    "accuracy": 0.375,
    "avgTimeSeconds": 163,
    "avgConfidence": 55.2,
    "sampleSize": 72
  },
  "mgvuete6a10cflpocdf": {
    "accuracy": 0.255,
    "avgTimeSeconds": 413,
    "avgConfidence": 56.8,
    "sampleSize": 55
  },
  "mguifs77fsxs1dzgjvf": {
    "accuracy": 0.446,
    "avgTimeSeconds": 174,
    "avgConfidence": 43.9,
    "sampleSize": 74
  },
  "mgvs4y1kfho57apayv": {
    "accuracy": 0.529,
    "avgTimeSeconds": 190,
    "avgConfidence": 59.9,
    "sampleSize": 68
  },
  "mgvuma48nd6nf62wqw8": {
    "accuracy": 0.574,
    "avgTimeSeconds": 121,
    "avgConfidence": 58.8,
    "sampleSize": 54
  },
  "mgvujbepw4d1kpvg6lg": {
    "accuracy": 0.582,
    "avgTimeSeconds": 137,
    "avgConfidence": 52.7,
    "sampleSize": 55
  },
  "mgvu1c6c60m68keyaod": {
    "accuracy": 0.71,
    "avgTimeSeconds": 175,
    "avgConfidence": 57.7,
    "sampleSize": 62
  },
  "mgvs12eys3kj1h60d8": {
    "accuracy": 0.443,
    "avgTimeSeconds": 93,
    "avgConfidence": 59.3,
    "sampleSize": 70
  },
  "mgvryao7x5d959u3gqj": {
    "accuracy": 0.606,
    "avgTimeSeconds": 114,
    "avgConfidence": 66.2,
    "sampleSize": 71
  },
  "mgvupt4xjmeq2ir78o": {
    "accuracy": 0.386,
    "avgTimeSeconds": 123,
    "avgConfidence": 51.7,
    "sampleSize": 44
  },
  "mgvs2gpajh477vl0e4": {
    "accuracy": 0.569,
    "avgTimeSeconds": 125,
    "avgConfidence": 64.9,
    "sampleSize": 72
  },
  "mgvu4n0mulokgl9flds": {
    "accuracy": 0.559,
    "avgTimeSeconds": 158,
    "avgConfidence": 61,
    "sampleSize": 68
  }
};

/** Metadata */
export const BENCHMARK_META = {
  sampleSize: 76,
  exportedAt: '2026-03-08T11:02:56.059Z',
  testTitle: 'Diagnostic Test #1',
};
