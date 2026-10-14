import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SAT목표 점수에 가장 빠르게 | SuperfastSAT',
  description: '맞춤형 수업으로 목표 점수에 도달하세요.',
  openGraph: {
    title: 'SAT목표 점수에 가장 빠르게',
    description: '맞춤형 수업으로 목표 점수에 도달하세요.',
    url: 'https://tutoring.superfastsat.com/enrollment2026',
    siteName: 'SuperfastSAT',
    type: 'website',
    images: [{ url: 'https://tutoring.superfastsat.com/og-enrollment2026.png', alt: '수업권 | SuperfastSAT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAT목표 점수에 가장 빠르게',
    description: '맞춤형 수업으로 목표 점수에 도달하세요.',
    images: ['https://tutoring.superfastsat.com/og-enrollment2026.png'],
  },
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
