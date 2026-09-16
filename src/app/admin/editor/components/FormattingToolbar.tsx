'use client';

import type { Editor } from '@tiptap/react';
import {
    Image as ImageIcon, Link2,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Rows3, Columns3, ChevronLeft, ChevronRight, Combine, SplitSquareHorizontal, Trash2,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface FormattingToolbarProps {
    editor: Editor | null;
    showSettings: boolean;
    onInsertLink: () => void;
    onInsertYoutube: () => void;
    onInsertReel: () => void;
    onInsertInlineImage: () => void;
    onAlign: (align: string) => void;
}

function ToolbarBtn({ active, onMouseDown, title, children }: {
    active?: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onMouseDown={onMouseDown}
            title={title}
            className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${active ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            {children}
        </button>
    );
}

const Divider = () => <div className="w-px h-5 bg-white/10 mx-1" />;

function TableToolbar({ editor }: { editor: Editor }) {
    const [colWidth, setColWidth] = useState('');

    useEffect(() => {
        const cell = editor.getAttributes('tableCell');
        const header = editor.getAttributes('tableHeader');
        const attrs = cell.colwidth ? cell : header.colwidth ? header : {};
        setColWidth(attrs.colwidth?.[0]?.toString() ?? '');
    }, [editor.state.selection, editor]);

    const applyWidth = () => {
        const px = parseInt(colWidth, 10);
        if (!isNaN(px) && px > 0) editor.chain().focus().setCellAttribute('colwidth', [px]).run();
    };

    const btn = 'w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors';
    const danger = 'w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors';

    return (
        <>
            {/* 열 너비 */}
            <div className="flex items-center gap-1 pr-1.5">
                <span className="text-[10px] text-gray-500">W</span>
                <input
                    type="number"
                    value={colWidth}
                    onChange={e => setColWidth(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyWidth()}
                    onBlur={applyWidth}
                    placeholder="px"
                    className="w-14 bg-transparent text-xs text-gray-300 border border-white/10 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500/50"
                />
            </div>
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            {/* 행 */}
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); }} title="위에 행 추가" className={btn}>
                <span className="relative"><Rows3 size={14} /><span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold text-blue-400">+</span></span>
            </button>
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }} title="아래에 행 추가" className={btn}>
                <span className="relative"><Rows3 size={14} /><span className="absolute -bottom-1.5 -right-1.5 text-[8px] font-bold text-blue-400">+</span></span>
            </button>
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }} title="행 삭제" className={btn}>
                <span className="relative"><Rows3 size={14} /><span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold text-red-400">−</span></span>
            </button>
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            {/* 열 */}
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); }} title="왼쪽에 열 추가" className={btn}><ChevronLeft size={14} /></button>
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }} title="오른쪽에 열 추가" className={btn}><ChevronRight size={14} /></button>
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }} title="열 삭제" className={btn}><Columns3 size={14} className="text-red-400/70" /></button>
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            {/* 병합 / 분할 */}
            <button
                onMouseDown={e => { e.preventDefault(); editor.chain().focus().mergeCells().run(); }}
                disabled={!editor.can().mergeCells()}
                title="셀 병합"
                className={`${btn} disabled:opacity-30 disabled:cursor-not-allowed`}
            ><Combine size={14} /></button>
            {editor.can().splitCell() && (
                <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().splitCell().run(); }} title="셀 분할" className={btn}><SplitSquareHorizontal size={14} /></button>
            )}
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            {/* 표 삭제 */}
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }} title="표 삭제" className={danger}><Trash2 size={14} /></button>
        </>
    );
}

