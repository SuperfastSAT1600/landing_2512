import Hero from './components/Hero';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import LatestPosts from './components/LatestPosts';
import Footer from './components/Footer';

import { getHomeConfig } from '@/lib/config';
import { getPublishedReviews } from '@/lib/reviews-data';

import { getPostData } from '@/lib/posts';

export default async function Home() {
  const config = getHomeConfig();
  const reviews = getPublishedReviews(); // Fetch from JSON

  // Enrich features with images from blog posts if available
  const featuresWithImages = await Promise.all(config.features.map(async (feature) => {
    if (feature.link && feature.link.includes('/blog/')) {
      try {
        const slug = feature.link.split('/blog/')[1];
        if (slug) {
          const post = await getPostData(slug);
          if (post && post.featuredImage) {
            return { ...feature, image: post.featuredImage };
          }
        }
      } catch (e) {
        // Ignore error if post not found
      }
    }
    return feature;
  }));

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
