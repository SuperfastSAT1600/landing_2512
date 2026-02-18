'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, X, LayoutTemplate, Image as ImageIcon, Settings, Eye, Globe, Search, Hash, UploadCloud } from 'lucide-react';

import { Suspense } from 'react';
// ... existing imports ...

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Core Data
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('SAT RW');
    const [author, setAuthor] = useState('SuperfastSAT');

    // SEO & Meta Data
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [featuredImage, setFeaturedImage] = useState('');

    // UI States
    const [showSettings, setShowSettings] = useState(false); // Sidebar toggle
    const [showPreview, setShowPreview] = useState(false);   // Preview toggle

    useEffect(() => {
        // Auth Check
        const key = localStorage.getItem('admin_key');
        if (!key) {
            // Simple prompt for now
            const input = prompt("Enter Admin API Key:");
            if (input) {
                localStorage.setItem('admin_key', input);
                // Reload to apply
                window.location.reload();
            } else {
                router.push('/');
            }
            return;
        }

        if (editId) loadPost(editId);
    }, [editId, router]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    const loadPost = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/posts?id=${id}`, {
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' }
            });
            const data = await res.json();
            if (data.success && data.post) {
                const p = data.post;
                setTitle(p.title); setSlug(p.id); setDate(p.date);
                setCategory(p.category); setDescription(p.description || '');
                setTags(Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''));
                setFeaturedImage(p.featuredImage || ''); setContent(p.content || '');
                setAuthor(p.author || 'SuperfastSAT');
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!title) return alert('제목을 입력해주세요.');
        setSaving(true);
        try {
            const res = await fetch('/api/admin/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': localStorage.getItem('admin_key') || ''
                },
                body: JSON.stringify({
                    originalId: editId, title, slug, date, category, content, description, tags, featuredImage, author
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert('발행되었습니다.'); // "Published"
                if (!editId) router.push(`/admin/editor?id=${data.id}`);
            } else {
                alert('오류: ' + data.error);
            }
        } catch { alert('저장 중 오류 발생'); } finally { setSaving(false); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                setFeaturedImage(data.url);
                // Dont necessarily open settings, just show it
            } else {
                alert('업로드 실패: ' + data.error);
            }
        } catch {
            alert('업로드 중 오류 발생');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerUpload = () => {
        fileInputRef.current?.click();
    };

    // Inline Image Upload Logic
    const handleInlineUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;

        // Insert "Uploading..." placeholder
        const placeholder = `![Uploading ${file.name}...]()...`;
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const oldContent = content;

        const newContentWithPlaceholder = oldContent.substring(0, start) + placeholder + oldContent.substring(end);
        setContent(newContentWithPlaceholder);

        // Upload
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                // Replace placeholder with actual markdown
                const finalMarkdown = `![${file.name}](${data.url})`;
                setContent(prev => prev.replace(placeholder, finalMarkdown));
            } else {
                alert('이미지 업로드 실패: ' + data.error);
                setContent(prev => prev.replace(placeholder, '')); // Remove placeholder
            }
        } catch (e) {
            alert('이미지 업로드 중 오류 발생');
            setContent(prev => prev.replace(placeholder, '')); // Remove placeholder
        } finally {
            setUploading(false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleInlineUpload(file);
                return;
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleInlineUpload(file);
            }
        }
    };

    // Slash Command Logic
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashMenuIndex, setSlashMenuIndex] = useState(0);
    const slashOptions = [
        { label: 'Heading 1', icon: <Hash size={18} />, action: () => insertMarkdown('# ') },
        { label: 'Heading 2', icon: <Hash size={16} />, action: () => insertMarkdown('## ') },
        { label: 'Bullet List', icon: <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center"><div className="w-1 h-1 bg-current rounded-full" /></div>, action: () => insertMarkdown('- ') },
        { label: 'Quote', icon: <div className="text-lg font-serif italic">"</div>, action: () => insertMarkdown('> ') },
        { label: 'Image', icon: <ImageIcon size={18} />, action: () => triggerUpload() }, // Re-use upload trigger
    ];

    const insertMarkdown = (syntax: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const oldContent = content;

        // Remove the "/" that triggered the menu if it exists right before cursor
        // We assume the menu was triggered by "/"
        // Logic: Replace the last "/" before cursor with the syntax
        const beforeCursor = oldContent.substring(0, start);
        if (beforeCursor.endsWith('/')) {
            const newContent = beforeCursor.slice(0, -1) + syntax + oldContent.substring(end);
            setContent(newContent);
        } else {
            // Just insert
            const newContent = oldContent.substring(0, start) + syntax + oldContent.substring(end);
            setContent(newContent);
        }

        setShowSlashMenu(false);
        textarea.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSlashMenu) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashMenuIndex(prev => (prev + 1) % slashOptions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashMenuIndex(prev => (prev - 1 + slashOptions.length) % slashOptions.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                slashOptions[slashMenuIndex].action();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowSlashMenu(false);
            } else {
                // Any other key closes menu for now to keep it simple
                setShowSlashMenu(false);
            }
        } else {
            if (e.key === '/') {
                // Check if it's the start of line or preceded by space (simple check)
                const textarea = textareaRef.current;
                if (textarea) {
                    const cursor = textarea.selectionStart;
                    const textBefore = textarea.value.substring(0, cursor);
                    const lastLine = textBefore.split('\n').pop() || '';

                    // Trigger if line is empty (start of new block)
                    if (lastLine.trim() === '') {
                        setShowSlashMenu(true);
                        setSlashMenuIndex(0);
                    }
                }
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#151719] text-[#E0E0E0] font-sans selection:bg-blue-500/30">
            {/* Hidden Input */}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />

            {/* Top Navigation (Ghost Style) */}
            <header className="fixed top-0 w-full h-16 flex items-center justify-between px-6 z-[100] bg-[#151719]/90 backdrop-blur-sm border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                        <ArrowLeft size={16} /> Posts
                    </Link>
                    <span className="text-gray-700">|</span>
                    <span className="text-gray-700">|</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">{category}</span>
                    <span className="text-gray-400 text-sm font-medium italic">{saving ? 'Saving...' : 'Draft'}</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-gray-400 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors"
                    >
                        {showPreview ? 'Edit' : 'Preview'}
                    </button>

                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
                    >
                        {editId ? 'Update' : 'Publish'}
                    </button>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded transition-colors ${showSettings ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <LayoutTemplate size={20} />
                    </button>
                </div>
            </header>

            {/* Slash Command Menu Overlay (Command Palette Style) */}
            {showSlashMenu && (
                <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-50 w-72 bg-[#1e2023] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-white/5">
                        Basic blocks
                    </div>
                    <div>
                        {slashOptions.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={option.action} // Mouse click support
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${idx === slashMenuIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                            >
                                <div className={`w-6 h-6 flex items-center justify-center rounded ${idx === slashMenuIndex ? 'bg-white/20' : 'bg-white/5'}`}>
                                    {option.icon}
                                </div>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className={`pt-32 pb-32 transition-all duration-300 ${showSettings ? 'mr-[320px]' : ''}`}>
                {!showPreview ? (
                    <div className="max-w-3xl mx-auto px-6">
                        {/* Add Feature Image Placeholder */}
                        {!featuredImage ? (
                            <button
                                onClick={triggerUpload}
                                className="group flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-8 transition-colors text-sm font-medium"
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : <><ImageIcon size={18} /> Add feature image</>}
                            </button>
                        ) : (
                            <div
                                className="relative w-full h-64 mb-10 rounded-xl overflow-hidden cursor-pointer group border border-white/10"
                                onClick={() => setShowSettings(true)}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={featuredImage} alt="Feature" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity text-white text-sm font-bold">
                                    <span className="bg-black/50 px-3 py-1 rounded-full"><UploadCloud size={16} className="inline mr-2" />Change</span>
                                </div>
                            </div>
                        )}

                        {/* Title Input */}
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Post title"
                            className="w-full bg-transparent text-5xl font-bold placeholder-gray-600 border-none outline-none mb-8 leading-tight focus:ring-0"
                        />

                        {/* Body Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onPaste={handlePaste}
                            onDrop={handleDrop}
                            onKeyDown={handleKeyDown}
                            placeholder="Begin writing your story..."
                            className="w-full bg-transparent text-xl text-gray-300 placeholder-gray-600 border-none outline-none resize-none font-serif leading-relaxed min-h-[50vh] focus:ring-0"
                            style={{ overflow: 'hidden' }}
                        />
                    </div>
                ) : (
                    // Preview Mode
                    <div className="max-w-3xl mx-auto px-6 prose prose-invert prose-lg">
                        {featuredImage && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={featuredImage} alt="Cover" className="rounded-xl mb-8 w-full h-64 object-cover" />
                        )}
                        <h1>{title || "Untitled Post"}</h1>
                        <div className="whitespace-pre-wrap text-gray-300 leading-relaxed font-serif">
                            {content || "No content..."}
                        </div>
                    </div>
                )}
            </main>

            {/* Ghost-style Settings Sidebar */}
            <aside
                className={`fixed top-16 right-0 w-[320px] h-[calc(100vh-64px)] bg-[#151719] border-l border-white/10 transform transition-transform duration-300 z-40 overflow-y-auto ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Post settings</h2>
                        <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Full Image URL Input */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                    <ImageIcon size={12} /> Feature Image
                                </label>
                                <button onClick={triggerUpload} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                                    <UploadCloud size={12} /> Upload
                                </button>
                            </div>
                            <input
                                type="text"
                                value={featuredImage}
                                onChange={(e) => setFeaturedImage(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none"
                            />
                        </div>

                        {/* URL Slug */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Globe size={12} /> Post URL
                            </label>
                            <div className="bg-[#1e2023] rounded px-3 py-2 border border-transparent focus-within:border-blue-500">
                                <div className="text-xs text-gray-600 mb-1">blog.superfastsat.com/</div>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="untitled"
                                    className="w-full bg-transparent text-white text-sm outline-none"
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Publish Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        {/* Tags */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Hash size={12} /> Tags
                            </label>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="SAT, Math (comma separated)"
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        {/* Excerpt/Meta Desc */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Search size={12} /> Meta Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Meta description for search engines..."
                                rows={4}
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white resize-none outline-none"
                            />
                            <p className="text-[10px] text-right text-gray-600">{description.length}/160</p>
                        </div>

                        {/* Category */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none appearance-none"
                            >
                                <option value="SAT RW">SAT RW</option>
                                <option value="SAT Math">SAT Math</option>
                                <option value="입시뉴스">입시뉴스</option>
                            </select>
                        </div>

                        {/* Author */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Author</label>
                            <input
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="SuperfastSAT"
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <button
                                className="w-full py-2 text-red-500 hover:text-red-400 text-sm font-medium border border-red-500/20 rounded hover:bg-red-500/10 transition-colors"
                            >
                                Delete post
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default function EditorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#151719] text-white">Loading Editor...</div>}>
            <EditorContent />
        </Suspense>
    );
}
