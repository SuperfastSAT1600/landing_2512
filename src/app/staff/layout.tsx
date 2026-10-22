import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// 직원 전용 — 검색·AI 수집 대상이 아니다
export const metadata: Metadata = {
  title: '직원용 일일 브리핑',
  robots: { index: false, follow: false, nocache: true },
};

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-gray-50 text-gray-900">{children}</div>;
}
