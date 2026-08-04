import Link from 'next/link';
import Image from 'next/image';
import { getPostData, getAllPostIds, getRelatedPosts } from '../../../lib/posts';
import Footer from '../../components/Footer';
import { PostContent } from './PostContent';
import { Calendar, ArrowLeft, Tag } from 'lucide-react';

export const revalidate = 3600;

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    const paths = await getAllPostIds();
    return paths.map((path) => ({
        slug: path.params.slug,
    }));
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutoring.superfastsat.com';

export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    try {
        const postData = await getPostData(decodeURIComponent(slug));
        const description = postData.description || postData.excerpt;
        const effectiveTitle = postData.metaTitle || `${postData.title} | SuperfastSAT Blog`;
        const ogImage = postData.featuredImage
            ? [{ url: postData.featuredImage, alt: postData.featuredImageAlt || postData.title }]
            : [{ url: `${BASE_URL}/api/og?title=${encodeURIComponent(postData.title)}&category=${encodeURIComponent(postData.category)}` }];

        // Parse metaRobots
        const robotsMeta: Record<string, boolean> = {};
        if (postData.metaRobots) {
            const parts = postData.metaRobots.split(',').map(s => s.trim());
            if (parts.includes('noindex')) robotsMeta.index = false;
            if (parts.includes('nofollow')) robotsMeta.follow = false;
        }

        return {
            title: effectiveTitle,
            description,
            keywords: [postData.focusKeyword, ...(postData.tags || [])].filter(Boolean),
            alternates: { canonical: `${BASE_URL}/blog/${slug}` },
            ...(Object.keys(robotsMeta).length > 0 ? { robots: robotsMeta } : {}),
            openGraph: {
                type: 'article' as const,
                url: `${BASE_URL}/blog/${slug}`,
                title: postData.metaTitle || postData.title,
                description,
                siteName: 'SuperfastSAT',
                publishedTime: postData.date,
                modifiedTime: postData.updatedAt || postData.date,
                authors: [postData.author || 'SuperfastSAT'],
                section: postData.category,
                tags: postData.tags,
                images: ogImage,
            },
            twitter: {
                card: 'summary_large_image' as const,
                title: postData.metaTitle || postData.title,
                description,
                images: postData.featuredImage
                    ? [postData.featuredImage]
                    : [`${BASE_URL}/api/og?title=${encodeURIComponent(postData.title)}&category=${encodeURIComponent(postData.category)}`],
            },
        };
    } catch {
        return { title: 'Post | SuperfastSAT Blog' };
    }
}

