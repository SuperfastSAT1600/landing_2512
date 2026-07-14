import type {
  Category,
  CategoryId,
  HourPackageCategoryId,
  HourPackage,
  ContentItem,
  ManagementService,
  ManagementType,
  ClassFormat,
  ProgramTypeOption,
  ManagementTypeOption,
  ClassFormatOption,
  OptionSelection,
  SummerIntensiveInfo,
  APPackage,
} from '@/types/enrollment';

export const AP_PACKAGES: APPackage[] = [
  { id: 'ap-lite', name: 'Lite', price: 1440000, subjects: 1, hours: 16, salesLabel: 'entry' },
  { id: 'ap-standard', name: 'Standard', price: 2720000, discountRate: 6, subjects: 2, hours: 32, salesLabel: 'popular' },
  { id: 'ap-booster', name: 'Booster', price: 3840000, discountRate: 12, subjects: 2, hours: 48, salesLabel: 'bestValue' },
];

export const AP_SUBJECTS = [
  'Biology',
  'Calculus AB / BC',
  'Chemistry',
  'Computer Science A',
  'English Language',
  'Macro / Micro Economics',
  'Physics 1',
  'Precalculus',
  'Psychology',
  'Statistics',
  'Comparative Government and Politics',
  'US Government and Politics',
  'US History',
  'World History',
] as const;

export const PROGRAM_TYPES: ProgramTypeOption[] = [
  {
    id: 'regular',
    name: '정규수업',
    subtitle: '체계적 학습 관리',
    description: '전담 코치와 매니저가 함께하는 체계적인 SAT 학습 프로그램',
    icon: 'GraduationCap',
    recommended: true,
  },
  {
    id: 'summer-intensive',
    name: '여름방학 특강',
    subtitle: '집중 단기 과정',
    description: '여름방학 기간 집중적으로 실력을 끌어올리는 특별 프로그램',
    icon: 'Sun',
  },
];

export const SUMMER_INTENSIVE_DATA: SummerIntensiveInfo = {
  startDate: '7월 20일',
  philosophy: [
    {
      title: '개념 우선',
      description: '문제풀이보다 개념 이해가 먼저입니다. 탄탄한 기초 위에 실전 감각을 쌓습니다.',
      icon: 'BookOpen',
    },
    {
      title: '반복과 체화',
      description: '같은 유형을 다양한 각도로 반복합니다. 패턴이 체화될 때까지 연습합니다.',
      icon: 'RefreshCw',
    },
    {
      title: '실전 적용',
      description: '배운 개념을 실전 문제에 바로 적용합니다. 시험장에서 쓸 수 있는 실력을 만듭니다.',
      icon: 'Target',
    },
  ],
  weeklyStructure: [
    {
      days: '월 ~ 수',
      focus: '개념 수업',
      description: '핵심 개념 정리와 유형별 접근법을 학습합니다.',
    },
    {
      days: '목 ~ 금',
      focus: '문제풀이',
      description: '배운 개념을 실전 문제에 적용하고, 오답을 분석합니다.',
    },
  ],
  schedule: {
    days: ['월', '화', '수', '목', '금'],
    dayGroups: [
      { label: '개념 집중 학습', span: 3 },
      { label: '문제 풀이 집중 학습', span: 2 },
    ],
    rows: [
      {
        time: '09:00~10:00',
        cells: [{ text: 'Vocab', color: 'accent', colSpan: 5 }],
      },
      {
        time: '10:00~10:35',
        cells: [
          { text: 'RW 라이브 강의', color: 'accent', colSpan: 3, rowSpan: 3 },
          { text: 'RW Module1\nTEST', color: 'accent' },
          { text: 'Math Module 1\nTEST', color: 'red' },
        ],
      },
      {
        time: '10:45~11:20',
        cells: [
          null,
          { text: 'RW Module 2\nTEST', color: 'accent' },
          { text: 'Math Module 2\nTEST', color: 'red' },
        ],
      },
      {
        time: '11:30~12:00',
        cells: [
          null,
          { text: '라이브\n개념 및 해설 강의', color: 'accent' },
          { text: '라이브\n개념 및 해설 강의', color: 'red' },
        ],
      },
      {
        time: '12:00~13:00',
        cells: [{ text: '휴식', colSpan: 5 }],
        isBreak: true,
      },
      {
        time: '13:00~15:00',
        cells: [
          { text: '맞춤형 학습\n(Live Text Tutoring)', color: 'accent', colSpan: 3 },
          { text: '라이브\n개념 및 해설 강의', color: 'accent' },
          { text: '라이브\n개념 및 해설 강의', color: 'red' },
        ],
      },
      {
        time: '15:00~16:00',
        cells: [{ text: 'Vocab TEST\n복습 문제 정리', colSpan: 5 }],
      },
    ],
  },
  timezoneNotice: '한국시간(KST) 기준입니다.',
};

