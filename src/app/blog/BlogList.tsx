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
                        <div
                            key={post.id}
                            className="group relative bg-[#1e2023] rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col"
                        >
                            {/* Featured Image */}
                            <div className="relative aspect-[16/9] overflow-hidden bg-gray-800">
                                {post.featuredImage ? (
                                    <Image
                                        src={post.featuredImage}
                                        alt={post.title}
                                        fill
                                        unoptimized
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
                                {post.isVip && post.isGated ? (
                                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                                        ✨ VIP 전용
                                    </div>
                                ) : post.isGated ? (
                                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-yellow-400 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-500/30 flex items-center gap-1">
                                        🔒 팔로워 전용
                                    </div>
                                ) : null}
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 font-medium relative z-10">
                                    <Tag size={12} />
                                    {post.tags?.filter(t => t !== 'vip')[0] ? (
                                        <Link
                                            href={`/blog?tag=${encodeURIComponent(post.tags!.filter(t => t !== 'vip')[0])}`}
                                            className="hover:text-blue-400 transition-colors"
                                        >
                                            {post.tags!.filter(t => t !== 'vip')[0]}
                                        </Link>
                                    ) : (
                                        <span>Article</span>
                                    )}
                                    <span className="mx-1">•</span>
                                    <Clock size={12} />
                                    <span>{post.date}</span>
                                </div>

                                <h2 className="text-xl font-bold text-gray-100 mb-3 group-hover:text-blue-400 transition-colors leading-tight">
                                    {/* stretched link — covers entire card */}
                                    <Link
                                        href={`/blog/${post.id}`}
                                        className="after:absolute after:inset-0"
                                    >
                                        {post.title}
                                    </Link>
                                </h2>

                                {post.isVip && post.isGated && (
                                    <p className="text-xs text-amber-400/80 mb-2 flex items-center gap-1">
                                        <span>👤</span> 코치가 특별히 선정한 VIP 전용 콘텐츠
                                    </p>
                                )}

                                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6 flex-1">
                                    {post.excerpt || post.description || '자세한 내용을 확인해보세요...'}
                                </p>

                                <div className="flex items-center text-blue-400 text-sm font-bold group-hover:translate-x-1 transition-transform">
                                    글 읽기 <span className="ml-1">→</span>
                                </div>
                            </div>
                        </div>
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
