import { FeatureItem } from './config';
import { getPostData } from './posts';

export async function enrichFeaturesWithImages(features: FeatureItem[]): Promise<FeatureItem[]> {
    return Promise.all(features.map(async (feature) => {
        if (feature.link && feature.link.includes('/blog/')) {
            try {
                const parts = feature.link.split('/blog/');
                if (parts.length > 1) {
                    const slug = parts[1];
                    if (slug) {
                        const post = await getPostData(slug);
                        if (post && post.featuredImage) {
                            return { ...feature, image: post.featuredImage };
                        }
                    }
                }
            } catch (e) {
                // Ignore error if post not found
                // console.warn(`Failed to fetch image for feature ${feature.title}:`, e);
            }
        }
        return feature;
    }));
}
