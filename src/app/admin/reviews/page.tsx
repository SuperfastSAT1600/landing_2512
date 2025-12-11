'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, CheckCircle, XCircle, Star, Eye, EyeOff } from 'lucide-react';
import { ReviewData } from '@/lib/reviews-data'; // Only for type reference, actually fetches from API

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await fetch('/api/reviews');
            const data = await res.json();
            if (data.success) {
                setReviews(data.reviews);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatus = async (id: string, newStatus: string) => {
        await updateReview(id, { status: newStatus as any });
    };

    const handleFeature = async (id: string, isFeatured: boolean) => {
        await updateReview(id, { isFeatured });
    };

    const updateReview = async (id: string, updates: any) => {
        try {
            const res = await fetch('/api/reviews', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            });
            if (res.ok) fetchReviews();
        } catch (e) {
            alert("Error updating review");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchReviews();
        } catch (e) {
            alert("Error deleting");
        }
    };

    if (loading) return <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#151719] text-gray-100 font-sans">
            <header className="fixed top-0 w-full z-50 bg-[#151719]/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-400" />
                    </Link>
                    <h1 className="text-lg font-bold">Review Management</h1>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6 max-w-6xl mx-auto">
                <div className="grid gap-6">
                    {reviews.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No reviews submitted yet.</div>
                    ) : (
                        reviews.map(review => (
                            <div key={review.id} className="bg-[#1e2023] rounded-xl border border-white/5 p-6 flex flex-col md:flex-row gap-6">
                                {/* Info */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${review.status === 'published' ? 'bg-green-500/10 text-green-500' :
                                                review.status === 'hidden' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-yellow-500/10 text-yellow-500'
                                            }`}>
                                            {review.status}
                                        </span>
                                        {review.isFeatured && (
                                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-purple-500/10 text-purple-400">
                                                Best Review
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-500 ml-auto">{review.date}</span>
                                    </div>

                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        {review.author}
                                        <span className="text-xs font-normal text-gray-500">({review.authorType}, {review.grade})</span>
                                        <div className="flex ml-2">
                                            {[...Array(review.rating)].map((_, i) => <Star key={i} size={12} className="fill-yellow-500 text-yellow-500" />)}
                                        </div>
                                    </h3>

                                    <p className="text-gray-300 text-sm leading-relaxed bg-[#151719] p-3 rounded-lg border border-white/5">
                                        {review.content}
                                    </p>

                                    <div className="flex gap-4 text-xs text-gray-500 mt-2">
                                        <div>🎁 Reward: <span className="text-gray-300">{review.rewardType}</span></div>
                                        <div>📞 Contact: <span className="text-gray-300">{review.contact}</span></div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex md:flex-col gap-2 justify-center border-l md:border-l border-white/5 pl-0 md:pl-6">
                                    {review.status !== 'published' && (
                                        <button
                                            onClick={() => handleStatus(review.id, 'published')}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold flex items-center gap-2 w-full justify-center transition-colors"
                                        >
                                            <CheckCircle size={14} /> Publish
                                        </button>
                                    )}
                                    {review.status === 'published' && (
                                        <button
                                            onClick={() => handleStatus(review.id, 'hidden')}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold flex items-center gap-2 w-full justify-center transition-colors"
                                        >
                                            <EyeOff size={14} /> Hide
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleFeature(review.id, !review.isFeatured)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 w-full justify-center transition-colors border ${review.isFeatured
                                                ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10'
                                                : 'border-white/10 hover:bg-white/5'
                                            }`}
                                    >
                                        <Star size={14} className={review.isFeatured ? "fill-purple-400" : ""} />
                                        {review.isFeatured ? 'Unset Best' : 'Set as Best'}
                                    </button>

                                    <button
                                        onClick={() => handleDelete(review.id)}
                                        className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-bold flex items-center gap-2 w-full justify-center transition-colors mt-auto"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
