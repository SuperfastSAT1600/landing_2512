'use client';

import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';
import { Bold, Italic, Strikethrough, Code, ChevronLeft, ChevronRight, Rows3, RowsIcon } from 'lucide-react';

interface TextBubbleMenuProps {
    editor: Editor | null;
}

const btn = (active: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded transition-colors ${
        active
            ? 'bg-white/20 text-white'
            : 'text-gray-400 hover:bg-white/10 hover:text-white'
    }`;

const tableBtn =
    'w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white/10 hover:text-white transition-colors';

export function TextBubbleMenu({ editor }: TextBubbleMenuProps) {
    if (!editor) return null;

    const inTable = editor.isActive('tableCell') || editor.isActive('tableHeader');

    return (
        <BubbleMenu
            editor={editor}
            options={{ placement: 'top', offset: 8 }}
            shouldShow={({ state }) => {
                const { selection } = state;
                if (!(selection instanceof TextSelection)) return false;
                if (selection.empty) return false;
                return true;
            }}
        >
            <div className="flex items-center gap-0.5 px-1 py-1 bg-[#1e2023] border border-white/10 rounded-lg shadow-xl">
                {/* 텍스트 서식 */}
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

                {/* 표 안에서만: compact 행/열 컨트롤 */}
                {inTable && (
                    <>
                        <div className="w-px h-4 bg-white/10 mx-0.5" />
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                editor.chain().focus().addRowBefore().run();
                            }}
                            title="위에 행 추가"
                            className={tableBtn}
                        >
                            <span className="relative">
                                <Rows3 size={12} />
                                <span className="absolute -top-1.5 -right-1.5 text-[7px] font-bold text-blue-400 leading-none">+</span>
                            </span>
                        </button>
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                editor.chain().focus().addRowAfter().run();
                            }}
                            title="아래에 행 추가"
                            className={tableBtn}
                        >
                            <span className="relative">
                                <RowsIcon size={12} />
                                <span className="absolute -bottom-1.5 -right-1.5 text-[7px] font-bold text-blue-400 leading-none">+</span>
                            </span>
                        </button>
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                editor.chain().focus().addColumnBefore().run();
                            }}
                            title="왼쪽에 열 추가"
                            className={tableBtn}
                        >
                            <ChevronLeft size={12} />
                        </button>
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                editor.chain().focus().addColumnAfter().run();
                            }}
                            title="오른쪽에 열 추가"
                            className={tableBtn}
                        >
                            <ChevronRight size={12} />
                        </button>
                    </>
                )}
            </div>
        </BubbleMenu>
    );
}
