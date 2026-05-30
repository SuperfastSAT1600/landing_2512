'use client';

import { useRef, useState, useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapLink from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { CellSelection, cellAround } from '@tiptap/pm/tables';
import Youtube from '@tiptap/extension-youtube';
import { Markdown } from 'tiptap-markdown';
import { CustomImage } from '../components/ImageNodeView';

export function useEditorSetup() {
    const pendingContentRef = useRef<string | null>(null);
    const anchorCellRef = useRef<number | null>(null);
    const [pendingContent, setPendingContent] = useState<string | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ link: false }),
            CustomImage.configure({ inline: false }),
            TiptapLink.configure({ openOnClick: false, autolink: true }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
                alignments: ['left', 'center', 'right', 'justify'],
                defaultAlignment: 'left',
            }),
            Placeholder.configure({ placeholder: 'Tell your story...' }),
            Table.configure({ resizable: true }),
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
                const target = event.target as HTMLElement;
                if (target.tagName === 'A' || target.closest('a')) {
                    event.preventDefault();
                    return true;
                }
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

    function loadContent(content: string) {
        pendingContentRef.current = content;
        setPendingContent(content);
    }

    return { editor, loadContent };
}
