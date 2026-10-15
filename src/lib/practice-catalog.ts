// /practice/* 는 인스타그램에서 액세스 코드를 받고 넘어오는 리드 수집 퍼널이다.
// 문항 자체는 코드 뒤에 있어야 하므로, 게이트 화면 아래에 이 소개를 서버에서 렌더링해
// 검색엔진이 읽을 본문을 만든다. 인스타로 바로 넘어온 사용자는 폼만 보고 지나가고,
// 검색에서 들어온 사람은 스크롤해서 이 문제 세트가 무엇인지 알게 된다.
//
// 제목·설명은 한국어 검색 수요에 맞춘다. 게이트 화면 h1 은 영문인 경우가 있는데(예:
// "Quadratic Equations — 30 Problems") 그대로 두면 한국어 쿼리와 맞지 않는다.

export interface PracticeCatalogEntry {
    /** <title> 과 og:title. 한국어 타깃 키워드를 앞에 둔다. */
    title: string;
    /** meta description. 120~155자 권장. */
    description: string;
    /** 소개 섹션의 제목. 게이트 h1 과 중복되지 않게 쓴다. */
    heading: string;
    /** 이 세트가 무엇인지 2~3문단. 검색엔진이 읽는 본문의 핵심. */
    body: string[];
    /** 다루는 개념·유형. 칩으로 렌더링된다. */
    topics: string[];
    /** 문항 수. 0 이면 표시하지 않는다. */
    questionCount: number;
    /** "누구에게 맞는가" 한 줄. */
    audience: string;
}

