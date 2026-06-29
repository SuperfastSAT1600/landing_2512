'use client';

import { useState } from 'react';
import { Copy, Check, CheckCircle2, Circle, FileText } from 'lucide-react';
import type { AlertsResponse } from '@/app/api/admin/srm/alerts/route';

// ── 메시지 템플릿 ────────────────────────────────────────────────────

function msgNoClassStudent(student: string, coach: string) {
  return `안녕하세요, ${student}님! 이번 주 수업 일정이 아직 잡혀 있지 않아요. ${coach} 선생님과 빠르게 시간 맞춰봐요 😊`;
}
function msgNoClassStudentEn(student: string, coach: string) {
  return `Hi ${student}! You don't have a class scheduled this week yet. Let's get a time set up with ${coach} ASAP 😊`;
}
function msgNoClassCoach(student: string, coach: string) {
  return `${coach}님 ${student} 학생과 수업 일정 조율되면 홈페이지에 업데이트 부탁드릴게요!`;
}
function msgNoStudyHall(student: string) {
  return `안녕하세요, ${student}님! 이번 주 스터디홀 접속 일정이 아직 없어요. 꼭 세팅해서 공부 루틴 이어가봐요! 💪`;
}
function msgNoStudyHallEn(student: string) {
  return `Hi ${student}! You haven't set up your Study Hall session for this week. Schedule it to keep your study routine going! 💪`;
}
function msgNoVocab(student: string) {
  return `안녕하세요, ${student}님! 이번 주 단어학습 일정이 없어요. 매주 꾸준히 단어 외우는 게 점수 올리는 지름길이에요, 일정 잡아주세요 📚`;
}
function msgNoVocabEn(student: string) {
  return `Hi ${student}! You haven't scheduled your vocab session this week. Consistent vocab study is the key to score improvement — please schedule it! 📚`;
}

// ── 타입 ─────────────────────────────────────────────────────────────

type AlertRowType = 'noClass' | 'noStudyHall' | 'noVocab';

export interface FlatAlert {
  key: string;
  type: AlertRowType;
  studentId: string;
  studentName: string;
  coaches: string[];
  coachIds: string[];
}

interface Props {
  data: AlertsResponse | null;
  loading?: boolean;
  onStudentClick: (s: { id: string; name: string; triggerType: string }) => void;
  onCoachClick: (c: { id: string; name: string }) => void;
  onLogClick?: (alert: FlatAlert) => void;
}

const TYPE_CONFIG: Record<AlertRowType, { label: string; border: string; bg: string; badge: string; trigger: string }> = {
  noClass:      { label: '수업없음',    border: 'border-orange-200', bg: 'bg-orange-50/40 hover:bg-orange-50',  badge: 'bg-orange-100 text-orange-700',  trigger: 'no_class' },
  noStudyHall:  { label: '스터디홀없음', border: 'border-yellow-200', bg: 'bg-yellow-50/40 hover:bg-yellow-50',  badge: 'bg-yellow-100 text-yellow-700',  trigger: 'no_study_hall' },
  noVocab:      { label: '단어없음',    border: 'border-purple-200', bg: 'bg-purple-50/40 hover:bg-purple-50',  badge: 'bg-purple-100 text-purple-700',  trigger: 'no_vocab' },
};

// ── 컴포넌트 ─────────────────────────────────────────────────────────

