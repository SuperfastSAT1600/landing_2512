import Link from 'next/link';
import Image from 'next/image';
import { Clock, Tag } from 'lucide-react';
import type { PostData } from '../../lib/posts';

interface BlogListProps {
    posts: PostData[];
}

export default function BlogList({ posts }: BlogListProps) {
    return (
        <div className="max-w-7xl mx-auto px-6 pb-36 sm:pb-24">
            <div className="flex items-center mb-8">
                <p className="text-sm text-gray-500">
                    {posts.length > 0 ? `총 ${posts.length}개의 글` : ''}
                </p>
            </div>

            {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <Link
                            href={`/blog/${post.id}`}
                            key={post.id}
                            className="group bg-[#1e2023] rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col"
                        >
                            {/* Featured Image */}
                            <div className="relative aspect-[16/9] overflow-hidden bg-gray-800">
                                {post.featuredImage ? (
                                    <Image
                                        src={post.featuredImage}
                                        alt={post.title}
                                        fill
                                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                        <span className="text-4xl font-serif italic opacity-20">Aa</span>
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                                    {post.category}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 font-medium">
                                    <Tag size={12} />
                                    <span>{post.tags?.[0] || 'Article'}</span>
                                    <span className="mx-1">•</span>
                                    <Clock size={12} />
                                    <span>{post.date}</span>
                                </div>

                                <h2 className="text-xl font-bold text-gray-100 mb-3 group-hover:text-blue-400 transition-colors leading-tight">
                                    {post.title}
                                </h2>

                                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6 flex-1">
                                    {post.excerpt || post.description || '자세한 내용을 확인해보세요...'}
                                </p>

                                <div className="flex items-center text-blue-400 text-sm font-bold group-hover:translate-x-1 transition-transform">
                                    글 읽기 <span className="ml-1">→</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">
                    <p className="text-xl">이 카테고리에 아직 글이 없습니다.</p>
                    <Link href="/blog" className="text-blue-400 hover:underline mt-4 inline-block">
                        전체 글 보기
                    </Link>
                </div>
            )}
        </div>
    );
}
