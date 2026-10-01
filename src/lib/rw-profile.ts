export type RWQuestionType = 'sniper' | 'doubt' | 'hasty' | 'avoider';

export type RWProfileType = 'master' | 'doubt' | 'hasty' | 'avoider' | 'chaotic';

export interface RWStudentProfile {
  profileType: RWProfileType;
  headline: string;
  evidence: string;
}

interface ClassifyQuestionInput {
  isCorrect: boolean;
  confidence: number;
  chosenOptionIdx: number;
  correctOptionIdx: number;
}

export function classifyRWQuestion(input: ClassifyQuestionInput): RWQuestionType {
  const { isCorrect, confidence, chosenOptionIdx, correctOptionIdx } = input;

  if (isCorrect) {
    return confidence >= 75 ? 'sniper' : 'doubt';
  }

  if (chosenOptionIdx === -1 || correctOptionIdx === -1) return 'avoider';
  return chosenOptionIdx < correctOptionIdx ? 'hasty' : 'avoider';
}

export function classifyRWStudent(questionTypes: RWQuestionType[]): RWStudentProfile {
  const total = questionTypes.length;
  if (total === 0) {
    return {
      profileType: 'master',
      headline: '분석할 데이터가 없습니다',
      evidence: '',
    };
  }

  const counts = {
    sniper: questionTypes.filter(t => t === 'sniper').length,
    doubt: questionTypes.filter(t => t === 'doubt').length,
    hasty: questionTypes.filter(t => t === 'hasty').length,
    avoider: questionTypes.filter(t => t === 'avoider').length,
  };

  const r = {
    sniper: counts.sniper / total,
    doubt: counts.doubt / total,
    hasty: counts.hasty / total,
    avoider: counts.avoider / total,
  };

  const parts: string[] = [];
  if (counts.sniper > 0) parts.push(`확신 정답 ${counts.sniper}문제`);
  if (counts.doubt > 0) parts.push(`불확실 정답 ${counts.doubt}문제`);
  if (counts.hasty > 0) parts.push(`성급한 선택 ${counts.hasty}문제`);
  if (counts.avoider > 0) parts.push(`논리 부재 ${counts.avoider}문제`);
  const evidence = `전체 ${total}문제 중 ${parts.join(', ')}`;

  if (r.hasty >= 0.25 && r.avoider >= 0.25) {
    return {
      profileType: 'chaotic',
      headline: '성급한 선택과 논리 부재가 동시에 나타나고 있습니다.',
      evidence,
    };
  }

  if (r.avoider >= 0.3) {
    return {
      profileType: 'avoider',
      headline: '정답의 이유를 끝까지 파악하지 못하고 있습니다.',
      evidence,
    };
  }

  if (r.hasty >= 0.3) {
    return {
      profileType: 'hasty',
      headline: '성급하게 결론을 내리는 습관이 있습니다.',
      evidence,
    };
  }

  if (r.doubt >= 0.3) {
    return {
      profileType: 'doubt',
      headline: '정답을 고르면서도 확신이 서지 않습니다.',
      evidence,
    };
  }

  if (r.sniper + r.doubt >= 0.7) {
    return {
      profileType: 'master',
      headline: '이 영역은 준비된 상태입니다.',
      evidence,
    };
  }

  // Fallback: dominant type wins
  const dominant = (Object.entries(counts) as [RWQuestionType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const fallbacks: Record<RWQuestionType, RWStudentProfile> = {
    sniper: {
      profileType: 'master',
      headline: '이 영역은 준비된 상태입니다.',
      evidence,
    },
    doubt: {
      profileType: 'doubt',
      headline: '답은 맞히는데 확신이 부족합니다.',
      evidence,
    },
    hasty: {
      profileType: 'hasty',
      headline: '정답을 보기도 전에 결론을 냈습니다.',
      evidence,
    },
    avoider: {
      profileType: 'avoider',
      headline: '정답을 보고도 지나쳤습니다.',
      evidence,
    },
  };

  return fallbacks[dominant] ?? fallbacks.avoider;
}
