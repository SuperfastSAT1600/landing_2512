export type CourseType = 'sat' | 'ap';

export type ProgramType = 'regular' | 'summer-intensive';

export interface APPackage {
  id: string;
  name: string;
  price: number;
  discountRate?: number;
  subjects: number;
  hours: number;
  salesLabel?: 'entry' | 'popular' | 'bestValue';
}


export interface ProgramTypeOption {
  id: ProgramType;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  recommended?: boolean;
  badge?: string;
  disabled?: boolean;
}

export interface SummerScheduleCell {
  text: string;
  color?: 'accent' | 'red';
  rowSpan?: number;
  colSpan?: number;
}

export interface SummerScheduleRow {
  time: string;
  cells: (SummerScheduleCell | null)[];
  isBreak?: boolean;
}

export interface SummerIntensiveInfo {
  startDate: string;
  philosophy: { title: string; description: string; icon: string }[];
  weeklyStructure: { days: string; focus: string; description: string }[];
  schedule: {
    days: string[];
    dayGroups: { label: string; span: number }[];
    rows: SummerScheduleRow[];
  };
  timezoneNotice: string;
}

export type CategoryId = 'one-on-one' | 'content' | 'unmanaged';

export type HourPackageCategoryId = Extract<CategoryId, 'one-on-one' | 'unmanaged'>;

export type ManagementType = 'managed' | 'unmanaged';

export type ClassFormat = 'one-on-one' | 'content';

export interface Category {
  id: CategoryId;
  name: string;
  subtitle: string;
  description: string;
  managementLevel: string;
  icon: string;
  recommended?: boolean;
}

export interface HourPackage {
  id: string;
  hours: number;
  pricePerHour: number;
  totalPrice: number;
  discountRate?: number;
  salesLabel?: 'popular' | 'bestValue';
  /** 대표 코치 프리미엄 상품 여부 — 그리드 아래 전용 카드로 렌더 */
  premium?: boolean;
}

export interface ContentItem {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
}

export interface ManagementService {
  key: string;
  name: string;
  included: boolean;
  /** 있으면 서비스 항목이 해당 URL로 이동하는 링크로 렌더된다 (예: 학습 리포트) */
  link?: string;
}

export type OptionSelection =
  | { type: 'hour-package'; packageId: string }
  | { type: 'content'; contentIds: string[] };

export interface ManagementTypeOption {
  id: ManagementType;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  recommended?: boolean;
  socialProof?: string;
  serviceHighlight?: string;
}

export interface ClassFormatOption {
  id: ClassFormat;
  name: string;
  description: string;
  icon: string;
  recommended?: boolean;
}
