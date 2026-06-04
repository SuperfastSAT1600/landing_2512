'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseInstagramShortcode } from '@/lib/instagram-url';
import { useEditorSetup } from './hooks/useEditorSetup';
import { usePostForm } from './hooks/usePostForm';
import { useImageUpload } from './hooks/useImageUpload';
import { useSlashMenu } from './hooks/useSlashMenu';
import { EditorHeader } from './components/EditorHeader';
import { FormattingToolbar } from './components/FormattingToolbar';
import { SlashMenu } from './components/SlashMenu';
import { AltTextDialog } from './components/AltTextDialog';
import { EditorCanvas } from './components/EditorCanvas';
import { SettingsSidebar } from './components/SettingsSidebar';

export default function BlogEditor() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');

    const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
    const [showSettings, setShowSettings] = useState(false);

    const form = usePostForm();
    const { editor, loadContent } = useEditorSetup();
    const upload = useImageUpload(form.setFeaturedImage, form.setFeatureImage);
    const insertYoutube = useCallback(() => {
        const url = window.prompt('YouTube URL:', 'https://www.youtube.com/watch?v=');
        if (!url) return;
        const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
        if (!match) { alert('올바른 YouTube URL이 아닙니다.'); return; }
        editor?.chain().focus().setYoutubeVideo({ src: url }).run();
    }, [editor]);

    const insertReel = useCallback(() => {
        const url = window.prompt('Instagram Reel URL:', 'https://www.instagram.com/reel/');
        if (!url) return;
        const shortcode = parseInstagramShortcode(url);
        if (!shortcode) { alert('올바른 Instagram Reel URL이 아닙니다.\n예: https://www.instagram.com/reel/ABC123/'); return; }
        editor?.chain().focus().setInstagramReel(shortcode).run();
    }, [editor]);

    const slash = useSlashMenu(editor, upload.inlineFileInputRef, insertYoutube, insertReel);

    useEffect(() => {
        const key = localStorage.getItem('admin_key');
        if (!key) {
            const input = prompt('Enter Admin API Key:');
            if (input) { localStorage.setItem('admin_key', input); window.location.reload(); }
            else router.push('/');
            return;
        }
        if (editId) {
            form.loadPost(editId).then((content) => { if (content) loadContent(content); });
        }
        form.initCoaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId]);

    function handleAlign(alignment: string) {
        if (!editor) return;
        if (editor.isActive('image')) {
            editor.chain().focus().updateAttributes('image', { dataAlign: alignment }).run();
        } else {
            editor.chain().focus().setTextAlign(alignment).run();
        }
    }

    function insertLink() {
        if (editor?.isActive('link')) { editor.chain().focus().unsetLink().run(); return; }
        const url = window.prompt('URL을 입력하세요:', 'https://');
        if (!url || url === 'https://') return;
        editor?.chain().focus().setLink({ href: url }).run();
    }

    const editorHtml = editor?.getHTML() ?? '';

    return (
        <div className="min-h-screen bg-[#151719] text-[#E0E0E0] font-sans selection:bg-blue-500/60">
            {form.loading && (
                <div className="fixed inset-0 z-[300] bg-[#151719] flex items-center justify-center text-gray-400">
                    Loading...
                </div>
            )}

            {/* Hidden file inputs */}
            <input type="file" ref={upload.fileInputRef} onChange={upload.handleImageUpload} className="hidden" accept="image/*" />
            <input type="file" ref={upload.featureFileInputRef} onChange={upload.handleFeatureImageUpload} className="hidden" accept="image/*" />
            <input type="file" ref={upload.inlineFileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.handleInlineUpload(file);
                if (upload.inlineFileInputRef.current) upload.inlineFileInputRef.current.value = '';
            }} className="hidden" accept="image/*" />

            {upload.altTextDialog && (
                <AltTextDialog
                    dialog={upload.altTextDialog}
                    value={upload.altTextInput}
                    onChange={upload.setAltTextInput}
                    onConfirm={() => upload.confirmAltText(editor)}
                    onSkip={() => upload.skipAltText(editor)}
                />
            )}

            <EditorHeader
                category={form.category} saving={form.saving} editId={editId}
                viewMode={viewMode} showSettings={showSettings}
                onViewModeChange={setViewMode}
                onSave={() => form.handleSave(editor, editId)}
                onToggleSettings={() => setShowSettings(s => !s)}
            />

            {viewMode !== 'preview' && (
                <FormattingToolbar
                    editor={editor} showSettings={showSettings}
                    onInsertLink={insertLink}
                    onInsertYoutube={insertYoutube}
                    onInsertReel={insertReel}
                    onInsertInlineImage={() => upload.inlineFileInputRef.current?.click()}
                    onAlign={handleAlign}
                />
            )}

            {slash.showSlashMenu && (
                <SlashMenu options={slash.slashOptions} activeIndex={slash.slashMenuIndex} />
            )}

            <EditorCanvas
                editor={editor} viewMode={viewMode} showSettings={showSettings}
                title={form.title} setTitle={form.setTitle}
                date={form.date} category={form.category}
                featuredImage={form.featuredImage}
                uploading={upload.uploading}
                onTriggerUpload={upload.triggerUpload}
                onEditorPaste={upload.handleEditorPaste}
                onEditorDrop={upload.handleEditorDrop}
                onEditorKeyDown={slash.handleEditorKeyDown}
            />

            <SettingsSidebar
                show={showSettings} onClose={() => setShowSettings(false)}
                settingsTab={form.settingsTab} onTabChange={form.setSettingsTab}
                excerpt={form.excerpt} onExcerptChange={form.setExcerpt}
                description={form.description} onDescriptionChange={form.setDescription}
                featuredImage={form.featuredImage} onFeaturedImageChange={form.setFeaturedImage}
                featuredImageAlt={form.featuredImageAlt} onFeaturedImageAltChange={form.setFeaturedImageAlt}
                featureImage={form.featureImage} onFeatureImageChange={form.setFeatureImage}
                slug={form.slug} onSlugChange={form.setSlug}
                date={form.date} onDateChange={form.setDate}
                tags={form.tags} onTagsChange={form.setTags}
                category={form.category} onCategoryChange={form.setCategory}
                author={form.author} onAuthorChange={form.setAuthor}
                coaches={form.coaches}
                accessCode={form.accessCode} onAccessCodeChange={form.setAccessCode}
                ctaFeatured={form.ctaFeatured} onCtaFeaturedToggle={() => form.setCtaFeatured(p => !p)}
                isGeneratingSeo={form.isGeneratingSeo} isGeneratingSlug={form.isGeneratingSlug}
                onGenerateSeo={() => form.handleGenerateSeo(editor)}
                onGenerateSlug={form.handleGenerateSlug}
                onTriggerFeaturedUpload={upload.triggerUpload}
                onTriggerCardUpload={() => upload.featureFileInputRef.current?.click()}
                title={form.title}
                metaTitle={form.metaTitle} onMetaTitleChange={form.setMetaTitle}
                metaRobots={form.metaRobots} onMetaRobotsChange={form.setMetaRobots}
                focusKeyword={form.focusKeyword} onFocusKeywordChange={form.setFocusKeyword}
                contentHtml={editorHtml}
            />
        </div>
    );
}