export default async function Post({ params }: Props) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const postData = await getPostData(decodedSlug);
    const relatedPosts = await getRelatedPosts(decodedSlug, postData.category, 3);

    return (
        <div className="bg-[#fafaf9] min-h-screen text-gray-800 font-sans selection:bg-blue-200">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        headline: postData.title,
                        description: postData.description || postData.excerpt,
                        datePublished: postData.date,
                        dateModified: postData.updatedAt || postData.date,
                        author: {
                            '@type': 'Person',
                            name: postData.author || 'SuperfastSAT',
                            url: `${BASE_URL}/blog`,
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: 'SuperfastSAT',
                            url: BASE_URL,
                            logo: {
                                '@type': 'ImageObject',
                                url: `${BASE_URL}/logo.png`,
                            },
                        },
                        mainEntityOfPage: {
                            '@type': 'WebPage',
                            '@id': `${BASE_URL}/blog/${postData.id}`,
                        },
                        url: `${BASE_URL}/blog/${postData.id}`,
                        image: postData.featuredImage || `${BASE_URL}/api/og?title=${encodeURIComponent(postData.title)}&category=${encodeURIComponent(postData.category)}`,
                        keywords: [postData.focusKeyword, ...(postData.tags || [])].filter(Boolean),
                        wordCount: (postData.contentHtml || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).length,
                        inLanguage: 'ko-KR',
                        articleSection: postData.category,
                        speakable: {
                            '@type': 'SpeakableSpecification',
                            cssSelector: ['h1', '.prose h2', '.prose p'],
                        },
                    }),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            {
                                '@type': 'ListItem',
                                position: 1,
                                name: 'Home',
                                item: BASE_URL,
                            },
                            {
                                '@type': 'ListItem',
                                position: 2,
                                name: 'Blog',
                                item: `${BASE_URL}/blog`,
                            },
                            {
                                '@type': 'ListItem',
                                position: 3,
                                name: postData.title,
                                item: `${BASE_URL}/blog/${postData.id}`,
                            },
                        ],
                    }),
                }}
            />
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 flex items-center">
                <div className="max-w-[780px] mx-auto w-full px-6 flex justify-between items-center">
                    <Link href="/blog" className="text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors text-sm font-medium">
                        <ArrowLeft size={16} /> Back to Blog
                    </Link>
                    <Link href="/" className="font-bold text-gray-900 tracking-tight">SuperfastSAT</Link>
                </div>
            </nav>

            <main className="pt-24 pb-32 sm:pb-20">
                <article className="max-w-[680px] mx-auto px-4 md:px-6">
                    {/* Header: Category & Date */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 justify-center">
                        <span className="text-blue-600 font-bold uppercase tracking-wider">{postData.category}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                            <Calendar size={14} /> {postData.date}
                        </div>
                    </div>

                    {/* Featured Image */}
                    {postData.featuredImage && (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10 border border-gray-200 shadow-md">
                            <Image
                                src={postData.featuredImage}
                                alt={postData.featuredImageAlt || postData.title}
                                fill
                                unoptimized
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 800px"
                                priority
                            />
                        </div>
                    )}

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 text-center mb-6 sm:mb-12 leading-tight">
                        {postData.title}
                    </h1>

                    {/* Content: server-rendered for non-gated (avoids RSC large-string serialization bug),
                        client PostContent only for gated posts (GateWall unlock flow) */}
                    {postData.isGated ? (
                        <PostContent postData={postData} />
                    ) : (
                        <>
                            <div className={`prose prose-base sm:prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600 prose-img:rounded-xl prose-table:border-collapse [&_td]:border [&_th]:border [&_td]:border-gray-200 [&_th]:border-gray-200 [&_td]:p-2 [&_th]:p-2 [&_.instagram-reel-wrapper]:flex [&_.instagram-reel-wrapper]:justify-center [&_.instagram-reel-wrapper]:py-4 [&_.instagram-reel-embed]:max-w-[420px] [&_.instagram-reel-embed]:w-full [&_.instagram-reel-embed]:rounded-2xl [&_.instagram-reel-embed]:border-0`}>
                                <div dangerouslySetInnerHTML={{ __html: postData.contentHtml ?? '' }} />
                            </div>
                            {postData.tags && postData.tags.filter((t: string) => t !== 'vip').length > 0 && (
                                <div className="mt-16 pt-8 border-t border-gray-200">
                                    <div className="flex flex-wrap gap-2">
                                        {postData.tags.filter((t: string) => t !== 'vip').map((tag: string) => (
                                            <Link
                                                key={tag}
                                                href={`/blog?tag=${encodeURIComponent(tag)}`}
                                                className="bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 px-3 py-1 rounded-full text-sm border border-gray-200 flex items-center gap-1 transition-colors"
                                            >
                                                <Tag size={12} /> {tag}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </article>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="max-w-6xl mx-auto px-6 mt-12 sm:mt-24">
                        <div className="flex items-center gap-4 mb-8">
                            <h3 className="text-2xl font-bold text-gray-900">이 글도 한 번 읽어보세요.</h3>
                            <div className="h-px bg-gray-200 flex-1"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedPosts.map((post) => (
                                <Link key={post.id} href={`/blog/${post.id}`} className="group block">
                                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-blue-400 transition-all duration-300 hover:transform hover:-translate-y-1 shadow-sm hover:shadow-md h-full flex flex-col">
                                        {/* Thumbnail */}
                                        <div className="aspect-[16/9] w-full overflow-hidden relative">
                                            {post.featuredImage ? (
                                                <Image
                                                    src={post.featuredImage}
                                                    alt={post.title}
                                                    fill
                                                    unoptimized
                                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, 33vw"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                                                    <span className="text-gray-300 font-bold text-xl">No Image</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{post.category}</span>
                                                <span className="text-gray-400 text-xs">•</span>
                                                <span className="text-gray-400 text-xs">{post.date}</span>
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                                                {post.title}
                                            </h4>
                                            <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                                                {post.excerpt || post.description}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
