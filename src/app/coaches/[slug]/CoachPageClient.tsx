'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { PostData } from '@/lib/posts';
import type { ReviewData } from '@/lib/reviews-data';

type Tab = 'intro' | 'curriculum' | 'articles' | 'reviews';

interface CoachProfile {
    slug: string;
    name: string;
    photo: string;
    bio: string;
}

interface CoachPageClientProps {
    coach: CoachProfile;
    curriculumHtml: string | null;
    articles: PostData[];
    reviews: ReviewData[];
}

const TAB_LABELS: { key: Tab; label: string }[] = [
    { key: 'intro', label: '코치 소개' },
    { key: 'curriculum', label: '커리큘럼' },
    { key: 'articles', label: '아티클' },
    { key: 'reviews', label: '수업 후기' },
];

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5" aria-label={`${rating}점`}>
            {[1, 2, 3, 4, 5].map(s => (
                <Star
                    key={s}
                    size={14}
                    className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                    aria-hidden="true"
                />
            ))}
        </div>
    );
}

function ArticleCard({ post }: { post: PostData }) {
    const thumb = post.featuredImage ?? post.featureImage;
    return (
        <Link
            href={`/blog/${post.id}`}
            className="group block bg-[#09090b] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
        >
            {thumb ? (
                <div className="relative aspect-video w-full overflow-hidden">
                    <Image
                        src={thumb}
                        alt={post.title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                    />
                </div>
            ) : (
                <div className="aspect-video w-full bg-gradient-to-br from-[#071be9]/20 to-[#6085FF]/10 flex items-center justify-center">
                    <span className="text-white/20 text-sm font-medium">No Image</span>
                </div>
            )}
            <div className="p-4">
                <p className="text-xs text-[#6085FF] font-semibold uppercase tracking-wide mb-2">
                    {post.category}
                </p>
                <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 group-hover:text-[#6085FF] transition-colors">
                    {post.title}
                </h3>
                <p className="text-gray-500 text-xs mt-1">{post.date}</p>
            </div>
        </Link>
    );
}

function ReviewCard({ review }: { review: ReviewData }) {
    return (
        <article className="bg-[#09090b] border border-white/10 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <StarRating rating={review.rating} />
                <span className="text-xs text-gray-500">{review.date}</span>
            </div>
            {review.title && (
                <h4 className="text-white font-semibold text-sm leading-snug">{review.title}</h4>
            )}
            <p className="text-gray-400 text-sm leading-relaxed line-clamp-5">{review.content}</p>
            <p className="text-xs text-gray-600 mt-auto">
                {review.author} &middot; {review.grade}
            </p>
        </article>
    );
}

export default function CoachPageClient({
    coach,
    curriculumHtml,
    articles,
    reviews,
}: CoachPageClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>('intro');

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/5 h-14 flex items-center px-6">
                <Link href="/" className="font-bold text-white tracking-tight text-sm">
                    SuperfastSAT
                </Link>
            </nav>

            {/* Profile Hero */}
            <header className="pt-28 pb-10 px-4 max-w-3xl mx-auto flex flex-col items-center text-center gap-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-[#09090b] flex-shrink-0">
                    {coach.photo ? (
                        <Image
                            src={coach.photo}
                            alt={coach.name}
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white/20">
                            {coach.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">{coach.name}</h1>
                    {coach.bio && (
                        <p className="text-gray-400 mt-2 text-sm max-w-md leading-relaxed">{coach.bio}</p>
                    )}
                </div>
                <Link
                    href={`/reviews/write?coach=${coach.slug}`}
                    className="mt-2 px-5 py-2.5 bg-[#071be9] hover:bg-[#1a31f0] rounded-lg text-sm font-semibold transition-colors"
                >
                    후기 작성하기
                </Link>
            </header>

            {/* Tabs */}
            <div className="sticky top-14 z-40 bg-black border-b border-white/5">
                <div className="max-w-3xl mx-auto px-4 flex gap-1">
                    {TAB_LABELS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                activeTab === key
                                    ? 'border-[#071be9] text-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                            aria-selected={activeTab === key}
                            role="tab"
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <main className="max-w-3xl mx-auto px-4 py-10">
                {activeTab === 'intro' && (
                    <section>
                        <h2 className="text-xl font-bold mb-4">코치 소개</h2>
                        {coach.bio ? (
                            <p className="text-gray-300 leading-relaxed whitespace-pre-line">{coach.bio}</p>
                        ) : (
                            <p className="text-gray-600">소개 내용이 준비 중입니다.</p>
                        )}
                    </section>
                )}

                {activeTab === 'curriculum' && (
                    <section>
                        <h2 className="text-xl font-bold mb-6">커리큘럼</h2>
                        {curriculumHtml ? (
                            <div
                                className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-[#6085FF] prose-strong:text-white prose-li:text-gray-300"
                                dangerouslySetInnerHTML={{ __html: curriculumHtml }}
                            />
                        ) : (
                            <p className="text-gray-600">커리큘럼이 준비 중입니다.</p>
                        )}
                    </section>
                )}

                {activeTab === 'articles' && (
                    <section>
                        <h2 className="text-xl font-bold mb-6">아티클</h2>
                        {articles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {articles.map(post => (
                                    <ArticleCard key={post.id} post={post} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">작성된 아티클이 없습니다.</p>
                        )}
                    </section>
                )}

                {activeTab === 'reviews' && (
                    <section>
                        <h2 className="text-xl font-bold mb-6">
                            수업 후기
                            {reviews.length > 0 && (
                                <span className="ml-2 text-sm text-gray-500 font-normal">
                                    ({reviews.length}개)
                                </span>
                            )}
                        </h2>
                        {reviews.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {reviews.map(r => (
                                    <ReviewCard key={r.id} review={r} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-gray-600 mb-4">아직 등록된 후기가 없습니다.</p>
                                <Link
                                    href={`/reviews/write?coach=${coach.slug}`}
                                    className="px-5 py-2.5 bg-[#071be9] hover:bg-[#1a31f0] rounded-lg text-sm font-semibold transition-colors"
                                >
                                    첫 후기를 작성해보세요
                                </Link>
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