export const PRACTICE_CATALOG: Record<string, PracticeCatalogEntry> = {
    quadratic: {
        title: 'SAT 이차방정식 연습문제 30제 | SuperfastSAT',
        description:
            'Digital SAT Math 이차방정식 30문항. 근의 공식, 짝수 계수 공식, 판별식, 비에타의 공식까지 출제 유형별로 묶어 풀어봅니다. 채점과 해설은 제출 즉시 확인할 수 있습니다.',
        heading: '이 문제 세트는 무엇인가요?',
        body: [
            'SAT Math 에서 이차방정식은 매 회차 빠지지 않고 나오지만, 같은 개념이라도 묻는 방식이 매번 다릅니다. 근을 직접 구해야 하는 문제, 판별식만으로 답이 갈리는 문제, 근을 구하지 않고 합과 곱만으로 끝나는 문제가 섞여 나옵니다.',
            '이 30문항은 그 네 갈래를 유형별로 묶어둔 세트입니다. 공식을 외웠는지가 아니라, 문제를 보고 어떤 도구를 꺼내야 하는지 판단할 수 있는지를 확인합니다. 풀이 시간을 재기 때문에 실전에서 어디서 막히는지도 함께 드러납니다.',
            '제출하면 문항별 정오와 해설을 바로 볼 수 있고, 같은 세트를 푼 다른 학생들의 점수 분포와 비교됩니다.',
        ],
        topics: ['근의 공식', '짝수 계수 공식', '판별식', '비에타의 공식'],
        questionCount: 30,
        audience: 'SAT Math 600~750점대에서 이차방정식 문항을 자주 놓치는 학생',
    },

    'august-math': {
        title: '8월 SAT Math 실전연습 30제 — 소수·분수 정답 유형 | SuperfastSAT',
        description:
            '8월 Digital SAT Math 기출 경향을 반영한 실전연습 30문항. 정답이 소수·분수로 떨어지는 유형만 모아 계산 정확도와 입력 형식 실수를 점검합니다.',
        heading: '이 문제 세트는 무엇인가요?',
        body: [
            'Digital SAT Math 에서 정답이 정수가 아닌 소수나 분수로 떨어지는 문항은 풀이를 맞게 하고도 입력 형식에서 틀리는 경우가 많습니다. 소수점 자리수를 반올림해 버리거나, 대분수로 입력해 오답 처리되는 식입니다.',
            '이 30문항은 정답이 소수·분수인 문제만 모았습니다. 개념을 새로 배우는 세트가 아니라, 알고 있는 것을 정확하게 옮겨 적는 훈련입니다.',
        ],
        topics: ['소수 정답 입력', '분수 정답 입력', '반올림 처리', '계산 정확도'],
        questionCount: 30,
        audience: '풀이는 맞는데 답 입력에서 점수를 잃는 학생',
    },

    'september-math': {
        title: '9월 SAT Math 파이널 연습 | SuperfastSAT',
        description:
            '9월 Digital SAT 직전 점검용 Math 파이널 연습. 시험 직전에 확인해야 할 고빈도 유형을 압축해 실전 타이머와 계산기 환경 그대로 풀어봅니다.',
        heading: '이 문제 세트는 무엇인가요?',
        body: [
            '시험을 며칠 앞둔 시점에는 새로운 개념을 배우기보다, 아는 것을 시험장 조건에서 정확히 꺼낼 수 있는지 확인하는 편이 낫습니다.',
            '이 세트는 9월 Digital SAT 직전 점검용으로 고빈도 유형만 압축했습니다. 실전과 같은 타이머와 계산기 환경에서 풀기 때문에, 남은 기간에 무엇을 손봐야 하는지가 드러납니다.',
        ],
        topics: ['고빈도 유형', '실전 타이머', 'Desmos 계산기', '직전 점검'],
        questionCount: 14,
        audience: '9월 시험을 앞두고 마지막 점검이 필요한 학생',
    },

    'september-rw': {
        title: '9월 SAT Reading & Writing 파이널 연습 | SuperfastSAT',
        description:
            '9월 Digital SAT 직전 점검용 Reading & Writing 파이널 연습. 시험 직전에 확인해야 할 고빈도 유형을 실전 타이머 환경에서 풀어봅니다.',
        heading: '이 문제 세트는 무엇인가요?',
        body: [
            'Reading & Writing 은 지문을 읽는 속도보다, 문제가 무엇을 묻는지 빨리 분류하는 쪽에서 시간이 갈립니다. 직전 점검에서는 그 분류가 흔들리지 않는지를 봐야 합니다.',
            '이 세트는 9월 Digital SAT 직전 점검용으로 고빈도 유형을 압축했습니다. 실전과 같은 타이머에서 풀고, 제출 후 문항별 해설로 어떤 유형에서 시간을 쓰는지 확인할 수 있습니다.',
        ],
        topics: ['고빈도 유형', '실전 타이머', '유형 분류', '직전 점검'],
        questionCount: 14,
        audience: '9월 시험을 앞두고 RW 유형 감각을 점검하려는 학생',
    },

    'sep26-grammar': {
        title: 'SAT 신유형 문법 100제 — FSS · Boundaries | SuperfastSAT',
        description:
            '이전 시험에 등장하지 않은 Digital SAT 신유형 문법 100문항. Form, Structure, and Sense 와 Boundaries 두 영역을 집중적으로 다룹니다.',
        heading: '이 문제 세트는 무엇인가요?',
        body: [
            'Digital SAT 문법은 Form, Structure, and Sense 와 Boundaries 두 축으로 출제됩니다. 기출만 반복해 풀면 익숙한 형태에는 강해지지만, 처음 보는 배치에서 무너지는 경우가 많습니다.',
            '이 100문항은 이전 시험에 등장하지 않은 형태 위주로 구성했습니다. 규칙을 외워서 푸는지, 문장 구조를 보고 판단하는지가 여기서 갈립니다.',
        ],
        topics: ['Form, Structure, and Sense', 'Boundaries', '신유형', '문장 구조 판단'],
        questionCount: 100,
        audience: '기출은 익숙한데 변형 문제에서 흔들리는 학생',
    },

    'november-qb22': {
        title: '11월 SAT 예상 문항 — College Board 문제은행 추가분 | SuperfastSAT',
        description:
            'College Board 문제은행에 새로 추가된 문항을 분석해 구성한 11월 Digital SAT 예상 세트. 최근 추가분에서 반복되는 출제 의도를 확인합니다.',
        heading: '이 문제 세트는 무엇인가요?',
        body: [
            'College Board 가 공개 문제은행에 문항을 추가하면, 그 직후 시험에서 비슷한 출제 의도가 반복되는 경향이 있습니다. 추가분을 먼저 훑어보는 것이 예상 문제를 미리 보는 가장 현실적인 방법입니다.',
            '이 세트는 최근 추가분을 분석해 11월 Digital SAT 에 나올 가능성이 높은 형태로 구성했습니다. 적중을 보장하는 세트가 아니라, 출제 의도의 방향을 미리 맞춰보는 용도입니다.',
        ],
        topics: ['문제은행 추가분', '11월 시험 대비', '출제 의도 분석'],
        questionCount: 56,
        audience: '11월 시험을 앞두고 최신 출제 경향을 확인하려는 학생',
    },

    'june-2026': {
        title: 'SAT 서브스킬 집중 연습 300제 | SuperfastSAT',
        description:
            'Digital SAT 를 서브스킬 단위로 쪼개 구성한 300문항 연습 세트. 영역별 총점이 아니라 어떤 세부 능력에서 점수가 새는지를 찾아냅니다.',
        heading: '이 문제 세트는 무엇인가요?',
        body: [
            '"Math 가 약하다" 는 진단으로는 무엇을 공부해야 할지 정해지지 않습니다. Digital SAT 는 영역 아래에 다시 세부 능력(sub-skill)이 나뉘어 있고, 점수는 보통 그중 두세 개에서 집중적으로 샙니다.',
            '이 300문항은 서브스킬 단위로 묶여 있습니다. 한 세션에 다 풀 필요는 없고, 끝나면 어떤 서브스킬에서 정답률이 떨어지는지 분포로 확인할 수 있습니다.',
        ],
        topics: ['서브스킬 진단', '정답률 분포', '약점 탐색'],
        questionCount: 300,
        audience: '점수가 정체돼 무엇부터 손봐야 할지 모르겠는 학생',
    },
};

export function getPracticeEntry(slug: string): PracticeCatalogEntry | undefined {
    return PRACTICE_CATALOG[slug];
}

export const PRACTICE_SLUGS = Object.keys(PRACTICE_CATALOG);
