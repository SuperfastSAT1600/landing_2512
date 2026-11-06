'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { COACH_SUBJECT_OPTIONS } from '@/lib/coach-subject-options';

interface Props {
    coachName: string;
    initial: string[];
    saving: boolean;
    error: string | null;
    onSave: (details: string[]) => void;
    onClose: () => void;
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                on
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
        >
            {label}
        </button>
    );
}

export function SubjectEditorModal({ coachName, initial, saving, error, onSave, onClose }: Props) {
    const [selected, setSelected] = useState<string[]>(initial);
    const toggle = (s: string) =>
        setSelected(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
    const extras = initial.filter(s => !COACH_SUBJECT_OPTIONS.includes(s));
    const group = (prefix: string) => COACH_SUBJECT_OPTIONS.filter(s => s.startsWith(prefix));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">{coachName} 코치 · 수업 가능 과목</h2>
                    <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900"><X size={16} /></button>
                </div>

                {[['SAT', group('SAT ')], ['AP', group('AP ')], ['기타', extras]].map(([label, items]) =>
                    (items as string[]).length > 0 && (
                        <div key={label as string} className="space-y-1.5">
                            <p className="text-[11px] font-semibold text-gray-500">{label as string}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(items as string[]).map(s => (
                                    <Chip key={s} label={s.replace(/^(SAT|AP) /, '')} on={selected.includes(s)} onClick={() => toggle(s)} />
                                ))}
                            </div>
                        </div>
                    )
                )}

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={onClose} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900">취소</button>
                    <button
                        onClick={() => onSave(selected)}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white"
                    >
                        {saving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
