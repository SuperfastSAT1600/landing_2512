'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Power, PowerOff, Loader2 } from 'lucide-react';

type PageStatus = 'active' | 'paused';

interface EnrollmentPage {
    slug: string;
    label: string;
    url: string;
    description: string;
}

const PAGES: EnrollmentPage[] = [
    {
        slug: 'enrollment',
        label: 'enrollment (v1)',
        url: '/enrollment',
        description: '기존 수업권 신청 페이지',
    },
    {
        slug: 'enrollment-v2',
        label: 'enrollment2026 (v2)',
        url: '/enrollment-v2',
        description: '신규 수업권 신청 페이지 — 2026년 버전',
    },
];

export default function AdminEnrollmentPage() {
    const [statuses, setStatuses] = useState<Record<string, PageStatus>>({});
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/enrollment-pages')
            .then(r => r.json())
            .then(setStatuses)
            .catch(console.error);
    }, []);

    async function toggle(slug: string) {
        const current = statuses[slug] ?? 'active';
        const next: PageStatus = current === 'active' ? 'paused' : 'active';
        setToggling(slug);
        setStatuses(prev => ({ ...prev, [slug]: next }));
        try {
            const res = await fetch('/api/admin/enrollment-pages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, status: next }),
            });
            if (!res.ok) throw new Error('failed');
        } catch {
            setStatuses(prev => ({ ...prev, [slug]: current }));
        } finally {
            setToggling(null);
        }
    }

    return (
        <div className="p-8 max-w-4xl">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <span className="opacity-80">🎫</span> 수업권 페이지 관리
                </h1>
                <p className="text-gray-500">
                    수업권 신청 페이지 목록을 확인하고 배포 상태를 관리합니다.
                </p>
            </header>

            <div className="space-y-3">
                {PAGES.map(page => {
                    const status = statuses[page.slug] ?? 'active';
                    const isActive = status === 'active';
                    const isToggling = toggling === page.slug;

                    return (
                        <div
                            key={page.slug}
                            className="flex items-center gap-4 bg-[#1e2023] border border-white/5 rounded-lg px-5 py-4"
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">{page.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{page.description}</p>
                                <p className="text-xs text-blue-400/70 mt-0.5 font-mono">{page.url}</p>
                            </div>

                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                isActive
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-gray-700 text-gray-400'
                            }`}>
                                {isActive ? '배포 중' : '중지됨'}
                            </span>

                            <Link
                                href={page.url}
                                target="_blank"
                                className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
                                title="새 탭에서 열기"
                            >
                                <ExternalLink size={15} />
                            </Link>

                            <button
                                onClick={() => toggle(page.slug)}
                                disabled={isToggling}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex-shrink-0 ${
                                    isActive
                                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                } disabled:opacity-50`}
                            >
                                {isToggling ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : isActive ? (
                                    <PowerOff size={13} />
                                ) : (
                                    <Power size={13} />
                                )}
                                {isActive ? '배포 중지' : '배포 재개'}
                            </button>
                        </div>
                    );
                })}
            </div>

            <p className="mt-6 text-xs text-gray-600">
                배포 중지 시 해당 페이지 접근 시 메인으로 리디렉션됩니다.
            </p>
        </div>
    );
}
