import type { VocabSearchExample, VocabSearchResult } from './page';

function highlight(sentence: string, surfaces: string[]) {
  const escaped = surfaces.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = sentence.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
  const surfaceSet = new Set(surfaces.map((s) => s.toLowerCase()));
  return parts.map((part, i) =>
    surfaceSet.has(part.toLowerCase()) ? (
      <mark key={i} className="bg-primary-100 text-primary-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function ExampleCard({ example }: { example: VocabSearchExample }) {
  return (
    <li className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-gray-800 text-sm leading-relaxed">{highlight(example.sentence, example.surfaces)}</p>
      <div className="flex gap-2 mt-3 text-xs text-gray-400">
        <span className="px-2 py-0.5 rounded-full bg-gray-100">{example.skill}</span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100">{example.difficulty}</span>
      </div>
    </li>
  );
}

export function ResultList({ result }: { result: VocabSearchResult }) {
  if (result.count === 0) {
    return (
      <p className="text-center text-gray-500 text-sm py-10">
        &quot;{result.query}&quot;는 아직 보유한 지문에서 찾지 못했어요.
      </p>
    );
  }

  const forms = Object.entries(result.surface_forms)
    .sort((a, b) => b[1] - a[1])
    .map(([form, n]) => `${form} (${n})`)
    .join(' · ');

  return (
    <div>
      <div className="mb-5">
        <p className="text-gray-900 font-bold">
          &quot;{result.lemma}&quot; — {result.count}개 문장에서 등장
        </p>
        <p className="text-gray-400 text-xs mt-1">{forms}</p>
        {result.truncated && (
          <p className="text-gray-400 text-xs mt-1">예문이 많아 일부만 보여드려요.</p>
        )}
      </div>
      <ul className="space-y-3">
        {result.examples.map((ex, i) => (
          <ExampleCard key={`${ex.question_id}-${i}`} example={ex} />
        ))}
      </ul>
    </div>
  );
}
