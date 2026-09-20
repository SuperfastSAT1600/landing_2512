'use client';

const COMPLETED_KEY = 'ssat_math_completed_v1';

function getCompleted(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(COMPLETED_KEY) ?? '[]') as number[];
  } catch {
    return [];
  }
}

export function SetSelect({ studentId, onSelect }: { studentId: string; onSelect: (setNumber: number) => void }) {
  const completed = getCompleted();
  const displayName = studentId.split('_')[0] ?? studentId;

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">SSAT Math Practice</h1>
          <p className="text-gray-400 text-base">안녕하세요, <span className="text-white font-semibold">{displayName}</span>님! 풀 세트를 선택해주세요.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((setNum) => {
            const done = completed.includes(setNum);
            return (
              <button
                key={setNum}
                onClick={() => onSelect(setNum)}
                className={`relative rounded-2xl border p-6 text-left transition-all group ${
                  done
                    ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                    : 'border-white/10 bg-[#09090b] hover:border-[#071be9]/50 hover:bg-[#071be9]/5'
                }`}
              >
                {done && (
                  <span className="absolute top-3 right-3 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    완료
                  </span>
                )}
                <div className="text-2xl font-bold mb-1 text-white">Set {setNum}</div>
                <div className="text-xs text-gray-500">15문제 · 4분 30초</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
