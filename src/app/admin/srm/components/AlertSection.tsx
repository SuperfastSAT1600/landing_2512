'use client';

import { AlertsResponse } from '@/app/api/admin/srm/alerts/route';

function toKstDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  });
}

interface StudentChip { id: string; name: string; triggerType: string; }

interface Props {
  data: AlertsResponse | null;
  loading?: boolean;
  onStudentClick: (student: StudentChip) => void;
}

export function AlertSection({ data, loading, onStudentClick }: Props) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-6">
      {/* 수업 미잡힌 조합 */}
      <div className="bg-[#1a1c1f] rounded-xl p-5 border border-orange-500/20">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-orange-400 text-base">!</span>
          <h3 className="text-sm font-semibold text-white">수업 미잡힌 조합</h3>
          <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full ml-auto">
            {loading ? '…' : (data?.noUpcomingClass?.length ?? 0)}건
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">최근 4주 활동 · 향후 2주 수업 없음</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}
          </div>
        ) : !data?.noUpcomingClass?.length ? (
          <p className="text-xs text-gray-600">모든 조합에 수업이 잡혀 있습니다.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {data.noUpcomingClass.map((item) => (
              <div
                key={item.matchingId}
                className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-md text-sm hover:bg-white/8 transition-colors"
              >
                <span className="text-gray-200">
                  {item.students.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => onStudentClick({ id: item.studentIds?.[i] ?? name, name, triggerType: 'no_class' })}
                      className="hover:text-blue-400 hover:underline transition-colors"
                    >{name}</button>
                  ))}
                  <span className="text-gray-500 mx-1">|</span>
                  {item.coaches.join(', ')}
                </span>
                <span className="text-xs text-gray-600 shrink-0 ml-3">
                  마지막 {toKstDate(item.lastClassDate)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 스터디홀 미세팅 */}
      <div className="bg-[#1a1c1f] rounded-xl p-5 border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-yellow-400 text-base">!</span>
          <h3 className="text-sm font-semibold text-white">스터디홀 미세팅</h3>
          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full ml-auto">
            {loading ? '…' : (data?.noStudyHall?.length ?? 0)}명
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">최근 4주 활동 · 다음 7일 스터디홀 없음</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}
          </div>
        ) : !data?.noStudyHall?.length ? (
          <p className="text-xs text-gray-600">모든 학생이 스터디홀을 세팅했습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto">
            {data.noStudyHall.map((item) => (
              <button
                key={item.studentId}
                onClick={() => onStudentClick({ id: item.studentId, name: item.studentName, triggerType: 'no_study_hall' })}
                className="px-3 py-1 bg-white/5 rounded-full text-sm text-gray-300 hover:bg-white/10 hover:text-blue-400 transition-colors"
              >
                {item.studentName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
