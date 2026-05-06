'use client';

import FloatingCTA from '../components/FloatingCTA';

export default function DiagnosisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hide FloatingCTA on entire diagnosis page
  return <>{children}</>;
}
