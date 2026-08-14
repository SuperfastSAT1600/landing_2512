import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '상담 및 학습 기록 | SuperfastSAT',
  description: 'SuperfastSAT 학부모 전용 상담 포털',
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
