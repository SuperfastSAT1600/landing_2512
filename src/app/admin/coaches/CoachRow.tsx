'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Copy, Check, Edit2, X, Save, Upload } from 'lucide-react';
import { CoachData } from '@/lib/coaches-data';
import { ReelUrlsEditor } from './ReelUrlsEditor';
import { isValidInstagramUrl } from '@/lib/instagram-url';

interface CoachRowProps {
    coach: CoachData;
    onUpdate: (slug: string, updates: Partial<CoachData>) => Promise<void>;
    onDelete: (slug: string) => Promise<void>;
}

interface EditState {
    name: string;
    photo: string;
    bio: string;
    introPostSlug: string;
    curriculumPostSlug: string;
    reelUrls: string[];
}

interface PostOption {
    id: string;
    title: string;
}

function getAdminKey(): string {
    return localStorage.getItem('admin_key') || '';
}

export function CoachRow({ coach, onUpdate, onDelete }: CoachRowProps) {
    const [editing, setEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [editState, setEditState] = useState<EditState>({
        name: coach.name,
        photo: coach.photo,
        bio: coach.bio,
        introPostSlug: coach.introPostSlug,
        curriculumPostSlug: coach.curriculumPostSlug,
        reelUrls: coach.reelUrls ?? [],
    });
    const [posts, setPosts] = useState<PostOption[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!editing) return;
        fetch(`/api/admin/posts?author=${encodeURIComponent(coach.name)}`, {
            headers: { 'x-admin-key': getAdminKey() },
        })
            .then(r => r.json())
            .then((data: { success: boolean; posts?: PostOption[] }) => {
                if (data.success && data.posts) setPosts(data.posts);
            })
            .catch(() => {});
    }, [editing, coach.name]);

    const handlePhotoUpload = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'x-admin-key': getAdminKey() },
                body: formData,
            });
            const data: { success: boolean; url?: string } = await res.json();
            if (data.success && data.url) {
                setEditState(s => ({ ...s, photo: data.url! }));
            } else {
                alert('업로드에 실패했습니다.');
            }
        } catch {
            alert('업로드 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const handleCopyLink = () => {
        const url = window.location.origin + '/reviews/write?coach=' + coach.slug;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleCopyCoachLink = () => {
        const url = window.location.origin + '/coaches/' + coach.slug;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        });
    };

    const handleSave = async () => {
        await onUpdate(coach.slug, editState);
        setEditing(false);
    };

    const handleCancelEdit = () => {
        setEditState({
            name: coach.name,
            photo: coach.photo,
            bio: coach.bio,
            introPostSlug: coach.introPostSlug,
            curriculumPostSlug: coach.curriculumPostSlug,
            reelUrls: coach.reelUrls ?? [],
        });
        setEditing(false);
    };

    const hasInvalidUrls = editState.reelUrls.some(u => u !== '' && !isValidInstagramUrl(u));

    return (
        <div className="bg-[#1e2023] rounded-xl border border-white/5 p-5 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-white text-base">{coach.name}</span>
                <span className="text-xs text-gray-500 font-mono">/{coach.slug}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${coach.isActive ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                    {coach.isActive ? 'Active' : 'Inactive'}
                </span>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => setEditing(v => !v)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Edit"
                    >
                        {editing ? <X size={14} /> : <Edit2 size={14} />}
                    </button>
                    <button
                        onClick={handleCopyCoachLink}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copiedLink ? 'bg-green-600 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-200'}`}
                    >
                        {copiedLink ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> 코치 링크</>}
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-600 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-200'}`}
                    >
                        {copied ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> 리뷰 링크</>}
                    </button>
                    <button
                        onClick={() => onUpdate(coach.slug, { isActive: !coach.isActive })}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 transition-colors"
                    >
                        {coach.isActive ? '비활성화' : '활성화'}
                    </button>
                    <button
                        onClick={() => onDelete(coach.slug)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {editing && (
                <div className="space-y-3 border-t border-white/5 pt-3">
                    {/* 이름 */}
                    <input
                        value={editState.name}
                        onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                        placeholder="이름"
                        className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                    />

                    {/* 프로필 사진 */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">프로필 사진</label>
                        <div className="flex items-center gap-2">
                            {editState.photo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={editState.photo} alt="preview" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                            )}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg text-xs font-bold text-gray-300 transition-colors"
                            >
                                <Upload size={12} />
                                {uploading ? '업로드 중...' : '파일 선택'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePhotoUpload(file);
                                }}
                            />
                            {editState.photo && (
                                <span className="text-[11px] text-gray-500 truncate max-w-[160px]">{editState.photo.split('/').pop()}</span>
                            )}
                        </div>
                    </div>

                    {/* 소개글 */}
                    <textarea
                        value={editState.bio}
                        onChange={e => setEditState(s => ({ ...s, bio: e.target.value }))}
                        placeholder="소개글"
                        rows={3}
                        className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none resize-none"
                    />

                    {/* 코치 소개 포스팅 선택 */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">코치 소개 포스팅</label>
                        {posts.length > 0 ? (
                            <select
                                value={editState.introPostSlug}
                                onChange={e => setEditState(s => ({ ...s, introPostSlug: e.target.value }))}
                                className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                            >
                                <option value="">선택 안 함</option>
                                {posts.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-xs text-gray-500 px-1">이 코치 이름으로 작성된 포스팅이 없습니다.</p>
                        )}
                    </div>

                    {/* 영상 (릴스) URL */}
                    <ReelUrlsEditor
                        urls={editState.reelUrls}
                        onChange={urls => setEditState(s => ({ ...s, reelUrls: urls }))}
                    />

                    {/* 커리큘럼 포스팅 선택 */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">커리큘럼 포스팅</label>
                        {posts.length > 0 ? (
                            <select
                                value={editState.curriculumPostSlug}
                                onChange={e => setEditState(s => ({ ...s, curriculumPostSlug: e.target.value }))}
                                className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                            >
                                <option value="">선택 안 함</option>
                                {posts.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-xs text-gray-500 px-1">이 코치 이름으로 작성된 포스팅이 없습니다.</p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={hasInvalidUrls}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-white transition-colors"
                        >
                            <Save size={13} /> 저장
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold text-gray-400 transition-colors"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
