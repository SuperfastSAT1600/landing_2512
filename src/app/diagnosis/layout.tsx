import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SAT 목표 점수에 가장 빠르게 | SuperfastSAT',
  description: '30분 진단테스트로 현재 실력을 확인하세요',
  openGraph: {
    title: 'SAT 목표 점수에 가장 빠르게 | SuperfastSAT',
    description: '30분 진단테스트로 현재 실력을 확인하세요',
    url: 'https://tutoring.superfastsat.com/diagnosis',
    siteName: 'SuperfastSAT',
    type: 'website',
    images: [{ url: 'https://tutoring.superfastsat.com/og-diagnosis.png', alt: '진단테스트 | SuperfastSAT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAT 목표 점수에 가장 빠르게 | SuperfastSAT',
    description: '30분 진단테스트로 현재 실력을 확인하세요',
    images: ['https://tutoring.superfastsat.com/og-diagnosis.png'],
  },
};

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
