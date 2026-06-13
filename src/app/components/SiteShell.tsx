'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import FloatingCTA from './FloatingCTA';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith('/portal/');
  const isCoachPrep = pathname?.startsWith('/coach-prep/');

  if (isPortal || isCoachPrep) return <>{children}</>;

  return (
    <>
      <Header />
      {children}
      <FloatingCTA />
    </>
  );
}
