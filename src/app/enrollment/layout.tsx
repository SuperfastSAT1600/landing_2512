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
  title: 'SuperfastSAT — 수업 선택 및 상담 신청',
  description: '관리형 SAT의 기준, SuperfastSAT 수업권. 정규수업과 여름방학 특강을 확인하세요.',
  openGraph: {
    title: 'SuperfastSAT — 수업 선택 및 상담 신청',
    description: '관리형 SAT의 기준, SuperfastSAT 수업권. 정규수업과 여름방학 특강을 확인하세요.',
    images: [{ url: '/enrollment/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SuperfastSAT — 수업 선택 및 상담 신청',
    description: '관리형 SAT의 기준, SuperfastSAT 수업권. 정규수업과 여름방학 특강을 확인하세요.',
    images: ['/enrollment/og-image.png'],
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
