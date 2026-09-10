'use client';

import { useState, useEffect } from 'react';
import { X, MousePointer2, Search, SlidersHorizontal } from 'lucide-react';

const TUTORIAL_KEY = 'mathweb_tutorial_v1';

export function TutorialOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(TUTORIAL_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-[#0d0d12] border border-zinc-700/60 rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_0_60px_rgba(96,133,255,0.18)]">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400 transition-colors"
          aria-label="닫기"
        >
          <X size={16} />
        </button>

        <h2 className="text-white text-lg font-bold mb-1.5 text-center">Math Web 사용법</h2>
        <p className="text-zinc-500 text-sm text-center mb-7">개념 지도를 탐색하는 방법이에요</p>

        <div className="space-y-5">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center shrink-0 mt-0.5">
              <MousePointer2 size={14} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-zinc-200 text-sm font-semibold">그래프의 점 = 문제</p>
              <p className="text-zinc-500 text-sm mt-0.5 leading-relaxed">
                화면에 보이는 빛나는 점(노드)이 각각 하나의 수학 문제예요. 클릭하면 문제를 바로 볼 수 있어요. 화살표 버튼으로 앞뒤 문제를 넘길 수 있어요.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center shrink-0 mt-0.5">
              <Search size={14} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-zinc-200 text-sm font-semibold">개념으로 필터링</p>
              <p className="text-zinc-500 text-sm mt-0.5 leading-relaxed">
                왼쪽 검색창에 개념 이름을 입력하거나, 아래 개념 목록을 클릭하면 그 개념이 포함된 문제만 그래프에 표시돼요. 여러 개념을 동시에 선택하면 모두 포함한 문제만 보여줘요.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center shrink-0 mt-0.5">
              <SlidersHorizontal size={14} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-zinc-200 text-sm font-semibold">난이도 필터</p>
              <p className="text-zinc-500 text-sm mt-0.5 leading-relaxed">
                오른쪽 위 체크박스로 원하는 난이도만 선택할 수 있어요.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: 'Easy', color: '#22c55e' },
                  { label: 'Medium', color: '#f59e0b' },
                  { label: 'Hard', color: '#ef4444' },
                  { label: 'Killer', color: '#c084fc' },
                ].map(d => (
                  <span
                    key={d.label}
                    className="flex items-center gap-1.5 text-[12px] px-2 py-0.5 rounded-full"
                    style={{ color: d.color, backgroundColor: d.color + '18', border: `1px solid ${d.color}40` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all"
        >
          시작하기 →
        </button>
      </div>
    </div>
  );
}
