'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, AlignLeft, AlignCenter, List, X } from 'lucide-react';
import { useEffect } from 'react';

const btn = (active: boolean) =>
  `w-8 h-8 flex items-center justify-center rounded transition-colors text-sm ${
    active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
  }`;

interface Props {
  subject: string;
  value: string;
  onSave: (html: string) => void;
  onClose: () => void;
}

export function SubjectEditorModal({ subject, value, onSave, onClose }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    immediatelyRender: false,
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = () => {
    onSave(editor?.getHTML() ?? '');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl bg-[#151719] rounded-2xl border border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-0.5">수업 방향성</p>
            <h3 className="text-base font-bold text-white">{subject}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 shrink-0">
          <button
            onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
            className={btn(editor?.isActive('bold') ?? false)}
            title="굵게 (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
            className={btn(editor?.isActive('italic') ?? false)}
            title="기울임 (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button
            onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('left').run(); }}
            className={btn(editor?.isActive({ textAlign: 'left' }) ?? false)}
            title="왼쪽 정렬"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign('center').run(); }}
            className={btn(editor?.isActive({ textAlign: 'center' }) ?? false)}
            title="중앙 정렬"
          >
            <AlignCenter size={14} />
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button
            onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
            className={btn(editor?.isActive('bulletList') ?? false)}
            title="목록"
          >
            <List size={14} />
          </button>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <EditorContent
            editor={editor}
            className="prose prose-invert prose-sm max-w-none min-h-[300px]"
          />
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white transition-colors"
          >
            저장
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-400 transition-colors"
          >
            취소
          </button>
        </div>
      </div>

      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 300px;
          color: rgb(209, 213, 219);
          line-height: 1.7;
        }
        .ProseMirror p { margin: 0.5em 0; }
        .ProseMirror ul { list-style: disc; padding-left: 1.5rem; margin: 0.5em 0; }
        .ProseMirror li { margin: 0.25em 0; }
        .ProseMirror strong { font-weight: 700; color: white; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgb(75, 85, 99);
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
