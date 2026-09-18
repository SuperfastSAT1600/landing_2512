'use client';

interface Props {
  totalReps: number;
  goal?: number;
}

export default function MissionStatus({ totalReps, goal = 1600 }: Props) {
  const progress = Math.min((totalReps / goal) * 100, 100);

  return (
    <div className="bg-orange-50 rounded-2xl p-5 mb-6">
      <p className="text-sm font-semibold text-gray-700 mb-3">미션 현황</p>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-black text-orange-600">{totalReps.toLocaleString()}</span>
        <span className="text-sm text-gray-400 pb-0.5">/ {goal.toLocaleString()}개 목표</span>
      </div>
      <div className="w-full h-3 bg-orange-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-orange-400 mt-1.5 text-right">{progress.toFixed(1)}% 달성</p>
    </div>
  );
}
