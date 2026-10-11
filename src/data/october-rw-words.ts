export interface RwWord {
  id: string;
  word: string;
  pos: 'noun' | 'verb' | 'adjective' | 'adverb';
  definition_en: string;
  definition_ko: string;
}

export type WordVoteType = 'knew' | 'didnt_know';

export const OCTOBER_RW_WORDS: RwWord[] = [
  { id: 'rw-acquiesce',    word: 'acquiesce',    pos: 'verb',      definition_en: 'accept without protest',                          definition_ko: '마지못해 따르다' },
  { id: 'rw-admonish',     word: 'admonish',     pos: 'verb',      definition_en: 'warn or gently reprimand',                        definition_ko: '타이르다, 훈계하다' },
  { id: 'rw-ambivalent',   word: 'ambivalent',   pos: 'adjective', definition_en: 'having mixed or conflicting feelings',             definition_ko: '양면적인, 상반된 감정의' },
  { id: 'rw-ameliorate',   word: 'ameliorate',   pos: 'verb',      definition_en: 'make something bad better',                       definition_ko: '개선하다, 호전시키다' },
  { id: 'rw-arduous',      word: 'arduous',      pos: 'adjective', definition_en: 'requiring great effort; difficult',                definition_ko: '힘든, 고된' },
  { id: 'rw-articulate',   word: 'articulate',   pos: 'verb',      definition_en: 'express thoughts clearly and fluently',           definition_ko: '명확히 표현하다' },
  { id: 'rw-austere',      word: 'austere',      pos: 'adjective', definition_en: 'severe and plain; without luxury',                definition_ko: '금욕적인, 엄격한' },
  { id: 'rw-bolster',      word: 'bolster',      pos: 'verb',      definition_en: 'support or strengthen',                           definition_ko: '강화하다, 북돋우다' },
  { id: 'rw-candid',       word: 'candid',       pos: 'adjective', definition_en: 'truthful and straightforward',                    definition_ko: '솔직한' },
  { id: 'rw-circumvent',   word: 'circumvent',   pos: 'verb',      definition_en: 'find a way around an obstacle',                   definition_ko: '우회하다, 피하다' },
  { id: 'rw-concede',      word: 'concede',      pos: 'verb',      definition_en: 'admit reluctantly; yield',                        definition_ko: '인정하다, 양보하다' },
  { id: 'rw-contentious',  word: 'contentious',  pos: 'adjective', definition_en: 'causing controversy or disagreement',             definition_ko: '논쟁적인' },
  { id: 'rw-curtail',      word: 'curtail',      pos: 'verb',      definition_en: 'reduce or restrict',                              definition_ko: '축소하다, 제한하다' },
  { id: 'rw-deference',    word: 'deference',    pos: 'noun',      definition_en: 'respectful submission to another\'s judgment',    definition_ko: '경의, 존중' },
  { id: 'rw-disparate',    word: 'disparate',    pos: 'adjective', definition_en: 'essentially different in kind',                   definition_ko: '이질적인, 판이한' },
  { id: 'rw-elusive',      word: 'elusive',      pos: 'adjective', definition_en: 'difficult to find, catch, or define',             definition_ko: '포착하기 힘든' },
  { id: 'rw-ephemeral',    word: 'ephemeral',    pos: 'adjective', definition_en: 'lasting a very short time',                       definition_ko: '덧없는, 순간적인' },
  { id: 'rw-exacerbate',   word: 'exacerbate',   pos: 'verb',      definition_en: 'make a problem or bad situation worse',           definition_ko: '악화시키다' },
  { id: 'rw-exemplify',    word: 'exemplify',    pos: 'verb',      definition_en: 'be a typical example of',                         definition_ko: '예시하다, 전형이 되다' },
  { id: 'rw-facilitate',   word: 'facilitate',   pos: 'verb',      definition_en: 'make an action or process easier',                definition_ko: '용이하게 하다, 촉진하다' },
  { id: 'rw-fervent',      word: 'fervent',      pos: 'adjective', definition_en: 'showing strong, passionate feeling',              definition_ko: '열렬한, 간절한' },
  { id: 'rw-foster',       word: 'foster',       pos: 'verb',      definition_en: 'encourage the development of something',          definition_ko: '조장하다, 육성하다' },
  { id: 'rw-inherent',     word: 'inherent',     pos: 'adjective', definition_en: 'existing as a permanent, essential quality',      definition_ko: '고유한, 내재하는' },
  { id: 'rw-mitigate',     word: 'mitigate',     pos: 'verb',      definition_en: 'make less severe or serious',                     definition_ko: '완화하다' },
  { id: 'rw-nuanced',      word: 'nuanced',      pos: 'adjective', definition_en: 'having subtle distinctions or variations',        definition_ko: '미묘한 차이가 있는' },
  { id: 'rw-perpetuate',   word: 'perpetuate',   pos: 'verb',      definition_en: 'make something continue indefinitely',            definition_ko: '영속시키다, 지속시키다' },
  { id: 'rw-pragmatic',    pos: 'adjective', word: 'pragmatic',    definition_en: 'dealing with things practically and sensibly',    definition_ko: '실용적인' },
  { id: 'rw-refute',       word: 'refute',       pos: 'verb',      definition_en: 'prove to be wrong; disprove',                     definition_ko: '반박하다, 논파하다' },
  { id: 'rw-skeptical',    word: 'skeptical',    pos: 'adjective', definition_en: 'not easily convinced; having doubts',             definition_ko: '회의적인' },
  { id: 'rw-substantiate', word: 'substantiate', pos: 'verb',      definition_en: 'provide evidence to support a claim',             definition_ko: '입증하다, 실증하다' },
  { id: 'rw-tenacious',    word: 'tenacious',    pos: 'adjective', definition_en: 'holding firmly; persistent',                      definition_ko: '끈질긴, 집요한' },
  { id: 'rw-ubiquitous',   word: 'ubiquitous',   pos: 'adjective', definition_en: 'present everywhere at the same time',             definition_ko: '어디에나 있는' },
  { id: 'rw-underscore',   word: 'underscore',   pos: 'verb',      definition_en: 'emphasize or stress something',                   definition_ko: '강조하다' },
  { id: 'rw-venerate',     word: 'venerate',     pos: 'verb',      definition_en: 'regard with great respect and reverence',         definition_ko: '존경하다, 숭배하다' },
  { id: 'rw-viable',       word: 'viable',       pos: 'adjective', definition_en: 'capable of working successfully; feasible',       definition_ko: '실행 가능한, 생존 가능한' },
];