export const MANAGEMENT_TYPES: ManagementTypeOption[] = [
  {
    id: 'managed',
    name: '관리형',
    subtitle: '전담 매니저 배정',
    description: '전담 매니저가 학습 전반을 관리하고 성적 향상을 이끕니다',
    icon: 'ShieldCheck',
    recommended: true,
    socialProof: '학생 90% 이상 선택',
    serviceHighlight: '6개 관리 서비스 포함',
  },
  {
    id: 'unmanaged',
    name: '비관리형',
    subtitle: '수업 + 학습 리포트만',
    description: '수업과 학습 리포트만 제공되는 합리적인 옵션',
    icon: 'BookOpen',
    serviceHighlight: '학습 리포트만 제공',
  },
];

export const CLASS_FORMATS: ClassFormatOption[] = [
  {
    id: 'one-on-one',
    name: '1:1 수업',
    description: '전담 코치와 1:1 맞춤 수업 + 전체 관리 서비스',
    icon: 'UserCheck',
    recommended: true,
  },
  {
    id: 'content',
    name: '콘텐츠',
    description: '인강, 단어, 문제풀이 등 월간 구독 콘텐츠',
    icon: 'MonitorPlay',
  },
];

const FORMAT_EXTRAS: Record<ClassFormat, { subtitle: string; managementLevel: string }> = {
  'one-on-one': { subtitle: '풀 관리', managementLevel: '풀 관리' },
  'content': { subtitle: '부분 관리', managementLevel: '부분 관리' },
};

export const CATEGORIES: Category[] = [
  ...CLASS_FORMATS.map((cf) => ({
    ...cf,
    ...FORMAT_EXTRAS[cf.id],
  })),
  {
    id: 'unmanaged' as CategoryId,
    name: '비관리',
    subtitle: '학습 리포트만',
    description: '수업 후 학습 리포트만 제공되는 합리적 옵션',
    managementLevel: '학습 리포트만',
    icon: 'BookOpen',
  },
];

export const HOUR_PACKAGES: Record<HourPackageCategoryId, HourPackage[]> = {
  'one-on-one': [
    { id: '1on1-10h', hours: 10, pricePerHour: 165000, totalPrice: 1650000 },
    { id: '1on1-20h', hours: 20, pricePerHour: 149500, totalPrice: 2990000, discountRate: 9, salesLabel: 'popular' },
    { id: '1on1-40h', hours: 40, pricePerHour: 134750, totalPrice: 5390000, discountRate: 18, salesLabel: 'bestValue' },
    { id: '1on1-premium-10h', hours: 10, pricePerHour: 180000, totalPrice: 1800000, premium: true },
  ],
  unmanaged: [
    { id: 'unmanaged-10h', hours: 10, pricePerHour: 100000, totalPrice: 1000000 },
    { id: 'unmanaged-20h', hours: 20, pricePerHour: 90000, totalPrice: 1800000, discountRate: 10, salesLabel: 'popular' },
    { id: 'unmanaged-40h', hours: 40, pricePerHour: 80000, totalPrice: 3200000, discountRate: 20, salesLabel: 'bestValue' },
  ],
};

export const CONTENT_ITEMS: ContentItem[] = [
  { id: 'content-lecture', name: '인강', monthlyPrice: 249000, description: '전 범위 동영상 강의' },
  { id: 'content-vocab', name: '단어', monthlyPrice: 50000, description: 'SAT 필수 어휘 학습' },
  { id: 'content-problems', name: '문제', monthlyPrice: 149000, description: '유형별 기출문제 풀이' },
  { id: 'content-mock', name: '모의고사', monthlyPrice: 60000, description: '실전 모의시험 응시' },
  { id: 'content-qna', name: '실시간 Q&A', monthlyPrice: 200000, description: '실시간 질의응답 지원' },
];

/** 학습 리포트 샘플 링크 — 서비스 항목 클릭 시 이동 */
export const GROWTH_REPORT_URL = 'https://www.superfastsat.io/report/712234';

const FULL_MANAGEMENT_SERVICES: ManagementService[] = [
  { key: 'lessonFeedback', name: '학습 리포트', included: true, link: GROWTH_REPORT_URL },
  { key: 'pastExams', name: '기출문제 제공', included: true },
  { key: 'dailyVocab', name: '데일리 Vocab', included: true },
  { key: 'wrongAnswerNote', name: 'Study Hall', included: true },
  { key: 'homeworkSchedule', name: '숙제 일정 관리', included: true },
  { key: 'biweeklyMock', name: '매주 실전 모의고사', included: true },
];

