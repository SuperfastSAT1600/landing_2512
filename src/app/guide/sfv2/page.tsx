import type { Metadata } from 'next';
import TutorialShell from '@/components/guide/TutorialShell';

export const metadata: Metadata = {
  title: 'v2 사용법 튜토리얼 | SuperfastSAT',
  description: 'SuperfastSAT v2 스케줄 입력, Study Hall, Test Center 사용법을 직접 눌러보며 익혀요.',
  robots: { index: false, follow: false },
};

export default function Sfv2GuidePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
      <TutorialShell />
    </main>
  );
}
