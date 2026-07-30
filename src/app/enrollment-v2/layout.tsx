import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SAT 수업권 | SuperfastSAT',
  description: '관리형 SAT 코칭 — 1:1, 그룹, 콘텐츠',
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
