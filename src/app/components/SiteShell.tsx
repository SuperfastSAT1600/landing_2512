'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import FloatingCTA from './FloatingCTA';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith('/portal/');

  if (isPortal) return <>{children}</>;

  return (
    <>
      <Header />
      {children}
      <FloatingCTA />
    </>
  );
}
