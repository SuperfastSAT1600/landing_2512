'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, List } from 'lucide-react';

interface CoachBioEditorProps {
    value: string;
    onChange: (html: string) => void;
}

const btn = (active: boolean) =>
    `w-8 h-8 flex items-center justify-center rounded transition-colors text-sm ${
        active
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-white/10 hover:text-white'
    }`;

const separatorBtn = 'w-px h-6 bg-white/10 mx-0.5';

export function CoachBioEditor({ value, onChange }: CoachBioEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    if (!editor) {
        return (
            <div className="w-full bg-[#151719] border border-white/10 rounded px-3 py-2 text-sm text-white opacity-50">
                로딩 중...
            </div>
        );
    }

    return (
        <div className="space-y-2 border border-white/10 rounded-lg p-3 bg-[#1e2023]">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-[#151719] rounded border border-white/5">
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleBold().run();
                    }}
                    title="굵게 (Ctrl+B)"
                    className={btn(editor.isActive('bold'))}
                >
                    <Bold size={14} />
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleItalic().run();
                    }}
                    title="기울임 (Ctrl+I)"
                    className={btn(editor.isActive('italic'))}
                >
                    <Italic size={14} />
                </button>

                <div className={separatorBtn} />

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().setTextAlign('left').run();
                    }}
                    title="왼쪽 정렬"
                    className={btn(editor.isActive({ textAlign: 'left' }))}
                >
                    <AlignLeft size={14} />
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().setTextAlign('center').run();
                    }}
                    title="중앙 정렬"
                    className={btn(editor.isActive({ textAlign: 'center' }))}
                >
                    <AlignCenter size={14} />
                </button>

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().setTextAlign('right').run();
                    }}
                    title="오른쪽 정렬"
                    className={btn(editor.isActive({ textAlign: 'right' }))}
                >
                    <AlignRight size={14} />
                </button>

                <div className={separatorBtn} />

                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        editor.chain().focus().toggleBulletList().run();
                    }}
                    title="불릿 리스트"
                    className={btn(editor.isActive('bulletList'))}
                >
                    <List size={14} />
                </button>
            </div>

            {/* Editor */}
            <EditorContent
                editor={editor}
                className="prose prose-invert prose-sm max-w-none"
                style={{
                    minHeight: '200px',
                }}
            />

            <style>{`
                .prose {
                    color: white;
                    line-height: 1.6;
                }

                .ProseMirror {
                    background: #151719;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 0.375rem;
                    padding: 0.75rem;
                    outline: none;
                    min-height: 200px;
                    overflow-y: auto;
                }

                .ProseMirror:focus {
                    border-color: rgb(59, 130, 246);
                }

                .ProseMirror p {
                    margin: 0.5em 0;
                    color: rgb(209, 213, 219);
                }

                .ProseMirror ul {
                    list-style: disc;
                    padding-left: 1.5rem;
                    margin: 0.5em 0;
                }

                .ProseMirror li {
                    color: rgb(209, 213, 219);
                    margin: 0.25em 0;
                }

                .ProseMirror strong {
                    font-weight: 700;
                }

                .ProseMirror em {
                    font-style: italic;
                }

                .ProseMirror [style*="text-align: center"] {
                    text-align: center;
                }

                .ProseMirror [style*="text-align: right"] {
                    text-align: right;
                }

                .ProseMirror [style*="text-align: left"] {
                    text-align: left;
                }
            `}</style>
        </div>
    );
}
