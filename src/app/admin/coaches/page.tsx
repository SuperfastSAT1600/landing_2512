'use client';

import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { CoachData } from '@/lib/coaches-data';
import { CoachRow } from './CoachRow';

interface NewCoachForm {
    name: string;
    slug: string;
}

function getAdminKey(): string {
    return localStorage.getItem('admin_key') || '';
}

export default function AdminCoachesPage() {
    const [coaches, setCoaches] = useState<CoachData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCoach, setNewCoach] = useState<NewCoachForm>({ name: '', slug: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        try {
            const res = await fetch('/api/admin/coaches', {
                headers: { 'x-admin-key': getAdminKey() },
            });
            const data: { success: boolean; coaches: CoachData[] } = await res.json();
            if (data.success) setCoaches(data.coaches);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newCoach.name.trim() || !newCoach.slug.trim()) {
            alert('이름과 slug를 모두 입력해주세요.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/admin/coaches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': getAdminKey(),
                },
                body: JSON.stringify({
                    name: newCoach.name.trim(),
                    slug: newCoach.slug.trim(),
                    photo: '',
                    bio: '',
                    curriculumPostSlug: '',
                    isActive: true,
                }),
            });
            const data: { success: boolean; error?: string } = await res.json();
            if (data.success) {
                setNewCoach({ name: '', slug: '' });
                setShowAddForm(false);
                await fetchCoaches();
            } else {
                alert(data.error ?? '추가에 실패했습니다.');
            }
        } catch {
            alert('오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (slug: string, updates: Partial<CoachData>) => {
        try {
            const res = await fetch('/api/admin/coaches', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': getAdminKey(),
                },
                body: JSON.stringify({ slug, ...updates }),
            });
            if (res.ok) await fetchCoaches();
            else alert('업데이트에 실패했습니다.');
        } catch {
            alert('오류가 발생했습니다.');
        }
    };

    const handleDelete = async (slug: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/admin/coaches?slug=${slug}`, {
                method: 'DELETE',
                headers: { 'x-admin-key': getAdminKey() },
            });
            if (res.ok) await fetchCoaches();
            else alert('삭제에 실패했습니다.');
        } catch {
            alert('오류가 발생했습니다.');
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
            <main className="p-8 pb-20 max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-white">Coach Management</h1>
                    <button
                        onClick={() => setShowAddForm(v => !v)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white transition-colors"
                    >
                        <UserPlus size={15} /> 코치 추가
                    </button>
                </div>

                {showAddForm && (
                    <div className="p-5 bg-[#1e2023] rounded-xl border border-white/5 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">새 코치 추가</p>
                        <div className="flex gap-3">
                            <input
                                value={newCoach.name}
                                onChange={e => setNewCoach(s => ({ ...s, name: e.target.value }))}
                                placeholder="이름"
                                className="flex-1 bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                            />
                            <input
                                value={newCoach.slug}
                                onChange={e => setNewCoach(s => ({ ...s, slug: e.target.value }))}
                                placeholder="slug (영문, 소문자)"
                                className="flex-1 bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none font-mono"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAdd}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white transition-colors"
                            >
                                {saving ? '저장 중...' : '추가'}
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setNewCoach({ name: '', slug: '' }); }}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold text-gray-400 transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {coaches.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">등록된 코치가 없습니다.</div>
                    ) : (
                        coaches.map(coach => (
                            <CoachRow
                                key={coach.slug}
                                coach={coach}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
