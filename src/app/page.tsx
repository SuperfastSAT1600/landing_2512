import Hero from './components/Hero';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import LatestPosts from './components/LatestPosts';
import Footer from './components/Footer';

import { getHomeConfig } from '@/lib/config';
import { getPublishedReviews } from '@/lib/reviews-data';



import { enrichFeaturesWithImages } from '@/lib/features';

export default async function Home() {
  const config = getHomeConfig();
  const reviews = getPublishedReviews(); // Fetch from JSON

  // Enrich features with images from blog posts if available
  const featuresWithImages = await enrichFeaturesWithImages(config.features);

  return (
    <main>
      <Hero
        ctaText={config.hero.ctaText}
        ctaLink={config.hero.ctaLink}
      />
      <Features items={featuresWithImages} />
      {/* English Curtain (Curriculum) Removed. Replaced with Customer Reviews First */}
      <Testimonials reviews={reviews} />
      {/* Blog Posts (Toss Style) */}
      <LatestPosts />

      <Footer />
    </main>
  );
}
