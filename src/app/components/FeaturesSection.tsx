import Features from './Features';
import { enrichFeaturesFromPosts } from '@/lib/features';
import type { StoredFeatureItem } from '@/lib/config';

// REQ-005: Async server component so page.tsx can wrap in Suspense
// enrichFeaturesFromPosts runs in its own streaming slot — Hero renders first
export default async function FeaturesSection({ features }: { features: StoredFeatureItem[] }) {
    const items = await enrichFeaturesFromPosts(features);
    return <Features items={items} />;
}
