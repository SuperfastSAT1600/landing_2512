import { Suspense } from 'react';
import Hero from './components/Hero';
import FeaturesSection from './components/FeaturesSection';
import Testimonials from './components/Testimonials';
import LatestPosts from './components/LatestPosts';
import Footer from './components/Footer';

import { getHomeConfig } from '@/lib/config';
import { getPublishedReviews } from '@/lib/reviews-data';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://superfastsat.com';

const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'SuperfastSAT은 어떤 학원인가요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'SuperfastSAT은 Digital SAT 전문 온라인 학원입니다. AI 기반 진단 테스트와 맞춤형 커리큘럼으로 목표 점수 달성을 도와드립니다.',
            },
        },
        {
            '@type': 'Question',
            name: 'Digital SAT와 기존 SAT의 차이점은 무엇인가요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Digital SAT는 2024년부터 시행된 컴퓨터 기반 시험으로, 시험 시간이 2시간 14분으로 단축되고 adaptive 방식으로 출제됩니다. Reading & Writing과 Math 두 섹션으로 구성되며, 최고 점수는 1600점입니다.',
            },
        },
        {
            '@type': 'Question',
            name: 'SAT 1500점 이상을 받으려면 얼마나 공부해야 하나요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: '개인 수준에 따라 다르지만, SuperfastSAT의 집중 커리큘럼으로 평균 3~6개월 내에 목표 점수 달성이 가능합니다. AI 진단 테스트로 취약 영역을 먼저 파악하면 더 효율적으로 준비할 수 있습니다.',
            },
        },
        {
            '@type': 'Question',
            name: 'SAT 무료 진단 테스트는 어디서 받을 수 있나요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'SuperfastSAT 홈페이지에서 AI 기반 SAT 진단 테스트를 받아보실 수 있습니다. 현재 실력을 정확히 파악하고 맞춤형 학습 플랜을 받아보세요.',
            },
        },
    ],
};

const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'Digital SAT 완전 정복 과정',
    description: 'Digital SAT 전문 강사진이 설계한 체계적인 커리큘럼. AI 진단부터 실전 모의고사까지 목표 점수 달성을 보장합니다.',
    provider: {
        '@type': 'Organization',
        name: 'SuperfastSAT',
        url: SITE_URL,
    },
    url: SITE_URL,
    inLanguage: 'ko-KR',
    educationalLevel: 'HighSchool',
    teaches: ['SAT Reading & Writing', 'SAT Math', 'Digital SAT Strategy'],
    hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        inLanguage: 'ko-KR',
    },
};

export default async function Home() {
  // REQ-005: Only fetch hero config here (cached, <5ms).
  // enrichFeaturesFromPosts and LatestPosts stream independently —
  // Hero is visible to the user before slower queries finish.
  const config = await getHomeConfig();
  const reviews = getPublishedReviews();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />
      <Hero
        ctaText={config.hero.ctaText}
        ctaLink={config.hero.ctaLink}
      />
      {/* Features waits for enrichFeaturesFromPosts; streams in once ready */}
      <Suspense fallback={<div style={{ minHeight: '600px' }} />}>
        <FeaturesSection features={config.features} />
      </Suspense>
      <Testimonials reviews={reviews} />
      {/* LatestPosts has its own DB call; streams independently */}
      <Suspense fallback={null}>
        <LatestPosts />
      </Suspense>
      <Footer />
    </main>
  );
}
