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
    introHtml: string | null;
    curriculumHtml: string | null;
    articles: PostData[];
    reviews: ReviewData[];
}

const TABS: { key: Tab; label: string }[] = [
    { key: 'intro', label: '코치 소개' },
    { key: 'curriculum', label: '커리큘럼' },
    { key: 'articles', label: '아티클' },
    { key: 'reviews', label: '수업 후기' },
];

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={13} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
            ))}
        </div>
    );
}

function ArticleCard({ post }: { post: PostData }) {
    const thumb = post.featuredImage ?? post.featureImage;
    return (
        <Link
            href={`/blog/${post.id}`}
            className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 hover:shadow-md transition-all"
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
                <div className="aspect-video w-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                    <span className="text-gray-300 text-sm">No Image</span>
                </div>
            )}
            <div className="p-4">
                <p className="text-xs text-[#071be9] font-semibold uppercase tracking-wide mb-1">{post.category}</p>
                <h3 className="text-gray-900 font-bold text-sm leading-snug line-clamp-2 group-hover:text-[#071be9] transition-colors">
                    {post.title}
                </h3>
                <p className="text-gray-400 text-xs mt-1">{post.date}</p>
            </div>
        </Link>
    );
}

function ReviewCard({ review }: { review: ReviewData }) {
    return (
        <article className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
                <StarRating rating={review.rating} />
                <span className="text-xs text-gray-400">{review.date}</span>
            </div>
            {review.title && <h4 className="text-gray-900 font-semibold text-sm">{review.title}</h4>}
            <p className="text-gray-500 text-sm leading-relaxed line-clamp-5">{review.content}</p>
            <p className="text-xs text-gray-400 mt-auto">{review.author} · {review.grade}</p>
        </article>
    );
}

const PROSE = 'prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-[#071be9] prose-strong:text-gray-900 prose-li:text-gray-600';

export default function CoachPageClient({ coach, introHtml, curriculumHtml, articles, reviews }: CoachPageClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>('intro');

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">

            {/* ── 상단 네비게이션 (랜딩 헤더와 동일 스타일) ── */}
            <header className="fixed top-0 w-full z-50 bg-[#050816] border-b border-white/10">
                <div className="max-w-[1400px] mx-auto px-[5%] h-14 flex items-center gap-12">
                    {/* 로고 */}
                    <Link href="/" className="flex-shrink-0">
                        <Image src="/logo_header.png" alt="SuperfastSAT" height={24} width={130} className="h-6 w-auto object-contain" unoptimized />
                    </Link>

                    {/* 탭 메뉴 */}
                    <nav className="flex items-center gap-8 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                        {TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`relative py-[10px] text-[0.95rem] font-medium whitespace-nowrap transition-colors ${
                                    activeTab === key ? 'text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {label}
                                {activeTab === key && (
                                    <span className="absolute bottom-1 left-0 w-full h-0.5 bg-white rounded-sm" />
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {/* ── 프로필 히어로 ── */}
            <section className="pt-28 pb-12 px-4 bg-white">
                <div className="max-w-xl mx-auto flex flex-col items-center text-center gap-5">
                    {/* 프로필 사진 */}
                    <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg bg-gray-50 flex-shrink-0">
                        {coach.photo ? (
                            <Image
                                src={coach.photo}
                                alt={coach.name}
                                width={144}
                                height={144}
                                className="object-cover w-full h-full"
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300">
                                {coach.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* 이름 */}
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{coach.name}</h1>

                    {/* 구분선 1: 이름 ↔ 소개 */}
                    <hr className="w-full border-gray-200" />

                    {/* bio */}
                    {coach.bio && (
                        <p className="text-gray-500 text-sm leading-relaxed max-w-sm">{coach.bio}</p>
                    )}

                    {/* 구분선 2: 소개 ↔ 콘텐츠 */}
                    <hr className="w-full border-gray-200" />
                </div>
            </section>

            {/* ── 탭 콘텐츠 ── */}
            <main className="max-w-3xl mx-auto px-4 py-10">

                {activeTab === 'intro' && (
                    <section>
                        {introHtml ? (
                            <div className={PROSE} dangerouslySetInnerHTML={{ __html: introHtml }} />
                        ) : coach.bio ? (
                            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{coach.bio}</p>
                        ) : (
                            <p className="text-gray-400">소개 내용이 준비 중입니다.</p>
                        )}
                    </section>
                )}

                {activeTab === 'curriculum' && (
                    <section>
                        {curriculumHtml ? (
                            <div className={PROSE} dangerouslySetInnerHTML={{ __html: curriculumHtml }} />
                        ) : (
                            <p className="text-gray-400">커리큘럼이 준비 중입니다.</p>
                        )}
                    </section>
                )}

                {activeTab === 'articles' && (
                    <section>
                        {articles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {articles.map(post => <ArticleCard key={post.id} post={post} />)}
                            </div>
                        ) : (
                            <p className="text-gray-400">작성된 아티클이 없습니다.</p>
                        )}
                    </section>
                )}

                {activeTab === 'reviews' && (
                    <section>
                        <p className="text-sm text-gray-400 mb-6">{reviews.length}개의 후기</p>
                        {reviews.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                            </div>
                        ) : (
                            <p className="text-gray-400">아직 등록된 후기가 없습니다.</p>
                        )}
                    </section>
                )}

            </main>
        </div>
    );
}
