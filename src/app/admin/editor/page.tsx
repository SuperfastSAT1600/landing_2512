'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, X, LayoutTemplate, Image as ImageIcon, Globe, Search, Hash, UploadCloud, Link2, Minus } from 'lucide-react';

import { Suspense } from 'react';

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const featureFileInputRef = useRef<HTMLInputElement>(null);
    const inlineFileInputRef = useRef<HTMLInputElement>(null);

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
    const [excerpt, setExcerpt] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [featuredImage, setFeaturedImage] = useState('');
    const [featureImage, setFeatureImage] = useState('');
    const [ctaFeatured, setCtaFeatured] = useState(false);

    // UI States
    const [showSettings, setShowSettings] = useState(false);
    const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
    const [renderedHtml, setRenderedHtml] = useState('');

    useEffect(() => {
        // Auth Check
        const key = localStorage.getItem('admin_key');
        if (!key) {
            const input = prompt("Enter Admin API Key:");
            if (input) {
                localStorage.setItem('admin_key', input);
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

    // Markdown preview rendering
    useEffect(() => {
        if (viewMode === 'edit') return;
        let cancelled = false;
        (async () => {
            const { remark } = await import('remark');
            const html = (await import('remark-html')).default;
            const processed = await remark().use(html, { allowDangerousHtml: true }).process(content || '');
            if (!cancelled) setRenderedHtml(processed.toString());
        })();
        return () => { cancelled = true; };
    }, [viewMode, content]);

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
                setFeaturedImage(p.featuredImage || ''); setFeatureImage(p.featureImage || '');
                setContent(p.content || '');
                setExcerpt(p.excerpt || '');
                setAuthor(p.author || 'SuperfastSAT');
                setCtaFeatured(p.ctaFeatured === true);
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
                    originalId: editId, title, slug, date, category, content, excerpt, description, tags, featuredImage, featureImage, author, ctaFeatured
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert('발행되었습니다.');
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
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' }, body: formData });
            const data = await res.json();
            if (data.success) {
                setFeaturedImage(data.url);
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

    const handleFeatureImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' }, body: formData });
            const data = await res.json();
            if (data.success) {
                setFeatureImage(data.url);
            } else {
                alert('업로드 실패: ' + data.error);
            }
        } catch {
            alert('업로드 중 오류 발생');
        } finally {
            setUploading(false);
            if (featureFileInputRef.current) featureFileInputRef.current.value = '';
        }
    };

    // Inline Image Upload Logic
    const handleInlineUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;

        const placeholder = `![Uploading ${file.name}...]()...`;
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const oldContent = content;

        const newContentWithPlaceholder = oldContent.substring(0, start) + placeholder + oldContent.substring(end);
        setContent(newContentWithPlaceholder);

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' }, body: formData });
            const data = await res.json();

            if (data.success) {
                const finalMarkdown = `![${file.name}](${data.url})`;
                setContent(prev => prev.replace(placeholder, finalMarkdown));
            } else {
                alert('이미지 업로드 실패: ' + data.error);
                setContent(prev => prev.replace(placeholder, ''));
            }
        } catch (e) {
            alert('이미지 업로드 중 오류 발생');
            setContent(prev => prev.replace(placeholder, ''));
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

    // ─── Formatting Helper Functions ───────────────────────────────────────────

    const wrapSelected = (prefix: string, suffix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.substring(start, end);
        const newContent = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
        setContent(newContent);
        requestAnimationFrame(() => {
            textarea.focus();
            if (selected) {
                textarea.setSelectionRange(start + prefix.length, end + prefix.length);
            } else {
                textarea.setSelectionRange(start + prefix.length, start + prefix.length);
            }
        });
    };

    const insertAtLineStart = (prefix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const text = content;
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const lineText = text.substring(lineStart);
        let newContent: string;
        let newCursor: number;
        if (lineText.startsWith(prefix)) {
            newContent = text.substring(0, lineStart) + lineText.substring(prefix.length);
            newCursor = Math.max(lineStart, start - prefix.length);
        } else {
            newContent = text.substring(0, lineStart) + prefix + lineText;
            newCursor = start + prefix.length;
        }
        setContent(newContent);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
        });
    };

    const insertCodeBlock = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const snippet = '\n```\ncode here\n```\n';
        const newContent = content.substring(0, start) + snippet + content.substring(start);
        setContent(newContent);
        requestAnimationFrame(() => {
            textarea.focus();
            const codeStart = start + 5; // after '\n```\n'
            textarea.setSelectionRange(codeStart, codeStart + 9); // select 'code here'
        });
    };

    const insertLink = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.substring(start, end);
        const url = window.prompt('URL을 입력하세요:', 'https://');
        if (!url) return;
        const text = selected || 'link text';
        const markdown = `[${text}](${url})`;
        const newContent = content.substring(0, start) + markdown + content.substring(end);
        setContent(newContent);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(start + markdown.length, start + markdown.length);
        });
    };

    const insertTable = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const table = '\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n';
        const newContent = content.substring(0, start) + table + content.substring(start);
        setContent(newContent);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(start + table.length, start + table.length);
        });
    };

    const insertYoutube = () => {
        const url = window.prompt('YouTube URL:', 'https://www.youtube.com/watch?v=');
        if (!url) return;
        const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
        if (!match) { alert('올바른 YouTube URL이 아닙니다.'); return; }
        const videoId = match[1];
        const embed = `\n<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:1.5rem 0"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe></div>\n`;
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        setContent(c => c.substring(0, start) + embed + c.substring(start));
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(start + embed.length, start + embed.length);
        });
    };

    // ─── Slash Command Logic ───────────────────────────────────────────────────

    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashMenuIndex, setSlashMenuIndex] = useState(0);
    const YouTubeSVG = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
    );
    const slashOptions = [
        { label: 'Heading 1', icon: <span className="font-bold text-xs">H1</span>, action: () => insertMarkdown('# ') },
        { label: 'Heading 2', icon: <span className="font-bold text-xs">H2</span>, action: () => insertMarkdown('## ') },
        { label: 'Heading 3', icon: <span className="font-bold text-xs">H3</span>, action: () => insertMarkdown('### ') },
        { label: 'Bullet List', icon: <span className="text-base">•</span>, action: () => insertMarkdown('- ') },
        { label: 'Numbered List', icon: <span className="text-xs font-mono">1.</span>, action: () => insertMarkdown('1. ') },
        { label: 'Quote', icon: <div className="text-lg font-serif italic">"</div>, action: () => insertMarkdown('> ') },
        { label: 'Code Block', icon: <span className="font-mono text-xs">{`</>`}</span>, action: () => { setShowSlashMenu(false); insertCodeBlock(); } },
        { label: 'Divider', icon: <Minus size={16} />, action: () => insertMarkdown('\n---\n') },
        { label: 'Table', icon: <span className="text-xs font-mono">⊞</span>, action: () => { setShowSlashMenu(false); insertTable(); } },
        { label: 'Image', icon: <ImageIcon size={18} />, action: () => { setShowSlashMenu(false); inlineFileInputRef.current?.click(); } },
        { label: 'YouTube', icon: <YouTubeSVG />, action: () => { setShowSlashMenu(false); insertYoutube(); } },
    ];

    const insertMarkdown = (syntax: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const oldContent = content;

        const beforeCursor = oldContent.substring(0, start);
        if (beforeCursor.endsWith('/')) {
            const newContent = beforeCursor.slice(0, -1) + syntax + oldContent.substring(end);
            setContent(newContent);
        } else {
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
                setShowSlashMenu(false);
            }
            return;
        }

        // Keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                wrapSelected('**', '**');
                return;
            }
            if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                wrapSelected('*', '*');
                return;
            }
            if (e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                insertLink();
                return;
            }
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const newContent = content.substring(0, start) + '  ' + content.substring(start);
            setContent(newContent);
            requestAnimationFrame(() => {
                textarea.setSelectionRange(start + 2, start + 2);
            });
            return;
        }

        if (e.key === '/') {
            const textarea = textareaRef.current;
            if (textarea) {
                const cursor = textarea.selectionStart;
                const textBefore = textarea.value.substring(0, cursor);
                const lastLine = textBefore.split('\n').pop() || '';
                if (lastLine.trim() === '') {
                    setShowSlashMenu(true);
                    setSlashMenuIndex(0);
                }
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#151719] text-[#E0E0E0] font-sans selection:bg-blue-500/30">
            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <input type="file" ref={featureFileInputRef} onChange={handleFeatureImageUpload} className="hidden" accept="image/*" />
            <input
                type="file"
                ref={inlineFileInputRef}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleInlineUpload(file);
                    if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
                }}
                className="hidden"
                accept="image/*"
            />

            {/* Top Navigation */}
            <header className="fixed top-0 w-full h-16 flex items-center justify-between px-6 z-[100] bg-[#151719]/90 backdrop-blur-sm border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                        <ArrowLeft size={16} /> Posts
                    </Link>
                    <span className="text-gray-700">|</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">{category}</span>
                    <span className="text-gray-400 text-sm font-medium italic">{saving ? 'Saving...' : 'Draft'}</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* 3-state view mode segment control */}
                    <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'edit' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                        >Edit</button>
                        <button
                            onClick={() => setViewMode('split')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'split' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Split view"
                        >⣿</button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'preview' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                        >Preview</button>
                    </div>

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

            {/* Formatting Toolbar */}
            {viewMode !== 'preview' && (
                <div className={`fixed top-16 w-full z-[90] bg-[#151719]/95 backdrop-blur-sm border-b border-white/5 flex items-center gap-0.5 px-4 h-11 transition-all duration-300 ${showSettings ? 'pr-[332px]' : ''}`}>
                    {/* Inline formatting */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); wrapSelected('**', '**'); }}
                        title="Bold (Ctrl+B)"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors font-bold text-sm"
                    >B</button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); wrapSelected('*', '*'); }}
                        title="Italic (Ctrl+I)"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors italic text-sm"
                    >I</button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); wrapSelected('~~', '~~'); }}
                        title="Strikethrough"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors line-through text-sm"
                    >S</button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); wrapSelected('`', '`'); }}
                        title="Inline code"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors font-mono text-xs"
                    >{`\`c\``}</button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Headings */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertAtLineStart('# '); }}
                        title="Heading 1"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold"
                    >H1</button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertAtLineStart('## '); }}
                        title="Heading 2"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold"
                    >H2</button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertAtLineStart('### '); }}
                        title="Heading 3"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold"
                    >H3</button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Block elements */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertAtLineStart('> '); }}
                        title="Blockquote"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors font-serif italic text-base"
                    >&ldquo;</button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertCodeBlock(); }}
                        title="Code block"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors font-mono text-xs"
                    >{`</>`}</button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Lists */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertAtLineStart('- '); }}
                        title="Bullet list"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-base"
                    >•</button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertAtLineStart('1. '); }}
                        title="Numbered list"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors font-mono text-xs"
                    >1.</button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Insert */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
                        title="Link (Ctrl+K)"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    ><Link2 size={14} /></button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); setContent(c => { const textarea = textareaRef.current; if (!textarea) return c; const start = textarea.selectionStart; return c.substring(0, start) + '\n---\n' + c.substring(start); }); requestAnimationFrame(() => textareaRef.current?.focus()); }}
                        title="Horizontal rule"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors font-bold text-sm"
                    >—</button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertTable(); }}
                        title="Table"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                            <line x1="3" y1="15" x2="21" y2="15"/>
                            <line x1="9" y1="3" x2="9" y2="21"/>
                            <line x1="15" y1="3" x2="15" y2="21"/>
                        </svg>
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); inlineFileInputRef.current?.click(); }}
                        title="Insert image"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    ><ImageIcon size={14} /></button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); insertYoutube(); }}
                        title="YouTube 영상 삽입"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                    </button>
                </div>
            )}

            {/* Slash Command Menu Overlay */}
            {showSlashMenu && (
                <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-50 w-72 bg-[#1e2023] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-white/5">
                        Basic blocks
                    </div>
                    <div>
                        {slashOptions.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={option.action}
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
            {viewMode === 'split' ? (
                <div className={`fixed left-0 right-0 top-[108px] bottom-0 flex transition-all duration-300 ${showSettings ? 'mr-[320px]' : ''}`}>
                    {/* Left: Editor */}
                    <div className="w-1/2 overflow-y-auto border-r border-white/10">
                        <div className="max-w-xl mx-auto px-6 py-8">
                            {/* Feature Image */}
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
                                    className="relative w-full h-48 mb-8 rounded-xl overflow-hidden cursor-pointer group border border-white/10"
                                    onClick={() => setShowSettings(true)}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={featuredImage} alt="Feature" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity text-white text-sm font-bold">
                                        <span className="bg-black/50 px-3 py-1 rounded-full"><UploadCloud size={16} className="inline mr-2" />Change</span>
                                    </div>
                                </div>
                            )}

                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Post title"
                                className="w-full bg-transparent text-4xl font-bold placeholder-gray-600 border-none outline-none mb-6 leading-tight focus:ring-0"
                            />

                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                onKeyDown={handleKeyDown}
                                placeholder="Begin writing your story..."
                                className="w-full bg-transparent text-lg text-gray-300 placeholder-gray-600 border-none outline-none resize-none font-serif leading-relaxed min-h-[60vh] focus:ring-0"
                                style={{ overflow: 'hidden' }}
                            />
                        </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="w-1/2 overflow-y-auto bg-[#1a1d1f]">
                        <div className="max-w-xl mx-auto px-6 py-8">
                            {featuredImage && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={featuredImage} alt="Cover" className="rounded-xl mb-6 w-full h-48 object-cover" />
                            )}
                            <h1 className="text-4xl font-bold text-white mb-6">{title || 'Untitled'}</h1>
                            <div
                                className="prose prose-invert prose-lg max-w-none
                                    prose-headings:font-bold prose-headings:text-white
                                    prose-a:text-blue-400 prose-code:bg-white/5
                                    prose-pre:bg-[#1e2023] prose-blockquote:border-l-blue-500
                                    prose-table:border-collapse prose-th:border prose-td:border
                                    prose-th:border-white/10 prose-td:border-white/10"
                                dangerouslySetInnerHTML={{ __html: renderedHtml || '<p class="text-gray-600">No content yet...</p>' }}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <main className={`pt-44 pb-32 transition-all duration-300 ${showSettings ? 'mr-[320px]' : ''}`}>
                    {viewMode === 'edit' ? (
                        <div className="max-w-3xl mx-auto px-6">
                            {/* Feature Image */}
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
                        <div className="max-w-3xl mx-auto px-6">
                            {featuredImage && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={featuredImage} alt="Cover" className="rounded-xl mb-8 w-full h-64 object-cover" />
                            )}
                            <h1 className="text-4xl font-bold text-white mb-8">{title || 'Untitled Post'}</h1>
                            <div
                                className="prose prose-invert prose-lg max-w-none
                                    prose-headings:font-bold prose-headings:text-white
                                    prose-a:text-blue-400 prose-code:bg-white/5
                                    prose-pre:bg-[#1e2023] prose-blockquote:border-l-blue-500
                                    prose-table:border-collapse prose-th:border prose-td:border
                                    prose-th:border-white/10 prose-td:border-white/10"
                                dangerouslySetInnerHTML={{ __html: renderedHtml || '<p class="text-gray-600">No content...</p>' }}
                            />
                        </div>
                    )}
                </main>
            )}

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
                        {/* Excerpt */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Search size={12} /> Excerpt
                            </label>
                            <textarea
                                value={excerpt}
                                onChange={(e) => setExcerpt(e.target.value)}
                                placeholder="목록과 구글 검색결과에 표시될 1-2문장 요약..."
                                rows={3}
                                className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white resize-none outline-none"
                            />
                            <p className="text-[10px] text-right text-gray-600">{excerpt.length}/160</p>
                        </div>

                        {/* Blog Thumbnail */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                    <ImageIcon size={12} /> Blog Thumbnail
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

                        {/* Card Thumbnail */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                    <ImageIcon size={12} /> Card Thumbnail
                                </label>
                                <button onClick={() => featureFileInputRef.current?.click()} className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                                    <UploadCloud size={12} /> Upload
                                </button>
                            </div>
                            {featureImage && (
                                <div className="relative w-full rounded-lg overflow-hidden border border-white/10" style={{ aspectRatio: '3/5' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={featureImage} alt="Card thumbnail" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setFeatureImage('')}
                                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}
                            <input
                                type="text"
                                value={featureImage}
                                onChange={(e) => setFeatureImage(e.target.value)}
                                placeholder="세로 썸네일 URL (메인 Features 카드)"
                                className="w-full bg-[#1e2023] border border-transparent focus:border-indigo-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none"
                            />
                            <p className="text-[10px] text-gray-600">메인페이지 Features 카드에 표시됩니다. 비율: 3:5 세로</p>
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

                        {/* Meta Description */}
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

                        {/* CTA Featured Toggle */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">플로팅 CTA 노출</label>
                            <button
                                type="button"
                                onClick={() => setCtaFeatured(prev => !prev)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                                    ctaFeatured
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                        : 'bg-[#1e2023] border-transparent text-gray-400 hover:border-white/10'
                                }`}
                            >
                                <span>📌 랜딩 버튼에 이 글 표시</span>
                                <span className={`w-8 h-4 rounded-full relative transition-colors ${ctaFeatured ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${ctaFeatured ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </span>
                            </button>
                            {ctaFeatured && (
                                <p className="text-[11px] text-indigo-400/80">저장 시 다른 포스팅의 CTA 노출이 자동 해제됩니다.</p>
                            )}
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
