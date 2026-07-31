import type { HourPackage, ContentItem } from '@/types/enrollment';
import type { GroupPackage, ClassFormatV2Option } from '@/types/enrollment-v2';

// ── 1:1 정규수업 패키지 (v1과 동일) ────────────────────────────────
export const ONE_ON_ONE_PACKAGES_V2: HourPackage[] = [
  { id: '1on1-10h', hours: 10, pricePerHour: 165000, totalPrice: 1650000 },
  { id: '1on1-20h', hours: 20, pricePerHour: 149500, totalPrice: 2990000, discountRate: 9, salesLabel: 'popular' },
  { id: '1on1-40h', hours: 40, pricePerHour: 134750, totalPrice: 5390000, discountRate: 18, salesLabel: 'bestValue' },
];

// ── 1:4 그룹수업 패키지 ─────────────────────────────────────────────
export const GROUP_PACKAGES_V2: GroupPackage[] = [
  {
    id: 'group-summer',
    name: '여름특강',
    subtitle: '여름방학 집중 과정',
    totalPrice: 990000,
    durationLabel: '4주 · 주 5일',
    salesLabel: 'popular',
  },
  {
    id: 'group-chuseok',
    name: '추석특강',
    subtitle: '연휴 집중 과정',
    totalPrice: 490000,
    durationLabel: '2주 · 주 5일',
    salesLabel: 'new',
  },
  {
    id: 'group-theme',
    name: '테마특강',
    subtitle: '단기 집중 테마 과정',
    totalPrice: 240000,
    durationLabel: '3일 · 6시간 코스',
    salesLabel: 'new',
  },
];

// ── 비관리형 패키지 (v1과 동일) ─────────────────────────────────────
export const UNMANAGED_PACKAGES_V2: HourPackage[] = [
  { id: 'unmanaged-10h', hours: 10, pricePerHour: 100000, totalPrice: 1000000 },
  { id: 'unmanaged-20h', hours: 20, pricePerHour: 90000, totalPrice: 1800000, discountRate: 10, salesLabel: 'popular' },
  { id: 'unmanaged-40h', hours: 40, pricePerHour: 80000, totalPrice: 3200000, discountRate: 20, salesLabel: 'bestValue' },
];

// ── 콘텐츠 아이템 (단어·인강·문제풀이만) ──────────────────────────
export const CONTENT_ITEMS_V2: ContentItem[] = [
  { id: 'content-vocab',    name: '단어',    monthlyPrice: 50000,  description: 'SAT 필수 어휘 학습' },
  { id: 'content-lecture',  name: '인강',    monthlyPrice: 249000, description: '전 범위 동영상 강의' },
  { id: 'content-problems', name: '문제풀이', monthlyPrice: 149000, description: '유형별 기출문제 풀이' },
];

// ── 수업 형태 옵션 (관리형) ─────────────────────────────────────────
export const CLASS_FORMATS_V2: ClassFormatV2Option[] = [
  {
    id: 'one-on-one',
    name: '1:1 정규수업',
    description: '전담 코치와 1:1 맞춤 수업\n전체 관리 서비스 포함',
    icon: 'UserCheck',
    recommended: true,
  },
  {
    id: 'group',
    name: '1:4 그룹수업',
    description: '소그룹 집중 특강\n여름·추석방학 과정',
    icon: 'Users',
  },
  {
    id: 'content',
    name: '콘텐츠',
    description: '단어·인강·문제풀이\n월간 구독 콘텐츠',
    icon: 'MonitorPlay',
  },
];

export const SALES_LABELS_V2: Record<string, { text: string; color: string }> = {
  popular:  { text: '가장 인기', color: 'primary' },
  bestValue: { text: '최대 할인', color: 'primary' },
  new:      { text: 'NEW',      color: 'neutral' },
};
