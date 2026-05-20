'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';

export default function AdminSupertest() {
    const [spots, setSpots] = useState<number>(30);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const adminKey = localStorage.getItem('admin_key') || '';
        fetch('/api/admin/supertest', { headers: { 'x-admin-key': adminKey } })
            .then(r => r.json())
            .then(d => {
                setSpots(d.remainingSpots ?? 30);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const adminKey = localStorage.getItem('admin_key') || '';
            const res = await fetch('/api/admin/supertest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                body: JSON.stringify({ remainingSpots: spots }),
            });
            if (res.ok) {
                setMessage('저장되었습니다!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('저장 실패.');
            }
        } catch {
            setMessage('오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

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
                            Hero 섹션에 표시되는 잔여 좌석 수를 관리합니다.
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
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm font-semibold">
                        {message}
                    </div>
                )}

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
                            <span
                                className={`w-2 h-2 rounded-full ${spots > 10 ? 'bg-green-500' : 'bg-red-400'}`}
                            />
                            이번 시험 남은 자리
                            <span className="font-bold text-white text-base">{spots}석</span>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
