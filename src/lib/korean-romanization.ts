/**
 * 한글 이름 → 로마자 표기 후보 생성.
 *
 * 2025 구 진단테스트는 응시자가 이름을 직접 적었고 상당수가 영문(`Jinseo Chung`)인데,
 * CRM에는 한글(`정진서`)로 들어 있어 문자 대조로는 영영 안 붙는다.
 * 실제 표기는 국립국어원 표준을 안 따르는 경우가 더 많아(정=Chung/Jung, 이=Lee),
 * 표준 1개가 아니라 **쓰일 법한 변형 전부**를 만들어 집합으로 비교한다.
 *
 * 성 + 이름 순서도 한국식(KimDoyeong)과 영어식(DoyeongKim) 둘 다 만든다.
 */

const BASE = 0xac00;
const INITIALS = [
  ['g', 'k'],
  ['kk', 'gg'],
  ['n'],
  ['d', 't'],
  ['tt'],
  ['r', 'l'],
  ['m'],
  ['b', 'p'],
  ['pp'],
  ['s', 'sh'],
  ['ss'],
  [''],
  ['j', 'ch', 'z'],
  ['jj'],
  ['ch'],
  ['k'],
  ['t'],
  ['p'],
  ['h'],
];
const VOWELS = [
  ['a'],
  ['ae'],
  ['ya'],
  ['yae'],
  ['eo', 'u', 'o'],
  ['e'],
  ['yeo', 'yu', 'yo'],
  ['ye'],
  ['o', 'oh'],
  ['wa'],
  ['wae'],
  ['oe', 'we', 'oi'],
  ['yo'],
  ['u', 'oo', 'w'],
  ['wo'],
  ['we'],
  ['wi'],
  ['yu', 'yoo', 'you'],
  ['eu', 'u'],
  ['ui', 'ee'],
  ['i', 'ee', 'y'],
];
const FINALS = [
  [''],
  ['k', 'g'],
  ['k'],
  ['k'],
  ['n'],
  ['n'],
  ['n'],
  ['l', 'r'],
  ['k'],
  ['m'],
  ['p'],
  ['l'],
  ['l'],
  ['p'],
  ['l'],
  ['l'],
  ['m'],
  ['p'],
  ['p'],
  ['t'],
  ['t'],
  ['ng'],
  ['t'],
  ['t'],
  ['k'],
  ['t'],
  ['p'],
  ['t'],
];

/** 관용 표기가 표준과 크게 다른 성씨들 — 여기 없으면 음절 규칙으로 만든다. */
const SURNAME_FORMS: Record<string, string[]> = {
  김: ['kim', 'gim'],
  이: ['lee', 'yi', 'rhee', 'i', 'ee'],
  박: ['park', 'bak', 'pak'],
  최: ['choi', 'choe', 'chwe'],
  정: ['jung', 'jeong', 'chung', 'chong'],
  강: ['kang', 'gang'],
  조: ['cho', 'jo'],
  윤: ['yoon', 'yun', 'youn'],
  장: ['jang', 'chang'],
  임: ['lim', 'im', 'rim'],
  한: ['han'],
  오: ['oh', 'o'],
  서: ['seo', 'suh', 'sur'],
  신: ['shin', 'sin'],
  권: ['kwon', 'gwon'],
  황: ['hwang'],
  안: ['ahn', 'an'],
  송: ['song'],
  유: ['yu', 'yoo', 'ryu'],
  류: ['ryu', 'yu', 'lyu'],
  홍: ['hong'],
  전: ['jeon', 'jun', 'chun', 'chon'],
  고: ['ko', 'go'],
  문: ['moon', 'mun'],
  손: ['son', 'sohn'],
  양: ['yang'],
  배: ['bae', 'pae'],
  백: ['baek', 'paek', 'back'],
  허: ['heo', 'hur', 'huh'],
  남: ['nam'],
  심: ['shim', 'sim'],
  노: ['noh', 'no', 'roh'],
  하: ['ha'],
  곽: ['kwak', 'gwak'],
  성: ['sung', 'seong'],
  차: ['cha'],
  주: ['joo', 'ju'],
  우: ['woo', 'wu', 'u'],
  구: ['koo', 'gu', 'ku'],
  나: ['na', 'nah', 'ra'],
  라: ['ra', 'na'],
  민: ['min'],
  지: ['ji', 'jee'],
  진: ['jin', 'chin'],
  채: ['chae', 'chai'],
  천: ['chun', 'cheon'],
  표: ['pyo'],
  소: ['so'],
  반: ['ban'],
  방: ['bang', 'pang'],
  여: ['yeo', 'yuh'],
  연: ['yeon', 'youn'],
  석: ['seok', 'suk'],
  설: ['seol', 'sul'],
  선: ['seon', 'sun'],
  예: ['ye'],
  태: ['tae'],
};

const MAX_FORMS = 400; // 조합 폭발 방지 — 이름 3~4음절이면 충분히 커버된다

function syllableForms(ch: string): string[] {
  const code = ch.charCodeAt(0) - BASE;
  if (code < 0 || code > 11171) return [ch.toLowerCase()];
  const i = Math.floor(code / 588);
  const v = Math.floor((code % 588) / 28);
  const f = code % 28;
  const out: string[] = [];
  for (const a of INITIALS[i])
    for (const b of VOWELS[v]) for (const c of FINALS[f]) out.push(a + b + c);
  return [...new Set(out)];
}

function combine(parts: string[][]): string[] {
  let acc = [''];
  for (const options of parts) {
    const next: string[] = [];
    for (const prefix of acc) for (const o of options) next.push(prefix + o);
    acc = next.length > MAX_FORMS ? next.slice(0, MAX_FORMS) : next;
  }
  return acc;
}

/** 표준 규칙만 적용한 대표 표기들(성 관용형 제외). */
export function romanizeName(name: string): string[] {
  const chars = [...name].filter((c) => /[가-힣]/.test(c));
  if (!chars.length) return [];
  return combine(chars.map(syllableForms));
}

const HANGUL = /[가-힣]/;

/**
 * 한 한글 이름에 대해 실제로 쓰일 법한 로마자 표기 전부.
 * 성-이름 순서와 이름-성 순서(영어식)를 모두 낸다.
 */
export function romanizationsOf(name: string): Set<string> {
  const chars = [...name].filter((c) => HANGUL.test(c));
  if (!chars.length) return new Set();

  const [surnameChar, ...givenChars] = chars;
  const surnameForms = SURNAME_FORMS[surnameChar] ?? syllableForms(surnameChar);
  const givenForms = givenChars.length ? combine(givenChars.map(syllableForms)) : [''];

  const out = new Set<string>();
  for (const s of surnameForms) {
    for (const g of givenForms) {
      out.add(s + g); // 김도영 → kimdoyeong
      if (g) out.add(g + s); // 도영김 → doyeongkim (영어식)
    }
  }
  return out;
}

const STRIP = /[\s.·,\-_'"()]+/g;

/** 영문 표기(englishName)와 한글 이름(koreanName)이 같은 사람으로 읽히는지. */
export function matchesRomanized(englishName: string, koreanName: string): boolean {
  if (HANGUL.test(englishName)) return false; // 한글끼리는 문자 대조가 담당한다
  if (!HANGUL.test(koreanName)) return false;
  const target = englishName.toLowerCase().replace(STRIP, '');
  if (!target) return false;
  return romanizationsOf(koreanName).has(target);
}
