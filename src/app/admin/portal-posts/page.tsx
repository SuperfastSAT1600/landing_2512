'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import type { PortalPost } from '@/lib/config';

function adminKey() {
    return typeof window !== 'undefined' ? (localStorage.getItem('admin_key') || '') : '';
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPortalPosts() {
    const [posts, setPosts] = useState<PortalPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState<string | null>(null);
    const [msg, setMsg] = useState('');

    const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey() };

    async function load() {
        const r = await fetch('/api/admin/portal-posts', { headers: { 'x-admin-key': adminKey() } });
        const data = await r.json() as PortalPost[];
        setPosts(data.sort((a, b) => a.order - b.order));
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function handleCreate() {
        if (!newTitle.trim() || !newContent.trim()) return;
        setCreating(true);
        const r = await fetch('/api/admin/portal-posts', {
            method: 'POST',
            headers,
            body: JSON.stringify({ title: newTitle, content: newContent }),
        });
        if (r.ok) {
            setNewTitle(''); setNewContent(''); setShowForm(false);
            await load();
            flash('게시글이 추가됐습니다.');
        }
        setCreating(false);
    }

    async function toggleActive(post: PortalPost) {
        setSaving(post.id);
        await fetch(`/api/admin/portal-posts/${post.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ active: !post.active }),
        });
        await load();
        setSaving(null);
    }

    async function handleDelete(id: string) {
        if (!confirm('삭제하시겠습니까?')) return;
        setSaving(id);
        await fetch(`/api/admin/portal-posts/${id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey() } });
        await load();
        setSaving(null);
    }

    async function saveEdit(id: string) {
        setSaving(id);
        await fetch(`/api/admin/portal-posts/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ title: editTitle, content: editContent }),
        });
        setEditId(null);
        await load();
        setSaving(null);
        flash('수정됐습니다.');
    }

    async function moveOrder(post: PortalPost, dir: 'up' | 'down') {
        const sorted = [...posts];
        const idx = sorted.findIndex(p => p.id === post.id);
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return;

        setSaving(post.id);
        await Promise.all([
            fetch(`/api/admin/portal-posts/${sorted[idx].id}`, { method: 'PATCH', headers, body: JSON.stringify({ order: sorted[swapIdx].order }) }),
            fetch(`/api/admin/portal-posts/${sorted[swapIdx].id}`, { method: 'PATCH', headers, body: JSON.stringify({ order: sorted[idx].order }) }),
        ]);
        await load();
        setSaving(null);
    }

    function flash(text: string) {
        setMsg(text);
        setTimeout(() => setMsg(''), 3000);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#151719] text-gray-100 font-sans">
            <main className="p-8 pb-20 max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">포털 게시글 관리</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            비결제 학부모 포털에 공통으로 노출되는 안내 게시글을 관리합니다.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                    >
                        <Plus size={16} />
                        새 게시글
                    </button>
                </div>

                {msg && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm font-semibold">
                        {msg}
                    </div>
                )}

                {/* 새 게시글 작성 폼 */}
                {showForm && (
                    <section className="bg-[#1e2023] rounded-xl p-6 space-y-4 border border-blue-500/20">
                        <h2 className="text-base font-semibold text-white">새 게시글 작성</h2>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1.5">제목</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="예: 이번 주 SuperTest 안내"
                                className="w-full bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1.5">내용</label>
                            <textarea
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                                placeholder="학부모에게 전달할 내용을 입력하세요."
                                rows={5}
                                className="w-full bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-all resize-none"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { setShowForm(false); setNewTitle(''); setNewContent(''); }}
                                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newTitle.trim() || !newContent.trim()}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                            >
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                등록
                            </button>
                        </div>
                    </section>
                )}

                {/* 게시글 목록 */}
                {posts.length === 0 ? (
                    <div className="bg-[#1e2023] rounded-xl p-10 text-center text-gray-600 text-sm">
                        등록된 게시글이 없습니다. 새 게시글을 추가해 보세요.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {posts.map((post, idx) => (
                            <div
                                key={post.id}
                                className={`bg-[#1e2023] rounded-xl p-5 space-y-3 border ${post.active ? 'border-white/5' : 'border-white/5 opacity-60'}`}
                            >
                                {editId === post.id ? (
                                    /* 수정 모드 */
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            className="w-full bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 text-white text-sm outline-none"
                                        />
                                        <textarea
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            rows={4}
                                            className="w-full bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">취소</button>
                                            <button
                                                onClick={() => saveEdit(post.id)}
                                                disabled={saving === post.id}
                                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-bold"
                                            >
                                                {saving === post.id ? <Loader2 size={12} className="animate-spin" /> : null}
                                                저장
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* 보기 모드 */
                                    <>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{post.title}</p>
                                                <p className="text-xs text-gray-600 mt-0.5">{formatDate(post.created_at)}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {/* 순서 조절 */}
                                                <button
                                                    onClick={() => moveOrder(post, 'up')}
                                                    disabled={idx === 0 || saving === post.id}
                                                    className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors"
                                                    title="위로"
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button
                                                    onClick={() => moveOrder(post, 'down')}
                                                    disabled={idx === posts.length - 1 || saving === post.id}
                                                    className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors"
                                                    title="아래로"
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                                {/* 활성/비활성 토글 */}
                                                <button
                                                    onClick={() => toggleActive(post)}
                                                    disabled={saving === post.id}
                                                    className={`p-1.5 rounded-md transition-colors ${post.active ? 'text-blue-400 hover:text-blue-300' : 'text-gray-600 hover:text-gray-400'}`}
                                                    title={post.active ? '비활성화' : '활성화'}
                                                >
                                                    {saving === post.id ? <Loader2 size={14} className="animate-spin" /> : post.active ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>
                                                {/* 삭제 */}
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    disabled={saving === post.id}
                                                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-md"
                                                    title="삭제"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-3">{post.content}</p>

                                        <button
                                            onClick={() => { setEditId(post.id); setEditTitle(post.title); setEditContent(post.content); }}
                                            className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
                                        >
                                            수정
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
