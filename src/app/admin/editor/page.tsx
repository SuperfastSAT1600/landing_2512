'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import {
    ArrowLeft, X, LayoutTemplate, Image as ImageIcon,
    Globe, Search, Hash, UploadCloud, Link2, Minus, Sparkles, Loader2,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Trash2
} from 'lucide-react';
import { Suspense } from 'react';
import SeoPanel from '@/components/editor/seo/SeoPanel';
import SocialPreview from '@/components/editor/seo/SocialPreview';
import { TableBubbleMenu } from '@/components/editor/TableBubbleMenu';
import { TextBubbleMenu } from '@/components/editor/TextBubbleMenu';

import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
// TiptapLink removed — tiptap-markdown's Markdown extension registers its own Link internally
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { CellSelection, cellAround } from '@tiptap/pm/tables';
import Youtube from '@tiptap/extension-youtube';
import { Markdown } from 'tiptap-markdown';

function ImageNodeView({ node, updateAttributes, deleteNode, selected }: any) {
    const { src, alt, dataAlign } = node.attrs;
    return (
        <NodeViewWrapper className="relative group my-4" data-align={dataAlign}>
            <img src={src} alt={alt || ''}
                 className={`rounded-lg max-w-full ${selected ? 'ring-2 ring-blue-500' : ''}`}
                 data-align={dataAlign} />

            <input
                value={alt || ''}
                onChange={(e) => updateAttributes({ alt: e.target.value })}
                placeholder="이미지 설명을 입력하세요..."
                className="w-full text-center text-xs text-gray-500 bg-transparent
                           border-none outline-none mt-1 placeholder-gray-600/50"
            />

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                            transition-opacity flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                    <button key={align}
                        onClick={() => updateAttributes({ dataAlign: align })}
                        className={`w-7 h-7 flex items-center justify-center rounded
                                    bg-black/60 hover:bg-black/80 text-white text-xs
                                    ${dataAlign === align ? 'ring-1 ring-blue-400' : ''}`}
                        title={`${align} 정렬`}>
                        {align === 'left' ? <AlignLeft size={12}/> :
                         align === 'center' ? <AlignCenter size={12}/> :
                         <AlignRight size={12}/>}
                    </button>
                ))}
                <button onClick={deleteNode}
                    className="w-7 h-7 flex items-center justify-center rounded
                               bg-red-600/80 hover:bg-red-500 text-white"
                    title="이미지 삭제">
                    <Trash2 size={12} />
                </button>
            </div>
        </NodeViewWrapper>
    );
}


const CustomImage = TiptapImage.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            dataAlign: {
                default: 'center',
                parseHTML: (el: HTMLElement) => el.getAttribute('data-align') || 'center',
                renderHTML: (attrs: Record<string, string>) => ({ 'data-align': attrs.dataAlign }),
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ImageNodeView);
    },
});

