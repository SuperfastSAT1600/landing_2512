import { StoredFeatureItem, FeatureItem } from './config';
import { getPostData } from './posts';

export async function enrichFeaturesFromPosts(
    features: StoredFeatureItem[]
): Promise<FeatureItem[]> {
    return Promise.all(features.map(async (feature) => {
        const result: FeatureItem = {
            title: feature.title,
            description: feature.description,
            link: `/blog/${feature.postSlug}`,
        };
        try {
            const post = await getPostData(feature.postSlug);
            if (post) {
                // featureImage (세로 썸네일) 우선, 없으면 featuredImage (가로) 폴백
                const image = post.featureImage || post.featuredImage;
                if (image) result.image = image;
            }
        } catch {
            // 포스트 없으면 이미지 없이 렌더
        }
        return result;
    }));
}
