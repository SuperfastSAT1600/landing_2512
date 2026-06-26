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

function AlertCard({
  title,
  color,
  count,
  loading,
  description,
  emptyText,
  children,
}: {
  title: string;
  color: 'orange' | 'yellow' | 'purple';
  count: number;
  loading?: boolean;
  description: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const styles = {
    orange: { border: 'border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
    yellow: { border: 'border-yellow-200', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    purple: { border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  }[color];

  return (
    <div className={`bg-white rounded-xl p-5 border ${styles.border}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`${styles.icon} text-base`}>!</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className={`text-xs ${styles.badge} px-2 py-0.5 rounded-full ml-auto`}>
          {loading ? '…' : `${count}건`}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : count === 0 ? (
        <p className="text-xs text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {children}
        </div>
      )}
    </div>
  );
}

function StudentCoachRow({
  studentId,
  studentName,
  coaches,
  triggerType,
  secondary,
  onStudentClick,
}: {
  studentId: string;
  studentName: string;
  coaches: string[];
  triggerType: string;
  secondary?: string;
  onStudentClick: (student: StudentChip) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md text-sm hover:bg-gray-100 transition-colors">
      <span className="text-gray-700 flex items-center gap-1 min-w-0">
        <button
          onClick={() => onStudentClick({ id: studentId, name: studentName, triggerType })}
          className="hover:text-blue-600 hover:underline transition-colors shrink-0"
        >
          {studentName}
        </button>
        {coaches.length > 0 && (
          <>
            <span className="text-gray-400 mx-1">|</span>
            <span className="text-gray-500 truncate">{coaches.join(', ')}</span>
          </>
        )}
      </span>
      {secondary && (
        <span className="text-xs text-gray-400 shrink-0 ml-3">{secondary}</span>
      )}
    </div>
  );
}

export function AlertSection({ data, loading, onStudentClick }: Props) {
  return (
    <div className="mt-8 grid grid-cols-3 gap-6">
      {/* 수업 미잡힌 조합 */}
      <AlertCard
        title="수업 미잡힌 조합"
        color="orange"
        count={data?.noUpcomingClass?.length ?? 0}
        loading={loading}
        description="지난 3주 수업 있음 · 이번 주 수업 없음"
        emptyText="모든 조합에 수업이 잡혀 있습니다."
      >
        {data?.noUpcomingClass?.map((item) =>
          item.students.map((name, i) => (
            <StudentCoachRow
              key={`${item.matchingId}-${i}`}
              studentId={item.studentIds?.[i] ?? name}
              studentName={name}
              coaches={item.coaches}
              triggerType="no_class"
              secondary={`마지막 ${toKstDate(item.lastClassDate)}`}
              onStudentClick={onStudentClick}
            />
          ))
        )}
      </AlertCard>

      {/* 스터디홀 미세팅 */}
      <AlertCard
        title="스터디홀 미세팅"
        color="yellow"
        count={data?.noStudyHall?.length ?? 0}
        loading={loading}
        description="지난 3주 수업 있음 · 이번 주 스터디홀 없음"
        emptyText="모든 학생이 스터디홀을 세팅했습니다."
      >
        {data?.noStudyHall?.map((item) => (
          <StudentCoachRow
            key={item.studentId}
            studentId={item.studentId}
            studentName={item.studentName}
            coaches={item.coaches}
            triggerType="no_study_hall"
            onStudentClick={onStudentClick}
          />
        ))}
      </AlertCard>

      {/* 단어학습 미세팅 */}
      <AlertCard
        title="단어학습 미세팅"
        color="purple"
        count={data?.noVocab?.length ?? 0}
        loading={loading}
        description="지난 3주 수업 있음 · 이번 주 단어학습 없음"
        emptyText="모든 학생이 단어학습을 세팅했습니다."
      >
        {data?.noVocab?.map((item) => (
          <StudentCoachRow
            key={item.studentId}
            studentId={item.studentId}
            studentName={item.studentName}
            coaches={item.coaches}
            triggerType="no_vocab"
            onStudentClick={onStudentClick}
          />
        ))}
      </AlertCard>
    </div>
  );
}
