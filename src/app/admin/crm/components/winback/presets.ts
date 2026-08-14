/**
 * 플레이 브리프 프리셋 — 실제 판매 상품(pricing.ts)에서 출발하게 한다.
 * 상품 마스터 DB를 만들지 않기로 했으므로, 여기 값은 "빠른 시작용 문구"일 뿐 정본이 아니다.
 */
import { AP_PACKAGES, HOUR_PACKAGES } from '@/lib/enrollment/data/pricing';

export const PRODUCT_CATEGORY_OPTIONS = [
  'SAT 정규 1:1 수업',
  'SAT 정규 1:2 수업',
  'SAT 정규 그룹 수업',
  'AP 정규 1:1 수업',
  'AP 정규 1:2 수업',
  '관리형 콘텐츠',
  'SAT 체험 1:1 수업',
  'SAT 체험 1:2 수업',
] as const;

const apLite = AP_PACKAGES.find((p) => p.id === 'ap-lite');
const satHour = HOUR_PACKAGES['one-on-one']?.[0];

export interface BriefPreset {
  title: string;
  draft: {
    title: string;
    product_brief: string;
    product_category: string;
    product_price: string;
    product_hours: string;
    target_exam_date: string;
    audience_hint: string;
    conversion_window_days: string;
    contact_cooldown_days: string;
  };
}

const BASE = {
  target_exam_date: '',
  conversion_window_days: '45',
  contact_cooldown_days: '30',
};

export const BRIEF_PRESETS: BriefPreset[] = [
  {
    title: `AP 단기 패키지 (${apLite?.hours ?? 16}시간)`,
    draft: {
      ...BASE,
      title: 'AP 단기 패키지 윈백',
      product_brief: `AP 1과목 ${apLite?.hours ?? 16}시간권(Lite), 9~11학년 대상, AP 시험 대비 단기 집중. ${
        apLite ? Math.round(apLite.price / 10000) : 144
      }만원.`,
      product_category: 'AP 정규 1:1 수업',
      product_price: String(apLite?.price ?? 1440000),
      product_hours: String(apLite?.hours ?? 16),
      audience_hint: 'AP 문의 이력이 있거나 AP/IB 학제 리드',
    },
  },
  {
    title: `SAT 1:1 시간권 (${satHour?.hours ?? 10}시간)`,
    draft: {
      ...BASE,
      title: 'SAT 1:1 시간권 윈백',
      product_brief: `SAT 1:1 ${satHour?.hours ?? 10}시간권, 10~12학년 대상, 다음 SAT 시험 대비. 시간당 ${(
        satHour?.pricePerHour ?? 165000
      ).toLocaleString()}원.`,
      product_category: 'SAT 정규 1:1 수업',
      product_price: String(satHour?.totalPrice ?? 1650000),
      product_hours: String(satHour?.hours ?? 10),
      audience_hint: '진단 점수가 있고 목표 점수와 격차가 큰 리드',
    },
  },
  {
    title: 'SAT 체험 수업',
    draft: {
      ...BASE,
      title: 'SAT 체험 수업 윈백',
      product_brief:
        'SAT 체험 1:1 수업(1회), 상담만 받고 결제까지 오지 않은 리드에게 부담 없이 수업을 경험시키는 오퍼.',
      product_category: 'SAT 체험 1:1 수업',
      product_price: '',
      product_hours: '1',
      audience_hint: '세일즈 콜까지 진행했으나 미결제로 이탈한 리드',
      conversion_window_days: '30',
    },
  },
];