export const MANAGEMENT_SERVICES: Record<CategoryId, ManagementService[]> = {
  'one-on-one': FULL_MANAGEMENT_SERVICES,
  content: [
    { key: 'learningFeedback', name: '학습 결과 피드백', included: true },
    { key: 'wrongAnswerNote', name: 'Study Hall', included: true },
    { key: 'homeworkSchedule', name: '숙제 일정 관리', included: true },
    { key: 'lessonFeedback', name: '학습 리포트', included: false },
    { key: 'biweeklyMock', name: '매주 실전 모의고사', included: false },
  ],
  unmanaged: [
    { key: 'lessonFeedback', name: '학습 리포트', included: true, link: GROWTH_REPORT_URL },
    { key: 'lectures', name: '인강', included: false },
    { key: 'vocabLearning', name: '단어 학습', included: false },
    { key: 'wrongAnswerNote', name: 'Study Hall', included: false },
    { key: 'homeworkSchedule', name: '숙제 일정 관리', included: false },
    { key: 'biweeklyMock', name: '매주 실전 모의고사', included: false },
  ],
};

// AP Custom Hour Pricing
export const AP_BASE_PRICE_PER_HOUR = 90000;

export const AP_PRICE_TIERS = [
  { minHours: 1, maxHours: 16, pricePerHour: 90000, discountRate: 0 },
  { minHours: 17, maxHours: 32, pricePerHour: 85000, discountRate: 6 },
  { minHours: 33, maxHours: 48, pricePerHour: 80000, discountRate: 12 },
  { minHours: 49, maxHours: 60, pricePerHour: 75000, discountRate: 17 },
] as const;

export function getAPCustomPrice(hours: number) {
  const clamped = Math.max(1, Math.min(60, Math.round(hours)));
  const tier = AP_PRICE_TIERS.find((t) => clamped >= t.minHours && clamped <= t.maxHours)!;
  const baseTotal = clamped * AP_BASE_PRICE_PER_HOUR;
  const totalPrice = clamped * tier.pricePerHour;
  return {
    hours: clamped,
    pricePerHour: tier.pricePerHour,
    discountRate: tier.discountRate,
    baseTotal,
    totalPrice,
    discountAmount: baseTotal - totalPrice,
  };
}

export function resolveCategoryId(
  managementType: ManagementType,
  classFormat: ClassFormat | null
): CategoryId | null {
  if (managementType === 'unmanaged') return 'unmanaged';
  return classFormat ?? null;
}

export function isHourPackageCategory(id: CategoryId): id is HourPackageCategoryId {
  return id === 'one-on-one' || id === 'unmanaged';
}

export function getBasePrice(categoryId: CategoryId): number {
  if (!isHourPackageCategory(categoryId)) return 0;
  return HOUR_PACKAGES[categoryId][0].pricePerHour;
}

export function getSavingsAmount(pkg: HourPackage, basePrice: number): number {
  return (basePrice * pkg.hours) - pkg.totalPrice;
}

export const SALES_LABELS: Record<string, { textKey: string; variant: 'warning' | 'success' }> = {
  popular: { textKey: 'salesLabels.popular', variant: 'warning' },
  bestValue: { textKey: 'salesLabels.bestValue', variant: 'success' },
};

type TFn = (key: string, params?: Record<string, string | number>) => string;

export function getSelectedOptionSummary(
  categoryId: CategoryId,
  option: OptionSelection,
  t?: TFn
): string {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return '';

  const categoryName = t ? t(`classFormat.${categoryId}.name`) || t(`category.${categoryId}.name`) || category.name : category.name;

  if (option.type === 'hour-package') {
    if (!isHourPackageCategory(categoryId)) return '';
    const pkg = HOUR_PACKAGES[categoryId].find((p) => p.id === option.packageId);
    if (!pkg) return '';
    if (pkg.premium) {
      return t ? t('summary.summaryPremiumPackage') : '대표 코치와의 수업권';
    }
    return t
      ? t('summary.summaryHourPackage', { category: categoryName, hours: pkg.hours })
      : `${category.name} ${pkg.hours}시간`;
  }

  if (option.type === 'content') {
    if (option.contentIds.length === 0) return '';
    const names = option.contentIds
      .map((id) => {
        const item = CONTENT_ITEMS.find((c) => c.id === id);
        return item ? (t ? t(`contentItems.${item.id}.name`) : item.name) : null;
      })
      .filter(Boolean);
    return t
      ? t('summary.summaryContent', { names: names.join(', ') })
      : `콘텐츠 - ${names.join(', ')}`;
  }

  return '';
}

export function getSelectedTotalPrice(
  categoryId: CategoryId,
  option: OptionSelection
): number {
  if (option.type === 'hour-package') {
    if (!isHourPackageCategory(categoryId)) return 0;
    const pkg = HOUR_PACKAGES[categoryId].find((p) => p.id === option.packageId);
    return pkg?.totalPrice ?? 0;
  }

  if (option.type === 'content') {
    return option.contentIds.reduce((sum, id) => {
      const item = CONTENT_ITEMS.find((c) => c.id === id);
      return sum + (item?.monthlyPrice ?? 0);
    }, 0);
  }

  return 0;
}
