'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ToggleLeft, ToggleRight, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import { CoachData } from '@/lib/coaches-data';
import type { CoachStat } from '@/app/api/admin/coaches/stats/route';

function getAdminKey(): string {
    return localStorage.getItem('admin_key') || '';
}

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <span className="flex items-center gap-1 text-[11px] text-gray-400" title={label}>
            {icon}
            {value}
        </span>
    );
}

function CoachStatusCard({
    coach,
    stat,
    statLoading,
    onToggle,
    toggling,
}: {
    coach: CoachData;
    stat: CoachStat | undefined;
    statLoading: boolean;
    onToggle: (slug: string, current: boolean) => void;
    toggling: boolean;
}) {
    const initials = coach.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex items-center gap-3 bg-[#1e2023] rounded-xl border border-white/5 p-3.5">
            {/* 프로필 사진 or 이니셜 */}
            {coach.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={coach.photo}
                    alt={coach.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10"
                />
            ) : (
                <div className="w-10 h-10 rounded-full shrink-0 bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300">
                    {initials}
                </div>
            )}

            {/* 이름 + slug + 스탯 */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                    {coach.isHeadCoach && <span className="mr-1">⭐</span>}
                    {coach.name}
                </p>
                <p className="text-[11px] text-gray-500 font-mono truncate">/{coach.slug}</p>

                {/* 학생 수 + 누적 시간 */}
                <div className="flex items-center gap-3 mt-1">
                    {statLoading ? (
                        <span className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                    ) : (
                        <>
                            <StatBadge
                                icon={<Users size={10} />}
                                value={`${stat?.studentCount ?? 0}명`}
                                label="현재 학생 수"
                            />
                            <StatBadge
                                icon={<Clock size={10} />}
                                value={`${stat?.totalHours ?? 0}h`}
                                label="누적 수업 시간"
                            />
                            {coach.subjects && coach.subjects.length > 0 && (
                                <span className="flex gap-1">
                                    {coach.subjects.map(s => (
                                        <span key={s} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                            {s}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 토글 버튼 */}
            <button
                onClick={() => onToggle(coach.slug, coach.isActive)}
                disabled={toggling}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    coach.isActive
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                        : 'bg-gray-500/10 border-gray-600/30 text-gray-400 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400'
                }`}
                title={coach.isActive ? '비활성화' : '활성화'}
            >
                {toggling ? (
                    <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                ) : coach.isActive ? (
                    <ToggleRight size={14} />
                ) : (
                    <ToggleLeft size={14} />
                )}
                {coach.isActive ? '활성' : '비활성'}
            </button>
        </div>
    );
}

export default function CoachStatusPage() {
    const [coaches, setCoaches] = useState<CoachData[]>([]);
    const [stats, setStats] = useState<Record<string, CoachStat>>({});
    const [loading, setLoading] = useState(true);
    const [statLoading, setStatLoading] = useState(true);
    const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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
            // stats 실패는 non-fatal
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

        // Optimistic update
        setCoaches(prev =>
            prev.map(c => (c.slug === slug ? { ...c, isActive: !currentActive } : c))
        );

        try {
            const res = await fetch('/api/admin/coaches', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': getAdminKey(),
                },
                body: JSON.stringify({ slug, isActive: !currentActive }),
            });
            if (!res.ok) throw new Error('업데이트 실패');
        } catch {
            // Rollback
            setCoaches(prev =>
                prev.map(c => (c.slug === slug ? { ...c, isActive: currentActive } : c))
            );
            setError(`${slug} 상태 변경에 실패했습니다.`);
        } finally {
            setTogglingSlug(null);
        }
    };

    const active = coaches.filter(c => c.isActive);
    const inactive = coaches.filter(c => !c.isActive);

    // 활성 코치 전체 집계
    const totalActiveStudents = active.reduce((sum, c) => sum + (stats[c.slug]?.studentCount ?? 0), 0);
    const totalActiveHours = active.reduce((sum, c) => sum + (stats[c.slug]?.totalHours ?? 0), 0);

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
                {/* 헤더 */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/coaches"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <h1 className="text-3xl font-bold text-white">Coach Status</h1>
                    <span className="ml-2 text-sm text-gray-500">
                        활성 {active.length} · 비활성 {inactive.length}
                    </span>
                </div>

                {/* 활성 코치 전체 요약 */}
                {!statLoading && (
                    <div className="flex gap-4 p-4 bg-[#1e2023] rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-blue-400" />
                            <span className="text-xs text-gray-400">전체 학생</span>
                            <span className="text-sm font-bold text-white">{totalActiveStudents}명</span>
                        </div>
                        <div className="w-px bg-white/5" />
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-blue-400" />
                            <span className="text-xs text-gray-400">누적 시간 합계</span>
                            <span className="text-sm font-bold text-white">{Math.round(totalActiveHours * 10) / 10}h</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 활성 코치 */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">
                                활성 ({active.length})
                            </h2>
                        </div>
                        {active.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-600 bg-[#1e2023] rounded-xl border border-white/5">
                                활성 코치 없음
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {active.map(coach => (
                                    <CoachStatusCard
                                        key={coach.slug}
                                        coach={coach}
                                        stat={stats[coach.slug]}
                                        statLoading={statLoading}
                                        onToggle={handleToggle}
                                        toggling={togglingSlug === coach.slug}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* 비활성 코치 */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-500" />
                            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">
                                비활성 ({inactive.length})
                            </h2>
                        </div>
                        {inactive.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-600 bg-[#1e2023] rounded-xl border border-white/5">
                                비활성 코치 없음
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {inactive.map(coach => (
                                    <CoachStatusCard
                                        key={coach.slug}
                                        coach={coach}
                                        stat={stats[coach.slug]}
                                        statLoading={statLoading}
                                        onToggle={handleToggle}
                                        toggling={togglingSlug === coach.slug}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
