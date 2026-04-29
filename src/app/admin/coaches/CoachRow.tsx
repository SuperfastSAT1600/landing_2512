'use client';

import { useState } from 'react';
import { Trash2, Copy, Check, Edit2, X, Save } from 'lucide-react';
import { CoachData } from '@/lib/coaches-data';

interface CoachRowProps {
    coach: CoachData;
    onUpdate: (slug: string, updates: Partial<CoachData>) => Promise<void>;
    onDelete: (slug: string) => Promise<void>;
}

interface EditState {
    name: string;
    photo: string;
    bio: string;
    curriculumPostSlug: string;
}

export function CoachRow({ coach, onUpdate, onDelete }: CoachRowProps) {
    const [editing, setEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [editState, setEditState] = useState<EditState>({
        name: coach.name,
        photo: coach.photo,
        bio: coach.bio,
        curriculumPostSlug: coach.curriculumPostSlug,
    });

    const handleCopyLink = () => {
        const url = window.location.origin + '/reviews/write?coach=' + coach.slug;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
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
            curriculumPostSlug: coach.curriculumPostSlug,
        });
        setEditing(false);
    };

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
                        onClick={handleCopyLink}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-600 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-200'}`}
                        title="리뷰 링크 복사"
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
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {editing && (
                <div className="space-y-2 border-t border-white/5 pt-3">
                    <input
                        value={editState.name}
                        onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                        placeholder="이름"
                        className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                    />
                    <input
                        value={editState.photo}
                        onChange={e => setEditState(s => ({ ...s, photo: e.target.value }))}
                        placeholder="Photo URL"
                        className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                    />
                    <textarea
                        value={editState.bio}
                        onChange={e => setEditState(s => ({ ...s, bio: e.target.value }))}
                        placeholder="Bio"
                        rows={3}
                        className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none resize-none"
                    />
                    <input
                        value={editState.curriculumPostSlug}
                        onChange={e => setEditState(s => ({ ...s, curriculumPostSlug: e.target.value }))}
                        placeholder="Curriculum Post Slug"
                        className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                    />
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white transition-colors"
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
