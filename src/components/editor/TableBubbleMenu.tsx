'use client';

import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import {
    Rows3, RowsIcon, Trash2,
    Columns3, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface TableBubbleMenuProps {
    editor: Editor | null;
}

const btnBase =
    'w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors';
const btnDanger =
    'w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors';
const divider = <div className="w-px h-5 bg-white/10 mx-0.5" />;

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
    if (!editor) return null;

    return (
        <BubbleMenu
            editor={editor}
            options={{
                placement: 'top',
                offset: 8,
            }}
            shouldShow={({ editor: e }: { editor: Editor }) =>
                e.isActive('table') ||
                e.isActive('tableCell') ||
                e.isActive('tableHeader')
            }
        >
            <div className="flex items-center gap-0.5 px-1.5 py-1 bg-[#1e2023] border border-white/10 rounded-lg shadow-xl">
                {/* Row controls */}
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().addRowBefore().run();
                    }}
                    title="위에 행 추가"
                    className={btnBase}
                >
                    <span className="relative">
                        <Rows3 size={14} />
                        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold text-blue-400 leading-none">+</span>
                    </span>
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().addRowAfter().run();
                    }}
                    title="아래에 행 추가"
                    className={btnBase}
                >
                    <span className="relative">
                        <RowsIcon size={14} />
                        <span className="absolute -bottom-1.5 -right-1.5 text-[8px] font-bold text-blue-400 leading-none">+</span>
                    </span>
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().deleteRow().run();
                    }}
                    title="행 삭제"
                    className={btnBase}
                >
                    <span className="relative">
                        <Rows3 size={14} />
                        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold text-red-400 leading-none">−</span>
                    </span>
                </button>

                {divider}

                {/* Column controls */}
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().addColumnBefore().run();
                    }}
                    title="왼쪽에 열 추가"
                    className={btnBase}
                >
                    <ChevronLeft size={14} />
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().addColumnAfter().run();
                    }}
                    title="오른쪽에 열 추가"
                    className={btnBase}
                >
                    <ChevronRight size={14} />
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().deleteColumn().run();
                    }}
                    title="열 삭제"
                    className={btnBase}
                >
                    <Columns3 size={14} className="text-red-400/70 hover:text-red-400" />
                </button>

                {divider}

                {/* Delete table */}
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().deleteTable().run();
                    }}
                    title="표 삭제"
                    className={btnDanger}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </BubbleMenu>
    );
}
