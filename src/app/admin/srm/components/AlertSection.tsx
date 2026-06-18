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
      <div className="bg-white rounded-xl p-5 border border-orange-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-orange-600 text-base">!</span>
          <h3 className="text-sm font-semibold text-gray-900">수업 미잡힌 조합</h3>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full ml-auto">
            {loading ? '…' : (data?.noUpcomingClass?.length ?? 0)}건
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">최근 4주 활동 · 향후 2주 수업 없음</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : !data?.noUpcomingClass?.length ? (
          <p className="text-xs text-gray-400">모든 조합에 수업이 잡혀 있습니다.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {data.noUpcomingClass.map((item) => (
              <div
                key={item.matchingId}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md text-sm hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">
                  {item.students.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => onStudentClick({ id: item.studentIds?.[i] ?? name, name, triggerType: 'no_class' })}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >{name}</button>
                  ))}
                  <span className="text-gray-400 mx-1">|</span>
                  {item.coaches.join(', ')}
                </span>
                <span className="text-xs text-gray-400 shrink-0 ml-3">
                  마지막 {toKstDate(item.lastClassDate)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 스터디홀 미세팅 */}
      <div className="bg-white rounded-xl p-5 border border-yellow-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-yellow-600 text-base">!</span>
          <h3 className="text-sm font-semibold text-gray-900">스터디홀 미세팅</h3>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-auto">
            {loading ? '…' : (data?.noStudyHall?.length ?? 0)}명
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">최근 4주 활동 · 다음 7일 스터디홀 없음</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : !data?.noStudyHall?.length ? (
          <p className="text-xs text-gray-400">모든 학생이 스터디홀을 세팅했습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto">
            {data.noStudyHall.map((item) => (
              <button
                key={item.studentId}
                onClick={() => onStudentClick({ id: item.studentId, name: item.studentName, triggerType: 'no_study_hall' })}
                className="px-3 py-1 bg-gray-50 rounded-full text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
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
