'use client';

interface Props {
  memoText: string;
  setMemoText: (v: string) => void;
  savingMemo: boolean;
  memoError: string;
  setMemoError: (v: string) => void;
  onAddMemo: () => void;
}

export function MemoSection({ memoText, setMemoText, savingMemo, memoError, setMemoError, onAddMemo }: Props) {
  return (
    <section>
      <p className="text-xs font-medium text-gray-500 mb-2" style={{ letterSpacing: '0.3px' }}>상담 메모</p>
      <textarea
        value={memoText}
        onChange={e => { setMemoText(e.target.value); setMemoError(''); }}
        placeholder="상담 내용을 입력하세요..."
        rows={3}
        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-y focus:outline-none focus:border-blue-400 min-h-[64px]"
      />
      {memoError && <p className="mt-1 text-xs text-red-500">{memoError}</p>}
      <div className="flex justify-end mt-2">
        <button
          onClick={onAddMemo}
          disabled={!memoText.trim() || savingMemo}
          className="px-4 py-1.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-[13px] font-semibold text-white transition-colors"
        >
          {savingMemo ? '저장 중...' : '메모 저장'}
        </button>
      </div>
    </section>
  );
}
