// 수업권 페이지 판매 구성 — v2(/enrollment2026)와 V3(/enrollment-v3)는 화면은 같고 파는 상품만 다르다.

/** 대표코치 정가(시간당). 할인액은 이 정가 대비로 계산한다. */
export const DIRECTOR_PRICE_PER_HOUR = 210000;

export interface ManagedPkg {
  id: string;
  hours: number;
  totalPrice: number;
  pricePerHour: number;
  discountRate: number | null;
}

export interface DirectorPkg {
  id: string;
  hours: number;
  totalPrice: number;
}

export interface EnrollmentVariant {
  /** 1:1 관리형 시간권. 할인 문구는 basePricePerHour 대비로 계산한다. */
  managedPkgs: ManagedPkg[];
  basePricePerHour: number;
  /** 대표코치 1:1 시간권. */
  directorPkgs: DirectorPkg[];
  /** false면 관리형만 판매 — 관리형/자기주도 선택 단계와 비관리형·콘텐츠를 숨긴다. */
  selfDirected: boolean;
}

/** 대표코치 시간권의 정가 대비 할인액(원). 정가 그대로면 0. */
export function directorSavings(pkg: DirectorPkg): number {
  return Math.max(0, pkg.hours * DIRECTOR_PRICE_PER_HOUR - pkg.totalPrice);
}

export const ENROLLMENT_V2: EnrollmentVariant = {
  basePricePerHour: 165000,
  managedPkgs: [
    { id: '1on1-10h', hours: 10, totalPrice: 1650000, pricePerHour: 165000, discountRate: null },
    { id: '1on1-20h', hours: 20, totalPrice: 2990000, pricePerHour: 149500, discountRate: 9 },
    { id: '1on1-40h', hours: 40, totalPrice: 5390000, pricePerHour: 134750, discountRate: 18 },
  ],
  // 대표코치 수업권 — 할인 없는 정액, 10시간권만 판매
  directorPkgs: [{ id: '1on1-director-10h', hours: 10, totalPrice: 2100000 }],
  selfDirected: true,
};

// V3(2026-10): 비관리형·콘텐츠 판매 중단, 관리형은 10시간권만, 대표코치 20·40시간권 할인 판매.
export const ENROLLMENT_V3: EnrollmentVariant = {
  basePricePerHour: 165000,
  managedPkgs: [
    { id: '1on1-10h', hours: 10, totalPrice: 1650000, pricePerHour: 165000, discountRate: null },
  ],
  directorPkgs: [
    { id: '1on1-director-10h', hours: 10, totalPrice: 2100000 },
    { id: '1on1-director-20h', hours: 20, totalPrice: 3800000 },
    { id: '1on1-director-40h', hours: 40, totalPrice: 6860000 },
  ],
  selfDirected: false,
};
