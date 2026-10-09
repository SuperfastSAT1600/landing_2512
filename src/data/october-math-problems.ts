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
  {
    id: 'new-trig-inequality',
    skill: 'Right triangles and trigonometry',
    type: 'new',
    title: 'Trig ratio comparison with inequality condition',
    description:
      'In a right triangle, the two acute angles measure r° and s°, where r + s = 90. An inequality condition is given (such as 3r > 11s). Which of the following must be the greatest: sin r°, cos r°, sin r° / sin s°, or sin r° / cos s°?',
    what_changed:
      '기존 문항은 여각 관계(cos L = sin K 등)를 판정하는 수준이었습니다. 이번엔 부등식으로 r의 범위를 먼저 추론한 뒤 네 식의 크기를 비교하는 2단계가 필요합니다. "must be the greatest" 발문은 기존 기출에서 0건이었습니다.',
  },
  {
    id: 'new-cubic-no-info',
    skill: 'Nonlinear functions',
    type: 'new',
    title: 'Sign of h(0) — not enough information',
    description:
      'The function h is defined by h(x) = a(x + n)(x + r)(x + s). Is h(0) positive, negative, or is there not enough information to determine?',
    what_changed:
      '"Not enough information" 선택지가 통계 문제(평균·중앙값 비교)에만 쓰이던 것에서 함숫값 기호 비교 문제로 처음 확장되었습니다. a의 부호를 모르면 경우 나눔이 필요합니다.',
  },
  {
    id: 'new-abs-difference',
    skill: 'Nonlinear functions',
    type: 'new',
    title: 'Function with two absolute value terms',
    description:
      'The function f is defined by f(x) = |x + a| − |x + b| + c. What is the value of f at a given x?',
    what_changed:
      '기존 절댓값 함수 문항은 절댓값 하나를 처리하는 수준이었습니다. 절댓값 두 개를 동시에 빼는 형태는 기출에서 발견되지 않았습니다.',
  },
  {
    id: 'harder-similar-triangles',
    skill: 'Right triangles and trigonometry',
    type: 'harder',
    title: 'Similar triangles — no direct angle correspondence given',
    description:
      'Two similar triangles are given. A relationship such as AE = 26(BD) is provided, but angle correspondence is not stated directly. Find the measure of a specific angle.',
    what_changed:
      '기존 문항(RTT40-1)은 같은 닮음 삼각형 그림에서 같은 질문을 했지만 대응각을 바로 읽을 수 있었습니다. 이번엔 k·BD 함정을 파악해야 하는 추론 단계가 추가되었습니다.',
  },
  {
    id: 'harder-cubic-shift',
    skill: 'Nonlinear functions',
    type: 'harder',
    title: 'Cubic function — horizontal and vertical translation combined',
    description:
      'A cubic function is translated both horizontally and vertically. Does the resulting function pass through a given point?',
    what_changed:
      '기존 문항은 수직 이동 하나였습니다. 수평 이동과 수직 이동을 동시에 적용하는 것이 이번에 더해졌습니다.',
  },
  {
    id: 'harder-linear-half-input',
    skill: 'Linear functions',
    type: 'harder',
    title: 'Linear function — input is half the height',
    description:
      'A relationship between height h and variable x is given (e.g., h = 2x). When x increases by 20, by how much does d increase?',
    what_changed:
      '기존 문항(LFN136-1)은 기울기 × 변화량을 바로 계산했습니다. 이번엔 "높이 = 2x" 관계를 중간에 끌어내는 변수 치환 단계가 추가되었습니다.',
  },
  {
    id: 'harder-exponential-symbol',
    skill: 'Nonlinear functions',
    type: 'harder',
    title: 'Exponential function — base is a variable, exponent is t/10',
    description:
      'The function f is defined by f(t) = A · R^(t/10), where R is a variable (not a specific number). Which expression represents the percent decrease over 4 months?',
    what_changed:
      '기존 문항(NLF565-1)은 밑이 0.829 같은 구체적 숫자였습니다. 밑을 문자 R로 기호화하고 지수가 t/10이 되면서 "감소율 = 1 - R^(2/5)" 식을 스스로 구성해야 하는 추상화 단계가 추가되었습니다.',
  },
];
