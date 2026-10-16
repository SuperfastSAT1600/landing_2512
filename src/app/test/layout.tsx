import type { Metadata } from 'next';

// 전체 모의고사 진입 화면. 응시자가 링크로 들어오는 페이지라 검색 노출 대상이 아니다.
// 색인만 막고 링크는 따라가게 둔다(follow).
export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
    return children;
}
