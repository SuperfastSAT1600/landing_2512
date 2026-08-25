'use client';

import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { useState, useEffect, useRef } from 'react';
import {
    Rows3, RowsIcon, Trash2,
    Columns3, ChevronLeft, ChevronRight,
    Combine, SplitSquareHorizontal,
    Bold, Italic, Strikethrough, Code, Link,
} from 'lucide-react';

interface TableBubbleMenuProps {
    editor: Editor | null;
}

const btnBase =
    'w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors';
const btnSm = (active: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded transition-colors ${active ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`;
const btnDanger =
    'w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors';
const divider = <div className="w-px h-5 bg-white/10 mx-0.5" />;

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
    const [colWidth, setColWidth] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (menuRef.current) {
            menuRef.current.style.zIndex = '100';
        }
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!editor) return;
        const cell = editor.getAttributes('tableCell');
        const headerCell = editor.getAttributes('tableHeader');
        const attrs = cell.colwidth ? cell : headerCell.colwidth ? headerCell : {};
        setColWidth(attrs.colwidth?.[0]?.toString() ?? '');
    }, [editor?.state.selection, editor]);

    if (!editor) return null;

    const applyWidth = () => {
        const px = parseInt(colWidth, 10);
        if (!isNaN(px) && px > 0) {
            editor.chain().focus().setCellAttribute('colwidth', [px]).run();
        }
    };

    return (
        <BubbleMenu
            ref={menuRef}
            editor={editor}
            options={{
                placement: 'top',
                offset: 8,
            }}
            shouldShow={({ editor: e }) => {
                return e.isActive('table') || e.isActive('tableCell') || e.isActive('tableHeader');
            }}
        >
            <div className="flex flex-col gap-0 bg-[#1e2023] border border-white/10 rounded-lg shadow-xl overflow-hidden">
            {/* 텍스트 선택 시 서식 도구 표시 */}
            {editor.state.selection instanceof TextSelection && !editor.state.selection.empty && (
                <div className="flex items-center gap-0.5 px-1 py-1 border-b border-white/10">
                    <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} title="굵게" className={btnSm(editor.isActive('bold'))}><Bold size={12} /></button>
                    <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} title="기울임" className={btnSm(editor.isActive('italic'))}><Italic size={12} /></button>
                    <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} title="취소선" className={btnSm(editor.isActive('strike'))}><Strikethrough size={12} /></button>
                    <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }} title="코드" className={btnSm(editor.isActive('code'))}><Code size={12} /></button>
                    <div className="w-px h-4 bg-white/10 mx-0.5" />
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); }
                            else {
                                const url = window.prompt('URL을 입력하세요:', 'https://');
                                if (url && url !== 'https://') editor.chain().focus().setLink({ href: url }).run();
                            }
                        }}
                        title={editor.isActive('link') ? '링크 제거' : '링크 추가'}
                        className={btnSm(editor.isActive('link'))}
                    ><Link size={12} /></button>
                </div>
            )}
            <div className="flex items-center gap-0.5 px-1.5 py-1">
                {/* Column width input */}
                <div className="flex items-center gap-1 pr-1.5 border-r border-white/10">
                    <span className="text-[10px] text-gray-500">W</span>
                    <input
                        type="number"
                        value={colWidth}
                        onChange={(e) => setColWidth(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyWidth()}
                        onBlur={applyWidth}
                        placeholder="px"
                        className="w-14 bg-transparent text-xs text-gray-300 border border-white/10
                                   rounded px-1 py-0.5 focus:outline-none focus:border-blue-500/50"
                    />
                </div>
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

                {/* Merge / Split cells */}
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().mergeCells().run();
                    }}
                    disabled={!editor.can().mergeCells()}
                    title={
                        editor.can().mergeCells()
                            ? '셀 병합'
                            : '셀 병합 (Shift+클릭으로 여러 셀 선택 후 클릭)'
                    }
                    className={`${btnBase} disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                    <Combine size={14} />
                </button>

                {editor.can().splitCell() && (
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            editor.chain().focus().splitCell().run();
                        }}
                        title="셀 분할"
                        className={btnBase}
                    >
                        <SplitSquareHorizontal size={14} />
                    </button>
                )}

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
            </div>
        </BubbleMenu>
    );
}
