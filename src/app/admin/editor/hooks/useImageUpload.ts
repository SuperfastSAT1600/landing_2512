'use client';

import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

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
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: { 'x-admin-key': localStorage.getItem('admin_key') || '' },
            body: formData,
        });
        const data = await res.json();
        if (data.success) return data.url;
        alert('업로드 실패: ' + data.error);
        return null;
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
