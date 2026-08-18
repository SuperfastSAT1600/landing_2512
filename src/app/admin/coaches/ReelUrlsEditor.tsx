'use client';

import { Plus, X } from 'lucide-react';
import { isValidInstagramUrl } from '@/lib/instagram-url';

interface ReelUrlsEditorProps {
    urls: string[];
    onChange: (urls: string[]) => void;
}

export function ReelUrlsEditor({ urls, onChange }: ReelUrlsEditorProps) {
    const update = (i: number, value: string) =>
        onChange(urls.map((u, idx) => (idx === i ? value : u)));
    const remove = (i: number) =>
        onChange(urls.filter((_, idx) => idx !== i));
    const add = () => onChange([...urls, '']);

    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">영상 (Instagram Reels)</label>
            <div className="space-y-1.5">
                {urls.map((url, i) => {
                    const isInvalid = url !== '' && !isValidInstagramUrl(url);
                    return (
                        <div key={i} className="flex items-center gap-1.5">
                            <input
                                value={url}
                                onChange={e => update(i, e.target.value)}
                                placeholder="https://www.instagram.com/reel/..."
                                className={`flex-1 bg-[#151719] border rounded px-3 py-2 text-sm text-white outline-none transition-colors ${
                                    isInvalid
                                        ? 'border-red-500 focus:border-red-400'
                                        : 'border-transparent focus:border-blue-500'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={add}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs font-bold text-gray-300 transition-colors"
                >
                    <Plus size={12} /> 영상 추가
                </button>
            </div>
        </div>
    );
}
