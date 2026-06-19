export const DISCOUNT_PERCENT = 30;
export const LAUNCH_DATE = '2026-06-27';

export interface Plan {
    id: 'live' | 'flex' | 'review';
    name: string;
    tagline: string;
    price: number;
    deadline: string;
    features: {
        camera: boolean;
        vocab: boolean;
        analysis: boolean;
        lecture: string | false;
    };
    checkoutUrl: string;
    highlighted: boolean;
}

export interface TestDate {
    date: string;
    label: string;
}

export function getDiscountedPrice(price: number, percent: number): number {
    return Math.round(price * (1 - percent / 100));
}

export function formatKRW(amount: number): string {
    return amount.toLocaleString('ko-KR') + '원';
}

export const PLANS: Plan[] = [
    {
        id: 'live',
        name: 'Live',
        tagline: '완벽한 실전 긴장감',
        price: 70000,
        deadline: '시험 당일 오전 11시 30분',
        features: {
            camera: true,
            vocab: true,
            analysis: true,
            lecture: '안내된 리뷰 시간 1시간 접속',
        },
        checkoutUrl: '#',
        highlighted: false,
    },
    {
        id: 'flex',
        name: 'Flex',
        tagline: '유연한 일정 + 성적 분석',
        price: 40000,
        deadline: '시험 종료 후 48시간',
        features: {
            camera: false,
            vocab: true,
            analysis: true,
            lecture: '30일 내 자유롭게 시청',
        },
        checkoutUrl: '#',
        highlighted: false,
    },
    {
        id: 'review',
        name: 'Review',
        tagline: '오답 정리 및 해설 집중',
        price: 20000,
        deadline: '시험 종료 후 30일',
        features: {
            camera: false,
            vocab: false,
            analysis: false,
            lecture: '30일 내 자유롭게 시청',
        },
        checkoutUrl: '#',
        highlighted: false,
    },
];

// 2026년 격주 일정 (5/30 시작)
function generateSchedule(startDate: string, count: number): TestDate[] {
    const dates: TestDate[] = [];
    const start = new Date(startDate);
    for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * 14);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const weekday = weekdays[d.getDay()];
        dates.push({
            date: `2026-${mm}-${dd}`,
            label: `${i + 1}회차 — 2026년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`,
        });
    }
    return dates;
}

export const TEST_SCHEDULE: TestDate[] = generateSchedule('2026-06-27', 10);

export interface TestDatePricing {
    date: string;
    round: number;
    month: number;
    day: number;
    weekday: string;
    discountPercent: number;
    checkoutUrls: Record<'live' | 'flex' | 'review', string>;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CHECKOUT_URLS = {
    regular: {
        live:   'https://s.tosspayments.com/BnkGZpDgu7t',
        flex:   'https://s.tosspayments.com/BnkGZ-v4fxT',
        review: 'https://s.tosspayments.com/BnkGaajAy8D',
    },
    discount: {
        live:   'https://s.tosspayments.com/BnkGZvfwDjo',
        flex:   'https://s.tosspayments.com/BnkGaQCAw3b',
        review: 'https://s.tosspayments.com/BnkGaiEQZcf',
    },
};

export const UPCOMING_TESTS: TestDatePricing[] = TEST_SCHEDULE
    .filter(t => new Date(t.date) <= new Date('2026-08-31'))
    .map((t, i) => {
        const d = new Date(t.date);
        const isDiscount = i === 0;
        return {
            date: t.date,
            round: i + 1,
            month: d.getMonth() + 1,
            day: d.getDate(),
            weekday: WEEKDAYS[d.getDay()],
            discountPercent: isDiscount ? DISCOUNT_PERCENT : 0,
            checkoutUrls: isDiscount ? CHECKOUT_URLS.discount : CHECKOUT_URLS.regular,
        };
    });

// 한국 KST 09:00 기준 타임존별 시험 시작 시간 (고정 문자열)
export const TIMEZONE_TIMES = [
    { region: '한국 (KST)', time: '오전 09:00' },
    { region: '미국 동부 (EST)', time: '오후 08:00 (전날)' },
    { region: '미국 서부 (PST)', time: '오후 05:00 (전날)' },
    { region: '베트남 (ICT)', time: '오전 07:00' },
];
