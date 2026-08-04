'use client';

export default function DiagnosisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hide FloatingCTA on entire diagnosis page
  return <>{children}</>;
}
