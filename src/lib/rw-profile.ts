export type RWQuestionType = 'sniper' | 'doubt' | 'hasty' | 'avoider';

export type RWProfileType = 'master' | 'doubt' | 'hasty' | 'avoider' | 'chaotic';

export interface RWStudentProfile {
  profileType: RWProfileType;
  headline: string;
  evidence: string;
  prescription: string;
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
      prescription: '',
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
  if (counts.sniper > 0) parts.push(`직격수 ${counts.sniper}문제`);
  if (counts.doubt > 0) parts.push(`흔들리는 정답 ${counts.doubt}문제`);
  if (counts.hasty > 0) parts.push(`성급한 선점 ${counts.hasty}문제`);
  if (counts.avoider > 0) parts.push(`정답 회피 ${counts.avoider}문제`);
  const evidence = `전체 ${total}문제 중 ${parts.join(', ')}`;

  if (r.hasty >= 0.25 && r.avoider >= 0.25) {
    return {
      profileType: 'chaotic',
      headline: '성급함과 논리 부재가 동시에 나타나고 있다',
      evidence,
      prescription: '정답 전에 선택을 확정하는 성급함, 정답을 보고도 넘어가는 논리 부재가 함께 있다. 각 보기를 끝까지 읽고 이유를 확인하는 기본 습관부터 재설계해야 한다.',
    };
  }

  if (r.avoider >= 0.3) {
    return {
      profileType: 'avoider',
      headline: '정답의 이유를 끝까지 파악하지 못하고 있다',
      evidence,
      prescription: '정답을 보고도 넘어가는 패턴은 논리적 디테일이 부족하기 때문이다. 각 선택지가 왜 정답이고 왜 오답인지를 근거와 함께 설명하는 훈련이 필요하다.',
    };
  }

  if (r.hasty >= 0.3) {
    return {
      profileType: 'hasty',
      headline: '성급하게 결론을 내리는 습관이 있다',
      evidence,
      prescription: '정답을 보기 전에 선택을 확정하는 성급한 패턴이다. 반드시 4개 보기를 모두 확인한 뒤 고르는 습관을 강제해야 한다.',
    };
  }

  if (r.doubt >= 0.3) {
    return {
      profileType: 'doubt',
      headline: '정답을 고르면서도 확신이 서지 않는다',
      evidence,
      prescription: '정답은 맞히고 있지만 이유를 명확히 설명하지 못하는 상태다. 단순히 답만 맞추는 것에서 벗어나, 왜 그 선택지가 정답인지 근거를 언어로 설명하는 훈련이 필요하다.',
    };
  }

  if (r.sniper + r.doubt >= 0.7) {
    return {
      profileType: 'master',
      headline: '이 영역은 준비된 상태다',
      evidence,
      prescription: '난이도를 올려서 테스트할 것. 지금 이 유형에 시간을 쓰는 것은 낭비다.',
    };
  }

  // Fallback: dominant type wins
  const dominant = (Object.entries(counts) as [RWProfileType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const fallbacks: Record<RWProfileType, RWStudentProfile> = {
    sniper: {
      profileType: 'master',
      headline: '이 영역은 준비된 상태다',
      evidence,
      prescription: '난이도를 올려서 테스트할 것.',
    },
    doubt: {
      profileType: 'doubt',
      headline: '답은 맞히는데 자신을 못 믿는다',
      evidence,
      prescription: '"내 첫 선택이 몇 %나 맞았나" 기록 훈련.',
    },
    hasty: {
      profileType: 'hasty',
      headline: '정답을 보기도 전에 결론을 냈다',
      evidence,
      prescription: '"4개 다 보고 고른다" 규칙을 강제할 것.',
    },
    avoider: {
      profileType: 'avoider',
      headline: '정답을 보고도 지나쳤다',
      evidence,
      prescription: 'College Board 후반 선택지 함정 패턴 학습.',
    },
    chaotic: {
      profileType: 'chaotic',
      headline: '전략 없이 풀고 있다',
      evidence,
      prescription: '선택지를 보기 전에 "내 답은 뭐다"를 먼저 말하는 습관부터.',
    },
  };

  return fallbacks[dominant] ?? fallbacks.avoider;
}