export function AlertFeedRows({ data, loading, onStudentClick, onCoachClick, onLogClick }: Props) {
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const handleCopy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIds((prev) => new Set(prev).add(key));
  };

  const handleCheck = (key: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // 세 알림을 하나의 flat 리스트로 합침
  const rows: FlatAlert[] = [
    ...(data?.noUpcomingClass ?? []).flatMap((item) =>
      item.students.map((name, i) => ({
        key: `noClass-${item.matchingId}-${i}`,
        type: 'noClass' as AlertRowType,
        studentId: item.studentIds?.[i] ?? name,
        studentName: name,
        coaches: item.coaches,
        coachIds: [],
      }))
    ),
    ...(data?.noStudyHall ?? []).map((item) => ({
      key: `noSH-${item.studentId}`,
      type: 'noStudyHall' as AlertRowType,
      studentId: item.studentId,
      studentName: item.studentName,
      coaches: item.coaches,
      coachIds: item.coachIds,
    })),
    ...(data?.noVocab ?? []).map((item) => ({
      key: `noVocab-${item.studentId}`,
      type: 'noVocab' as AlertRowType,
      studentId: item.studentId,
      studentName: item.studentName,
      coaches: item.coaches,
      coachIds: item.coachIds,
    })),
  ];

  const total = rows.length;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">처리 필요</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {loading ? '...' : total}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : total === 0 ? (
        <p className="text-xs text-gray-400 py-3">처리할 알림이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const cfg = TYPE_CONFIG[row.type];
            const coachName = row.coaches[0] ?? '';
            const preview =
              row.type === 'noClass'     ? msgNoClassStudent(row.studentName, coachName) :
              row.type === 'noStudyHall' ? msgNoStudyHall(row.studentName) :
                                           msgNoVocab(row.studentName);

            const copiedStudent = copiedIds.has(`${row.key}-s-ko`) || copiedIds.has(`${row.key}-s-en`);
            const copiedCoach   = copiedIds.has(`${row.key}-coach`);
            const anySent = copiedStudent || copiedCoach;
            const isChecked = checkedIds.has(row.key);

            const rowClass = isChecked
              ? 'border-emerald-300 bg-emerald-100 hover:bg-emerald-100'
              : anySent
              ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
              : `${cfg.border} ${cfg.bg}`;

            return (
              <div key={row.key} className={`flex items-stretch gap-3 px-3 py-3 rounded-lg border text-sm transition-colors ${rowClass}`}>

                {/* 유형 뱃지 */}
                <div className="w-28 shrink-0 flex items-center justify-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* 학생 + 코치 */}
                <div className="w-[32%] min-w-0 flex flex-col justify-center gap-1 border-l border-gray-200 pl-3">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <button
                      onClick={() => onStudentClick({ id: row.studentId, name: row.studentName, triggerType: cfg.trigger })}
                      className="text-sm text-gray-800 hover:text-blue-500 hover:underline transition-colors"
                    >
                      {row.studentName}
                    </button>
                    {row.coaches.length > 0 && (
                      <span className="text-gray-400 flex items-center gap-1 text-xs">
                        <span>↔</span>
                        {row.coaches.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => onCoachClick({ id: row.coachIds[i] ?? c, name: c })}
                            className="hover:text-blue-500 hover:underline transition-colors"
                          >
                            {c}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                {/* 메시지 미리보기 + 복사 */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 border-l border-gray-200 pl-3">
                  <p className="text-[11px] text-gray-400 truncate leading-relaxed">{preview}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {/* 학생 KO */}
                    <CopyBtn
                      copied={copiedIds.has(`${row.key}-s-ko`)}
                      label="KO"
                      onClick={() => handleCopy(`${row.key}-s-ko`,
                        row.type === 'noClass'     ? msgNoClassStudent(row.studentName, coachName) :
                        row.type === 'noStudyHall' ? msgNoStudyHall(row.studentName) :
                                                      msgNoVocab(row.studentName)
                      )}
                    />
                    {/* 학생 EN */}
                    <CopyBtn
                      copied={copiedIds.has(`${row.key}-s-en`)}
                      label="EN"
                      variant="en"
                      onClick={() => handleCopy(`${row.key}-s-en`,
                        row.type === 'noClass'     ? msgNoClassStudentEn(row.studentName, coachName) :
                        row.type === 'noStudyHall' ? msgNoStudyHallEn(row.studentName) :
                                                      msgNoVocabEn(row.studentName)
                      )}
                    />
                    {/* 코치 (수업없음만) */}
                    {row.type === 'noClass' && coachName && (
                      <CopyBtn
                        copied={copiedIds.has(`${row.key}-coach`)}
                        label="코치"
                        variant="coach"
                        onClick={() => handleCopy(`${row.key}-coach`, msgNoClassCoach(row.studentName, coachName))}
                      />
                    )}
                    {/* 대응 완료 체크 */}
                    <button
                      onClick={() => handleCheck(row.key)}
                      title={isChecked ? '대응 완료 취소' : '대응 완료로 표시'}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                        isChecked
                          ? 'border-emerald-400 text-emerald-700 bg-emerald-200 hover:bg-emerald-300'
                          : 'border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      {isChecked ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                      {isChecked ? '완료' : '확인'}
                    </button>
                    {/* 이슈/커뮤니케이션 기록 */}
                    {onLogClick && (
                      <button
                        onClick={() => onLogClick(row)}
                        title="이슈/커뮤니케이션 기록"
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 bg-white transition-colors"
                      >
                        <FileText size={10} />
                        기록
                      </button>
                    )}
                  </div>
                </div>

                {/* 상태 */}
                <div className="w-16 shrink-0 flex flex-col items-end justify-center border-l border-gray-200 pl-3">
                  {isChecked ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
                      <CheckCircle2 size={10} />대응완료
                    </span>
                  ) : anySent ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                      <Check size={10} />발송됨
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-300">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CopyBtn({
  copied, label, onClick, variant = 'ko',
}: {
  copied: boolean;
  label: string;
  onClick: () => void;
  variant?: 'ko' | 'en' | 'coach';
}) {
  const base = 'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors';
  const activeClass = 'border-emerald-300 text-emerald-700 bg-emerald-100';
  const idleClass =
    variant === 'en'    ? 'border-blue-200 text-blue-600 hover:text-blue-700 hover:border-blue-300 bg-white' :
    variant === 'coach' ? 'border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 bg-white' :
                          'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white';
  return (
    <button onClick={onClick} className={`${base} ${copied ? activeClass : idleClass}`}>
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {label}
    </button>
  );
}
