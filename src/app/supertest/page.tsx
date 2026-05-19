import type { Metadata } from 'next';
import styles from './supertest.module.css';
import Hero from './components/Hero';
import Pain from './components/Pain';
import Solution from './components/Solution';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';

export const metadata: Metadata = {
    title: 'SuperTest — 가장 완벽한 SAT 실전 모의고사 | SuperfastSAT',
    description:
        '실제 SAT보다 조금 더 어렵게. 화상 카메라 동시 접속, Micro-skill 초정밀 분석, 전문가 해설 강의. SuperfastSAT의 SAT 실전 모의고사 SuperTest.',
    alternates: {
        canonical: 'https://superfastsat.com/supertest',
    },
    openGraph: {
        type: 'website',
        url: 'https://superfastsat.com/supertest',
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

export default function SuperTestPage() {
    return (
        <div className={styles.page}>
            <Hero />
            <Pain />
            <div className={styles.section}>
                <Solution />
            </div>
            <Pricing />
            <div className={styles.section}>
                <FAQ />
            </div>
        </div>
    );
}
