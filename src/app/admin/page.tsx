'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit3, Trash2 } from 'lucide-react';

interface Post {
    id: string;
    title: string;
    date: string;
    category: string;
    author?: string;
    isPublished: boolean;
    toggling?: boolean;
}

export default function AdminPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/admin/posts', {
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' }
            });
            const data = await res.json();
            if (data.success) {
                setPosts(data.posts.map((p: Post) => ({ ...p, isPublished: p.isPublished !== false })));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: string, currentIsPublished: boolean) => {
        // 낙관적 업데이트
        setPosts(prev => prev.map(p => p.id === id ? { ...p, isPublished: !currentIsPublished, toggling: true } : p));
        try {
            const res = await fetch(`/api/admin/posts?id=${id}`, {
                method: 'PATCH',
                headers: {
                    'x-admin-key': localStorage.getItem('admin_key') || '',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_published: !currentIsPublished }),
            });
            if (!res.ok) {
                // 실패 시 원복
                setPosts(prev => prev.map(p => p.id === id ? { ...p, isPublished: currentIsPublished, toggling: false } : p));
            } else {
                setPosts(prev => prev.map(p => p.id === id ? { ...p, toggling: false } : p));
            }
        } catch {
            setPosts(prev => prev.map(p => p.id === id ? { ...p, isPublished: currentIsPublished, toggling: false } : p));
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        if (!confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) return;
        try {
            const res = await fetch(`/api/admin/posts?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' }
            });
            if (res.ok) {
                fetchPosts();
            } else {
                alert('삭제 실패');
            }
        } catch {
            alert('오류 발생');
        }
    };

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.author ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

    return (
        <div className="p-8">
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
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-4">Title</div>
                    <div className="col-span-2">Author</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="divide-y divide-white/5">
                    {filteredPosts.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 text-sm">No posts found.</div>
                    ) : (
                        filteredPosts.map(post => (
                            <div key={post.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors group">
                                <div className="col-span-4 pr-4">
                                    <Link href={`/admin/editor?id=${post.id}`} className="block">
                                        <h3 className="text-white font-bold text-sm mb-1 group-hover:text-blue-400 transition-colors truncate">
                                            {post.title}
                                        </h3>
                                        <p className="text-xs text-gray-500">{post.date}</p>
                                    </Link>
                                </div>
                                <div className="col-span-2 text-sm text-gray-400 truncate">
                                    {post.author || 'SuperfastSAT'}
                                </div>
                                <div className="col-span-2">
                                    <button
                                        onClick={() => handleToggleStatus(post.id, post.isPublished)}
                                        disabled={post.toggling}
                                        title={post.isPublished ? '클릭하면 Draft로 변경' : '클릭하면 Published로 변경'}
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide transition-opacity cursor-pointer ${post.toggling ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-70'} ${post.isPublished ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}
                                    >
                                        {post.isPublished ? 'Published' : 'Draft'}
                                    </button>
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
        </div>
    );
}
