import Hero from './components/Hero';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import LatestPosts from './components/LatestPosts';
import Footer from './components/Footer';

import { getHomeConfig } from '@/lib/config';
import { getPublishedReviews } from '@/lib/reviews-data';

export default function Home() {
  const config = getHomeConfig();
  const reviews = getPublishedReviews(); // Fetch from JSON

  return (
    <main>
      <Hero
        ctaText={config.hero.ctaText}
        ctaLink={config.hero.ctaLink}
      />
      <Features items={config.features} />
      {/* English Curtain (Curriculum) Removed. Replaced with Customer Reviews First */}
      <Testimonials reviews={reviews} />
      {/* Blog Posts (Toss Style) */}
      <LatestPosts />

      <Footer />
    </main>
  );
}
