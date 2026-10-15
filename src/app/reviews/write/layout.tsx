import type { Metadata } from 'next';

// 후기 작성 폼. 내용이 없는 입력 화면이라 색인 가치가 없다.
// 색인만 막고 링크는 따라가게 둔다(follow).
export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
    return children;
}