function BlogEditor() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const featureFileInputRef = useRef<HTMLInputElement>(null);
    const inlineFileInputRef = useRef<HTMLInputElement>(null);
    const [pendingContent, setPendingContent] = useState<string | null>(null);
    const pendingContentRef = useRef<string | null>(null);
    const anchorCellRef = useRef<number | null>(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Core Data
    const [title, setTitle] = useState('');
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

    // SEO Extended
    const [featuredImageAlt, setFeaturedImageAlt] = useState('');
    const [focusKeyword, setFocusKeyword] = useState('');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaRobots, setMetaRobots] = useState('');
    const [settingsTab, setSettingsTab] = useState<'general' | 'seo'>('general');
    const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);

    // Inline image alt text dialog
    const [altTextDialog, setAltTextDialog] = useState<{ url: string; fileName: string } | null>(null);
    const [altTextInput, setAltTextInput] = useState('');

    // UI States
    const [showSettings, setShowSettings] = useState(false);
    const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashMenuIndex, setSlashMenuIndex] = useState(0);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ link: false }),
            CustomImage.configure({ inline: false }),
            // Link extension provided by tiptap-markdown (StarterKit's link disabled to avoid duplicate)
            TextAlign.configure({
                types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
                alignments: ['left', 'center', 'right', 'justify'],
                defaultAlignment: 'left',
            }),
            Placeholder.configure({ placeholder: 'Tell your story...' }),
            Table.configure({ resizable: false }),
            TableRow,
            TableHeader,
            TableCell,
            Youtube.configure({ width: 680, height: 480 }),
            Markdown.configure({ html: true, transformPastedText: true }),
        ],
        editorProps: {
            attributes: {
                class:
                    'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[50vh] ' +
                    'prose-headings:font-bold prose-headings:text-white ' +
                    'prose-a:text-blue-400 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded ' +
                    'prose-pre:bg-[#1e2023] prose-blockquote:border-l-blue-500 ' +
                    'prose-table:border-collapse [&_td]:border [&_th]:border [&_td]:border-white/10 [&_th]:border-white/10 ' +
                    '[&_td]:p-2 [&_th]:p-2',
            },
            handleClick(view, pos, event) {
                // 링크 클릭 방지
                const target = event.target as HTMLElement;
                if (target.tagName === 'A' || target.closest('a')) {
                    event.preventDefault();
                    return true;
                }
                // Shift+클릭 CellSelection
                const $pos = view.state.doc.resolve(pos);
                const $cell = cellAround($pos);
                if ($cell !== null) {
                    const cellPos = $cell.pos;
                    if (event.shiftKey && anchorCellRef.current !== null) {
                        const sel = CellSelection.create(view.state.doc, anchorCellRef.current, cellPos);
                        view.dispatch(view.state.tr.setSelection(sel));
                        return true;
                    }
                    anchorCellRef.current = cellPos;
                } else {
                    anchorCellRef.current = null;
                }
                return false;
            },
        },
        immediatelyRender: false,
        onCreate({ editor: newEditor }) {
            if (pendingContentRef.current !== null) {
                try {
                    newEditor.commands.setContent(pendingContentRef.current);
                } catch (e) {
                    console.error('onCreate setContent failed:', e);
                }
                pendingContentRef.current = null;
                setPendingContent(null);
            }
        },
    });

    // Load pending content when editor becomes ready
    useEffect(() => {
        if (editor && pendingContent !== null) {
            try {
                editor.commands.setContent(pendingContent);
            } catch (e) {
                console.error('setContent failed:', e);
            }
            pendingContentRef.current = null;
            setPendingContent(null);
        }
    }, [editor, pendingContent]);

    useEffect(() => {
        const key = localStorage.getItem('admin_key');
        if (!key) {
            const input = prompt('Enter Admin API Key:');
            if (input) {
                localStorage.setItem('admin_key', input);
                window.location.reload();
            } else {
                router.push('/');
            }
            return;
        }
        if (editId) loadPost(editId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId, router]);

    const loadPost = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/posts?id=${id}`, {
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' },
            });
            const data = await res.json();
            if (data.success && data.post) {
                const p = data.post;
                setTitle(p.title);
                setSlug(p.id);
                setDate(p.date);
                setCategory(p.category);
                setDescription(p.description || '');
                setTags(Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''));
                setFeaturedImage(p.featuredImage || '');
                setFeaturedImageAlt(p.featuredImageAlt || '');
                setFeatureImage(p.featureImage || '');
                setFocusKeyword(p.focusKeyword || '');
                setExcerpt(p.excerpt || '');
                setAuthor(p.author || 'SuperfastSAT');
                setCtaFeatured(p.ctaFeatured === true);
                setMetaTitle(p.metaTitle || '');
                setMetaRobots(p.metaRobots || '');

                const content = p.content || '';
                pendingContentRef.current = content;
                setPendingContent(content);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title) return alert('제목을 입력해주세요.');
        setSaving(true);
        try {
            const htmlContent = editor?.getHTML() ?? '';
            const res = await fetch('/api/admin/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': localStorage.getItem('admin_key') || '',
                },
                body: JSON.stringify({
                    originalId: editId,
                    title,
                    slug,
                    date,
                    category,
                    content: htmlContent,
                    excerpt,
                    description,
                    tags,
                    featuredImage,
                    featuredImageAlt,
                    featureImage,
                    focusKeyword,
                    author,
                    ctaFeatured,
                    metaTitle,
                    metaRobots,
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert('발행되었습니다.');
                if (!editId) router.push(`/admin/editor?id=${data.id}`);
            } else {
                alert('오류: ' + data.error);
            }
        } catch {
            alert('저장 중 오류 발생');
        } finally {
            setSaving(false);
        }
    };

    // AI Slug generation
    const handleGenerateSlug = async () => {
        if (!title) return alert('제목을 먼저 입력해주세요.');
        setIsGeneratingSlug(true);
        try {
            const res = await fetch('/api/admin/generate-slug', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': localStorage.getItem('admin_key') || '',
                },
                body: JSON.stringify({ title, category }),
            });
            const data = await res.json();
            if (data.success && data.slug) {
                setSlug(data.slug);
            } else {
                alert('Slug 생성 실패: ' + (data.error || 'Unknown error'));
            }
        } catch {
            alert('Slug 생성 중 오류 발생');
        } finally {
            setIsGeneratingSlug(false);
        }
    };

    // Featured image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' },
                body: formData,
            });
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

    const triggerUpload = () => fileInputRef.current?.click();

    const handleFeatureImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' },
                body: formData,
            });
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

    // Inline image upload (for editor content)
    const handleInlineUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' },
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setAltTextInput('');
                setAltTextDialog({ url: data.url, fileName: file.name });
            } else {
                alert('이미지 업로드 실패: ' + data.error);
            }
        } catch {
            alert('이미지 업로드 중 오류 발생');
        } finally {
            setUploading(false);
        }
    };

    // Paste handler — intercepts image pastes, lets Tiptap handle the rest
    const handleEditorPaste = (e: React.ClipboardEvent) => {
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

    // Drop handler for image files
    const handleEditorDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0 && files[0].type.startsWith('image/')) {
            handleInlineUpload(files[0]);
        }
    };

    const confirmAltText = () => {
        if (altTextDialog) {
            editor?.chain().focus().setImage({
                src: altTextDialog.url,
                alt: altTextInput || altTextDialog.fileName,
            }).run();
            setAltTextDialog(null);
        }
    };

    const handleAlign = (alignment: string) => {
        if (!editor) return;
        if (editor.isActive('image')) {
            editor.chain().focus().updateAttributes('image', { dataAlign: alignment }).run();
        } else {
            editor.chain().focus().setTextAlign(alignment).run();
        }
    };


    const insertYoutube = () => {
        const url = window.prompt('YouTube URL:', 'https://www.youtube.com/watch?v=');
        if (!url) return;
        const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
        if (!match) {
            alert('올바른 YouTube URL이 아닙니다.');
            return;
        }
        editor?.chain().focus().setYoutubeVideo({ src: url }).run();
    };

    const insertLink = () => {
        const url = window.prompt('URL을 입력하세요:', 'https://');
        if (!url) return;
        editor?.chain().focus().setLink({ href: url }).run();
    };

    // Delete the '/' slash before running slash menu command
    const runSlashCommand = (editorCommand: () => void) => {
        if (editor) {
            const { state } = editor;
            const { $from } = state.selection;
            const charBefore =
                $from.pos > 0
                    ? state.doc.textBetween(Math.max(0, $from.pos - 1), $from.pos)
                    : '';
            if (charBefore === '/') {
                editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).run();
            }
        }
        editorCommand();
        setShowSlashMenu(false);
    };

    const YouTubeSVG = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );

    const slashOptions = [
        {
            label: 'Heading 1',
            icon: <span className="font-bold text-xs">H1</span>,
            action: () => runSlashCommand(() => editor?.chain().focus().toggleHeading({ level: 1 }).run()),
        },
        {
            label: 'Heading 2',
            icon: <span className="font-bold text-xs">H2</span>,
            action: () => runSlashCommand(() => editor?.chain().focus().toggleHeading({ level: 2 }).run()),
        },
        {
            label: 'Heading 3',
            icon: <span className="font-bold text-xs">H3</span>,
            action: () => runSlashCommand(() => editor?.chain().focus().toggleHeading({ level: 3 }).run()),
        },
        {
            label: 'Bullet List',
            icon: <span className="text-base">•</span>,
            action: () => runSlashCommand(() => editor?.chain().focus().toggleBulletList().run()),
        },
        {
            label: 'Numbered List',
            icon: <span className="text-xs font-mono">1.</span>,
            action: () => runSlashCommand(() => editor?.chain().focus().toggleOrderedList().run()),
        },
        {
            label: 'Quote',
            icon: <div className="text-lg font-serif italic">&ldquo;</div>,
            action: () => runSlashCommand(() => editor?.chain().focus().toggleBlockquote().run()),
        },
        {
            label: 'Code Block',
            icon: <span className="font-mono text-xs">{`</>`}</span>,
            action: () => runSlashCommand(() => editor?.chain().focus().toggleCodeBlock().run()),
        },
        {
            label: 'Divider',
            icon: <Minus size={16} />,
            action: () => runSlashCommand(() => editor?.chain().focus().setHorizontalRule().run()),
        },
        {
            label: 'Table',
            icon: <span className="text-xs font-mono">⊞</span>,
            action: () =>
                runSlashCommand(() =>
                    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                ),
        },
        {
            label: 'Image',
            icon: <ImageIcon size={18} />,
            action: () => {
                setShowSlashMenu(false);
                inlineFileInputRef.current?.click();
            },
        },
        {
            label: 'YouTube',
            icon: <YouTubeSVG />,
            action: () => {
                setShowSlashMenu(false);
                insertYoutube();
            },
        },
    ];

    // Keydown handler on editor wrapper div
    const handleEditorKeyDown = (e: React.KeyboardEvent) => {
        if (showSlashMenu) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashMenuIndex((prev) => (prev + 1) % slashOptions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashMenuIndex((prev) => (prev - 1 + slashOptions.length) % slashOptions.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                slashOptions[slashMenuIndex].action();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowSlashMenu(false);
            } else if (!['/', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
                setShowSlashMenu(false);
            }
            return;
        }

        if (e.key === '/') {
            if (editor) {
                const { state } = editor;
                const { $from } = state.selection;
                // Show slash menu only when current paragraph is empty
                if ($from.parent.content.size === 0) {
                    setShowSlashMenu(true);
                    setSlashMenuIndex(0);
                }
            }
        }

        if (e.key === 'Escape') {
            setShowSlashMenu(false);
        }
    };

    const proseClasses =
        'prose prose-invert prose-lg max-w-none ' +
        'prose-headings:font-bold prose-headings:text-white ' +
        'prose-a:text-blue-400 prose-code:bg-white/5 ' +
        'prose-pre:bg-[#1e2023] prose-blockquote:border-l-blue-500 ' +
        'prose-table:border-collapse prose-th:border prose-td:border ' +
        'prose-th:border-white/10 prose-td:border-white/10';

    const editorHtml = editor?.getHTML() ?? '';

    return (
        <div className="min-h-screen bg-[#151719] text-[#E0E0E0] font-sans selection:bg-blue-500/30">
            {/* Loading overlay — keeps EditorContent mounted in the DOM */}
            {loading && (
                <div className="fixed inset-0 z-[300] bg-[#151719] flex items-center justify-center text-gray-400">
                    Loading...
                </div>
            )}
            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <input
                type="file"
                ref={featureFileInputRef}
                onChange={handleFeatureImageUpload}
                className="hidden"
                accept="image/*"
            />
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

            {/* Inline Image Alt Text Dialog */}
            {altTextDialog && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1e2023] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h3 className="text-white font-bold text-base mb-4">이미지 설명 (Alt Text)</h3>
                        <div className="w-full aspect-video rounded-lg overflow-hidden mb-4 bg-black/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={altTextDialog.url} alt="" className="w-full h-full object-contain" />
                        </div>
                        <input
                            autoFocus
                            type="text"
                            value={altTextInput}
                            onChange={(e) => setAltTextInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmAltText(); if (e.key === 'Escape') { editor?.chain().focus().setImage({ src: altTextDialog.url, alt: altTextDialog.fileName }).run(); setAltTextDialog(null); } }}
                            placeholder={`이미지 설명 (기본값: ${altTextDialog.fileName})`}
                            className="w-full bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none mb-4"
                        />
                        <p className="text-[11px] text-gray-500 mb-4">검색엔진이 이미지를 이해하는 데 도움을 줍니다. 이미지 내용을 간결하게 설명해주세요.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={confirmAltText}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                                추가
                            </button>
                            <button
                                onClick={() => { editor?.chain().focus().setImage({ src: altTextDialog.url, alt: altTextDialog.fileName }).run(); setAltTextDialog(null); }}
                                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                            >
                                건너뛰기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Navigation */}
            <header className="fixed top-0 w-full h-16 flex items-center justify-between px-6 z-[100] bg-[#151719]/90 backdrop-blur-sm border-b border-white/5">
                <div className="flex items-center gap-4">
                    <NextLink
                        href="/admin"
                        className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <ArrowLeft size={16} /> Posts
                    </NextLink>
                    <span className="text-gray-700">|</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                        {category}
                    </span>
                    <span className="text-gray-400 text-sm font-medium italic">
                        {saving ? 'Saving...' : 'Draft'}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* 3-state view mode segment control */}
                    <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'edit' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setViewMode('split')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'split' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Split view"
                        >
                            ⣿
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'preview' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Preview
                        </button>
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
                <div
                    className={`fixed top-16 w-full z-[90] bg-[#151719]/95 backdrop-blur-sm border-b border-white/5 flex items-center gap-0.5 px-4 h-11 transition-all duration-300 ${showSettings ? 'pr-[332px]' : ''}`}
                >
                    {/* Inline formatting */}
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleBold().run();
                        }}
                        title="Bold (Ctrl+B)"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors font-bold text-sm ${editor?.isActive('bold') ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        B
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleItalic().run();
                        }}
                        title="Italic (Ctrl+I)"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors italic text-sm ${editor?.isActive('italic') ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        I
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleStrike().run();
                        }}
                        title="Strikethrough"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors line-through text-sm ${editor?.isActive('strike') ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        S
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleCode().run();
                        }}
                        title="Inline code"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors font-mono text-xs ${editor?.isActive('code') ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {`\`c\``}
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Headings */}
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleHeading({ level: 1 }).run();
                        }}
                        title="Heading 1"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-xs font-bold ${editor?.isActive('heading', { level: 1 }) ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        H1
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleHeading({ level: 2 }).run();
                        }}
                        title="Heading 2"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-xs font-bold ${editor?.isActive('heading', { level: 2 }) ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        H2
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleHeading({ level: 3 }).run();
                        }}
                        title="Heading 3"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-xs font-bold ${editor?.isActive('heading', { level: 3 }) ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        H3
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Block elements */}
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleBlockquote().run();
                        }}
                        title="Blockquote"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors font-serif italic text-base ${editor?.isActive('blockquote') ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        &ldquo;
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleCodeBlock().run();
                        }}
                        title="Code block"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors font-mono text-xs ${editor?.isActive('codeBlock') ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {`</>`}
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Alignment */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleAlign('left'); }}
                        title="Align left"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${editor?.isActive({ textAlign: 'left' }) || (!editor?.isActive({ textAlign: 'center' }) && !editor?.isActive({ textAlign: 'right' }) && !editor?.isActive({ textAlign: 'justify' })) ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <AlignLeft size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleAlign('center'); }}
                        title="Align center"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${editor?.isActive({ textAlign: 'center' }) ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <AlignCenter size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleAlign('right'); }}
                        title="Align right"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${editor?.isActive({ textAlign: 'right' }) ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <AlignRight size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleAlign('justify'); }}
                        title="Justify"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <AlignJustify size={14} />
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Lists */}
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleBulletList().run();
                        }}
                        title="Bullet list"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-base ${editor?.isActive('bulletList') ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        •
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleOrderedList().run();
                        }}
                        title="Numbered list"
                        className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors font-mono text-xs ${editor?.isActive('orderedList') ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        1.
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1" />

                    {/* Insert */}
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            insertLink();
                        }}
                        title="Link (Ctrl+K)"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <Link2 size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().setHorizontalRule().run();
                        }}
                        title="Horizontal rule"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors font-bold text-sm"
                    >
                        —
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                        }}
                        title="Table"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="3" y1="15" x2="21" y2="15" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                            <line x1="15" y1="3" x2="15" y2="21" />
                        </svg>
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            inlineFileInputRef.current?.click();
                        }}
                        title="Insert image"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <ImageIcon size={14} />
                    </button>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            insertYoutube();
                        }}
                        title="YouTube 영상 삽입"
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
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
                                <div
                                    className={`w-6 h-6 flex items-center justify-center rounded ${idx === slashMenuIndex ? 'bg-white/20' : 'bg-white/5'}`}
                                >
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
                <div
                    className={`fixed left-0 right-0 top-[108px] bottom-0 flex transition-all duration-300 ${showSettings ? 'mr-[320px]' : ''}`}
                >
                    {/* Left: WYSIWYG Editor */}
                    <div className="w-1/2 overflow-y-auto border-r border-white/10">
                        <div className="max-w-xl mx-auto px-6 py-8">
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
                                    onClick={triggerUpload}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={featuredImage} alt="Feature" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity text-white text-sm font-bold">
                                        <span className="bg-black/50 px-3 py-1 rounded-full">
                                            <UploadCloud size={16} className="inline mr-2" />Change
                                        </span>
                                    </div>
                                </div>
                            )}

                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Post title"
                                className="w-full bg-transparent text-4xl font-bold placeholder-gray-600 border-none outline-none mb-6 leading-tight focus:ring-0 text-left"
                            />
                            <hr className="border-white/10 mb-6" />

                            <div
                                onPaste={handleEditorPaste}
                                onDrop={handleEditorDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onKeyDown={handleEditorKeyDown}
                            >
                                <EditorContent editor={editor} className="text-gray-200" />
                                <TableBubbleMenu editor={editor} />
                                <TextBubbleMenu editor={editor} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Live Preview (HTML from editor) */}
                    <div className="w-1/2 overflow-y-auto bg-[#1a1d1f]">
                        <div className="max-w-xl mx-auto px-6 py-8">
                            {/* Category & Date */}
                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 justify-center">
                                <span className="text-blue-400 font-bold uppercase tracking-wider">{category}</span>
                                <span>•</span>
                                <span>{date}</span>
                            </div>

                            {featuredImage && (
                                <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 border border-white/5 shadow-xl">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={featuredImage}
                                        alt="Cover"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <h1 className="text-3xl font-extrabold text-white text-center mb-6 leading-tight">{title || 'Untitled'}</h1>
                            <div
                                className={proseClasses}
                                dangerouslySetInnerHTML={{
                                    __html: editorHtml || '<p class="text-gray-600">No content yet...</p>',
                                }}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <main className={`pt-44 pb-32 transition-all duration-300 ${showSettings ? 'mr-[320px]' : ''}`}>
                    {viewMode === 'edit' ? (
                        <div className="max-w-4xl mx-auto px-4 md:px-6">
                            {/* Category & Date Header */}
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 justify-center">
                                <span className="text-blue-400 font-bold uppercase tracking-wider">{category}</span>
                                <span>•</span>
                                <span>{date}</span>
                            </div>

                            {/* Feature Image */}
                            {!featuredImage ? (
                                <button
                                    onClick={triggerUpload}
                                    className="group w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 mb-10 transition-colors text-sm font-medium"
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading...' : <><ImageIcon size={18} /> Add feature image</>}
                                </button>
                            ) : (
                                <div
                                    className="relative w-full aspect-video mb-10 rounded-2xl overflow-hidden cursor-pointer group border border-white/5 shadow-2xl"
                                    onClick={triggerUpload}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={featuredImage} alt="Feature" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity text-white text-sm font-bold">
                                        <span className="bg-black/50 px-3 py-1 rounded-full">
                                            <UploadCloud size={16} className="inline mr-2" />Change
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Title Input */}
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Post title"
                                className="w-full bg-transparent text-4xl md:text-6xl font-extrabold text-white placeholder-gray-600 border-none outline-none mb-6 leading-tight focus:ring-0 text-left"
                            />
                            <hr className="border-white/10 mb-8" />

                            {/* WYSIWYG Editor */}
                            <div
                                onPaste={handleEditorPaste}
                                onDrop={handleEditorDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onKeyDown={handleEditorKeyDown}
                            >
                                <EditorContent editor={editor} className="text-gray-200" />
                                <TableBubbleMenu editor={editor} />
                                <TextBubbleMenu editor={editor} />
                            </div>
                        </div>
                    ) : (
                        // Preview Mode
                        <div className="max-w-4xl mx-auto px-4 md:px-6">
                            {/* Category & Date Header */}
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 justify-center">
                                <span className="text-blue-400 font-bold uppercase tracking-wider">{category}</span>
                                <span>•</span>
                                <span>{date}</span>
                            </div>

                            {featuredImage && (
                                <div className="w-full aspect-video rounded-2xl overflow-hidden mb-10 border border-white/5 shadow-2xl">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={featuredImage}
                                        alt="Cover"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <h1 className="text-4xl md:text-6xl font-extrabold text-white text-center mb-12 leading-tight">{title || 'Untitled Post'}</h1>
                            <div
                                className={proseClasses}
                                dangerouslySetInnerHTML={{
                                    __html: editorHtml || '<p class="text-gray-600">No content...</p>',
                                }}
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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Post settings</h2>
                        <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tab Bar */}
                    <div className="flex gap-1 bg-[#1e2023] rounded-lg p-0.5 mb-6">
                        <button
                            onClick={() => setSettingsTab('general')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                                settingsTab === 'general' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            General
                        </button>
                        <button
                            onClick={() => setSettingsTab('seo')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                                settingsTab === 'seo' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            SEO
                        </button>
                    </div>

                    {/* General Tab */}
                    {settingsTab === 'general' && (
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
                                    <button
                                        onClick={triggerUpload}
                                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                    >
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
                                {featuredImage && (
                                    <input
                                        type="text"
                                        value={featuredImageAlt}
                                        onChange={(e) => setFeaturedImageAlt(e.target.value)}
                                        placeholder="이미지 설명 (비워두면 제목 사용)"
                                        className="w-full bg-[#1e2023] border border-transparent focus:border-blue-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors outline-none"
                                    />
                                )}
                            </div>

                            {/* Card Thumbnail */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                        <ImageIcon size={12} /> Card Thumbnail
                                    </label>
                                    <button
                                        onClick={() => featureFileInputRef.current?.click()}
                                        className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1"
                                    >
                                        <UploadCloud size={12} /> Upload
                                    </button>
                                </div>
                                {featureImage && (
                                    <div
                                        className="relative w-full rounded-lg overflow-hidden border border-white/10"
                                        style={{ aspectRatio: '3/5' }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={featureImage}
                                            alt="Card thumbnail"
                                            className="w-full h-full object-cover"
                                        />
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
                                <p className="text-[10px] text-gray-600">
                                    메인페이지 Features 카드에 표시됩니다. 비율: 3:5 세로
                                </p>
                            </div>

                            {/* URL Slug */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                    <Globe size={12} /> Post URL
                                </label>
                                <div className="bg-[#1e2023] rounded px-3 py-2 border border-transparent focus-within:border-blue-500">
                                    <div className="text-xs text-gray-600 mb-1">satmasterclass.com/blog/</div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            placeholder="untitled"
                                            className="flex-1 bg-transparent text-white text-sm outline-none"
                                        />
                                        <button
                                            onClick={handleGenerateSlug}
                                            disabled={isGeneratingSlug || !title}
                                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="AI로 영문 Slug 생성"
                                        >
                                            {isGeneratingSlug ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            AI
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                    Publish Date
                                </label>
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
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                    플로팅 CTA 노출
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setCtaFeatured((prev) => !prev)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                                        ctaFeatured
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                            : 'bg-[#1e2023] border-transparent text-gray-400 hover:border-white/10'
                                    }`}
                                >
                                    <span>랜딩 버튼에 이 글 표시</span>
                                    <span
                                        className={`w-8 h-4 rounded-full relative transition-colors ${ctaFeatured ? 'bg-indigo-500' : 'bg-gray-600'}`}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${ctaFeatured ? 'translate-x-4' : 'translate-x-0.5'}`}
                                        />
                                    </span>
                                </button>
                                {ctaFeatured && (
                                    <p className="text-[11px] text-indigo-400/80">
                                        저장 시 다른 포스팅의 CTA 노출이 자동 해제됩니다.
                                    </p>
                                )}
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <button className="w-full py-2 text-red-500 hover:text-red-400 text-sm font-medium border border-red-500/20 rounded hover:bg-red-500/10 transition-colors">
                                    Delete post
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SEO Tab */}
                    {settingsTab === 'seo' && (
                        <div className="space-y-6">
                            <SeoPanel
                                title={title}
                                slug={slug}
                                metaTitle={metaTitle}
                                onMetaTitleChange={setMetaTitle}
                                metaRobots={metaRobots}
                                onMetaRobotsChange={setMetaRobots}
                                description={description}
                                excerpt={excerpt}
                                focusKeyword={focusKeyword}
                                onFocusKeywordChange={setFocusKeyword}
                                contentHtml={editorHtml}
                                featuredImage={featuredImage}
                                featuredImageAlt={featuredImageAlt}
                                tags={tags}
                            />

                            <div className="border-t border-white/10 pt-6">
                                <SocialPreview
                                    title={title}
                                    metaTitle={metaTitle}
                                    description={description}
                                    slug={slug}
                                    featuredImage={featuredImage}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}

export default function EditorPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#151719] text-white">
                    Loading Editor...
                </div>
            }
        >
            <BlogEditor />
        </Suspense>
    );
}
