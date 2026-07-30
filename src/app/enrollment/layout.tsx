import type { Metadata } from 'next';
import { LanguageProvider } from '@/lib/enrollment/i18n/LanguageContext';
import { redirect } from 'next/navigation';
import { readFileSync } from 'fs';
import path from 'path';
import './enrollment.css';

function getPageStatus(slug: string): string {
  try {
    const data = JSON.parse(readFileSync(path.join(process.cwd(), 'src/data/enrollment-page-status.json'), 'utf-8'));
    return data[slug] ?? 'active';
  } catch {
    return 'active';
  }
}

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
  if (getPageStatus('enrollment') === 'paused') {
    redirect('/');
  }
  return (
    <div className="enrollment-root font-sans antialiased">
      <LanguageProvider>{children}</LanguageProvider>
    </div>
  );
}
