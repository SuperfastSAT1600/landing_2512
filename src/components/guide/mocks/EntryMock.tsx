import { T } from '@/lib/guide/targets';
import AppFrame from './AppFrame';

type Kind = 'study-hall' | 'test-center';

const COPY: Record<Kind, { name: string; nav: 'Study Hall' | 'Test Center'; tagline: string }> = {
  'study-hall': { name: 'Study Hall', nav: 'Study Hall', tagline: 'The question bank with a tutor inside.' },
  'test-center': { name: 'Test Center', nav: 'Test Center', tagline: 'Sit the real thing, before it counts.' },
};

function Toggle({ on, target, label }: { on: boolean; target: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
      <span className="text-xs font-semibold">{label}</span>
      <button
        type="button"
        data-tutorial-id={target}
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`h-5 w-9 rounded-full p-0.5 ${on ? 'bg-green-500' : 'bg-red-600'}`}
      >
        <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

// index: 0 홈 / 1 둘 다 꺼짐 / 2 카메라 켜짐 / 3 둘 다 켜짐(입장 가능) / 4 입장 완료
export default function EntryMock({ kind, index }: { kind: Kind; index: number }) {
  const { name, nav, tagline } = COPY[kind];
  if (index === 0) {
    return (
      <AppFrame active="Home" dark>
        <div className="p-3">
          <h3 className="text-base font-bold">Good evening.</h3>
          <div className="mt-3 h-14 rounded-xl bg-white/10" />
          <div className="mt-2 h-14 rounded-xl bg-white/10" />
        </div>
      </AppFrame>
    );
  }
  if (index >= 4) {
    return (
      <AppFrame active={nav} dark>
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-lg font-bold">{name}</p>
          <p className="text-xs text-white/60">입장 완료! 이제 실제 화면에서 똑같이 해보세요.</p>
        </div>
      </AppFrame>
    );
  }
  const cameraOn = index >= 2;
  const screenOn = index >= 3;
  return (
    <AppFrame active={nav} dark>
      <div className="p-3">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="mb-3 text-xs text-white/60">{tagline}</p>
        <div className="mb-3 grid grid-cols-2 gap-2 text-center text-[11px]">
          <div className="rounded-xl bg-white/10 py-5">{cameraOn ? 'Camera on' : 'No camera'}</div>
          <div className="rounded-xl bg-white/10 py-5">{screenOn ? 'Screen shared' : 'Not shared'}</div>
        </div>
        <div className="space-y-2 rounded-2xl bg-white/5 p-3">
          <p className="text-xs text-white/70">Before you enter</p>
          <Toggle on={cameraOn} target={T.camera} label="1. Connect your camera" />
          <Toggle on={screenOn} target={T.screen} label="2. Share this screen to enter" />
          <button
            type="button"
            {...(screenOn ? { 'data-tutorial-id': T.enter } : {})}
            className={`w-full rounded-lg py-2.5 text-xs font-semibold ${screenOn ? 'bg-white text-black' : 'bg-white/10 text-white/40'}`}
          >
            Enter {name}
          </button>
        </div>
      </div>
    </AppFrame>
  );
}
