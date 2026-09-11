'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Copy, Check, Edit2, X, Save, Upload, Link as LinkIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { CoachData, ProfileStatus } from '@/lib/coaches-data';
import { ReelUrlsEditor } from './ReelUrlsEditor';
import { CoachBioEditor } from './CoachBioEditor';
import { isValidInstagramUrl } from '@/lib/instagram-url';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface CoachRowProps {
    coach: CoachData;
    onUpdate: (slug: string, updates: Partial<CoachData>) => Promise<void>;
    onDelete: (slug: string) => Promise<void>;
}

interface InviteInfo {
    token: string;
    expires_at: string;
    used_at: string | null;
}

interface EditState {
    name: string;
    photo: string;
    bio: string;
    introPostSlug: string;
    curriculumPostSlug: string;
    reelUrls: string[];
    subjects: string[];
    isHeadCoach: boolean;
    v2UserId: string | null;
}

interface V2Teacher {
    id: string;
    full_name: string;
    email: string | null;
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
        subjects: coach.subjects ?? [],
        isHeadCoach: coach.isHeadCoach ?? false,
        v2UserId: coach.v2UserId ?? null,
    });
    const [posts, setPosts] = useState<PostOption[]>([]);
    const [v2Teachers, setV2Teachers] = useState<V2Teacher[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submission, setSubmission] = useState<Record<string, unknown> | null>(null);
    const [generating, setGenerating] = useState(false);
    const [invite, setInvite] = useState<InviteInfo | null | undefined>(undefined); // undefined = loading
    const [copiedOnboarding, setCopiedOnboarding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch(`/api/coach-onboarding/invite?coach_slug=${coach.slug}`, {
            headers: { 'x-admin-key': getAdminKey() },
        })
            .then(r => r.json())
            .then((d: { data?: InviteInfo | null }) => setInvite(d.data ?? null))
            .catch(() => setInvite(null));
    }, [coach.slug]);

    useEffect(() => {
        if (!editing) return;
        fetch(`/api/admin/posts?author=${encodeURIComponent(coach.name)}`, {
            headers: { 'x-admin-key': getAdminKey() },
        })
            .then(r => r.json())
            .then((data: { success: boolean; posts?: PostOption[] }) => {
                if (data.success && data.posts) setPosts(data.posts);
            })
            .catch((err) => console.error('[CoachRow] posts fetch failed:', err));

        fetch('/api/admin/coaches/v2-teachers', {
            headers: { 'x-admin-key': getAdminKey() },
        })
            .then(r => r.json())
            .then((data: { data?: V2Teacher[] }) => {
                if (data.data) setV2Teachers(data.data);
            })
            .catch((err) => console.error('[CoachRow] v2 teachers fetch failed:', err));

        fetch(`/api/admin/coach-onboarding?coach_slug=${coach.slug}`, {
            headers: { 'x-admin-key': getAdminKey() },
        })
            .then(r => r.json())
            .then((data: { data?: Record<string, unknown> | null }) => {
                if (data.data) setSubmission(data.data);
            })
            .catch(() => null);
    }, [editing, coach.name, coach.slug]);

    const handleGenerateBio = async () => {
        if (!submission) return;
        setGenerating(true);
        try {
            const li = (text: string) => `<li><p style="text-align: left;">${text}</p></li>`;
            const ROLES: Record<string, string> = { instructor: '강사', ta: 'TA', other: '기타' };

            const educationItems: string[] = [];
            const university = submission.university as string ?? '';
            const major = submission.undergrad_major as string ?? '';
            if (university) educationItems.push(major ? `${university} ${major}` : university);
            const gradSchool = submission.grad_school as string | null;
            const gradMajor = submission.grad_major as string | null;
            if (gradSchool) educationItems.push(gradMajor ? `${gradSchool} ${gradMajor}` : gradSchool);
            const highSchool = submission.high_school as string | null;
            if (highSchool) educationItems.push(highSchool);
            const rw = submission.sat_rw_score as number | null;
            const math = submission.sat_math_score as number | null;
            if (rw && math) educationItems.push(`SAT ${rw + math}점 (RW:${rw} / Math:${math})`);

            const careerItems: string[] = [];
            const years = submission.teaching_years as number | null;
            const hours = submission.teaching_hours_total as number | null;
            const students = submission.students_taught as number | null;
            const parts: string[] = years ? [`수업 경력 ${years}년`] : [];
            if (hours) parts.push(`누적 ${hours}시간`);
            if (students) parts.push(`${students}명 지도`);
            if (parts.length) careerItems.push(parts.join(', '));
            const academies = submission.past_academies as Array<{ name: string; role: string }> | null ?? [];
            for (const a of academies) {
                careerItems.push(`${a.name.trim()} (${ROLES[a.role] ?? a.role})`);
            }

            const eduSection = educationItems.length > 0
                ? `<p style="text-align: left;">🏛️ <strong>학력</strong></p><ul>${educationItems.map(li).join('')}</ul>`
                : '';
            const carSection = careerItems.length > 0
                ? `<p style="text-align: left;">📝 <strong>경력</strong></p><ul>${careerItems.map(li).join('')}</ul>`
                : '';
            const bio = [eduSection, carSection].filter(Boolean).join('<p style="text-align: left;"></p>') + '<p></p>';

            const subjectList = submission.subjects as string[] ?? [];
            const inferredSubjects: string[] = [];
            if (subjectList.some((s: string) => s.startsWith('SAT'))) inferredSubjects.push('SAT');
            if (subjectList.some((s: string) => s.startsWith('AP'))) inferredSubjects.push('AP');

            setEditState(s => ({
                ...s,
                bio,
                subjects: inferredSubjects.length > 0 ? inferredSubjects : s.subjects,
            }));
        } finally {
            setGenerating(false);
        }
    };

    const handlePhotoUpload = async (file: File) => {
        setUploading(true);
        try {
            const urlRes = await fetch('/api/admin/upload-url', {
                method: 'POST',
                headers: {
                    'x-admin-key': getAdminKey(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename: file.name, contentType: file.type }),
            });
            const urlData: { success: boolean; path?: string; token?: string; error?: string } = await urlRes.json();
            if (!urlData.success || !urlData.path || !urlData.token) {
                alert('업로드 URL 발급 실패: ' + (urlData.error ?? '알 수 없는 오류'));
                return;
            }

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .uploadToSignedUrl(urlData.path, urlData.token, file, { contentType: file.type });

            if (uploadError) {
                alert('업로드 실패: ' + uploadError.message);
                return;
            }

            const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(urlData.path);
            setEditState(s => ({ ...s, photo: publicUrl }));
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

    const [savingStatus, setSavingStatus] = useState(false);

    const inviteStatus = (() => {
        if (invite === undefined) return 'loading';
        if (!invite) return 'none';
        if (invite.used_at) return 'submitted';
        if (new Date(invite.expires_at) < new Date()) return 'expired';
        return 'valid';
    })();

    const handleProfileStatusChange = async (status: ProfileStatus) => {
        setSavingStatus(true);
        try {
            await onUpdate(coach.slug, { profileStatus: status });
        } finally {
            setSavingStatus(false);
        }
    };

    const handleCopyOnboardingLink = () => {
        if (!invite || inviteStatus !== 'valid') return;
        const url = window.location.origin + '/coach-onboarding/' + invite.token;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedOnboarding(true);
            setTimeout(() => setCopiedOnboarding(false), 2000);
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
            subjects: coach.subjects ?? [],
            isHeadCoach: coach.isHeadCoach ?? false,
            v2UserId: coach.v2UserId ?? null,
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
                {coach.isHeadCoach && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-yellow-500/10 text-yellow-400">
                        ⭐ 대표코치
                    </span>
                )}
                {coach.v2UserId ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-purple-500/10 text-purple-400">
                        V2 연결됨
                    </span>
                ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-yellow-500/10 text-yellow-500">
                        V2 미연결
                    </span>
                )}
                {inviteStatus === 'none' ? (
                    <select
                        value={coach.profileStatus ?? 'none'}
                        onChange={e => handleProfileStatusChange(e.target.value as ProfileStatus)}
                        disabled={savingStatus}
                        className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-gray-500/10 text-gray-400 border border-white/10 cursor-pointer disabled:opacity-50 appearance-none"
                    >
                        <option value="none">프로필 작성전</option>
                        <option value="in_progress">프로필 작성 중</option>
                        <option value="submitted">프로필 제출 완료</option>
                        <option value="expired">프로필 링크 만료</option>
                    </select>
                ) : (
                    <>
                        {inviteStatus === 'valid' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-blue-500/10 text-blue-400">
                                프로필 작성 중
                            </span>
                        )}
                        {inviteStatus === 'submitted' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-green-500/10 text-green-400">
                                프로필 제출 완료
                            </span>
                        )}
                        {inviteStatus === 'expired' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-orange-500/10 text-orange-400">
                                프로필 링크 만료
                            </span>
                        )}
                    </>
                )}

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
                    {inviteStatus === 'valid' && (
                        <button
                            onClick={handleCopyOnboardingLink}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copiedOnboarding ? 'bg-green-600 text-white' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'}`}
                        >
                            {copiedOnboarding ? <><Check size={12} /> 복사됨</> : <><LinkIcon size={12} /> 온보딩 링크</>}
                        </button>
                    )}
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
                    {/* 소개글 자동 생성 */}
                    {submission && (
                        <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-xs text-blue-400">온보딩 제출 데이터로 소개글을 자동 생성합니다.</p>
                            <button
                                onClick={handleGenerateBio}
                                disabled={generating}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs font-bold text-white transition-colors"
                            >
                                {generating ? '생성 중...' : '소개글 자동 생성'}
                            </button>
                        </div>
                    )}

                    {/* 이름 */}
                    <input
                        value={editState.name}
                        onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                        placeholder="이름"
                        className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                    />

                    {/* 담당 과목 */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">담당 과목</label>
                        <div className="flex gap-3">
                            {(['SAT', 'AP'] as const).map((subject) => {
                                const checked = editState.subjects.includes(subject);
                                return (
                                    <button
                                        key={subject}
                                        type="button"
                                        onClick={() => {
                                            setEditState(s => ({
                                                ...s,
                                                subjects: checked
                                                    ? s.subjects.filter(v => v !== subject)
                                                    : [...s.subjects, subject],
                                            }));
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                            checked
                                                ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {subject}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 대표코치 */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">대표코치</label>
                        <button
                            type="button"
                            onClick={() => setEditState(s => ({ ...s, isHeadCoach: !s.isHeadCoach }))}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                editState.isHeadCoach
                                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            {editState.isHeadCoach ? '⭐ 대표코치' : '대표코치 아님'}
                        </button>
                    </div>

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
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">소개글</label>
                        <CoachBioEditor
                            value={editState.bio}
                            onChange={html => setEditState(s => ({ ...s, bio: html }))}
                        />
                    </div>

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

                    {/* v2 계정 연결 */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">V2 계정 연결</label>
                        <select
                            value={editState.v2UserId ?? ''}
                            onChange={e => setEditState(s => ({ ...s, v2UserId: e.target.value || null }))}
                            className="w-full bg-[#151719] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                        >
                            <option value="">연결 안 함</option>
                            {v2Teachers.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.full_name}{t.email ? ` (${t.email})` : ''}
                                </option>
                            ))}
                        </select>
                        {v2Teachers.length === 0 && (
                            <p className="text-xs text-gray-500 px-1">v2 teacher 계정을 불러오는 중...</p>
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
