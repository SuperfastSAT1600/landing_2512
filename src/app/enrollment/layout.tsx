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
  title: 'SuperfastSAT',
  description: '수업권 및 시스템',
  openGraph: {
    title: 'SuperfastSAT',
    description: '수업권 및 시스템',
    images: [{ url: '/enrollment/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SuperfastSAT',
    description: '수업권 및 시스템',
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
