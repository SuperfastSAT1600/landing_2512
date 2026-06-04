'use client';

import type { Editor } from '@tiptap/react';
import {
    Image as ImageIcon, Link2, Minus,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from 'lucide-react';
import React from 'react';

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

export function FormattingToolbar({
    editor, showSettings, onInsertLink, onInsertYoutube, onInsertReel, onInsertInlineImage, onAlign,
}: FormattingToolbarProps) {
    return (
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
    );
}
