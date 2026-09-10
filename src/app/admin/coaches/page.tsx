'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Link as LinkIcon, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { CoachData } from '@/lib/coaches-data';
import { CoachRow } from './CoachRow';
import { CreateOnboardingLinkModal } from './CreateOnboardingLinkModal';

interface NewCoachForm {
    name: string;
    slug: string;
    email: string;
}

function getAdminKey(): string {
    return localStorage.getItem('admin_key') || '';
}

export default function AdminCoachesPage() {
    const [coaches, setCoaches] = useState<CoachData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showOnboardingModal, setShowOnboardingModal] = useState(false);
    const [newCoach, setNewCoach] = useState<NewCoachForm>({ name: '', slug: '', email: '' });
    const [saving, setSaving] = useState(false);
    const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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
                    email: newCoach.email.trim() || undefined,
                    photo: '',
                    bio: '',
                    curriculumPostSlug: '',
                    isActive: true,
                }),
            });
            const data: { success: boolean; error?: string; onboarding_url?: string } = await res.json();
            if (data.success) {
                setOnboardingUrl(data.onboarding_url ?? null);
                setNewCoach({ name: '', slug: '', email: '' });
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

    const handleCopyUrl = () => {
        if (!onboardingUrl) return;
        navigator.clipboard.writeText(onboardingUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                    <div className="flex items-center gap-2">
                        <Link
                            href="/admin/coaches/onboarding"
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold text-gray-300 transition-colors"
                        >
                            <ClipboardList size={15} /> 프로필 작성 현황
                        </Link>
                        <button
                            onClick={() => setShowOnboardingModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold text-gray-300 transition-colors"
                        >
                            <LinkIcon size={15} /> 링크 재발급
                        </button>
                        <button
                            onClick={() => setShowAddForm(v => !v)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white transition-colors"
                        >
                            <UserPlus size={15} /> 코치 추가
                        </button>
                    </div>
                </div>
                {showOnboardingModal && (
                    <CreateOnboardingLinkModal
                        onClose={() => setShowOnboardingModal(false)}
                        adminKey={getAdminKey()}
                    />
                )}

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
                        <input
                            type="email"
                            value={newCoach.email}
                            onChange={e => setNewCoach(s => ({ ...s, email: e.target.value }))}
                            placeholder="이메일 (온보딩 링크 발송용, 선택)"
                            className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleAdd}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white transition-colors"
                            >
                                {saving ? '저장 중...' : '추가 + 링크 생성'}
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setOnboardingUrl(null); setNewCoach({ name: '', slug: '', email: '' }); }}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold text-gray-400 transition-colors"
                            >
                                취소
                            </button>
                        </div>
                        {onboardingUrl && (
                            <div className="mt-1 p-3 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                                <p className="text-xs font-medium text-green-400">코치가 추가됐습니다. 아래 링크를 코치에게 전달해주세요.</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs text-gray-300 bg-black/30 px-2 py-1.5 rounded truncate">{onboardingUrl}</code>
                                    <button
                                        onClick={handleCopyUrl}
                                        className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white transition-colors"
                                    >
                                        {copied ? '복사됨' : '복사'}
                                    </button>
                                </div>
                            </div>
                        )}
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
