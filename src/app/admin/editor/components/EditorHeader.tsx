'use client';

import NextLink from 'next/link';
import { ArrowLeft, LayoutTemplate } from 'lucide-react';

interface EditorHeaderProps {
    category: string;
    saving: boolean;
    editId: string | null;
    viewMode: 'edit' | 'split' | 'preview';
    showSettings: boolean;
    onViewModeChange: (mode: 'edit' | 'split' | 'preview') => void;
    onSave: () => void;
    onToggleSettings: () => void;
}

export function EditorHeader({
    category, saving, editId, viewMode, showSettings,
    onViewModeChange, onSave, onToggleSettings,
}: EditorHeaderProps) {
    return (
        <header className="fixed top-0 w-full h-16 flex items-center justify-between px-6 z-[100] bg-[#151719]/90 backdrop-blur-sm border-b border-white/5">
            <div className="flex items-center gap-4">
                <NextLink
                    href="/admin"
                    className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <ArrowLeft size={16} /> Posts
                </NextLink>
                <span className="text-gray-700">|</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                    {category}
                </span>
                <span className="text-gray-400 text-sm font-medium italic">
                    {saving ? 'Saving...' : 'Draft'}
                </span>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0">
                    {(['edit', 'split', 'preview'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => onViewModeChange(mode)}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === mode ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {mode === 'split' ? '⣿' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onSave}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
                >
                    {editId ? 'Update' : 'Publish'}
                </button>

                <button
                    onClick={onToggleSettings}
                    className={`p-2 rounded transition-colors ${showSettings ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <LayoutTemplate size={20} />
                </button>
            </div>
        </header>
    );
}
