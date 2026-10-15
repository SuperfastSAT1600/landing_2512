import type { Metadata } from 'next';
import styles from './supertest.module.css';
import Hero from './components/Hero';
import Pain from './components/Pain';
import Solution from './components/Solution';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import { getSupertestConfig } from '@/lib/config';

export const metadata: Metadata = {
    title: 'SuperTest — 가장 완벽한 SAT 실전 모의고사 | SuperfastSAT',
    description:
        '실제 SAT보다 조금 더 어렵게. 화상 카메라 동시 접속, Micro-skill 초정밀 분석, 전문가 해설 강의. SuperfastSAT의 SAT 실전 모의고사 SuperTest.',
    // 이 페이지는 tutoring 에만 있다. superfastsat.com/supertest 는 404라서
    // 정본을 그쪽으로 가리키면 존재하지 않는 URL을 정본으로 선언하는 꼴이 된다.
    alternates: {
        canonical: 'https://tutoring.superfastsat.com/supertest',
    },
    openGraph: {
        type: 'website',
        url: 'https://tutoring.superfastsat.com/supertest',
        siteName: 'SuperfastSAT',
        title: 'SuperTest — 가장 완벽한 SAT 실전 모의고사 | SuperfastSAT',
        description:
            '실제 SAT보다 조금 더 어렵게. 화상 카메라 동시 접속, Micro-skill 초정밀 분석, 전문가 해설 강의.',
        images: [{ url: '/og-image.png', alt: 'SuperTest by SuperfastSAT' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SuperTest — 가장 완벽한 SAT 실전 모의고사 | SuperfastSAT',
        description: '실제 SAT보다 조금 더 어렵게. SuperfastSAT의 SAT 실전 모의고사.',
        images: ['/og-image.png'],
    },
};

export default async function SuperTestPage() {
    const { nextTestDate } = await getSupertestConfig();

    return (
        <div className={styles.page}>
            <Hero />
            <Pain />
            <div className={styles.section}>
                <Solution />
            </div>
            <Pricing nextTestDate={nextTestDate} />
            <div className={styles.section}>
                <FAQ />
            </div>
        </div>
    );
}
