import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: 'SAT목표 점수에 가장 빠르게 | SuperfastSAT',
  description: '올릴 딱 맞는 수업을 받아보세요',
  openGraph: {
    title: 'SAT목표 점수에 가장 빠르게',
    description: '올릴 딱 맞는 수업을 받아보세요',
    url: 'https://tutoring.superfastsat.com/enrollment2026',
    siteName: 'SuperfastSAT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAT목표 점수에 가장 빠르게',
    description: '올릴 딱 맞는 수업을 받아보세요',
  },
  robots: { index: false },
};

function getPageStatus(slug: string): string {
  try {
    const data = JSON.parse(readFileSync(path.join(process.cwd(), 'src/data/enrollment-page-status.json'), 'utf-8'));
    return data[slug] ?? 'active';
  } catch {
    return 'active';
  }
}

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_verified')?.value === '1';
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (getPageStatus('enrollment2026') === 'paused' && !(await isAdmin())) {
    redirect('/');
  }
  return (
    <div style={{ fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
