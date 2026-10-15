import type { Metadata } from 'next';

// /practice/* 는 인스타그램 유입 전용 문제풀이 랜딩이다.
// 문항을 클라이언트에서 불러오기 때문에 Googlebot 에게는 본문이 150자 남짓한 빈 껍데기로 보이고,
// 실제로 "크롤링됨 - 현재 색인이 생성되지 않음" 으로 분류돼 크롤 예산만 쓰고 있었다.
// noindex 는 검색 색인만 막고 직접 방문(인스타 링크)에는 아무 영향이 없다.
// 검색 유입까지 원한다면 noindex 를 걷기 전에 문항을 서버에서 렌더링해야 한다.
export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
    return children;
}
