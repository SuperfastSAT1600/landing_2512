'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import FloatingCTA from './FloatingCTA';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith('/portal/');
  const isCoachPrep = pathname?.startsWith('/coach-prep/');
  const isPartner = pathname?.startsWith('/partner/');
  const isEnrollment = pathname?.startsWith('/enrollment') && !pathname?.startsWith('/enrollment-v2') && !pathname?.startsWith('/enrollment2026');
  const isCoachOnboarding = pathname?.startsWith('/coach-onboarding');
  // 비공개 제안·데모 페이지 — SAT 랜딩 헤더와 상담 CTA가 뜨면 자료의 맥락이 깨진다.
  const isDemo = pathname?.startsWith('/demo/');

  if (isPortal || isCoachPrep || isPartner || isEnrollment || isCoachOnboarding || isDemo) return <>{children}</>;

  return (
    <>
      <Header />
      {children}
      <FloatingCTA />
    </>
  );
}
