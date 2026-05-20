'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';

export default function AdminSupertest() {
    const [spots, setSpots] = useState<number>(30);
    const [nextTestDate, setNextTestDate] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const adminKey = localStorage.getItem('admin_key') || '';
        fetch('/api/admin/supertest', { headers: { 'x-admin-key': adminKey } })
            .then(r => r.json())
            .then(d => {
                setSpots(d.remainingSpots ?? 30);
                setNextTestDate(d.nextTestDate ?? '');
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        if (!nextTestDate) {
            setMessage('시험 날짜를 입력해 주세요.');
            setIsError(true);
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setSaving(true);
        setIsError(false);
        try {
            const adminKey = localStorage.getItem('admin_key') || '';
            const res = await fetch('/api/admin/supertest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                body: JSON.stringify({ remainingSpots: spots, nextTestDate }),
            });
            if (res.ok) {
                setMessage('저장되었습니다!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('저장 실패.');
                setIsError(true);
            }
        } catch {
            setMessage('오류가 발생했습니다.');
            setIsError(true);
        } finally {
            setSaving(false);
        }
    };

    // D-day 계산: 시험 날짜 - 오늘 날짜 (캘린더 기준)
    const dday = (() => {
        if (!nextTestDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const test = new Date(nextTestDate);
        test.setHours(0, 0, 0, 0);
        const days = Math.round((test.getTime() - today.getTime()) / 86400000);
        if (days < 0) return '시험일이 지났습니다';
        if (days === 0) return 'D-Day';
        return `D-${days}`;
    })();

    const dateLabel = (() => {
        if (!nextTestDate) return '';
        const d = new Date(`${nextTestDate}T09:00:00+09:00`);
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
    })();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#151719] text-gray-100 font-sans">
            <main className="p-8 pb-20 max-w-2xl space-y-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">SuperTest 설정</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Hero 섹션의 시험 날짜와 잔여 좌석을 관리합니다.
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {message && (
                    <div className={`border px-4 py-3 rounded-lg text-sm font-semibold ${isError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                        {message}
                    </div>
                )}

                {/* 시험 날짜 */}
                <section className="bg-[#1e2023] rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-white">다음 시험 날짜</h2>
                    <p className="text-gray-500 text-sm">
                        Hero 섹션의 D-day 카운트다운 기준일입니다. KST 오전 9시를 기준으로 계산됩니다.
                    </p>
                    <input
                        type="date"
                        value={nextTestDate}
                        onChange={e => setNextTestDate(e.target.value)}
                        className="bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-4 py-3 text-white text-base font-bold outline-none transition-all"
                    />

                    {/* 미리보기 */}
                    {nextTestDate && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                            <p className="text-xs text-gray-600">미리보기</p>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-blue-400">{dday}</span>
                                <span className="text-gray-400 text-sm">{dateLabel} SuperTest까지</span>
                            </div>
                        </div>
                    )}
                </section>

                {/* 남은 자리 */}
                <section className="bg-[#1e2023] rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-white">이번 시험 남은 자리</h2>
                    <p className="text-gray-500 text-sm">
                        Hero 섹션 하단에 실시간으로 표시됩니다.
                        10석 이하이면 빨간 dot, 11석 이상이면 초록 dot으로 표시됩니다.
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            min={0}
                            max={999}
                            value={spots}
                            onChange={e => setSpots(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-32 bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-4 py-3 text-white text-xl font-bold outline-none transition-all text-center"
                        />
                        <span className="text-gray-400 text-sm">석</span>
                    </div>

                    {/* 미리보기 */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-600 mb-3">미리보기</p>
                        <div className="inline-flex items-center gap-2 bg-white/4 border border-white/8 rounded-full px-5 py-2 text-sm text-gray-400">
                            <span className={`w-2 h-2 rounded-full ${spots > 10 ? 'bg-green-500' : 'bg-red-400'}`} />
                            이번 시험 남은 자리
                            <span className="font-bold text-white text-base">{spots}석</span>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
