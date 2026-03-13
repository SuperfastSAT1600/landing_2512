'use client';

import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { Bold, Italic, Strikethrough, Code } from 'lucide-react';

interface TextBubbleMenuProps {
    editor: Editor | null;
}

const btn = (active: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded transition-colors ${
        active
            ? 'bg-white/20 text-white'
            : 'text-gray-400 hover:bg-white/10 hover:text-white'
    }`;

export function TextBubbleMenu({ editor }: TextBubbleMenuProps) {
    if (!editor) return null;

    return (
        <BubbleMenu
            editor={editor}
            options={{ placement: 'top', offset: 8 }}
            shouldShow={({ state }) => {
                const { selection } = state;
                if (selection.empty) return false;
                if (selection instanceof CellSelection) return false;
                return true;
            }}
        >
            <div className="flex items-center gap-0.5 px-1 py-1 bg-[#1e2023] border border-white/10 rounded-lg shadow-xl">
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleBold().run();
                    }}
                    title="굵게 (Ctrl+B)"
                    className={btn(editor.isActive('bold'))}
                >
                    <Bold size={13} />
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleItalic().run();
                    }}
                    title="기울임 (Ctrl+I)"
                    className={btn(editor.isActive('italic'))}
                >
                    <Italic size={13} />
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleStrike().run();
                    }}
                    title="취소선"
                    className={btn(editor.isActive('strike'))}
                >
                    <Strikethrough size={13} />
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleCode().run();
                    }}
                    title="인라인 코드"
                    className={btn(editor.isActive('code'))}
                >
                    <Code size={13} />
                </button>
            </div>
        </BubbleMenu>
    );
}
