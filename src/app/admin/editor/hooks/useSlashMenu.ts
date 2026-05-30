'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import type React from 'react';

export type SlashActionKey =
    | 'h1' | 'h2' | 'h3'
    | 'bulletList' | 'orderedList' | 'blockquote'
    | 'codeBlock' | 'divider' | 'table' | 'image' | 'youtube';

export interface SlashOption {
    key: SlashActionKey;
    label: string;
    action: () => void;
}

export function useSlashMenu(
    editor: Editor | null,
    inlineFileInputRef: React.RefObject<HTMLInputElement | null>,
    insertYoutube: () => void,
) {
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashMenuIndex, setSlashMenuIndex] = useState(0);

    function runSlashCommand(editorCommand: () => void) {
        if (editor) {
            const { state } = editor;
            const { $from } = state.selection;
            const charBefore = $from.pos > 0
                ? state.doc.textBetween(Math.max(0, $from.pos - 1), $from.pos)
                : '';
            if (charBefore === '/') {
                editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).run();
            }
        }
        editorCommand();
        setShowSlashMenu(false);
    }

    const slashOptions: SlashOption[] = [
        { key: 'h1', label: 'Heading 1', action: () => runSlashCommand(() => editor?.chain().focus().toggleHeading({ level: 1 }).run()) },
        { key: 'h2', label: 'Heading 2', action: () => runSlashCommand(() => editor?.chain().focus().toggleHeading({ level: 2 }).run()) },
        { key: 'h3', label: 'Heading 3', action: () => runSlashCommand(() => editor?.chain().focus().toggleHeading({ level: 3 }).run()) },
        { key: 'bulletList', label: 'Bullet List', action: () => runSlashCommand(() => editor?.chain().focus().toggleBulletList().run()) },
        { key: 'orderedList', label: 'Numbered List', action: () => runSlashCommand(() => editor?.chain().focus().toggleOrderedList().run()) },
        { key: 'blockquote', label: 'Quote', action: () => runSlashCommand(() => editor?.chain().focus().toggleBlockquote().run()) },
        { key: 'codeBlock', label: 'Code Block', action: () => runSlashCommand(() => editor?.chain().focus().toggleCodeBlock().run()) },
        { key: 'divider', label: 'Divider', action: () => runSlashCommand(() => editor?.chain().focus().setHorizontalRule().run()) },
        { key: 'table', label: 'Table', action: () => runSlashCommand(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()) },
        { key: 'image', label: 'Image', action: () => { setShowSlashMenu(false); inlineFileInputRef.current?.click(); } },
        { key: 'youtube', label: 'YouTube', action: () => { setShowSlashMenu(false); insertYoutube(); } },
    ];

    function handleEditorKeyDown(e: React.KeyboardEvent) {
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
                const { $from } = editor.state.selection;
                if ($from.parent.content.size === 0) {
                    setShowSlashMenu(true);
                    setSlashMenuIndex(0);
                }
            }
        }
        if (e.key === 'Escape') setShowSlashMenu(false);
    }

    return { showSlashMenu, slashMenuIndex, slashOptions, handleEditorKeyDown };
}
