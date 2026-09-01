'use client';

// 재결제 대상 추가 패널 — 순수 표현 컴포넌트. 데이터·후보 선별은 RenewalKanban이 담당한다.
// 배치는 플랫폼 Payment 페이지를 따른다: 좌측 필터 사이드바 + 우측 수치 표.

import { useMemo, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import {
  TutoringListControls,
  countByTutoringStatus,
  filterTutoringEntries,
  type TutoringEntry,
  type TutoringRowStudent,
  type TutoringSubTab,
} from './TutoringStudentRow';
import { RenewalCandidateTable } from './RenewalCandidateTable';
import { RenewalCandidateFilters } from './RenewalCandidateFilters';
import {
  defaultCandidateFilters,
  filterCandidates,
  paymentStatusOptions,
  subjectOptions,
  type CandidateFilters,
} from './renewal-candidate-filters';
import { countStudents, dedupeByStudent, expandSubjectRows } from './renewal-candidate-rows';

interface RenewalCandidateAddProps {
  /** 이미 선별·정렬된 후보 (열린 타깃 제외, 급한 순). */
  candidates: TutoringEntry<TutoringRowStudent>[];
  loading: boolean;
  error: string | null;
  onAdd: (studentId: string) => void;
  onClose: () => void;
  /** 추가 요청이 진행 중인 학생 id — 중복 클릭 방지. */
  pendingStudentId: string | null;
  /** SRM 튜터링 중이지만 CRM lead_status가 enrolled가 아니라 목록에 없는 인원. */
  missingFromEnrolled: number;
  onSelectStudent?: (studentId: string) => void;
}

export function RenewalCandidateAdd({
  candidates,
  loading,
  error,
  onAdd,
  onClose,
  pendingStudentId,
  missingFromEnrolled,
  onSelectStudent,
}: RenewalCandidateAddProps) {
  const [subTab, setSubTab] = useState<TutoringSubTab>('all');
  const [vipOnly, setVipOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // null = 아직 아무것도 좁히지 않음. 후보가 비동기로 도착해도 전체가 보이도록
  // 실제 체크 상태는 그때그때 옵션에서 파생한다.
  const [filters, setFilters] = useState<CandidateFilters | null>(null);

  // 목록의 단위는 학생이 아니라 (학생 × 과목) — 과목 필터도 이 행에 걸린다.
  const rows = useMemo(() => expandSubjectRows(candidates), [candidates]);

  const subjectOpts = useMemo(() => subjectOptions(rows), [rows]);
  const statusOpts = useMemo(() => paymentStatusOptions(rows), [rows]);
  const effectiveFilters = useMemo(
    () => filters ?? defaultCandidateFilters(rows),
    [filters, rows]
  );

  const visible = useMemo(() => {
    const byGroup = filterCandidates(rows, effectiveFilters);
    return filterTutoringEntries(byGroup, { subTab, vipOnly, searchQuery });
  }, [rows, effectiveFilters, subTab, vipOnly, searchQuery]);

  // 서브탭·하단 카운트는 사람 수 — 과목 행이 여러 개여도 한 명으로 센다.
  const counts = useMemo(
    () => countByTutoringStatus(dedupeByStudent(filterCandidates(rows, effectiveFilters))),
    [rows, effectiveFilters]
  );

  function resetFilters() {
    setFilters(null);
    setSubTab('all');
    setVipOnly(false);
    setSearchQuery('');
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="text-xs font-semibold text-gray-700">재결제 대상 추가</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            플랫폼 Payment 페이지와 같은 시간 내역·필터 — 초과예약·잔여 부족 순. 추가하면 이번 주차 파이프라인 1단계로 들어갑니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ChevronUp size={13} />
          닫기
        </button>
      </div>

      <div className="p-4 space-y-3">
        {missingFromEnrolled > 0 && (
          <p className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-700">
            SRM에서 튜터링 중이지만 CRM 리드 상태가 &lsquo;수강(enrolled)&rsquo;이 아닌 학생{' '}
            <b className="font-semibold">{missingFromEnrolled}명</b>은 이 목록에 없습니다 —
            &lsquo;튜터링 중&rsquo; 탭과 같은 기준입니다. 해당 학생의 리드 상태를 정리하면 여기에 나타납니다.
          </p>
        )}

        {loading ? (
          <p className="py-6 text-center text-xs text-gray-400">불러오는 중...</p>
        ) : error ? (
          <p className="py-6 text-center text-xs text-red-500">{error}</p>
        ) : (
          <div className="flex gap-4">
            <RenewalCandidateFilters
              subjectOpts={subjectOpts}
              statusOpts={statusOpts}
              filters={effectiveFilters}
              onChange={setFilters}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              visibleCount={countStudents(visible)}
              totalCount={countStudents(rows)}
              onReset={resetFilters}
            />

            <div className="min-w-0 flex-1 space-y-2">
              <TutoringListControls
                subTab={subTab}
                onSubTabChange={setSubTab}
                counts={counts}
                vipOnly={vipOnly}
                onVipOnlyChange={setVipOnly}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                showSearch={false}
              />

              {visible.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-400">
                  조건에 맞는 학생이 없습니다. 좌측 필터를 확인해 주세요.
                </p>
              ) : (
                <>
                  <p className="text-[11px] text-gray-400">
                    급한 순 정렬 — 컬럼 제목을 눌러 정렬을 바꿀 수 있습니다.
                  </p>
                  <div className="max-h-[460px] overflow-y-auto">
                    <RenewalCandidateTable
                      entries={visible}
                      onAdd={onAdd}
                      pendingStudentId={pendingStudentId}
                      onSelectStudent={onSelectStudent}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
