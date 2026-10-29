'use client';

import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { getMission, type MissionId } from '@/lib/guide/sfv2-steps';
import { initialState, tutorialReducer } from '@/lib/guide/tutorial-reducer';
import { getProgressSnapshot, markCompleted, parseCompleted, subscribeProgress } from '@/lib/guide/progress-storage';
import MissionPicker from './MissionPicker';
import Spotlight from './Spotlight';
import GuideMock from './mocks/GuideMock';

function Mission({ id, onExit, onDone }: { id: MissionId; onExit: () => void; onDone: () => void }) {
  const mission = getMission(id);
  const targets = mission.steps.map((s) => s.target);
  const [state, dispatch] = useReducer(tutorialReducer, initialState);
  // 콜백 ref + state: 자식 Spotlight 의 레이아웃 이펙트 시점에 container 가 null 인 문제를 피한다.
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const step = mission.steps[state.index];

  useEffect(() => {
    if (state.done) onDone();
  }, [state.done, onDone]);

  // 스포트라이트 밖 모든 클릭을 가로채고, 지정된 target 클릭만 진행으로 인정한다.
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-tutorial-id]');
    dispatch({ type: 'click', targetId: hit?.dataset.tutorialId ?? null, targets });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex items-center justify-between text-sm">
        <button type="button" onClick={onExit} className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> 미션 목록
        </button>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => dispatch({ type: 'back' })} disabled={state.index === 0} className="text-gray-500 hover:text-gray-900 disabled:opacity-30">
            이전 단계
          </button>
          <button type="button" onClick={() => dispatch({ type: 'reset' })} className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
            <RotateCcw className="h-3.5 w-3.5" /> 처음부터
          </button>
        </div>
      </div>
      <div ref={setStage} onClickCapture={handleClick} className="relative cursor-pointer overflow-hidden rounded-2xl">
        <GuideMock id={id} index={state.index} />
        {step && (
          <Spotlight
            container={stage}
            targetId={step.target}
            title={step.title}
            body={step.body}
            stepLabel={`STEP ${state.index + 1} / ${mission.steps.length}`}
            missed={state.missed}
          />
        )}
      </div>
      {state.done && (
        <div className="mt-4 rounded-xl bg-green-50 p-4 text-center">
          <p className="font-bold text-green-700">미션 완료!</p>
          <p className="mt-1 text-sm text-green-800">이제 실제 화면에서 똑같이 해보세요.</p>
          <a href={mission.liveUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-[#071be9] px-4 py-2 text-sm font-semibold text-white">
            {mission.liveLabel}
          </a>
        </div>
      )}
    </div>
  );
}

export default function TutorialShell() {
  const [active, setActive] = useState<MissionId | null>(null);
  const raw = useSyncExternalStore(subscribeProgress, getProgressSnapshot, () => '[]');
  const completed = useMemo(() => parseCompleted(raw), [raw]);

  // 매 렌더마다 새 함수가 되면 Mission 의 onDone 이펙트가 완료 상태에서 반복 실행된다.
  const handleDone = useCallback(() => {
    if (active) markCompleted(active);
  }, [active]);

  return active ? (
    <Mission key={active} id={active} onExit={() => setActive(null)} onDone={handleDone} />
  ) : (
    <MissionPicker completed={completed} onSelect={setActive} />
  );
}
