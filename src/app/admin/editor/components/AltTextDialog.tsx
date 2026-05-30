'use client';

interface AltTextDialogProps {
    dialog: { url: string; fileName: string };
    value: string;
    onChange: (v: string) => void;
    onConfirm: () => void;
    onSkip: () => void;
}

export function AltTextDialog({ dialog, value, onChange, onConfirm, onSkip }: AltTextDialogProps) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1e2023] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                <h3 className="text-white font-bold text-base mb-4">이미지 설명 (Alt Text)</h3>
                <div className="w-full aspect-video rounded-lg overflow-hidden mb-4 bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dialog.url} alt="" className="w-full h-full object-contain" />
                </div>
                <input
                    autoFocus
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onConfirm();
                        if (e.key === 'Escape') onSkip();
                    }}
                    placeholder={`이미지 설명 (기본값: ${dialog.fileName})`}
                    className="w-full bg-[#151719] border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none mb-4"
                />
                <p className="text-[11px] text-gray-500 mb-4">검색엔진이 이미지를 이해하는 데 도움을 줍니다. 이미지 내용을 간결하게 설명해주세요.</p>
                <div className="flex gap-2">
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        추가
                    </button>
                    <button
                        onClick={onSkip}
                        className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        건너뛰기
                    </button>
                </div>
            </div>
        </div>
    );
}
