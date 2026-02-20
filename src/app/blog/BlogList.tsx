'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Tag, ArrowRight, LayoutGrid, AlignJustify } from 'lucide-react';
import type { PostData } from '../../lib/posts';

interface BlogListProps {
    posts: PostData[];
}

export default function BlogList({ posts }: BlogListProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [transitioning, setTransitioning] = useState(false);

    const switchView = (mode: 'grid' | 'list') => {
        if (mode === viewMode) return;
        setTransitioning(true);
        setTimeout(() => {
            setViewMode(mode);
            setTransitioning(false);
        }, 150);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 pb-24">
            {/* Toggle Buttons */}
            <div className="flex items-center justify-between mb-8">
                <p className="text-sm text-gray-500">
                    {posts.length > 0 ? `총 ${posts.length}개의 글` : ''}
                </p>
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => switchView('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                            viewMode === 'grid'
                                ? 'bg-white/10 text-white'
                                : 'text-gray-500 hover:text-gray-300'
                        }`}
                        aria-label="모아보기"
                    >
                        <LayoutGrid size={15} />
                        <span>모아보기</span>
                    </button>
                    <button
                        onClick={() => switchView('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                            viewMode === 'list'
                                ? 'bg-white/10 text-white'
                                : 'text-gray-500 hover:text-gray-300'
                        }`}
                        aria-label="펼쳐보기"
                    >
                        <AlignJustify size={15} />
                        <span>펼쳐보기</span>
                    </button>
                </div>
            </div>

            {/* Post List */}
            <div
                style={{
                    opacity: transitioning ? 0 : 1,
                    transition: 'opacity 150ms ease',
                }}
            >
                {posts.length > 0 ? (
                    viewMode === 'grid' ? (
                        /* Grid View */
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
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={post.featuredImage}
                                                alt={post.title}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
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
                        /* List View */
                        <div className="flex flex-col divide-y divide-white/5">
                            {posts.map((post) => (
                                <Link
                                    href={`/blog/${post.id}`}
                                    key={post.id}
                                    className="group flex flex-col sm:flex-row gap-5 py-6 hover:bg-white/[0.03] rounded-xl px-3 -mx-3 transition-all duration-200"
                                >
                                    {/* Thumbnail */}
                                    <div className="flex-shrink-0 w-full sm:w-[220px] aspect-[16/9] sm:aspect-auto sm:h-[124px] rounded-xl overflow-hidden bg-gray-800">
                                        {post.featuredImage ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={post.featuredImage}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                <span className="text-3xl font-serif italic opacity-20">Aa</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col flex-1 min-w-0 justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-black/60 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/10">
                                                    {post.category}
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-bold text-gray-100 group-hover:text-blue-400 transition-colors leading-snug mb-2 line-clamp-2">
                                                {post.title}
                                            </h2>
                                            <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                                                {post.excerpt || post.description || '자세한 내용을 확인해보세요...'}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                <Clock size={12} />
                                                <span>{post.date}</span>
                                            </div>
                                            <span className="flex items-center gap-1 text-blue-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                글 읽기 <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-xl">이 카테고리에 아직 글이 없습니다.</p>
                        <Link href="/blog" className="text-blue-400 hover:underline mt-4 inline-block">
                            전체 글 보기
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
