import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Math Web | SuperfastSAT',
  description: '공부한 개념이 쓰이는 SAT문제를 확인하세요',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Math Web',
    description: '공부한 개념이 쓰이는 SAT문제를 확인하세요',
    url: 'https://tutoring.superfastsat.com/mathweb',
    siteName: 'SuperfastSAT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Math Web',
    description: '공부한 개념이 쓰이는 SAT문제를 확인하세요',
  },
};

export default function MathWebLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
