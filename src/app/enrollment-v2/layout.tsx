import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: 'SAT 수업권 | SuperfastSAT',
  description: '관리형 SAT 코칭 — 1:1, 그룹, 콘텐츠',
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
  if (getPageStatus('enrollment-v2') === 'paused' && !(await isAdmin())) {
    redirect('/');
  }
  return (
    <div style={{ fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
