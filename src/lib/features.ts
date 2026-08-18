import { supabase } from './supabase';
import { StoredFeatureItem, FeatureItem } from './config';

export async function enrichFeaturesFromPosts(
    features: StoredFeatureItem[]
): Promise<FeatureItem[]> {
    const slugs = features.map(f => f.postSlug).filter(Boolean);

    if (slugs.length === 0) {
        return features.map(f => ({
            title: f.title,
            description: f.description,
            link: `/blog/${f.postSlug}`,
        }));
    }

    const { data } = await supabase
        .from('posts')
        .select('id, feature_image, featured_image')
        .in('id', slugs);

    const imageMap = new Map(
        (data ?? []).map(row => [
            row.id as string,
            (row.feature_image || row.featured_image) as string | undefined,
        ])
    );

    return features.map(f => {
        const result: FeatureItem = {
            title: f.title,
            description: f.description,
            link: `/blog/${f.postSlug}`,
        };
        const image = imageMap.get(f.postSlug);
        if (image) result.image = image;
        return result;
    });
}
