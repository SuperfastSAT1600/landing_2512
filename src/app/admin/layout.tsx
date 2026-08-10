'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { useIsMobile } from '@/hooks/useIsMobile';

type NavItem =
    | { href: string; label: string; icon: string; children?: undefined }
    | { href?: undefined; label: string; icon: string; children: { href: string; label: string }[] };

const NAV_ITEMS: NavItem[] = [
    { href: '/admin', label: 'Posts', icon: '📄' },
    { href: '/admin/fulltest', label: 'Test Contents', icon: '📋' },
    { href: '/admin/diagnosis', label: 'Diagnosis', icon: '🩺' },
    { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
    { href: '/admin/coaches', label: 'Coaches', icon: '👨‍🏫' },
    { href: '/admin/home', label: 'Homepage', icon: '🏠' },
    { href: '/admin/supertest', label: 'SuperTest', icon: '🎯' },
    { href: '/admin/traffic', label: '채널 유입 통계', icon: '📊' },
    { href: '/admin/marketing', label: '마케팅', icon: '📣' },
    { href: '/admin/crm', label: 'CRM', icon: '👥' },
    { href: '/admin/srm', label: 'SRM', icon: '📅' },
    { href: '/admin/partner', label: '파트너 센터', icon: '🤝' },
    { href: '/admin/enrollment', label: '수업권', icon: '🎫' },
    { href: '/admin/vocab-access', label: '단어 검색 접근 코드', icon: '🔑' },
    { href: '/admin/mathweb', label: 'Math Web', icon: '🕸️' },
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading, login, logout, userName } = useAdminAuth();
    const [password, setPassword] = useState('');
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);
    const isMobile = useIsMobile();

    // Close the mobile nav drawer whenever the route changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setNavOpen(false);
    }, [pathname]);

    // Lock body scroll while the drawer is open on mobile only
    useEffect(() => {
        if (navOpen && isMobile) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [navOpen, isMobile]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (data.success) {
                login(data.apiKey || password, data.userName);
            } else {
                alert('비밀번호가 틀렸습니다.');
            }
        } catch {
            alert('로그인 중 오류가 발생했습니다.');
        }
    };

    // Editor is a standalone full-screen tool — skip sidebar layout
    if (pathname.startsWith('/admin/editor')) {
        return <>{children}</>;
    }

    if (loading) {
        return <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500 font-sans">Loading...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#151719] flex items-center justify-center p-4 font-sans text-gray-200">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Tutoring Landing Admin</h1>
                        <p className="text-gray-500">Access code를 입력하세요</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Access Code"
                            className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none transition-all"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20"
                        >
                            Sign In →
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#151719] text-[#E0E0E0] font-sans selection:bg-blue-500/30 flex">
            {/* Mobile backdrop */}
            {navOpen && (
                <div
                    className="md:hidden fixed inset-0 z-30 bg-black/50"
                    onClick={() => setNavOpen(false)}
                    aria-hidden="true"
                />
            )}
            <aside
                className={`w-64 border-r border-white/5 bg-[#151719] flex flex-col fixed inset-y-0 left-0 h-full z-40 transform transition-transform duration-200 md:translate-x-0 md:z-20 ${
                    navOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="p-6">
                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Admin Page
                    </h1>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        if (item.children) {
                            const isGroupActive = item.children.some(c => pathname === c.href);
                            const groupHref = item.children[0]?.href;
                            return (
                                <div key={item.label}>
                                    <Link
                                        href={groupHref ?? '#'}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${isGroupActive ? 'text-white bg-[#1e2023]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <span className="opacity-70">{item.icon}</span> {item.label}
                                    </Link>
                                    <div className="ml-6 space-y-0.5">
                                        {item.children.map(child => (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors font-medium ${
                                                    pathname === child.href
                                                        ? 'text-white bg-[#1e2023]'
                                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <span className="w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0" />
                                                {child.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium ${
                                    pathname === item.href
                                        ? 'text-white bg-[#1e2023]'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="opacity-70">{item.icon}</span> {item.label}
                            </Link>
                        );
                    })}

                    <div className="border-t border-white/5 pt-2 mt-2">
                        <Link
                            href="/"
                            target="_blank"
                            className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors font-medium"
                        >
                            <span className="opacity-70">🌐</span> View Site
                        </Link>
                    </div>
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2">
                    {userName && (
                        <p className="text-xs text-gray-400 px-2 truncate">{userName}님</p>
                    )}
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-400 transition-colors w-full px-2"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0 ml-0 md:ml-64">
                {/* Mobile top bar with hamburger */}
                <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-12 px-4 border-b border-white/5 bg-[#151719]">
                    <button
                        onClick={() => setNavOpen(true)}
                        aria-label="메뉴 열기"
                        className="text-gray-300 hover:text-white transition-colors"
                    >
                        <Menu size={22} />
                    </button>
                    <span className="text-sm font-bold text-white tracking-tight">Admin Page</span>
                </div>
                <main className="min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
