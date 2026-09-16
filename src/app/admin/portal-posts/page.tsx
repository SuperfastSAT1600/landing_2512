'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Eye, EyeOff, ChevronUp, ChevronDown, X, Search, ExternalLink } from 'lucide-react';
import type { PortalPost, PortalPostButton } from '@/lib/config';

function adminKey() {
    return typeof window !== 'undefined' ? (localStorage.getItem('admin_key') || '') : '';
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface ButtonField {
    text: string;
    url: string;
}

function ButtonEditor({
    buttons,
    onChange,
}: {
    buttons: ButtonField[];
    onChange: (buttons: ButtonField[]) => void;
}) {
    function add() {
        if (buttons.length >= 3) return;
        onChange([...buttons, { text: '', url: '' }]);
    }

    function remove(i: number) {
        onChange(buttons.filter((_, idx) => idx !== i));
    }

    function update(i: number, field: 'text' | 'url', value: string) {
        const next = buttons.map((b, idx) => idx === i ? { ...b, [field]: value } : b);
        onChange(next);
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-xs text-gray-500">버튼 (선택사항, 최대 3개)</label>
                {buttons.length < 3 && (
                    <button
                        type="button"
                        onClick={add}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <Plus size={12} />
                        버튼 추가
                    </button>
                )}
            </div>
            {buttons.map((btn, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={btn.text}
                        onChange={e => update(i, 'text', e.target.value)}
                        placeholder="버튼 이름"
                        className="flex-1 bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 text-white text-xs outline-none transition-all"
                    />
                    <input
                        type="url"
                        value={btn.url}
                        onChange={e => update(i, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-[2] bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 text-white text-xs outline-none transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => remove(i)}
                        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

interface PreviewStudent {
    name: string;
    portal_token: string | null;
}

function UserPreviewSection({ activePosts }: { activePosts: PortalPost[] }) {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [students, setStudents] = useState<PreviewStudent[]>([]);
    const [selected, setSelected] = useState<PreviewStudent | null>(null);
    const [searched, setSearched] = useState(false);
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
    const [togglingId, setTogglingId] = useState<string | null>(null);

    async function handleSearch() {
        if (!query.trim()) return;
        setSearching(true);
        setSelected(null);
        setSearched(false);
        setExcludedIds(new Set());
        try {
            const r = await fetch(
                `/api/admin/portal-posts/preview?name=${encodeURIComponent(query.trim())}`,
                { headers: { 'x-admin-key': adminKey() } }
            );
            const data = await r.json() as { students: PreviewStudent[]; activePosts: PortalPost[] };
            setStudents(data.students);
        } finally {
            setSearching(false);
            setSearched(true);
        }
    }

    async function selectStudent(s: PreviewStudent) {
        setSelected(s);
        if (!s.portal_token) return;
        const r = await fetch(
            `/api/admin/portal-posts/exclusions?token=${encodeURIComponent(s.portal_token)}`,
            { headers: { 'x-admin-key': adminKey() } }
        );
        const data = await r.json() as { excludedPostIds: string[] };
        setExcludedIds(new Set(data.excludedPostIds));
    }

    async function toggleHidden(postId: string) {
        if (!selected?.portal_token) return;
        const nowHidden = !excludedIds.has(postId);
        setTogglingId(postId);
        const r = await fetch('/api/admin/portal-posts/exclusions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() },
            body: JSON.stringify({ portal_token: selected.portal_token, post_id: postId, hidden: nowHidden }),
        });
        const data = await r.json() as { excludedPostIds: string[] };
        setExcludedIds(new Set(data.excludedPostIds));
        setTogglingId(null);
    }

    function reset() {
        setSelected(null);
        setStudents([]);
        setSearched(false);
        setQuery('');
        setExcludedIds(new Set());
    }

    const portalUrl = selected?.portal_token
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${selected.portal_token}`
        : null;

    const visibleCount = activePosts.filter(p => !excludedIds.has(p.id)).length;

    return (
        <section className="bg-[#1e2023] rounded-xl p-6 space-y-4 border border-white/5">
            <h2 className="text-base font-semibold text-white">학생별 게시글 노출 관리</h2>
            <p className="text-xs text-gray-500">학생 이름으로 검색해 노출 중인 게시글을 확인하고 개별로 숨기거나 다시 보일 수 있습니다.</p>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="학생 이름 입력"
                    className="flex-1 bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-all"
                />
                <button
                    onClick={handleSearch}
                    disabled={searching || !query.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0"
                >
                    {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    검색
                </button>
            </div>

            {searched && students.length === 0 && (
                <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
            )}

            {students.length > 0 && !selected && (
                <div className="space-y-1">
                    <p className="text-xs text-gray-500 mb-2">{students.length}명 검색됨 — 학생을 선택하세요</p>
                    {students.map(s => (
                        <button
                            key={s.portal_token ?? s.name}
                            onClick={() => selectStudent(s)}
                            className="w-full text-left px-4 py-2.5 rounded-lg bg-[#151719] hover:bg-white/5 text-sm text-white border border-white/5 transition-colors flex items-center justify-between"
                        >
                            <span>{s.name}</span>
                            {!s.portal_token && <span className="text-xs text-gray-600">포털 토큰 없음</span>}
                        </button>
                    ))}
                </div>
            )}

            {selected && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-white">{selected.name} 학생</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                노출 중 {visibleCount}개 · 숨김 {excludedIds.size}개
                            </p>
                            {portalUrl && (
                                <a
                                    href={portalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-0.5 transition-colors"
                                >
                                    포털 열기 <ExternalLink size={10} />
                                </a>
                            )}
                            {!selected.portal_token && (
                                <p className="text-xs text-red-400 mt-0.5">포털 토큰이 없어 숨기기 기능을 사용할 수 없습니다.</p>
                            )}
                        </div>
                        <button onClick={reset} className="text-xs text-gray-500 hover:text-white transition-colors">
                            초기화
                        </button>
                    </div>

                    <div className="border-t border-white/5 pt-3 space-y-2">
                        {activePosts.length === 0 ? (
                            <p className="text-xs text-gray-600">활성 게시글이 없습니다.</p>
                        ) : (
                            activePosts.map(post => {
                                const hidden = excludedIds.has(post.id);
                                const toggling = togglingId === post.id;
                                return (
                                    <div
                                        key={post.id}
                                        className={`flex items-start gap-3 bg-[#151719] rounded-lg px-4 py-3 border transition-all ${hidden ? 'border-white/5 opacity-50' : 'border-white/5'}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm font-medium ${hidden ? 'text-gray-500' : 'text-white'}`}>
                                                {post.title}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-1 whitespace-pre-wrap">{post.content}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                            {hidden && (
                                                <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">숨김</span>
                                            )}
                                            <button
                                                onClick={() => toggleHidden(post.id)}
                                                disabled={toggling || !selected.portal_token}
                                                className={`p-1.5 rounded-md transition-colors disabled:opacity-30 ${hidden ? 'text-gray-600 hover:text-gray-300' : 'text-blue-400 hover:text-blue-300'}`}
                                                title={hidden ? '이 학생에게 다시 보이기' : '이 학생에게 숨기기'}
                                            >
                                                {toggling
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : hidden ? <EyeOff size={14} /> : <Eye size={14} />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

export default function AdminPortalPosts() {
    const [posts, setPosts] = useState<PortalPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newButtons, setNewButtons] = useState<ButtonField[]>([]);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editButtons, setEditButtons] = useState<ButtonField[]>([]);
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
        const validButtons = newButtons.filter(b => b.text.trim() && b.url.trim());
        const r = await fetch('/api/admin/portal-posts', {
            method: 'POST',
            headers,
            body: JSON.stringify({ title: newTitle, content: newContent, buttons: validButtons }),
        });
        if (r.ok) {
            setNewTitle(''); setNewContent(''); setNewButtons([]); setShowForm(false);
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
        const validButtons = editButtons.filter(b => b.text.trim() && b.url.trim());
        await fetch(`/api/admin/portal-posts/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ title: editTitle, content: editContent, buttons: validButtons }),
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

    function startEdit(post: PortalPost) {
        setEditId(post.id);
        setEditTitle(post.title);
        setEditContent(post.content);
        setEditButtons((post.buttons ?? []).map(b => ({ text: b.text, url: b.url })));
    }

    const activePosts = posts.filter(p => p.active);

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
                        <ButtonEditor buttons={newButtons} onChange={setNewButtons} />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { setShowForm(false); setNewTitle(''); setNewContent(''); setNewButtons([]); }}
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
                                        <ButtonEditor buttons={editButtons} onChange={setEditButtons} />
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
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-white truncate">{post.title}</p>
                                                    {post.toolId && (
                                                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20">
                                                            툴 카드
                                                        </span>
                                                    )}
                                                </div>
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

                                        {post.buttons && post.buttons.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {post.buttons.map((btn: PortalPostButton, i: number) => (
                                                    <a
                                                        key={i}
                                                        href={btn.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 hover:bg-blue-500/25 transition-colors"
                                                    >
                                                        {btn.text}
                                                        <ExternalLink size={9} />
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => startEdit(post)}
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

                {/* 유저별 포털 게시글 조회 */}
                <UserPreviewSection activePosts={activePosts} />
            </main>
        </div>
    );
}
