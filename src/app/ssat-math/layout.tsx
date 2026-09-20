import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SSAT Math Practice',
  robots: { index: false, follow: false },
};

export default function SSATMathLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
