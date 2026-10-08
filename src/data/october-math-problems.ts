export type VoteType = 'yes' | 'similar' | 'no';

export interface MathProblem {
  id: string;
  skill: string;
  type: 'new' | 'harder';
  title: string;
  description: string;
  what_changed: string;
}

export const OCTOBER_MATH_PROBLEMS: MathProblem[] = [
  // ── 신유형 3갈래 ──────────────────────────────────────────────
  {
    id: 'new-trig-inequality',
    skill: 'Right triangles and trigonometry',
    type: 'new',
    title: '여각 삼각비 크기 비교 (부등식 조건)',
    description:
      '직각삼각형의 두 예각 r°, s°(r + s = 90)에 부등식 조건(예: 3r > 11s)이 주어지고, sin r°, cos r°, sin r°/sin s°, sin r°/cos s° 중 반드시 가장 큰 것을 고르는 문제.',
    what_changed:
      '기존 문항은 여각 관계(cos L = sin K 등)를 판정하는 수준이었습니다. 이번엔 부등식으로 r의 범위를 먼저 추론한 뒤 네 식의 크기를 비교하는 2단계가 필요합니다. "must be the greatest" 발문은 기존 기출에서 0건이었습니다.',
  },
  {
    id: 'new-cubic-no-info',
    skill: 'Nonlinear functions',
    type: 'new',
    title: '3차함수 h(0) 기호 비교 (정보 부족 판정)',
    description:
      'h(x) = a(x + n)(x + r)(x + s) 형태의 함수에서 h(0) = a·n·r·s의 부호와 n·r·s의 부호를 비교할 때, a의 구체적 값이 없어 "There is not enough information to determine"이 정답인 문제.',
    what_changed:
      '"Not enough information" 선택지가 통계 문제(평균·중앙값 비교)에만 쓰이던 것에서 함숫값 기호 비교 문제로 처음 확장되었습니다. a의 부호를 모르면 경우 나눔이 필요합니다.',
  },
  {
    id: 'new-abs-difference',
    skill: 'Nonlinear functions',
    type: 'new',
    title: '절댓값 두 개의 차 + 상수 함수',
    description:
      'f(x) = |x + a| - |x + b| + c 형태의 함수에서 특정 x 값에서의 함숫값을 구하는 문제.',
    what_changed:
      '기존 절댓값 함수 문항은 절댓값 하나를 처리하는 수준이었습니다. 절댓값 두 개를 동시에 빼는 형태는 기출에서 발견되지 않았습니다.',
  },

  // ── 어려워진 변형 ─────────────────────────────────────────────
  {
    id: 'harder-similar-triangles',
    skill: 'Right triangles and trigonometry',
    type: 'harder',
    title: '닮음 삼각형 — 대응각을 직접 주지 않음',
    description:
      '두 닮음 삼각형에서 AE = 26(BD) 같은 관계만 주어지고, 직접적인 각도 대응 없이 변의 비율로 각도를 구해야 하는 문제.',
    what_changed:
      '기존 문항(RTT40-1)은 같은 닮음 삼각형 그림에서 같은 질문을 했지만 대응각을 바로 읽을 수 있었습니다. 이번엔 k·BD 함정을 파악해야 하는 추론 단계가 추가되었습니다.',
  },
  {
    id: 'harder-cubic-shift',
    skill: 'Nonlinear functions',
    type: 'harder',
    title: '3차함수 — 수평 + 수직 이동 동시 적용',
    description:
      '3차함수를 수평 방향과 수직 방향으로 동시에 평행이동했을 때 특정 점을 지나는지 구하는 문제.',
    what_changed:
      '기존 문항은 수직 이동 하나였습니다. 수평 이동과 수직 이동을 동시에 적용하는 것이 이번에 더해졌습니다.',
  },
  {
    id: 'harder-linear-half-input',
    skill: 'Linear functions',
    type: 'harder',
    title: '일차함수 증가량 — 입력이 높이의 절반',
    description:
      '높이 h와 변수 x 사이의 관계(예: h = 2x)를 먼저 도출한 뒤, x가 20 증가할 때 d의 증가량을 구하는 문제.',
    what_changed:
      '기존 문항(LFN136-1)은 기울기 × 변화량을 바로 계산했습니다. 이번엔 "높이 = 2x" 관계를 중간에 끌어내는 변수 치환 단계가 추가되었습니다.',
  },
  {
    id: 'harder-exponential-symbol',
    skill: 'Nonlinear functions',
    type: 'harder',
    title: '지수함수 — 밑이 수에서 문자로, t/10 지수',
    description:
      'f(t) = A · R^(t/10) 형태에서 4개월 후의 감소율을 나타내는 식을 고르는 문제. R은 구체적 수가 아닌 문자.',
    what_changed:
      '기존 문항(NLF565-1)은 밑이 0.829 같은 구체적 숫자였습니다. 밑을 문자 R로 기호화하고 지수가 t/10이 되면서 "감소율 = 1 - R^(2/5)" 식을 스스로 구성해야 하는 추상화 단계가 추가되었습니다.',
  },
];
