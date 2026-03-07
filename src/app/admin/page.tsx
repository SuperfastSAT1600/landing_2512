'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, MoreHorizontal, Edit3, Trash2, ChevronRight, LogOut } from 'lucide-react';

interface Post {
    id: string;
    title: string;
    date: string;
    category: string;
    status?: string; // Future proofing
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    // Check auth on mount
    useEffect(() => {
        const auth = localStorage.getItem('admin_auth');
        if (auth === 'true') {
            setIsAuthenticated(true);
            fetchPosts();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/admin/posts', {
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' }
            });
            const data = await res.json();
            if (data.success) {
                setPosts(data.posts);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

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
                setIsAuthenticated(true);
                localStorage.setItem('admin_auth', 'true');
                localStorage.setItem('admin_key', data.apiKey || password);
                fetchPosts();
            } else {
                alert('비밀번호가 틀렸습니다.');
            }
        } catch (error) {
            alert('로그인 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Prevent link click if wrapped
        if (!confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) return;

        try {
            const res = await fetch(`/api/admin/posts?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' }
            });
            if (res.ok) {
                fetchPosts(); // Refresh
            } else {
                alert('삭제 실패');
            }
        } catch (error) {
            alert('오류 발생');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_auth');
        setIsAuthenticated(false);
        setPassword('');
    };

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="min-h-screen bg-[#151719] flex items-center justify-center text-gray-500 font-sans">Loading...</div>;

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#151719] flex items-center justify-center p-4 font-sans text-gray-200">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Ghost Admin</h1>
                        <p className="text-gray-500">Sign in to manage your blog</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Access Code"
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none transition-all"
                                autoFocus
                            />
                        </div>
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

    // Dashboard Screen
    return (
        <div className="min-h-screen bg-[#151719] text-[#E0E0E0] font-sans selection:bg-blue-500/30 flex">

            {/* Sidebar (Navigation) - Mimicking Ghost's left nav */}
            <aside className="w-64 border-r border-white/5 bg-[#151719] flex flex-col fixed h-full z-20">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Antigravity
                    </h1>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-white bg-[#1e2023] rounded-md transition-colors font-medium">
                        <span className="opacity-70">📄</span> Posts
                    </Link>
                    <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors font-medium cursor-not-allowed">
                        <span className="opacity-70">📊</span> Analytics
                    </a>
                    <Link href="/admin/home" className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors font-medium">
                        <span className="opacity-70">🏠</span> Homepage
                    </Link>
                    <Link href="/admin/reviews" className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors font-medium">
                        <span className="opacity-70">⭐</span> Reviews
                    </Link>
                    <Link href="/" target="_blank" className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors font-medium">
                        <span className="opacity-70">🌐</span> View Site
                    </Link>
                    <Link href="/admin/diagnosis" className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors font-medium">
                        <span className="opacity-70">🩺</span> Diagnosis
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-400 transition-colors w-full px-2"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <header className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-white">Posts</h2>
                    <div className="flex gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#1e2023] text-sm text-white pl-10 pr-4 py-2 rounded-lg border border-transparent focus:border-blue-500 outline-none w-64 transition-all"
                            />
                        </div>
                        <Link
                            href="/admin/editor"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={16} /> New post
                        </Link>
                    </div>
                </header>

                <div className="bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
                    {/* List Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-6">Title</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Category</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Posts List */}
                    <div className="divide-y divide-white/5">
                        {filteredPosts.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 text-sm">
                                No posts found.
                            </div>
                        ) : (
                            filteredPosts.map(post => (
                                <div key={post.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors group">
                                    <div className="col-span-6 pr-4">
                                        <Link href={`/admin/editor?id=${post.id}`} className="block">
                                            <h3 className="text-white font-bold text-sm mb-1 group-hover:text-blue-400 transition-colors truncate">
                                                {post.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                                <span className="truncate">By Admin</span>
                                                <span>•</span>
                                                <span>{post.date}</span>
                                            </p>
                                        </Link>
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${post.status === 'draft' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                                            {post.status || 'Published'}
                                        </span>
                                    </div>
                                    <div className="col-span-2 text-sm text-gray-400 truncate">
                                        {post.category}
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/admin/editor?id=${post.id}`}
                                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                                            title="Edit"
                                        >
                                            <Edit3 size={16} />
                                        </Link>
                                        <button
                                            onClick={(e) => handleDelete(e, post.id)}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
