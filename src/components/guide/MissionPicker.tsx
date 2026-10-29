import { Check, Lock } from 'lucide-react';
import { MISSIONS, type MissionId } from '@/lib/guide/sfv2-steps';

interface Props {
  completed: MissionId[];
  onSelect: (id: MissionId) => void;
}

export default function MissionPicker({ completed, onSelect }: Props) {
  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <h2 className="text-xl font-bold">SuperfastSAT v2 사용법</h2>
      <p className="text-sm text-gray-500">미션을 골라 실제 화면처럼 직접 눌러보며 익혀요.</p>
      {MISSIONS.map((m, i) => {
        const done = completed.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            disabled={!m.available}
            onClick={() => onSelect(m.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left text-gray-900 transition hover:border-[#071be9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#071be9]/10 font-bold text-[#071be9]">{i + 1}</span>
            <span className="flex-1">
              <span className="block font-semibold">{m.title}</span>
              <span className="block text-xs text-gray-500">{m.summary}</span>
            </span>
            {done && <Check className="h-5 w-5 text-green-600" aria-label="완료" />}
            {!m.available && <Lock className="h-4 w-4 text-gray-400" aria-label="준비 중" />}
          </button>
        );
      })}
    </div>
  );
}
