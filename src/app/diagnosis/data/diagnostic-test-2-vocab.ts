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
      { id: 'A', text: 'stubborn; refusing to change one\'s mind', type: 'distractor' },
      { id: 'B', text: 'relevant; directly related to the matter at hand', type: 'correct' },
      { id: 'C', text: 'lasting for a long time; persistent', type: 'distractor' },
      { id: 'D', text: 'rude or disrespectful', type: 'distractor' },
    ],
  },
  {
    id: 'v2',
    word: 'amenable',
    options: [
      { id: 'A', text: 'friendly and pleasant in manner', type: 'distractor' },
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
      { id: 'C', text: 'determined; showing firm resolve', type: 'distractor' },
      { id: 'D', text: 'related to the details of something', type: 'distractor' },
    ],
  },
  {
    id: 'v4',
    word: 'upended',
    options: [
      { id: 'A', text: 'completely disrupted or overturned', type: 'correct' },
      { id: 'B', text: 'postponed until a later time', type: 'distractor' },
      { id: 'C', text: 'brought to a successful conclusion', type: 'distractor' },
      { id: 'D', text: 'raised to a higher level or rank', type: 'distractor' },
    ],
  },
  {
    id: 'v5',
    word: 'redundancy',
    options: [
      { id: 'A', text: 'a sudden and unexpected shortage', type: 'distractor' },
      { id: 'B', text: 'a formal dismissal from a position of authority', type: 'distractor' },
      { id: 'C', text: 'the act of repeating a mistake', type: 'distractor' },
      { id: 'D', text: 'the state of being unnecessary because something else already serves the same purpose', type: 'correct' },
    ],
  },
  {
    id: 'v6',
    word: 'discrepancy',
    options: [
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
      { id: 'B', text: 'organized into categories', type: 'distractor' },
      { id: 'C', text: 'lower in rank, importance, or power', type: 'correct' },
      { id: 'D', text: 'located underground or below the surface', type: 'distractor' },
    ],
  },
  {
    id: 'v8',
    word: 'incongruous',
    options: [
      { id: 'A', text: 'arriving at the same conclusion by different routes', type: 'distractor' },
      { id: 'B', text: 'unable to be divided into parts', type: 'distractor' },
      { id: 'C', text: 'impossible to understand', type: 'distractor' },
      { id: 'D', text: 'out of place; not in harmony with its surroundings', type: 'correct' },
    ],
  },
  {
    id: 'v9',
    word: 'invariable',
    options: [
      { id: 'A', text: 'impossible to measure', type: 'distractor' },
      { id: 'B', text: 'never changing; always the same', type: 'correct' },
      { id: 'C', text: 'not able to be avoided', type: 'distractor' },
      { id: 'D', text: 'having many different forms', type: 'distractor' },
    ],
  },
  {
    id: 'v10',
    word: 'ambiguous',
    options: [
      { id: 'A', text: 'able to use both hands equally well', type: 'distractor' },
      { id: 'B', text: 'eager and full of desire to succeed', type: 'distractor' },
      { id: 'C', text: 'surrounding or existing on all sides', type: 'distractor' },
      { id: 'D', text: 'having more than one possible meaning; unclear', type: 'correct' },
    ],
  },
  {
    id: 'v11',
    word: 'imperceptible',
    options: [
      { id: 'A', text: 'too slight to be noticed', type: 'correct' },
      { id: 'B', text: 'unable to be completed', type: 'distractor' },
      { id: 'C', text: 'lacking good manners', type: 'distractor' },
      { id: 'D', text: 'impossible to persuade', type: 'distractor' },
    ],
  },
  {
    id: 'v12',
    word: 'nominal',
    options: [
      { id: 'A', text: 'chosen by a formal vote', type: 'distractor' },
      { id: 'B', text: 'existing in name only; or very small in amount', type: 'correct' },
      { id: 'C', text: 'related to numbers or counting', type: 'distractor' },
      { id: 'D', text: 'typical; conforming to a standard', type: 'distractor' },
    ],
  },
  {
    id: 'v13',
    word: 'deter',
    options: [
      { id: 'A', text: 'to make something worse over time', type: 'distractor' },
      { id: 'B', text: 'to delay a decision until later', type: 'distractor' },
      { id: 'C', text: 'to discourage someone from doing something', type: 'correct' },
      { id: 'D', text: 'to determine the cause of something', type: 'distractor' },
    ],
  },
  {
    id: 'v14',
    word: 'proxy',
    options: [
      { id: 'A', text: 'a close and detailed examination', type: 'distractor' },
      { id: 'B', text: 'a predicted outcome based on current trends', type: 'distractor' },
      { id: 'C', text: 'nearness in space or time', type: 'distractor' },
      { id: 'D', text: 'something that stands in for or represents something else', type: 'correct' },
    ],
  },
  {
    id: 'v15',
    word: 'indispensable',
    options: [
      { id: 'A', text: 'impossible to argue against', type: 'distractor' },
      { id: 'B', text: 'absolutely necessary; essential', type: 'correct' },
      { id: 'C', text: 'too expensive to be replaced', type: 'distractor' },
      { id: 'D', text: 'unable to be separated from something', type: 'distractor' },
    ],
  },
  {
    id: 'v16',
    word: 'resolute',
    options: [
      { id: 'A', text: 'firm and determined', type: 'correct' },
      { id: 'B', text: 'finally settled or answered', type: 'distractor' },
      { id: 'C', text: 'willing to compromise easily', type: 'distractor' },
      { id: 'D', text: 'extremely clear in detail', type: 'distractor' },
    ],
  },
  {
    id: 'v17',
    word: 'perfunctory',
    options: [
      { id: 'A', text: 'performed for the first time', type: 'distractor' },
      { id: 'B', text: 'done perfectly and without error', type: 'distractor' },
      { id: 'C', text: 'carried out in strict order', type: 'distractor' },
      { id: 'D', text: 'done quickly and carelessly, without real interest', type: 'correct' },
    ],
  },
  {
    id: 'v18',
    word: 'meticulously',
    options: [
      { id: 'A', text: 'in a very quick and efficient way', type: 'distractor' },
      { id: 'B', text: 'according to a fixed method or rule', type: 'distractor' },
      { id: 'C', text: 'with extreme care and attention to detail', type: 'correct' },
      { id: 'D', text: 'in a way that shows off one\'s skill', type: 'distractor' },
    ],
  },
  {
    id: 'v19',
    word: 'anachronistic',
    options: [
      { id: 'A', text: 'lacking any clear order or organization', type: 'distractor' },
      { id: 'B', text: 'belonging to a different period of time than the one it appears in', type: 'correct' },
      { id: 'C', text: 'extremely old and no longer useful', type: 'distractor' },
      { id: 'D', text: 'opposed to all forms of government', type: 'distractor' },
    ],
  },
  {
    id: 'v20',
    word: 'paradoxically',
    options: [
      { id: 'A', text: 'in a way that seems contradictory but may be true', type: 'correct' },
      { id: 'B', text: 'as a direct and expected result', type: 'distractor' },
      { id: 'C', text: 'in a way that is ideal or perfect', type: 'distractor' },
      { id: 'D', text: 'in a way that follows a strict pattern', type: 'distractor' },
    ],
  },
];
