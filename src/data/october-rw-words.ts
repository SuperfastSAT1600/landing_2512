export interface RwWord {
  id: string;
  word: string;
  forms?: string;       // 관련 형태 (예: "admonish, admonitions")
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'prefix';
  definition_en: string;
  definition_ko: string;
}

// sat_problem_votes 테이블 check 제약 때문에 'yes'/'no' 사용
// yes = 알고 있었어, no = 몰랐어
export type WordVoteType = 'yes' | 'no';

export const OCTOBER_RW_WORDS: RwWord[] = [
  {
    id: 'rw-veneration',
    word: 'veneration',
    pos: 'noun',
    definition_en: 'great respect and reverence for someone or something',
    definition_ko: '숭배, 경외',
  },
  {
    id: 'rw-admonition',
    word: 'admonition',
    forms: 'admonish',
    pos: 'noun',
    definition_en: 'a gentle warning or reprimand',
    definition_ko: '훈계, 경고',
  },
  {
    id: 'rw-obfuscation',
    word: 'obfuscation',
    pos: 'noun',
    definition_en: 'the action of making something unclear or hard to understand',
    definition_ko: '난해하게 만들기, 모호화',
  },
  {
    id: 'rw-exoneration',
    word: 'exoneration',
    forms: 'exonerate',
    pos: 'noun',
    definition_en: 'official absolution from blame or criminal charges',
    definition_ko: '면죄, 무죄 입증',
  },
  {
    id: 'rw-parameters',
    word: 'parameters',
    pos: 'noun',
    definition_en: 'limits or factors that define the scope of a process or system',
    definition_ko: '매개변수, 범위, 한도',
  },
  {
    id: 'rw-anomaly',
    word: 'anomaly',
    forms: 'anomalies / anomalous',
    pos: 'noun',
    definition_en: 'something that deviates from what is normal or expected',
    definition_ko: '이상(현상), 변칙',
  },
  {
    id: 'rw-optimization',
    word: 'optimization',
    pos: 'noun',
    definition_en: 'the process of making something as effective or functional as possible',
    definition_ko: '최적화',
  },
  {
    id: 'rw-prediction',
    word: 'prediction',
    forms: 'predictions',
    pos: 'noun',
    definition_en: 'a statement about what will happen in the future',
    definition_ko: '예측',
  },
  {
    id: 'rw-isolate',
    word: 'isolate',
    forms: 'isolating',
    pos: 'verb',
    definition_en: 'to set apart from others; to cause to be alone',
    definition_ko: '고립시키다, 분리하다',
  },
  {
    id: 'rw-regulate',
    word: 'regulate',
    pos: 'verb',
    definition_en: 'to control or maintain by rule or principle',
    definition_ko: '규제하다, 조절하다',
  },
  {
    id: 'rw-sufficient',
    word: 'sufficient',
    forms: 'suffice',
    pos: 'adjective',
    definition_en: 'enough to meet a need or requirement',
    definition_ko: '충분한',
  },
  {
    id: 'rw-austere',
    word: 'austere',
    pos: 'adjective',
    definition_en: 'severe and plain; without luxury or ornamentation',
    definition_ko: '금욕적인, 검소한, 엄격한',
  },
  {
    id: 'rw-skeptically',
    word: 'skeptically',
    forms: 'skeptical',
    pos: 'adverb',
    definition_en: 'in a doubting or questioning manner',
    definition_ko: '회의적으로',
  },
  {
    id: 'rw-satiate',
    word: 'satiate',
    pos: 'verb',
    definition_en: 'to satisfy fully; to supply to excess',
    definition_ko: '충족시키다, 질리게 하다',
  },
  {
    id: 'rw-interplay',
    word: 'interplay',
    pos: 'noun',
    definition_en: 'the way two or more things interact and influence each other',
    definition_ko: '상호작용',
  },
  {
    id: 'rw-throughput',
    word: 'throughput',
    pos: 'noun',
    definition_en: 'the amount of material or work processed in a given period',
    definition_ko: '처리량, 산출량',
  },
  {
    id: 'rw-abstain',
    word: 'abstain',
    pos: 'verb',
    definition_en: 'to restrain oneself from doing or enjoying something',
    definition_ko: '자제하다, 기권하다',
  },
  {
    id: 'rw-incipient',
    word: 'incipient',
    pos: 'adjective',
    definition_en: 'just beginning to happen or develop',
    definition_ko: '초기의, 막 시작된',
  },
  {
    id: 'rw-deviate',
    word: 'deviate',
    forms: 'deviant',
    pos: 'verb',
    definition_en: 'to depart from an established course, norm, or standard',
    definition_ko: '벗어나다, 이탈하다',
  },
  {
    id: 'rw-ambivalent',
    word: 'ambivalent',
    pos: 'adjective',
    definition_en: 'having mixed or contradictory feelings about something',
    definition_ko: '양가적인, 두 마음의',
  },
  {
    id: 'rw-ambiguous',
    word: 'ambiguous',
    pos: 'adjective',
    definition_en: 'open to more than one interpretation; unclear in meaning',
    definition_ko: '모호한, 중의적인',
  },
  {
    id: 'rw-ambi',
    word: 'ambi-',
    forms: 'ambidextrous',
    pos: 'prefix',
    definition_en: 'Latin prefix meaning "both" — e.g., ambidextrous: able to use both hands equally',
    definition_ko: '"양쪽(both)"을 뜻하는 라틴어 접두사',
  },
  {
    id: 'rw-attenuate',
    word: 'attenuate',
    pos: 'verb',
    definition_en: 'to reduce in force, effect, or value; to weaken',
    definition_ko: '약화시키다, 희석하다',
  },
  {
    id: 'rw-impede',
    word: 'impede',
    forms: 'impediment',
    pos: 'verb',
    definition_en: 'to obstruct or hinder the progress of something',
    definition_ko: '방해하다, 저해하다',
  },
];
