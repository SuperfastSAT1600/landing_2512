'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAdminAuth } from '@/lib/useAdminAuth';

const NAV_ITEMS = [
    { href: '/admin', label: 'Posts', icon: '📄' },
    { href: '/admin/diagnosis', label: 'Diagnosis', icon: '🩺' },
    { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
    { href: '/admin/coaches', label: 'Coaches', icon: '👨‍🏫' },
    { href: '/admin/home', label: 'Homepage', icon: '🏠' },
    { href: '/admin/supertest', label: 'SuperTest', icon: '🎯' },
    { href: '/admin/traffic', label: '채널 유입 통계', icon: '📊' },
    { href: '/admin/crm', label: 'CRM', icon: '👥' },
    { href: '/admin/fulltest', label: 'Test Contents', icon: '📋' },
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading, login, logout } = useAdminAuth();
    const [password, setPassword] = useState('');
    const pathname = usePathname();

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
                login(data.apiKey || password);
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
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Ghost Admin</h1>
                        <p className="text-gray-500">Sign in to manage your blog</p>
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
            <aside className="w-64 border-r border-white/5 bg-[#151719] flex flex-col fixed h-full z-20">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Admin Page
                    </h1>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(({ href, label, icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium ${
                                pathname === href
                                    ? 'text-white bg-[#1e2023]'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="opacity-70">{icon}</span> {label}
                        </Link>
                    ))}

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

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-400 transition-colors w-full px-2"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-1 ml-64 min-w-0">
                {children}
            </main>
        </div>
    );
}
