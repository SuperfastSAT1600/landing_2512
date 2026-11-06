'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';
import Link from 'next/link';
import { CoachData } from '@/lib/coaches-data';
import type { CoachStat } from '@/app/api/admin/coaches/stats/route';
import { groupSubjectDetails } from '@/lib/coach-subject-details';
import { broadSubjectsFor } from '@/lib/coach-subject-options';
import { SubjectEditorModal } from './SubjectEditorModal';

function getAdminKey(): string {
    return localStorage.getItem('admin_key') || '';
}

type SortKey = 'name' | 'hours';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
    if (col !== sortKey) return <ChevronsUpDown size={12} className="text-gray-400" />;
    return sortDir === 'asc'
        ? <ChevronUp size={12} className="text-blue-600" />
        : <ChevronDown size={12} className="text-blue-600" />;
}

function Th({
    label, col, sortKey, sortDir, onSort, className = '',
}: {
    label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir;
    onSort: (c: SortKey) => void; className?: string;
}) {
    return (
        <th
            onClick={() => onSort(col)}
            className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-gray-900 transition-colors whitespace-nowrap ${className}`}
        >
            <span className="flex items-center gap-1">
                {label}
                <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
            </span>
        </th>
    );
}

function SubjectRow({ label, items }: { label: string; items: string[] }) {
    if (items.length === 0) return null;
    return (
        <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 w-6 shrink-0">{label}</span>
            <span className="text-[11px] text-gray-700 leading-snug">{items.join(' · ')}</span>
        </div>
    );
}

function SubjectCell({ coach }: { coach: CoachData }) {
    const { sat, ap, other } = groupSubjectDetails(coach.subjectDetails);
    if (sat.length + ap.length + other.length === 0) {
        return (
            <div className="flex flex-wrap gap-1">
                {(coach.subjects ?? []).map(s => (
                    <span key={s} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                        {s}
                    </span>
                ))}
            </div>
        );
    }
    return (
        <div className="space-y-0.5 min-w-[180px]">
            <SubjectRow label="SAT" items={sat} />
            <SubjectRow label="AP" items={ap} />
            <SubjectRow label="기타" items={other} />
        </div>
    );
}

export default function CoachStatusPage() {
    const [coaches, setCoaches] = useState<CoachData[]>([]);
    const [stats, setStats] = useState<Record<string, CoachStat>>({});
    const [loading, setLoading] = useState(true);
    const [statLoading, setStatLoading] = useState(true);
    const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [savingSubjects, setSavingSubjects] = useState(false);
    const [subjectError, setSubjectError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 필터 & 정렬 상태
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    const fetchCoaches = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/coaches', {
                headers: { 'x-admin-key': getAdminKey() },
            });
            const data: { success: boolean; coaches: CoachData[] } = await res.json();
            if (data.success) setCoaches(data.coaches);
        } catch {
            setError('코치 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        setStatLoading(true);
        try {
            const res = await fetch('/api/admin/coaches/stats', {
                headers: { 'x-admin-key': getAdminKey() },
            });
            const data: { stats?: Record<string, CoachStat> } = await res.json();
            if (data.stats) setStats(data.stats);
        } catch {
            // non-fatal
        } finally {
            setStatLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCoaches();
        fetchStats();
    }, [fetchCoaches, fetchStats]);

    const handleToggle = async (slug: string, currentActive: boolean) => {
        setTogglingSlug(slug);
        setError(null);
        setCoaches(prev => prev.map(c => c.slug === slug ? { ...c, isActive: !currentActive } : c));
        try {
            const res = await fetch('/api/admin/coaches', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                body: JSON.stringify({ slug, isActive: !currentActive }),
            });
            if (!res.ok) throw new Error('업데이트 실패');
        } catch {
            setCoaches(prev => prev.map(c => c.slug === slug ? { ...c, isActive: currentActive } : c));
            setError(`${slug} 상태 변경에 실패했습니다.`);
        } finally {
            setTogglingSlug(null);
        }
        if (!currentActive) fetchCoaches(); // 활성화 시 서버가 채운 상세 과목 반영
    };

    const handleSaveSubjects = async (slug: string, details: string[]) => {
        setSavingSubjects(true);
        setSubjectError(null);
        const broad = broadSubjectsFor(details);
        try {
            const res = await fetch('/api/admin/coaches', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                body: JSON.stringify({ slug, subjectDetails: details, ...(broad ? { subjects: broad } : {}) }),
            });
            if (!res.ok) throw new Error('저장 실패');
            setCoaches(prev => prev.map(c => c.slug === slug
                ? { ...c, subjectDetails: details, subjects: broad ?? c.subjects }
                : c));
            setEditingSlug(null);
        } catch {
            setSubjectError('저장하지 못했습니다. 다시 시도해 주세요.');
        } finally {
            setSavingSubjects(false);
        }
    };

    const handleSort = (col: SortKey) => {
        if (col === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(col); setSortDir('desc'); }
    };

    // 전체 과목 목록
    const allSubjects = useMemo(() => {
        const set = new Set<string>();
        for (const c of coaches) for (const s of c.subjects ?? []) set.add(s);
        return [...set].sort();
    }, [coaches]);

    // 필터 + 정렬 적용
    const sorted = useMemo(() => {
        const filtered = coaches.filter(c => {
            if (statusFilter === 'active' && !c.isActive) return false;
            if (statusFilter === 'inactive' && c.isActive) return false;
            if (subjectFilter !== 'all' && !(c.subjects ?? []).includes(subjectFilter)) return false;
            if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
                !c.slug.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });

        const valueOf = (c: CoachData) => {
            const s = stats[c.slug];
            if (sortKey === 'name') return c.name.toLowerCase();
            if (sortKey === 'hours') return s?.totalHours ?? 0;
            return 0;
        };

        return [...filtered].sort((a, b) => {
            // 기본: 활성 먼저, 그 다음 정렬 기준 적용
            if (statusFilter === 'all' && a.isActive !== b.isActive) {
                return a.isActive ? -1 : 1;
            }
            const va = valueOf(a);
            const vb = valueOf(b);
            const cmp = typeof va === 'string'
                ? va.localeCompare(vb as string)
                : (va as number) - (vb as number);
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [coaches, stats, search, statusFilter, subjectFilter, sortKey, sortDir]);

    // 요약 집계 (활성 코치 기준)
    const activeCoaches = coaches.filter(c => c.isActive);
    const summaryHours = activeCoaches.reduce((s, c) => s + (stats[c.slug]?.totalHours ?? 0), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <main className="p-8 pb-20 max-w-6xl space-y-5">

                {/* 헤더 */}
                <div className="flex items-center gap-3">
                    <Link href="/admin/coaches" className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft size={16} />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Coach Status</h1>
                    <span className="text-sm text-gray-500">
                        활성 {activeCoaches.length} · 전체 {coaches.length}
                    </span>
                </div>

                {/* 요약 카드 (활성 코치 기준) */}
                {!statLoading && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: '누적 수업 시간', value: Math.round(summaryHours * 10) / 10, unit: 'h', color: 'text-blue-700', desc: '활성 코치 contracted' },
                        ].map(item => (
                            <div key={item.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                                <p className="text-[11px] text-gray-500 mb-1">{item.label}</p>
                                <p className={`text-2xl font-bold ${item.color}`}>
                                    {item.value}<span className="text-sm font-normal ml-1 text-gray-500">{item.unit}</span>
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* 필터 바 */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* 검색 */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="코치 이름 / slug"
                            className="pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 w-48"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* 상태 필터 */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                        {(['all', 'active', 'inactive'] as StatusFilter[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setStatusFilter(v)}
                                className={`px-3 py-2 transition-colors ${statusFilter === v ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {v === 'all' ? '전체' : v === 'active' ? '활성' : '비활성'}
                            </button>
                        ))}
                    </div>

                    {/* 과목 필터 */}
                    {allSubjects.length > 0 && (
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                            <button
                                onClick={() => setSubjectFilter('all')}
                                className={`px-3 py-2 transition-colors ${subjectFilter === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                전과목
                            </button>
                            {allSubjects.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSubjectFilter(s)}
                                    className={`px-3 py-2 transition-colors ${subjectFilter === s ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <span className="ml-auto text-xs text-gray-400">{sorted.length}명 표시</span>
                </div>

                {/* 테이블 */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-8">#</th>
                                <Th label="코치" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[160px]" />
                                <Th label="누적 시간" col="hours" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">과목</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sorted.map((coach, idx) => {
                                const stat = stats[coach.slug];
                                const hours = stat?.totalHours ?? 0;
                                const initials = coach.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                                const isInactive = !coach.isActive;

                                return (
                                    <tr key={coach.slug} className={`hover:bg-gray-50 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                                        {/* 순번 */}
                                        <td className="px-4 py-3 text-[11px] text-gray-400 font-mono">{idx + 1}</td>

                                        {/* 코치 */}
                                        <td className="px-4 py-3">
                                            <div
                                                className="flex items-center gap-2.5 cursor-pointer group"
                                                onClick={() => { setSubjectError(null); setEditingSlug(coach.slug); }}
                                                title="수업 가능 과목 편집"
                                            >
                                                {coach.photo ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={coach.photo} alt={coach.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full shrink-0 bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-700">
                                                        {initials}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-[13px] truncate group-hover:text-blue-600 transition-colors">
                                                        {coach.isHeadCoach && <span className="mr-1 text-[11px]">⭐</span>}
                                                        {coach.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-mono">/{coach.slug}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 누적 시간 */}
                                        <td className="px-4 py-3">
                                            {statLoading ? (
                                                <span className="h-4 w-12 bg-gray-100 rounded animate-pulse inline-block" />
                                            ) : (
                                                <span className={`text-sm font-semibold ${hours > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                                                    {hours}
                                                    <span className="text-[11px] font-normal text-gray-500 ml-0.5">h</span>
                                                </span>
                                            )}
                                        </td>

                                        {/* 과목 */}
                                        <td className="px-4 py-3">
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => { setSubjectError(null); setEditingSlug(coach.slug); }}
                                            >
                                                <SubjectCell coach={coach} />
                                            </div>
                                        </td>

                                        {/* 상태 토글 */}
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleToggle(coach.slug, coach.isActive)}
                                                disabled={togglingSlug === coach.slug}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    coach.isActive
                                                        ? 'bg-green-500/10 border-green-500/30 text-green-600 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600'
                                                        : 'bg-gray-500/10 border-gray-300 text-gray-500 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-600'
                                                }`}
                                            >
                                                {togglingSlug === coach.slug ? (
                                                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                ) : coach.isActive ? (
                                                    <ToggleRight size={13} />
                                                ) : (
                                                    <ToggleLeft size={13} />
                                                )}
                                                {coach.isActive ? '활성' : '비활성'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {sorted.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                                        조건에 맞는 코치가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </main>

            {editingSlug && (() => {
                const target = coaches.find(c => c.slug === editingSlug);
                return target && (
                    <SubjectEditorModal
                        key={target.slug}
                        coachName={target.name}
                        initial={target.subjectDetails ?? []}
                        saving={savingSubjects}
                        error={subjectError}
                        onSave={details => handleSaveSubjects(target.slug, details)}
                        onClose={() => setEditingSlug(null)}
                    />
                );
            })()}
        </div>
    );
}
