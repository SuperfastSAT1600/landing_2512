import { notFound } from 'next/navigation';
import { getCoachBySlug } from '@/lib/coaches-data';
import { getPostData } from '@/lib/posts';
import { getPublishedReviews } from '@/lib/reviews-data';
import { supabaseAdmin } from '@/lib/supabase';
import CoachPageClient from './CoachPageClient';
import type { PostData } from '@/lib/posts';

export const revalidate = 60;

interface Props {
    params: Promise<{ slug: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tutoring.superfastsat.com';

export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    const coach = getCoachBySlug(slug);
    if (!coach) return { title: '코치 | SuperfastSAT' };

    return {
        title: `${coach.name} 코치 | SuperfastSAT`,
        description: coach.bio || `${coach.name} 코치의 프로필과 커리큘럼을 확인해보세요.`,
        openGraph: {
            title: `${coach.name} 코치 | SuperfastSAT`,
            description: coach.bio ?? undefined,
            url: `${BASE_URL}/coaches/${slug}`,
            siteName: 'SuperfastSAT',
        },
    };
}

async function fetchArticlesByCoach(coachName: string): Promise<PostData[]> {
    const { data, error } = await supabaseAdmin
        .from('posts')
        .select('id, title, date, category, excerpt, description, featured_image, feature_image, featured_image_alt, author, tags')
        .eq('is_published', true)
        .eq('author', coachName)
        .order('date', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
        id: row.id as string,
        title: row.title as string,
        date: row.date as string,
        category: row.category as string,
        excerpt: row.excerpt as string | undefined,
        description: row.description as string | undefined,
        featuredImage: (row.featured_image ?? row.feature_image) as string | undefined,
        featuredImageAlt: row.featured_image_alt as string | undefined,
        featureImage: (row.feature_image ?? row.featured_image) as string | undefined,
        author: row.author as string | undefined,
        tags: row.tags as string[] | undefined,
    }));
}

export default async function CoachPage({ params }: Props) {
    const { slug } = await params;
    const coach = getCoachBySlug(slug);

    if (!coach || !coach.isActive) {
        notFound();
    }

    // Fetch curriculum post HTML (null if no slug configured or post missing)
    let curriculumHtml: string | null = null;
    if (coach.curriculumPostSlug) {
        try {
            const postData = await getPostData(coach.curriculumPostSlug);
            curriculumHtml = postData.contentHtml ?? null;
        } catch {
            // Post not found — silently skip
        }
    }

    // Fetch articles and reviews in parallel
    const [articles, allReviews] = await Promise.all([
        fetchArticlesByCoach(coach.name),
        Promise.resolve(getPublishedReviews()),
    ]);

    const coachReviews = allReviews.filter(r => r.coachSlug === slug);

    return (
        <CoachPageClient
            coach={{
                slug: coach.slug,
                name: coach.name,
                photo: coach.photo,
                bio: coach.bio,
            }}
            curriculumHtml={curriculumHtml}
            articles={articles}
            reviews={coachReviews}
        />
    );
}
