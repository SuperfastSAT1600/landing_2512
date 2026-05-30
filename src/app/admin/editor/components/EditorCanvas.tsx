'use client';

import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { ImageIcon, UploadCloud } from 'lucide-react';
import { TableBubbleMenu } from '@/components/editor/TableBubbleMenu';
import { TextBubbleMenu } from '@/components/editor/TextBubbleMenu';
import React from 'react';

const PROSE = 'prose prose-invert prose-lg max-w-none ' +
    'prose-headings:font-bold prose-headings:text-white ' +
    'prose-a:text-blue-400 prose-code:bg-white/5 ' +
    'prose-pre:bg-[#1e2023] prose-blockquote:border-l-blue-500 ' +
    'prose-table:border-collapse prose-th:border prose-td:border ' +
    'prose-th:border-white/10 prose-td:border-white/10';

interface EditorCanvasProps {
    editor: Editor | null;
    viewMode: 'edit' | 'split' | 'preview';
    showSettings: boolean;
    title: string; setTitle: (v: string) => void;
    date: string; category: string;
    featuredImage: string;
    uploading: boolean;
    onTriggerUpload: () => void;
    onEditorPaste: (e: React.ClipboardEvent) => void;
    onEditorDrop: (e: React.DragEvent) => void;
    onEditorKeyDown: (e: React.KeyboardEvent) => void;
}

function FeaturedImageArea({ featuredImage, uploading, onTriggerUpload, compact }: {
    featuredImage: string; uploading: boolean; onTriggerUpload: () => void; compact?: boolean;
}) {
    if (!featuredImage) {
        return (
            <button
                onClick={onTriggerUpload}
                disabled={uploading}
                className={`group ${compact ? 'flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-8' : 'w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 mb-10'} transition-colors text-sm font-medium`}
            >
                {uploading ? 'Uploading...' : <><ImageIcon size={18} /> Add feature image</>}
            </button>
        );
    }
    return (
        <div
            onClick={onTriggerUpload}
            className={`relative ${compact ? 'w-full h-48 mb-8 rounded-xl' : 'w-full aspect-video mb-10 rounded-2xl'} overflow-hidden cursor-pointer group border border-white/5 shadow-2xl`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={featuredImage} alt="Feature" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-sm font-bold">
                <span className="bg-black/50 px-3 py-1 rounded-full"><UploadCloud size={16} className="inline mr-2" />Change</span>
            </div>
        </div>
    );
}

function EditorArea({ editor, onPaste, onDrop, onKeyDown }: {
    editor: Editor | null;
    onPaste: (e: React.ClipboardEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}) {
    return (
        <div onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => e.preventDefault()} onKeyDown={onKeyDown}>
            <EditorContent editor={editor} className="text-gray-200" />
            <TableBubbleMenu editor={editor} />
            <TextBubbleMenu editor={editor} />
        </div>
    );
}

function MetaHeader({ category, date }: { category: string; date: string }) {
    return (
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 justify-center">
            <span className="text-blue-400 font-bold uppercase tracking-wider">{category}</span>
            <span>•</span>
            <span>{date}</span>
        </div>
    );
}

export function EditorCanvas({
    editor, viewMode, showSettings,
    title, setTitle, date, category,
    featuredImage, uploading, onTriggerUpload,
    onEditorPaste, onEditorDrop, onEditorKeyDown,
}: EditorCanvasProps) {
    const editorHtml = editor?.getHTML() ?? '';

    if (viewMode === 'split') {
        return (
            <div className={`fixed left-0 right-0 top-[108px] bottom-0 flex transition-all duration-300 ${showSettings ? 'mr-[320px]' : ''}`}>
                <div className="w-1/2 overflow-y-auto border-r border-white/10">
                    <div className="max-w-xl mx-auto px-6 py-8">
                        <FeaturedImageArea featuredImage={featuredImage} uploading={uploading} onTriggerUpload={onTriggerUpload} compact />
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title"
                            className="w-full bg-transparent text-4xl font-bold placeholder-gray-600 border-none outline-none mb-6 leading-tight focus:ring-0" />
                        <hr className="border-white/10 mb-6" />
                        <EditorArea editor={editor} onPaste={onEditorPaste} onDrop={onEditorDrop} onKeyDown={onEditorKeyDown} />
                    </div>
                </div>
                <div className="w-1/2 overflow-y-auto bg-[#1a1d1f]">
                    <div className="max-w-xl mx-auto px-6 py-8">
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 justify-center">
                            <span className="text-blue-400 font-bold uppercase tracking-wider">{category}</span>
                            <span>•</span><span>{date}</span>
                        </div>
                        {featuredImage && (
                            <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 border border-white/5 shadow-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={featuredImage} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <h1 className="text-3xl font-extrabold text-white text-center mb-6 leading-tight">{title || 'Untitled'}</h1>
                        <div className={PROSE} dangerouslySetInnerHTML={{ __html: editorHtml || '<p class="text-gray-600">No content yet...</p>' }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className={`pt-44 pb-32 transition-all duration-300 ${showSettings ? 'mr-[320px]' : ''}`}>
            <div className="max-w-4xl mx-auto px-4 md:px-6">
                {viewMode === 'edit' ? (
                    <>
                        <MetaHeader category={category} date={date} />
                        <FeaturedImageArea featuredImage={featuredImage} uploading={uploading} onTriggerUpload={onTriggerUpload} />
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title"
                            className="w-full bg-transparent text-4xl md:text-6xl font-extrabold text-white placeholder-gray-600 border-none outline-none mb-6 leading-tight focus:ring-0" />
                        <hr className="border-white/10 mb-8" />
                        <EditorArea editor={editor} onPaste={onEditorPaste} onDrop={onEditorDrop} onKeyDown={onEditorKeyDown} />
                    </>
                ) : (
                    <>
                        <MetaHeader category={category} date={date} />
                        {featuredImage && (
                            <div className="w-full aspect-video rounded-2xl overflow-hidden mb-10 border border-white/5 shadow-2xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={featuredImage} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white text-center mb-12 leading-tight">{title || 'Untitled Post'}</h1>
                        <div className={PROSE} dangerouslySetInnerHTML={{ __html: editorHtml || '<p class="text-gray-600">No content...</p>' }} />
                    </>
                )}
            </div>
        </main>
    );
}
