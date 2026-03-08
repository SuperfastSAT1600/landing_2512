'use client';

interface SavedWord {
  word: string;
  section: string;
  difficulty: string;
  domain: string;
}

interface Props {
  savedWords: SavedWord[];
}

const DIFFICULTY_STYLE: Record<string, { badge: string; dot: string }> = {
  Easy:   { badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-400' },
  Medium: { badge: 'bg-amber-50 text-amber-700 border-amber-100',       dot: 'bg-amber-400' },
  Hard:   { badge: 'bg-red-50 text-red-700 border-red-100',             dot: 'bg-red-400' },
};

export function ReportVocabularyGap({ savedWords }: Props) {
  if (savedWords.length === 0) {
    return (
      <section>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <p className="text-slate-400 text-sm">No vocabulary gaps recorded — great work!</p>
        </div>
      </section>
    );
  }

  const grouped: Record<string, SavedWord[]> = { Hard: [], Medium: [], Easy: [] };
  for (const w of savedWords) {
    const key = w.difficulty in grouped ? w.difficulty : 'Medium';
    grouped[key].push(w);
  }

  return (
    <section>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        {(['Hard', 'Medium', 'Easy'] as const).map((diff) => {
          const words = grouped[diff];
          if (words.length === 0) return null;
          const style = DIFFICULTY_STYLE[diff];
          return (
            <div key={diff}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{diff}</span>
                <span className="text-xs text-slate-300">({words.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {words.map((w, i) => (
                  <div
                    key={`${w.word}-${i}`}
                    className={`group relative inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium cursor-default ${style.badge}`}
                    title={`${w.domain} · ${w.section}`}
                  >
                    {w.word}
                    {/* Tooltip on hover */}
                    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {w.domain}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-slate-300 pt-2 border-t border-slate-50">
          Words are grouped by the difficulty of the question where they appeared.
          Hover for domain context.
        </p>
      </div>
    </section>
  );
}
