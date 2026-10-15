import type { Metadata } from 'next';

// 내부 안내 페이지.
// 색인만 막고 링크는 따라가게 둔다(follow).
export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
    return children;
}
