import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
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

export default function Layout({ children }: { children: React.ReactNode }) {
  if (getPageStatus('enrollment-v2') === 'paused') {
    redirect('/');
  }
  return (
    <div style={{ fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
