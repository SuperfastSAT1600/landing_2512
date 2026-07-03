'use client';

import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function useImageUpload(
    setFeaturedImage: (url: string) => void,
    setFeatureImage: (url: string) => void,
) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const featureFileInputRef = useRef<HTMLInputElement>(null);
    const inlineFileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [altTextDialog, setAltTextDialog] = useState<{ url: string; fileName: string } | null>(null);
    const [altTextInput, setAltTextInput] = useState('');

    async function uploadFile(file: File): Promise<string | null> {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            alert('지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP, SVG만 가능)');
            return null;
        }
        if (file.size > MAX_FILE_SIZE) {
            alert('파일 크기가 너무 큽니다. (최대 50MB)');
            return null;
        }

        const urlRes = await fetch('/api/admin/upload-url', {
            method: 'POST',
            headers: {
                'x-admin-key': localStorage.getItem('admin_key') || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        const urlData = await urlRes.json();
        if (!urlData.success) {
            alert('업로드 URL 발급 실패: ' + urlData.error);
            return null;
        }

        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .uploadToSignedUrl(urlData.path, urlData.token, file, { contentType: file.type });

        if (uploadError) {
            alert('업로드 실패: ' + uploadError.message);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(urlData.path);
        return publicUrl;
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadFile(file);
            if (url) setFeaturedImage(url);
        } catch { alert('업로드 중 오류 발생'); }
        finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleFeatureImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadFile(file);
            if (url) setFeatureImage(url);
        } catch { alert('업로드 중 오류 발생'); }
        finally {
            setUploading(false);
            if (featureFileInputRef.current) featureFileInputRef.current.value = '';
        }
    }

    async function handleInlineUpload(file: File) {
        if (!file.type.startsWith('image/')) return;
        setUploading(true);
        try {
            const url = await uploadFile(file);
            if (url) {
                setAltTextInput('');
                setAltTextDialog({ url, fileName: file.name });
            }
        } catch { alert('이미지 업로드 중 오류 발생'); }
        finally { setUploading(false); }
    }

    function handleEditorPaste(e: React.ClipboardEvent) {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleInlineUpload(file);
                return;
            }
        }
    }

    function handleEditorDrop(e: React.DragEvent) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files?.[0]?.type.startsWith('image/')) handleInlineUpload(files[0]);
    }

    function confirmAltText(editor: Editor | null) {
        if (!altTextDialog) return;
        editor?.chain().focus().setImage({
            src: altTextDialog.url,
            alt: altTextInput || altTextDialog.fileName,
        }).run();
        setAltTextDialog(null);
    }

    function skipAltText(editor: Editor | null) {
        if (!altTextDialog) return;
        editor?.chain().focus().setImage({
            src: altTextDialog.url,
            alt: altTextDialog.fileName,
        }).run();
        setAltTextDialog(null);
    }

    return {
        fileInputRef, featureFileInputRef, inlineFileInputRef,
        uploading,
        altTextDialog, altTextInput, setAltTextInput,
        handleImageUpload, handleFeatureImageUpload, handleInlineUpload,
        handleEditorPaste, handleEditorDrop,
        confirmAltText, skipAltText,
        triggerUpload: () => fileInputRef.current?.click(),
    };
}
