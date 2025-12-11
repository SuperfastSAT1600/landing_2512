'use client';

import { useState } from 'react';
import { ChevronRight, Check, Star, Gift, BookOpen } from 'lucide-react';


export default function ReviewWritePage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        category: '목표 점수 달성',
        author: '',
        authorType: 'Student', // Student | Parent
        grade: '11학년',
        rating: 5,
        content: '',
        rewardType: 'Reward', // Reward | Extra Class
        contact: ''
    });

    const handleNext = () => {
        if (step === 1 && !marketingConsent) {
            alert("마케팅 활용 동의에 체크해주세요.");
            return;
        }
        if (step === 2) {
            if (!formData.author || !formData.content) {
                alert("필수 항목을 모두 입력해주세요.");
                return;
            }
        }
        if (step === 3) {
            handleSubmit();
            return;
        }
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        if (!formData.contact) {
            alert("연락처를 입력해주세요.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, marketingConsent })
            });
            if (res.ok) {
                setStep(4); // Success
            } else {
                alert("제출에 실패했습니다. 다시 시도해주세요.");
            }
        } catch (e) {
            alert("오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#151719] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            {/* Branding Header */}
            <div className="mb-8 text-center animate-fade-in-down">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    SuperfastSAT
                </h1>
                <p className="text-gray-500 text-sm tracking-widest mt-1 uppercase">Student Success Story</p>
            </div>

            <div className="w-full max-w-lg bg-[#1e2023] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-blue-500' : 'bg-white/10'}`} />
                    ))}
                </div>

                {/* Step 1: Consent */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-2xl font-bold">후기 작성 안내</h2>
                        <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                            소중한 수강 후기를 남겨주시면<br />
                            더 나은 서비스를 만드는 데 큰 힘이 됩니다.<br />
                            작성해주신 후기는 익명(일부 마스킹)으로 홈페이지에 게시될 수 있습니다.
                        </p>

                        <div className="bg-[#151719] p-4 rounded-xl border border-white/5">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={marketingConsent}
                                    onChange={(e) => setMarketingConsent(e.target.checked)}
                                    className="mt-1 w-5 h-5 accent-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-300 leading-relaxed">
                                    (필수) 작성된 후기는 SuperfastSAT의 마케팅 자료 및 홈페이지 게시물로 활용될 수 있음에 동의합니다.
                                </span>
                            </label>
                        </div>

                        <button onClick={handleNext} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all text-lg shadow-lg shadow-blue-900/20">
                            동의하고 시작하기
                        </button>
                    </div>
                )}

                {/* Step 2: Content */}
                {step === 2 && (
                    <div className="space-y-5 animate-fade-in">
                        <h2 className="text-2xl font-bold">후기 정보 입력</h2>

                        {/* Category & Title */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">카테고리</label>
                                <select
                                    className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-3 text-white outline-none appearance-none"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="목표 점수 달성">목표 점수 달성</option>
                                    <option value="학습 코치 만족">학습 코치 만족</option>
                                    <option value="학습 관리 만족">학습 관리 만족</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">후기 제목 (한줄 요약)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-3 text-white outline-none placeholder-gray-600"
                                    placeholder="예: 2달 만에 200점 올랐습니다!"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Type & Grade */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">수강생/학부모</label>
                                <select
                                    className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-3 text-white outline-none appearance-none"
                                    value={formData.authorType}
                                    onChange={(e) => setFormData({ ...formData, authorType: e.target.value })}
                                >
                                    <option value="Student">학생</option>
                                    <option value="Parent">학부모</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">학년</label>
                                <select
                                    className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-3 text-white outline-none appearance-none"
                                    value={formData.grade}
                                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                >
                                    <option value="8학년 이하">8학년 이하</option>
                                    <option value="9학년">9학년</option>
                                    <option value="10학년">10학년</option>
                                    <option value="11학년">11학년</option>
                                    <option value="12학년">12학년</option>
                                </select>
                            </div>
                        </div>

                        {/* Name & Rating */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">이름 (또는 ID)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-3 text-white outline-none placeholder-gray-600"
                                    placeholder="Minj**"
                                    value={formData.author}
                                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">만족도</label>
                                <div className="flex gap-1 py-1.5 items-center justify-center">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star
                                            key={star}
                                            size={24}
                                            className={`cursor-pointer transition-transform hover:scale-110 ${formData.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                                            onClick={() => setFormData({ ...formData, rating: star })}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">후기 내용</label>
                            <textarea
                                className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-3 text-white outline-none h-40 resize-none leading-relaxed placeholder-gray-600"
                                placeholder="가장 도움 되었던 점이나 성적 향상 사례를 적어주세요."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>

                        <button onClick={handleNext} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all text-lg shadow-lg shadow-blue-900/20">
                            다음 단계로
                        </button>
                    </div>
                )}

                {/* Step 3: Reward */}
                {step === 3 && (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-2xl font-bold">리워드 선택</h2>
                        <p className="text-gray-400 text-sm">감사의 마음을 담아 작은 선물을 드립니다.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setFormData({ ...formData, rewardType: 'Reward' })}
                                className={`p-4 rounded-xl border border-white/10 cursor-pointer transition-all hover:bg-white/5 active:scale-95 ${formData.rewardType === 'Reward' ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'bg-[#151719]'}`}
                            >
                                <Gift size={32} className="text-purple-400 mb-3 mx-auto" />
                                <div className="font-bold text-center">리뷰 리워드</div>
                                <div className="text-xs text-gray-500 mt-1 text-center">스타벅스 기프티콘 등</div>
                            </div>
                            <div
                                onClick={() => setFormData({ ...formData, rewardType: 'Extra Class' })}
                                className={`p-4 rounded-xl border border-white/10 cursor-pointer transition-all hover:bg-white/5 active:scale-95 ${formData.rewardType === 'Extra Class' ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'bg-[#151719]'}`}
                            >
                                <BookOpen size={32} className="text-emerald-400 mb-3 mx-auto" />
                                <div className="font-bold text-center">추가 수업 1회</div>
                                <div className="text-xs text-gray-500 mt-1 text-center">1:1 코칭 1회권</div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">연락처 (핸드폰 또는 이메일)</label>
                            <input
                                type="text"
                                className="w-full bg-[#151719] border border-white/10 rounded-lg px-3 py-3 text-white outline-none placeholder-gray-600"
                                placeholder="010-1234-5678"
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            />
                            <p className="text-xs text-gray-600 mt-2">입력하신 연락처로 리워드를 발송해드립니다.</p>
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all disabled:opacity-50 text-lg shadow-lg shadow-blue-900/20"
                        >
                            {loading ? '제출 중...' : '작성 완료'}
                        </button>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div className="text-center py-10 animate-fade-in">
                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <h2 className="text-3xl font-bold mb-2 text-white">제출되었습니다!</h2>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            소중한 후기 감사합니다.<br />
                            확인 후 연락처로 리워드를 보내드리겠습니다.
                        </p>
                        <a href="/" className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors">
                            홈으로 돌아가기
                        </a>
                    </div>
                )}

            </div>
        </div>
    );
}
