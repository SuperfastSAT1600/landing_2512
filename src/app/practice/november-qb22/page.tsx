import type { Metadata } from 'next';
import { PracticeIntro } from '@/components/practice/PracticeIntro';
import { PRACTICE_CATALOG } from '@/lib/practice-catalog';
import PracticeClient from './PracticeClient';

const SLUG = 'november-qb22';
const entry = PRACTICE_CATALOG[SLUG];

// 서버 컴포넌트라서 메타데이터를 붙일 수 있다. 예전에는 page.tsx 가 'use client' 였고,
// 클라이언트 컴포넌트는 generateMetadata 를 export 할 수 없어 루트 레이아웃의 기본값
// (title "SAT 목표 점수에 가장 빠르게", canonical https://superfastsat.com)이 그대로 나갔다.
export const metadata: Metadata = {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: `https://tutoring.superfastsat.com/practice/${SLUG}` },
    openGraph: {
        type: 'website',
        url: `https://tutoring.superfastsat.com/practice/${SLUG}`,
        siteName: 'SuperfastSAT',
        title: entry.title,
        description: entry.description,
    },
    twitter: {
        card: 'summary_large_image',
        title: entry.title,
        description: entry.description,
    },
};

export default function Page() {
    return <PracticeClient intro={<PracticeIntro entry={entry} slug={SLUG} />} />;
}
