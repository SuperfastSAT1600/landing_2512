'use client';

interface Submission {
  id: string;
  display_name: string;
  instagram_username: string;
  rep_count: number;
  photo_url?: string;
  created_at: string;
}

interface Props {
  submissions: Submission[];
  totalReps: number;
  goal?: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function SubmissionFeed({ submissions, totalReps, goal = 1600 }: Props) {
  const progress = Math.min((totalReps / goal) * 100, 100);

  return (
    <div>
      {/* 진행률 바 */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-sm font-semibold text-gray-700">미션 누적 횟수</span>
          <span className="text-sm font-bold text-[#3182F6]">
            {totalReps.toLocaleString()} / {goal.toLocaleString()}개
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#3182F6] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{progress.toFixed(1)}% 달성</p>
      </div>


      {/* 인증 피드 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-700">학생 인증</span>
        <span className="text-xs text-gray-400">{submissions.length}명</span>
      </div>

      {submissions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">아직 인증이 없어요. 첫 번째로 인증해보세요!</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              {s.photo_url && (
                <img
                  src={s.photo_url}
                  alt={`${s.display_name} 인증`}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-800 truncate">{s.display_name}</span>
                  <span className="text-[#3182F6] font-bold text-sm whitespace-nowrap">{s.rep_count}개</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">@{s.instagram_username}</p>
                <p className="text-xs text-gray-300 mt-1">{timeAgo(s.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
