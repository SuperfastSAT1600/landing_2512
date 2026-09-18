import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vocab Counter | SuperfastSAT',
  description: '외우려는 그 단어, SAT문제에 얼마나 나오는지 확인하세요',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Vocab Counter',
    description: '외우려는 그 단어, SAT문제에 얼마나 나오는지 확인하세요',
    url: 'https://tutoring.superfastsat.com/vocabcounter',
    siteName: 'SuperfastSAT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vocab Counter',
    description: '외우려는 그 단어, SAT문제에 얼마나 나오는지 확인하세요',
  },
};

export default function VocabCounterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
