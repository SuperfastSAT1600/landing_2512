import { Suspense } from 'react';
import Hero from './components/Hero';
import FeaturesSection from './components/FeaturesSection';
import Testimonials from './components/Testimonials';
import LatestPosts from './components/LatestPosts';
import Footer from './components/Footer';

import { getHomeConfig } from '@/lib/config';
import { getPublishedReviews } from '@/lib/reviews-data';

export const revalidate = 60;

export default async function Home() {
  // REQ-005: Only fetch hero config here (cached, <5ms).
  // enrichFeaturesFromPosts and LatestPosts stream independently —
  // Hero is visible to the user before slower queries finish.
  const config = await getHomeConfig();
  const reviews = getPublishedReviews();

  return (
    <main>
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