export function FormattingToolbar({
    editor, showSettings, onInsertLink, onInsertYoutube, onInsertReel, onInsertInlineImage, onAlign,
}: FormattingToolbarProps) {
    const [inTable, setInTable] = useState(false);

    useEffect(() => {
        if (!editor) return;
        const update = () => setInTable(
            editor.isActive('tableCell') || editor.isActive('tableHeader')
        );
        update();
        editor.on('selectionUpdate', update);
        editor.on('transaction', update);
        return () => {
            editor.off('selectionUpdate', update);
            editor.off('transaction', update);
        };
    }, [editor]);

    return (
        <>
        <div className={`fixed top-16 w-full z-[90] bg-[#151719]/95 backdrop-blur-sm border-b border-white/5 flex items-center gap-0.5 px-4 h-11 transition-all duration-300 ${showSettings ? 'pr-[332px]' : ''}`}>
            {/* Inline formatting */}
            <ToolbarBtn active={editor?.isActive('bold')} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }} title="Bold (Ctrl+B)">
                <span className="font-bold text-sm">B</span>
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('italic')} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }} title="Italic (Ctrl+I)">
                <span className="italic text-sm">I</span>
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('strike')} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleStrike().run(); }} title="Strikethrough">
                <span className="line-through text-sm">S</span>
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('code')} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCode().run(); }} title="Inline code">
                <span className="font-mono text-xs">{`\`c\``}</span>
            </ToolbarBtn>

            <Divider />

            {/* Headings */}
            {([1, 2, 3] as const).map((level) => (
                <ToolbarBtn key={level} active={editor?.isActive('heading', { level })} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level }).run(); }} title={`Heading ${level}`}>
                    <span className="text-xs font-bold">H{level}</span>
                </ToolbarBtn>
            ))}

            <Divider />

            {/* Block elements */}
            <ToolbarBtn active={editor?.isActive('blockquote')} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBlockquote().run(); }} title="Blockquote">
                <span className="font-serif italic text-base">&ldquo;</span>
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('codeBlock')} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCodeBlock().run(); }} title="Code block">
                <span className="font-mono text-xs">{`</>`}</span>
            </ToolbarBtn>

            <Divider />

            {/* Alignment */}
            <ToolbarBtn
                active={editor?.isActive({ textAlign: 'left' }) || (!editor?.isActive({ textAlign: 'center' }) && !editor?.isActive({ textAlign: 'right' }) && !editor?.isActive({ textAlign: 'justify' }))}
                onMouseDown={(e) => { e.preventDefault(); onAlign('left'); }} title="Align left">
                <AlignLeft size={14} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive({ textAlign: 'center' })} onMouseDown={(e) => { e.preventDefault(); onAlign('center'); }} title="Align center">
                <AlignCenter size={14} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive({ textAlign: 'right' })} onMouseDown={(e) => { e.preventDefault(); onAlign('right'); }} title="Align right">
                <AlignRight size={14} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive({ textAlign: 'justify' })} onMouseDown={(e) => { e.preventDefault(); onAlign('justify'); }} title="Justify">
                <AlignJustify size={14} />
            </ToolbarBtn>

            <Divider />

            {/* Lists */}
            <ToolbarBtn active={editor?.isActive('bulletList')} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }} title="Bullet list">
                <span className="text-base">•</span>
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('orderedList')} onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }} title="Numbered list">
                <span className="font-mono text-xs">1.</span>
            </ToolbarBtn>

            <Divider />

            {/* Insert */}
            <ToolbarBtn active={editor?.isActive('link')} onMouseDown={(e) => { e.preventDefault(); onInsertLink(); }} title="Link (Ctrl+K)">
                <Link2 size={14} />
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setHorizontalRule().run(); }} title="Horizontal rule">
                <span className="font-bold text-sm">—</span>
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }} title="Table">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
                    <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
                </svg>
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); onInsertInlineImage(); }} title="Insert image">
                <ImageIcon size={14} />
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); onInsertYoutube(); }} title="YouTube 영상 삽입">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            </ToolbarBtn>
            <ToolbarBtn onMouseDown={(e) => { e.preventDefault(); onInsertReel(); }} title="Instagram Reel 삽입">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
            </ToolbarBtn>
        </div>
        {inTable && editor && (
            <div className={`fixed top-[108px] w-full z-[89] bg-[#151719]/95 backdrop-blur-sm border-b border-white/5 flex items-center gap-0.5 px-4 h-10 transition-all duration-300 ${showSettings ? 'pr-[332px]' : ''}`}>
                <span className="text-[10px] text-gray-500 mr-1 shrink-0">표</span>
                <TableToolbar editor={editor} />
            </div>
        )}
        </>
    );
}
