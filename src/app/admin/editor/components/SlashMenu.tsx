'use client';

import { Minus, Image as ImageIcon } from 'lucide-react';
import type { SlashOption, SlashActionKey } from '../hooks/useSlashMenu';

function SlashIcon({ actionKey }: { actionKey: SlashActionKey }) {
    if (actionKey === 'h1') return <span className="font-bold text-xs">H1</span>;
    if (actionKey === 'h2') return <span className="font-bold text-xs">H2</span>;
    if (actionKey === 'h3') return <span className="font-bold text-xs">H3</span>;
    if (actionKey === 'bulletList') return <span className="text-base">•</span>;
    if (actionKey === 'orderedList') return <span className="text-xs font-mono">1.</span>;
    if (actionKey === 'blockquote') return <span className="text-lg font-serif italic">&ldquo;</span>;
    if (actionKey === 'codeBlock') return <span className="font-mono text-xs">{`</>`}</span>;
    if (actionKey === 'divider') return <Minus size={16} />;
    if (actionKey === 'table') return <span className="text-xs font-mono">⊞</span>;
    if (actionKey === 'image') return <ImageIcon size={18} />;
    if (actionKey === 'youtube') return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
    return null;
}

interface SlashMenuProps {
    options: SlashOption[];
    activeIndex: number;
}

export function SlashMenu({ options, activeIndex }: SlashMenuProps) {
    return (
        <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-50 w-72 bg-[#1e2023] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-white/5">
                Basic blocks
            </div>
            <div>
                {options.map((option, idx) => (
                    <button
                        key={option.key}
                        onClick={option.action}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${idx === activeIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                    >
                        <div className={`w-6 h-6 flex items-center justify-center rounded ${idx === activeIndex ? 'bg-white/20' : 'bg-white/5'}`}>
                            <SlashIcon actionKey={option.key} />
                        </div>
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
