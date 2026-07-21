'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import FloatingCTA from './FloatingCTA';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith('/portal/');
  const isCoachPrep = pathname?.startsWith('/coach-prep/');
  const isPartner = pathname?.startsWith('/partner/');
  const isEnrollment = pathname?.startsWith('/enrollment');
  const isCoachOnboarding = pathname?.startsWith('/coach-onboarding');

  if (isPortal || isCoachPrep || isPartner || isEnrollment || isCoachOnboarding) return <>{children}</>;

  return (
    <>
      <Header />
      {children}
      <FloatingCTA />
    </>
  );
}
