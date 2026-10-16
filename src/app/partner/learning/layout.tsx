import type { Metadata } from 'next';

// 파트너용 학습 현황 리포트.
// 색인만 막고 링크는 따라가게 둔다(follow).
export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
    return children;
}
