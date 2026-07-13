import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { LanguageProvider } from '@/lib/enrollment/i18n/LanguageContext';
import './enrollment.css';

// class-enrollment 원본이 사용하던 Outfit 폰트 — enrollment 라우트에만 주입(전역 미영향)
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SAT 목표 점수에 가장 빠르게 | SuperfastSAT',
  description: '맞춤형 수업 시스템 수업권 소개',
  openGraph: {
    title: 'SAT 목표 점수에 가장 빠르게 | SuperfastSAT',
    description: '맞춤형 수업 시스템 수업권 소개',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAT 목표 점수에 가장 빠르게 | SuperfastSAT',
    description: '맞춤형 수업 시스템 수업권 소개',
    images: ['/og-image.png'],
  },
};

export default function EnrollmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`enrollment-root font-sans antialiased ${outfit.variable}`}>
      <LanguageProvider>{children}</LanguageProvider>
    </div>
  );
}
