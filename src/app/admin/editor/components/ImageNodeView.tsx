'use client';

import { useState, useEffect } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import TiptapImage from '@tiptap/extension-image';
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';

function ImageNodeViewComponent({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
    const { src, alt, dataAlign, width, caption } = node.attrs;
    const [localAlt, setLocalAlt] = useState<string>(alt || '');
    const [localWidth, setLocalWidth] = useState<string>(width ? String(width) : '');
    const [localCaption, setLocalCaption] = useState<string>(caption || '');

    useEffect(() => { setLocalAlt(alt || ''); }, [alt]);
    useEffect(() => { setLocalWidth(width ? String(width) : ''); }, [width]);
    useEffect(() => { setLocalCaption(caption || ''); }, [caption]);

    function applyWidth() {
        const parsed = parseInt(localWidth);
        updateAttributes({ width: (localWidth && parsed >= 50) ? parsed : null });
    }

    const wrapperStyle = width
        ? { maxWidth: `${width}px`, marginLeft: 'auto', marginRight: 'auto' }
        : {};

    return (
        <NodeViewWrapper className="relative group my-4" data-align={dataAlign} style={wrapperStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={localAlt}
                className={`rounded-lg max-w-full w-full ${selected ? 'ring-2 ring-blue-500' : ''}`}
                data-align={dataAlign} />

            {/* Caption input — 발행 시 figcaption으로 출력 */}
            <input
                value={localCaption}
                onChange={(e) => setLocalCaption(e.target.value)}
                onBlur={() => updateAttributes({ caption: localCaption.trim() || null })}
                onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="캡션 입력 (발행 시 이미지 아래 표시됨)"
                className="w-full text-center text-sm text-gray-300 bg-transparent border-none outline-none mt-2 placeholder-gray-600/60"
            />

            {/* ALT input — 접근성용, 발행 시 비표시 */}
            <input
                value={localAlt}
                onChange={(e) => setLocalAlt(e.target.value)}
                onBlur={() => updateAttributes({ alt: localAlt })}
                onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="ALT 텍스트 (접근성용, 발행 시 비표시)"
                className="w-full text-center text-xs text-gray-600 bg-transparent border-none outline-none mt-0.5 placeholder-gray-700/60"
            />

            {/* Hover overlay */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 items-center">
                {/* Width input */}
                <div className="flex items-center bg-black/60 rounded h-7 px-1.5 gap-0.5">
                    <input
                        type="number"
                        min="50"
                        max="680"
                        value={localWidth}
                        onChange={(e) => setLocalWidth(e.target.value)}
                        onBlur={applyWidth}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') { e.preventDefault(); applyWidth(); (e.target as HTMLInputElement).blur(); }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="폭"
                        className="w-10 bg-transparent text-white text-xs outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-gray-400 text-xs">px</span>
                </div>
                {/* Alignment buttons */}
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
            width: {
                default: null,
                parseHTML: (el: HTMLElement) => {
                    const own = el.style.maxWidth;
                    if (own) return parseInt(own);
                    const fig = el.parentElement?.tagName === 'FIGURE' ? el.parentElement : null;
                    if (fig?.style.maxWidth) return parseInt(fig.style.maxWidth);
                    return null;
                },
                renderHTML: () => ({}),
            },
            caption: {
                default: null,
                parseHTML: (el: HTMLElement) => {
                    const fig = el.parentElement?.tagName === 'FIGURE' ? el.parentElement : null;
                    return fig?.querySelector('figcaption')?.textContent?.trim() || null;
                },
                renderHTML: () => ({}),
            },
        };
    },
    parseHTML() {
        return [
            { tag: 'figure > img[src]' },
            { tag: 'img[src]' },
        ];
    },
    renderHTML({ node, HTMLAttributes }) {
        const { width, caption } = node.attrs as { width: number | null; caption: string | null };
        const figStyle = width ? `max-width: ${width}px; margin: 0 auto;` : undefined;

        if (caption && width) {
            return ['figure', { style: figStyle }, ['img', HTMLAttributes], ['figcaption', {}, caption]];
        }
        if (caption) {
            return ['figure', {}, ['img', HTMLAttributes], ['figcaption', {}, caption]];
        }
        if (width) {
            return ['figure', { style: figStyle }, ['img', HTMLAttributes]];
        }
        return ['img', HTMLAttributes];
    },
    addNodeView() {
        return ReactNodeViewRenderer(ImageNodeViewComponent);
    },
});
