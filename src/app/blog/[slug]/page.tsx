import Link from 'next/link';
import { getPostData, getAllPostIds, getRelatedPosts } from '../../../lib/posts';
import Footer from '../../components/Footer';
import { ChevronLeft, Calendar, Tag, ArrowLeft } from 'lucide-react';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    const paths = getAllPostIds();
    return paths.map((path) => ({
        slug: path.params.slug,
    }));
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    const postData = await getPostData(slug);
    return {
        title: `${postData.title} | SuperfastSAT Blog`,
        description: postData.description || postData.excerpt,
        openGraph: {
            images: postData.featuredImage ? [postData.featuredImage] : undefined,
        },
    };
}

export default async function Post({ params }: Props) {
    const { slug } = await params;
    const postData = await getPostData(slug);
    const relatedPosts = getRelatedPosts(slug, postData.category, 3);

    return (
        <div className="bg-[#151719] min-h-screen text-gray-200 font-sans selection:bg-blue-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-[#151719]/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center">
                <div className="max-w-4xl mx-auto w-full px-6 flex justify-between items-center">
                    <Link href="/blog" className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors text-sm font-medium">
                        <ArrowLeft size={16} /> Back to Blog
                    </Link>
                    <Link href="/" className="font-bold text-white tracking-tight">SuperfastSAT</Link>
                </div>
            </nav>

            <main className="pt-24 pb-20">
                <article className="max-w-4xl mx-auto px-4 md:px-6">
                    {/* Header: Category & Date */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 justify-center">
                        <span className="text-blue-400 font-bold uppercase tracking-wider">{postData.category}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                            <Calendar size={14} /> {postData.date}
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white text-center mb-8 leading-tight">
                        {postData.title}
                    </h1>

                    {/* Featured Image */}
                    {postData.featuredImage && (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden mb-12 border border-white/5 shadow-2xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={postData.featuredImage}
                                alt={postData.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-a:text-blue-400 prose-img:rounded-xl">
                        <div dangerouslySetInnerHTML={{ __html: postData.contentHtml || '' }} />
                    </div>

                    {/* Footer / Tags */}
                    {postData.tags && postData.tags.length > 0 && (
                        <div className="mt-16 pt-8 border-t border-white/10">
                            <div className="flex flex-wrap gap-2">
                                {postData.tags.map(tag => (
                                    <span key={tag} className="bg-white/5 text-gray-400 px-3 py-1 rounded-full text-sm border border-white/5 flex items-center gap-1">
                                        <Tag size={12} /> {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </article>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="max-w-6xl mx-auto px-6 mt-24">
                        <div className="flex items-center gap-4 mb-8">
                            <h3 className="text-2xl font-bold text-white">이 글도 한 번 읽어보세요.</h3>
                            <div className="h-px bg-white/10 flex-1"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedPosts.map((post) => (
                                <Link key={post.id} href={`/blog/${post.id}`} className="group block">
                                    <div className="bg-[#1C1F23] rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-300 hover:transform hover:-translate-y-1 shadow-lg h-full flex flex-col">
                                        {/* Thumbnail */}
                                        <div className="aspect-[16/9] w-full overflow-hidden relative">
                                            {post.featuredImage ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={post.featuredImage}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
                                                    <span className="text-white/20 font-bold text-xl">No Image</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">{post.category}</span>
                                                <span className="text-gray-600 text-xs">•</span>
                                                <span className="text-gray-500 text-xs">{post.date}</span>
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                                                {post.title}
                                            </h4>
                                            <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
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
