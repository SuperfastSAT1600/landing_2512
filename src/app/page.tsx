import Hero from './components/Hero';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import LatestPosts from './components/LatestPosts';
import Footer from './components/Footer';

import { getHomeConfig } from '@/lib/config';
import { getPublishedReviews } from '@/lib/reviews-data';
import { enrichFeaturesFromPosts } from '@/lib/features';

export const revalidate = 60;

export default async function Home() {
  const config = await getHomeConfig();
  const reviews = getPublishedReviews();

  const featuresWithImages = await enrichFeaturesFromPosts(config.features);

  return (
    <main>
      <Hero
        ctaText={config.hero.ctaText}
        ctaLink={config.hero.ctaLink}
      />
      <Features items={featuresWithImages} />
      <Testimonials reviews={reviews} />
      <LatestPosts />
      <Footer />
    </main>
  );
}
