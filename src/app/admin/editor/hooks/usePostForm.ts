'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Editor } from '@tiptap/react';

export interface PostFormState {
    title: string; setTitle: (v: string) => void;
    date: string; setDate: (v: string) => void;
    category: string; setCategory: (v: string) => void;
    author: string; setAuthor: (v: string) => void;
    coaches: { slug: string; name: string }[];
    slug: string; setSlug: (v: string) => void;
    excerpt: string; setExcerpt: (v: string) => void;
    description: string; setDescription: (v: string) => void;
    tags: string; setTags: (v: string) => void;
    featuredImage: string; setFeaturedImage: (v: string) => void;
    featureImage: string; setFeatureImage: (v: string) => void;
    featuredImageAlt: string; setFeaturedImageAlt: (v: string) => void;
    ctaFeatured: boolean; setCtaFeatured: (v: boolean | ((p: boolean) => boolean)) => void;
    focusKeyword: string; setFocusKeyword: (v: string) => void;
    metaTitle: string; setMetaTitle: (v: string) => void;
    metaRobots: string; setMetaRobots: (v: string) => void;
    accessCode: string; setAccessCode: (v: string) => void;
    settingsTab: 'general' | 'seo'; setSettingsTab: (v: 'general' | 'seo') => void;
    loading: boolean;
    saving: boolean;
    isGeneratingSlug: boolean;
    isGeneratingSeo: boolean;
    loadPost: (id: string) => Promise<string>;
    handleSave: (editor: Editor | null, editId: string | null) => Promise<void>;
    handleGenerateSeo: (editor: Editor | null) => Promise<void>;
    handleGenerateSlug: () => Promise<void>;
    initCoaches: () => void;
}

export function usePostForm(): PostFormState {
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('SAT RW');
    const [author, setAuthor] = useState('SuperfastSAT');
    const [coaches, setCoaches] = useState<{ slug: string; name: string }[]>([]);
    const [slug, setSlug] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [featuredImage, setFeaturedImage] = useState('');
    const [featureImage, setFeatureImage] = useState('');
    const [featuredImageAlt, setFeaturedImageAlt] = useState('');
    const [ctaFeatured, setCtaFeatured] = useState(false);
    const [focusKeyword, setFocusKeyword] = useState('');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaRobots, setMetaRobots] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [settingsTab, setSettingsTab] = useState<'general' | 'seo'>('general');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
    const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

    function initCoaches() {
        const key = localStorage.getItem('admin_key') || '';
        fetch('/api/admin/coaches', { headers: { 'x-admin-key': key } })
            .then(r => r.json())
            .then((data: { success: boolean; coaches?: { slug: string; name: string }[] }) => {
                if (data.success && data.coaches) setCoaches(data.coaches);
            })
            .catch(() => {});
    }

    async function loadPost(id: string) {
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
                setAccessCode(p.accessCode || '');
                return p.content || '';
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
        return '';
    }

    async function handleSave(editor: Editor | null, editId: string | null) {
        if (!title) { alert('제목을 입력해주세요.'); return; }
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
                    title, slug, date, category,
                    content: htmlContent,
                    excerpt, description, tags,
                    featuredImage, featuredImageAlt, featureImage,
                    focusKeyword, author, ctaFeatured,
                    metaTitle, metaRobots,
                    accessCode: accessCode || null,
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
    }

    async function handleGenerateSeo(editor: Editor | null) {
        if (!title) { alert('제목을 먼저 입력해주세요.'); return; }
        const htmlContent = editor?.getHTML() || '';
        if (!htmlContent || htmlContent === '<p></p>') { alert('본문 내용을 먼저 입력해주세요.'); return; }
        setIsGeneratingSeo(true);
        try {
            const res = await fetch('/api/admin/generate-seo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': localStorage.getItem('admin_key') || '',
                },
                body: JSON.stringify({ title, content: htmlContent, focusKeyword }),
            });
            const data = await res.json();
            if (data.success) {
                setExcerpt(data.excerpt);
                setDescription(data.description);
            } else {
                alert('SEO 내용 생성 실패: ' + (data.error || 'Unknown error'));
            }
        } catch {
            alert('SEO 내용 생성 중 오류 발생');
        } finally {
            setIsGeneratingSeo(false);
        }
    }

    async function handleGenerateSlug() {
        if (!title) { alert('제목을 먼저 입력해주세요.'); return; }
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
    }

    return {
        title, setTitle, date, setDate, category, setCategory,
        author, setAuthor, coaches,
        slug, setSlug, excerpt, setExcerpt, description, setDescription,
        tags, setTags, featuredImage, setFeaturedImage,
        featureImage, setFeatureImage, featuredImageAlt, setFeaturedImageAlt,
        ctaFeatured, setCtaFeatured, focusKeyword, setFocusKeyword,
        metaTitle, setMetaTitle, metaRobots, setMetaRobots,
        accessCode, setAccessCode, settingsTab, setSettingsTab,
        loading, saving, isGeneratingSlug, isGeneratingSeo,
        loadPost, handleSave, handleGenerateSeo, handleGenerateSlug, initCoaches,
    };
}
