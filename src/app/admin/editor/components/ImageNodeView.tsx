'use client';

import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import TiptapImage from '@tiptap/extension-image';
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';

function ImageNodeViewComponent({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
    const { src, alt, dataAlign } = node.attrs;
    return (
        <NodeViewWrapper className="relative group my-4" data-align={dataAlign}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt || ''}
                className={`rounded-lg max-w-full ${selected ? 'ring-2 ring-blue-500' : ''}`}
                data-align={dataAlign} />
            <input
                value={alt || ''}
                onChange={(e) => updateAttributes({ alt: e.target.value })}
                placeholder="이미지 설명을 입력하세요..."
                className="w-full text-center text-xs text-gray-500 bg-transparent border-none outline-none mt-1 placeholder-gray-600/50"
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                    <button key={align}
                        onClick={() => updateAttributes({ dataAlign: align })}
                        className={`w-7 h-7 flex items-center justify-center rounded bg-black/60 hover:bg-black/80 text-white text-xs ${dataAlign === align ? 'ring-1 ring-blue-400' : ''}`}
                        title={`${align} 정렬`}>
                        {align === 'left' ? <AlignLeft size={12} /> :
                         align === 'center' ? <AlignCenter size={12} /> :
                         <AlignRight size={12} />}
                    </button>
                ))}
                <button onClick={deleteNode}
                    className="w-7 h-7 flex items-center justify-center rounded bg-red-600/80 hover:bg-red-500 text-white"
                    title="이미지 삭제">
                    <Trash2 size={12} />
                </button>
            </div>
        </NodeViewWrapper>
    );
}

export const CustomImage = TiptapImage.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            dataAlign: {
                default: 'center',
                parseHTML: (el: HTMLElement) => el.getAttribute('data-align') || 'center',
                renderHTML: (attrs: Record<string, string>) => ({ 'data-align': attrs.dataAlign }),
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ImageNodeViewComponent);
    },
});
