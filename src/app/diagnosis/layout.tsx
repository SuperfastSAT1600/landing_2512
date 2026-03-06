'use client';

import { usePathname } from 'next/navigation';
import FloatingCTA from '../components/FloatingCTA';

export default function DiagnosisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTestActive = pathname === '/diagnosis/test';

  return (
    <>
      {children}
      {/* Hide FloatingCTA during active test */}
      {!isTestActive && <FloatingCTA />}
    </>
  );
}
