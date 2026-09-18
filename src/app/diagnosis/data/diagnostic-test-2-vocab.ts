export interface VocabOption {
  id: string;
  text: string;
  type: 'correct' | 'distractor';
}

export interface VocabQuestion {
  id: string;
  word: string;
  options: VocabOption[];
}

export const diagnosticTest2Vocab: VocabQuestion[] = [
  {
    id: 'v1',
    word: 'pertinent',
    options: [
      // nuance: "tangentially connected" vs "directly relevant" — 직접 관련 vs 간접 관련 혼동
      { id: 'A', text: 'having some connection to the topic but not directly addressing the core issue', type: 'distractor' },
      { id: 'B', text: 'relevant; directly related to the matter at hand', type: 'correct' },
      // nuance: "important/noteworthy" ≠ "relevant" — 중요하다 ≠ 관련 있다
      { id: 'C', text: 'particularly noteworthy or deserving of special attention', type: 'distractor' },
      // impertinent = rude — 가장 흔한 혼동
      { id: 'D', text: 'rude or disrespectful', type: 'distractor' },
    ],
  },
  {
    id: 'v2',
    word: 'amenable',
    options: [
      // amiable(친근함) vs amenable(동의/협조) — 가장 흔한 혼동
      { id: 'A', text: 'friendly and pleasant in manner', type: 'distractor' },
      // "amenable to correction" 법적 용법에서 "교정 가능한"으로 쓰이기도 함
      { id: 'B', text: 'able to be corrected or fixed', type: 'distractor' },
      { id: 'C', text: 'deserving of blame or punishment', type: 'distractor' },
      { id: 'D', text: 'willing to agree or cooperate; open to a suggestion', type: 'correct' },
    ],
  },
  {
    id: 'v3',
    word: 'detrimental',
    options: [
      { id: 'A', text: 'helpful in a small, indirect way', type: 'distractor' },
      { id: 'B', text: 'harmful; causing damage', type: 'correct' },
      // det- 음절 phonetic trap (determined)
      { id: 'C', text: 'determined; showing firm resolve', type: 'distractor' },
      // nuance: "temporary setback" vs "harmful" — 회복 가능한 방해 vs 손해/피해 혼동
      { id: 'D', text: 'causing a temporary setback that can be overcome with effort', type: 'distractor' },
    ],
  },
  {
    id: 'v4',
    word: 'upended',
    options: [
      { id: 'A', text: 'completely disrupted or overturned', type: 'correct' },
      { id: 'B', text: 'postponed until a later time', type: 'distractor' },
      { id: 'C', text: 'brought to a successful conclusion', type: 'distractor' },
      // up + ended 직역 함정: "위로 올려진"
      { id: 'D', text: 'raised to a higher level or rank', type: 'distractor' },
    ],
  },
  {
    id: 'v5',
    word: 'redundancy',
    options: [
      { id: 'A', text: 'a sudden and unexpected shortage', type: 'distractor' },
      // nuance: engineering 의미 — "system redundancy" = 예비 시스템. 글쓰기 맥락과 반대 함정
      { id: 'B', text: 'the use of backup systems or components to prevent complete failure', type: 'distractor' },
      // nuance: "repeating to verify" ≠ "unnecessary repetition" — 목적이 다름
      { id: 'C', text: 'the deliberate repetition of a task to confirm its accuracy', type: 'distractor' },
      { id: 'D', text: 'the state of being unnecessary because something else already serves the same purpose', type: 'correct' },
    ],
  },
  {
    id: 'v6',
    word: 'discrepancy',
    options: [
      // discretion — 철자 유사, 전혀 다른 뜻
      { id: 'A', text: 'careful judgment in avoiding offense', type: 'distractor' },
      { id: 'B', text: 'a difference between two things that should be the same', type: 'correct' },
      { id: 'C', text: 'a secret agreement between two parties', type: 'distractor' },
      { id: 'D', text: 'a lack of respect or courtesy', type: 'distractor' },
    ],
  },
  {
    id: 'v7',
    word: 'subordinate',
    options: [
      { id: 'A', text: 'working independently without supervision', type: 'distractor' },
      // nuance: "middle rank" vs "lower rank" — subordinate = 아래 직급, 가운데가 아님
      { id: 'B', text: 'ranked below one group while remaining above another in a hierarchy', type: 'distractor' },
      { id: 'C', text: 'lower in rank, importance, or power', type: 'correct' },
      // sub- 직역 함정: "지하에 있는"
      { id: 'D', text: 'located underground or below the surface', type: 'distractor' },
    ],
  },
  {
    id: 'v8',
    word: 'incongruous',
    options: [
      { id: 'A', text: 'arriving at the same conclusion by different routes', type: 'distractor' },
      // nuance: "logically inconsistent" vs "out of place" — 논리적 모순 ≠ 주변과 안 어울림
      { id: 'B', text: 'contradicting what one would logically expect in the circumstances', type: 'distractor' },
      // nuance: "intentionally eclectic" vs "out of place" — 의도적 혼합 vs 어울리지 않음
      { id: 'C', text: 'combining elements from different traditions in an unusual but deliberate way', type: 'distractor' },
      { id: 'D', text: 'out of place; not in harmony with its surroundings', type: 'correct' },
    ],
  },
  {
    id: 'v9',
    word: 'invariable',
    options: [
      // nuance: "universal/absolute" vs "unchanging" — 예외 없음 ≠ 변하지 않음
      { id: 'A', text: 'applying to all cases without exceptions or conditions', type: 'distractor' },
      { id: 'B', text: 'never changing; always the same', type: 'correct' },
      // inevitable — 음가 유사 함정
      { id: 'C', text: 'not able to be avoided', type: 'distractor' },
      // nuance: "consistent in character but not identical" vs "literally identical every time"
      { id: 'D', text: 'maintaining the same essential character while allowing minor variations', type: 'distractor' },
    ],
  },
  {
    id: 'v10',
    word: 'ambiguous',
    options: [
      // ambidextrous — ambi- 어원 함정
      { id: 'A', text: 'able to use both hands equally well', type: 'distractor' },
      // ambitious — 음가 함정
      { id: 'B', text: 'eager and full of desire to succeed', type: 'distractor' },
      // ambient — ambi- 어원 함정
      { id: 'C', text: 'surrounding or existing on all sides', type: 'distractor' },
      { id: 'D', text: 'having more than one possible meaning; unclear', type: 'correct' },
    ],
  },
  {
    id: 'v11',
    word: 'imperceptible',
    options: [
      { id: 'A', text: 'too slight to be noticed', type: 'correct' },
      // nuance: "difficult to detect with effort" vs "too slight to detect at all" — 핵심 함정
      { id: 'B', text: 'present but difficult to detect without focused attention', type: 'distractor' },
      // nuance: subliminal vs imperceptible — 의식 아래 존재 vs 아예 감지 불가
      { id: 'C', text: 'existing just below the level of conscious awareness', type: 'distractor' },
      // nuance: "typically overlooked" vs "literally cannot be perceived"
      { id: 'D', text: 'so subtle in effect that it is typically overlooked in practice', type: 'distractor' },
    ],
  },
  {
    id: 'v12',
    word: 'nominal',
    options: [
      // nominated — 철자/음가 함정
      { id: 'A', text: 'chosen by a formal vote', type: 'distractor' },
      { id: 'B', text: 'existing in name only; or very small in amount', type: 'correct' },
      // numerical — 음가 함정
      { id: 'C', text: 'related to numbers or counting', type: 'distractor' },
      // normal — 음가 함정
      { id: 'D', text: 'typical; conforming to a standard', type: 'distractor' },
    ],
  },
  {
    id: 'v13',
    word: 'deter',
    options: [
      // deteriorate — 음가 함정
      { id: 'A', text: 'to make something worse over time', type: 'distractor' },
      // defer — 가장 강력한 음가 함정
      { id: 'B', text: 'to delay a decision until later', type: 'distractor' },
      { id: 'C', text: 'to discourage someone from doing something', type: 'correct' },
      // determine — 음가 함정
      { id: 'D', text: 'to determine the cause of something', type: 'distractor' },
    ],
  },
  {
    id: 'v14',
    word: 'proxy',
    options: [
      { id: 'A', text: 'a close and detailed examination', type: 'distractor' },
      { id: 'B', text: 'a predicted outcome based on current trends', type: 'distractor' },
      // proximity — 어원 함정 (prox- = near)
      { id: 'C', text: 'nearness in space or time', type: 'distractor' },
      { id: 'D', text: 'something that stands in for or represents something else', type: 'correct' },
    ],
  },
  {
    id: 'v15',
    word: 'indispensable',
    options: [
      // indisputable — 철자 함정
      { id: 'A', text: 'impossible to argue against', type: 'distractor' },
      { id: 'B', text: 'absolutely necessary; essential', type: 'correct' },
      { id: 'C', text: 'too expensive to be replaced', type: 'distractor' },
      // inseparable — in- 계열 함정
      { id: 'D', text: 'unable to be separated from something', type: 'distractor' },
    ],
  },
  {
    id: 'v16',
    word: 'resolute',
    options: [
      { id: 'A', text: 'firm and determined', type: 'correct' },
      // resolved — 같은 어근, 다른 뉘앙스 함정 (과거분사 vs 형용사)
      { id: 'B', text: 'finally settled or answered', type: 'distractor' },
      { id: 'C', text: 'willing to compromise easily', type: 'distractor' },
      { id: 'D', text: 'extremely clear in detail', type: 'distractor' },
    ],
  },
  {
    id: 'v17',
    word: 'perfunctory',
    options: [
      // nuance: "meeting minimum standards" vs "done carelessly below standards" — 핵심 구분
      { id: 'A', text: 'carried out efficiently to meet minimum requirements without additional effort', type: 'distractor' },
      // perfect — 음가 + 의미 반대 함정
      { id: 'B', text: 'done perfectly and without error', type: 'distractor' },
      // nuance: "out of habit" captures the "no real interest" aspect but misses the carelessness
      { id: 'C', text: 'performed routinely out of habit rather than genuine interest', type: 'distractor' },
      { id: 'D', text: 'done quickly and carelessly, without real interest', type: 'correct' },
    ],
  },
  {
    id: 'v18',
    word: 'meticulously',
    options: [
      { id: 'A', text: 'in a very quick and efficient way', type: 'distractor' },
      // nuance: methodically(순서대로) vs meticulously(세밀하게) — 가장 흔한 혼동
      { id: 'B', text: 'according to a fixed method or rule', type: 'distractor' },
      { id: 'C', text: 'with extreme care and attention to detail', type: 'correct' },
      // nuance: "comprehensively" vs "meticulously" — 빠짐없이 ≠ 세심하게
      { id: 'D', text: 'with thoroughness that ensures all aspects are covered without omission', type: 'distractor' },
    ],
  },
  {
    id: 'v19',
    word: 'anachronistic',
    options: [
      // anarchic — ana- 접두사 함정
      { id: 'A', text: 'lacking any clear order or organization', type: 'distractor' },
      { id: 'B', text: 'belonging to a different period of time than the one it appears in', type: 'correct' },
      // archaic — 가장 흔한 혼동 (오래된 ≠ 시대착오적)
      { id: 'C', text: 'extremely old and no longer useful', type: 'distractor' },
      // anarchist — ana- 접두사 함정
      { id: 'D', text: 'opposed to all forms of government', type: 'distractor' },
    ],
  },
  {
    id: 'v20',
    word: 'paradoxically',
    options: [
      { id: 'A', text: 'in a way that seems contradictory but may be true', type: 'correct' },
      { id: 'B', text: 'as a direct and expected result', type: 'distractor' },
      // nuance: ironically(예상과 다른 결과) vs paradoxically(모순처럼 보이지만 사실) — 가장 중요한 함정
      { id: 'C', text: 'in a way that reveals an unexpected irony in the situation', type: 'distractor' },
      // nuance: counterproductively(의도와 반대 결과) vs paradoxically(겉보기 모순이지만 사실)
      { id: 'D', text: 'by producing an outcome that contradicts the original intention', type: 'distractor' },
    ],
  },
];
