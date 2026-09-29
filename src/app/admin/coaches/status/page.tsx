'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';
import Link from 'next/link';
import { CoachData } from '@/lib/coaches-data';
import type { CoachStat } from '@/app/api/admin/coaches/stats/route';

function getAdminKey(): string {
    return localStorage.getItem('admin_key') || '';
}

type SortKey = 'name' | 'enrolled' | 'total' | 'hours';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
    if (col !== sortKey) return <ChevronsUpDown size={12} className="text-gray-600" />;
    return sortDir === 'asc'
        ? <ChevronUp size={12} className="text-blue-400" />
        : <ChevronDown size={12} className="text-blue-400" />;
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
            className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap ${className}`}
        >
            <span className="flex items-center gap-1">
                {label}
                <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
            </span>
        </th>
    );
}

export default function CoachStatusPage() {
    const [coaches, setCoaches] = useState<CoachData[]>([]);
    const [stats, setStats] = useState<Record<string, CoachStat>>({});
    const [uniqueActiveStudentCount, setUniqueActiveStudentCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statLoading, setStatLoading] = useState(true);
    const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 필터 & 정렬 상태
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [sortKey, setSortKey] = useState<SortKey>('enrolled');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

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
            const data: { stats?: Record<string, CoachStat>; uniqueActiveStudentCount?: number } = await res.json();
            if (data.stats) setStats(data.stats);
            if (data.uniqueActiveStudentCount != null) setUniqueActiveStudentCount(data.uniqueActiveStudentCount);
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
            if (sortKey === 'enrolled') return s?.activeStudentCount ?? 0;
            if (sortKey === 'total') return s?.studentCount ?? 0;
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
    const summaryEnrolled = uniqueActiveStudentCount; // 유니크 재원생 (중복 제거)
    const summaryTotal = activeCoaches.reduce((s, c) => s + (stats[c.slug]?.studentCount ?? 0), 0);
    const summaryHours = activeCoaches.reduce((s, c) => s + (stats[c.slug]?.totalHours ?? 0), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#151719] text-gray-100 font-sans">
            <main className="p-8 pb-20 max-w-6xl space-y-5">

                {/* 헤더 */}
                <div className="flex items-center gap-3">
                    <Link href="/admin/coaches" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft size={16} />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Coach Status</h1>
                    <span className="text-sm text-gray-500">
                        활성 {activeCoaches.length} · 전체 {coaches.length}
                    </span>
                </div>

                {/* 요약 카드 (활성 코치 기준) */}
                {!statLoading && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: '재원생 합계', value: summaryEnrolled, unit: '명', color: 'text-emerald-300', desc: '유니크 재원생 (중복 제거)' },
                            { label: '전체 학생 합계', value: summaryTotal, unit: '명', color: 'text-white', desc: '활성 코치 누적 담당' },
                            { label: '누적 수업 시간', value: Math.round(summaryHours * 10) / 10, unit: 'h', color: 'text-blue-300', desc: '활성 코치 contracted' },
                        ].map(item => (
                            <div key={item.label} className="bg-[#1e2023] rounded-xl border border-white/5 px-5 py-4">
                                <p className="text-[11px] text-gray-500 mb-1">{item.label}</p>
                                <p className={`text-2xl font-bold ${item.color}`}>
                                    {item.value}<span className="text-sm font-normal ml-1 text-gray-400">{item.unit}</span>
                                </p>
                                <p className="text-[11px] text-gray-600 mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
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
                            className="pl-8 pr-8 py-2 bg-[#1e2023] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 w-48"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* 상태 필터 */}
                    <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs font-semibold">
                        {(['all', 'active', 'inactive'] as StatusFilter[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setStatusFilter(v)}
                                className={`px-3 py-2 transition-colors ${statusFilter === v ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {v === 'all' ? '전체' : v === 'active' ? '활성' : '비활성'}
                            </button>
                        ))}
                    </div>

                    {/* 과목 필터 */}
                    {allSubjects.length > 0 && (
                        <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs font-semibold">
                            <button
                                onClick={() => setSubjectFilter('all')}
                                className={`px-3 py-2 transition-colors ${subjectFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                전과목
                            </button>
                            {allSubjects.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSubjectFilter(s)}
                                    className={`px-3 py-2 transition-colors ${subjectFilter === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <span className="ml-auto text-xs text-gray-600">{sorted.length}명 표시</span>
                </div>

                {/* 테이블 */}
                <div className="bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b border-white/5 bg-white/[0.02]">
                            <tr>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-8">#</th>
                                <Th label="코치" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[160px]" />
                                <Th label="재원생" col="enrolled" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                <Th label="전체 학생" col="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                <Th label="누적 시간" col="hours" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">과목</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {sorted.map((coach, idx) => {
                                const stat = stats[coach.slug];
                                const enrolled = stat?.activeStudentCount ?? 0;
                                const total = stat?.studentCount ?? 0;
                                const hours = stat?.totalHours ?? 0;
                                const initials = coach.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                                const isInactive = !coach.isActive;

                                return (
                                    <tr key={coach.slug} className={`hover:bg-white/[0.02] transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                                        {/* 순번 */}
                                        <td className="px-4 py-3 text-[11px] text-gray-600 font-mono">{idx + 1}</td>

                                        {/* 코치 */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                {coach.photo ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={coach.photo} alt={coach.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full shrink-0 bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-300">
                                                        {initials}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-white text-[13px] truncate">
                                                        {coach.isHeadCoach && <span className="mr-1 text-[11px]">⭐</span>}
                                                        {coach.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-600 font-mono">/{coach.slug}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 재원생 */}
                                        <td className="px-4 py-3">
                                            {statLoading ? (
                                                <span className="h-4 w-10 bg-white/5 rounded animate-pulse inline-block" />
                                            ) : (
                                                <span className={`text-sm font-bold ${enrolled > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
                                                    {enrolled}
                                                    <span className="text-[11px] font-normal text-gray-500 ml-0.5">명</span>
                                                </span>
                                            )}
                                        </td>

                                        {/* 전체 학생 */}
                                        <td className="px-4 py-3">
                                            {statLoading ? (
                                                <span className="h-4 w-10 bg-white/5 rounded animate-pulse inline-block" />
                                            ) : (
                                                <span className="text-sm font-semibold text-gray-300">
                                                    {total}
                                                    <span className="text-[11px] font-normal text-gray-500 ml-0.5">명</span>
                                                </span>
                                            )}
                                        </td>

                                        {/* 누적 시간 */}
                                        <td className="px-4 py-3">
                                            {statLoading ? (
                                                <span className="h-4 w-12 bg-white/5 rounded animate-pulse inline-block" />
                                            ) : (
                                                <span className={`text-sm font-semibold ${hours > 0 ? 'text-blue-300' : 'text-gray-600'}`}>
                                                    {hours}
                                                    <span className="text-[11px] font-normal text-gray-500 ml-0.5">h</span>
                                                </span>
                                            )}
                                        </td>

                                        {/* 과목 */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(coach.subjects ?? []).map(s => (
                                                    <span key={s} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>

                                        {/* 상태 토글 */}
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleToggle(coach.slug, coach.isActive)}
                                                disabled={togglingSlug === coach.slug}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    coach.isActive
                                                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                                                        : 'bg-gray-500/10 border-gray-600/30 text-gray-400 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400'
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
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-600">
                                        조건에 맞는 코치가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    );
}
