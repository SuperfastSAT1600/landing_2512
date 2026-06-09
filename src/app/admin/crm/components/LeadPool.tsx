'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, Sparkles, X, Loader2, AlertCircle, ChevronDown, ArrowRight } from 'lucide-react';
import {
  Student,
  ChurnType,
  TrafficSource,
  ReactivationEntry,
  RetryStrategy,
  FUNNEL_STAGE_LABELS,
} from '@/types/crm';
import { FUNNEL_FLOW_ORDER, getChurnStage } from '@/lib/funnel-stats';
import { ReactivationModal } from './ReactivationModal';
import { BulkContactModal } from './BulkContactModal';
import type { AiPoolSearchMatch } from '@/app/api/crm/ai-pool-search/route';

// ─── Filters ──────────────────────────────────────────────────────────────────

// 이탈 단계 필터에서 '미상'(stage_history 없음)을 가리키는 sentinel
const CHURN_STAGE_NONE = '__none__';

interface LeadPoolFilters {
  churnTag: string;
  churnType: ChurnType | '';
  churnStage: string; // 이탈 직전 단계 코드, 또는 CHURN_STAGE_NONE
  grade: string;
  trafficSource: TrafficSource | '';
  daysSinceChurn: '30' | '60' | '90' | '180' | '';
  keyword: string;
}

const DEFAULT_FILTERS: LeadPoolFilters = {
  churnTag: '',
  churnType: '',
  churnStage: '',
  grade: '',
  trafficSource: '',
  daysSinceChurn: '',
  keyword: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

// updated_at이 lead_status 변경 시 갱신되므로 이탈 경과일 기준으로 사용
function churnedDaysAgo(student: Student): number {
  return daysSince(student.updated_at);
}

function lastConsultationSnippet(student: Student): string {
  const timeline = student.consultation_timeline ?? [];
  if (timeline.length === 0) return '';
  const latest = [...timeline].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  return (latest.ai_purified ?? latest.raw_memo ?? '').slice(0, 60);
}

// ─── Outcome Badge ─────────────────────────────────────────────────────────────

const OUTCOME_COLORS: Record<ReactivationEntry['outcome'], string> = {
  pending: 'bg-gray-100 text-gray-600',
  no_response: 'bg-orange-100 text-orange-700',
  reactivated: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const OUTCOME_LABELS: Record<ReactivationEntry['outcome'], string> = {
  pending: '대기 중',
  no_response: '반응 없음',
  reactivated: '재활성화',
  rejected: '거절',
};

// ─── StudentPoolCard ───────────────────────────────────────────────────────────

interface StudentPoolCardProps {
  student: Student;
  selected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClick: () => void;
}

function StudentPoolCard({ student, selected, onToggle, onClick }: StudentPoolCardProps) {
  const daysAgo = churnedDaysAgo(student);
  const snippet = lastConsultationSnippet(student);
  const log = student.reactivation_log ?? [];
  const lastEntry =
    log.length > 0 ? [...log].sort((a, b) => (a.attempted_at < b.attempted_at ? 1 : -1))[0] : null;
  const isReactivating = student.lead_status === 'reactivating';

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
        selected
          ? 'border-gray-900 bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {/* Checkbox — click stops propagation so card click doesn't also toggle */}
      <div onClick={onToggle} className="mt-1 flex-shrink-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{student.name}</span>
            <span className="text-xs text-gray-500">{student.grade}</span>
            {isReactivating && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                재활성화 시도 중
              </span>
            )}
            {student.churn_type && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  student.churn_type === 'closed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {student.churn_type === 'closed' ? '완전 이탈' : '잠재 이탈'}
              </span>
            )}
            {student.churn_tag && (
              <span
                title={student.churn_tag}
                className="inline-block align-bottom text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded max-w-[220px] truncate"
              >
                {student.churn_tag}
              </span>
            )}
            {(() => {
              const cs = getChurnStage(student);
              return cs ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">
                  ✘ {FUNNEL_STAGE_LABELS[cs]} 이탈
                </span>
              ) : null;
            })()}
          </div>
          <span className="text-[11px] text-gray-400 shrink-0">{daysAgo}일 경과</span>
        </div>

        {snippet && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{snippet}...</p>}

        {lastEntry && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-gray-400">
              마지막 시도: {new Date(lastEntry.attempted_at).toLocaleDateString('ko-KR')}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OUTCOME_COLORS[lastEntry.outcome]}`}
            >
              {OUTCOME_LABELS[lastEntry.outcome]}
            </span>
          </div>
        )}

        <p className="text-[10px] text-blue-400 mt-1.5">클릭하여 상담 이력 보기</p>
      </div>
    </div>
  );
}

// ─── SummaryCard ───────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="flex-1 min-w-[120px] bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── LeadPool ──────────────────────────────────────────────────────────────────

interface LeadPoolProps {
  adminKey: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStudentClick: (student: Student) => void;
  onRefetch: () => void;
  retryContext?: { id: string; name: string } | null;
  onRetryContextClear?: () => void;
  onRetryAssignSuccess?: () => void;
}

type PoolTab = 'inactive' | 'reactivating';

const POOL_PAGE_SIZE = 50;

export function LeadPool({
  adminKey,
  onStudentUpdate,
  onStudentClick,
  onRefetch,
  retryContext,
  onRetryContextClear,
  onRetryAssignSuccess,
}: LeadPoolProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statsInactive, setStatsInactive] = useState<number | null>(null);
  const [statsReactivating, setStatsReactivating] = useState<number | null>(null);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 초기 로드: 카운트만 가져옴
  useEffect(() => {
    if (!adminKey) return;
    fetch('/api/crm/students?pool=true&stats_only=true', {
      headers: { 'x-admin-key': adminKey },
    })
      .then((r) => r.json())
      .then((json) => {
        setStatsInactive(json.data?.inactive ?? 0);
        setStatsReactivating(json.data?.reactivating ?? 0);
      })
      .catch(() => {});
  }, [adminKey]);

  const fetchPoolStudents = useCallback(
    async (search: string) => {
      setPoolLoading(true);
      setPoolError(null);
      try {
        const res = await fetch(
          `/api/crm/students?pool=true&search=${encodeURIComponent(search)}`,
          { headers: { 'x-admin-key': adminKey } }
        );
        if (!res.ok) throw new Error('리드풀 데이터를 불러오지 못했습니다.');
        const data = await res.json();
        setStudents(data.data ?? []);
      } catch (err) {
        setPoolError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.');
      } finally {
        setPoolLoading(false);
      }
    },
    [adminKey]
  );

  // 진입 시 전체 풀 로드 + 이름 검색 디바운스 (빈 검색 = 전체 목록)
  useEffect(() => {
    if (!adminKey) return;
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    const q = nameSearch.trim();
    nameDebounceRef.current = setTimeout(
      () => {
        setHasSearched(true);
        fetchPoolStudents(q); // 빈 문자열이면 전체 풀(inactive+reactivating) 반환
      },
      q ? 300 : 0
    );
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    };
  }, [nameSearch, fetchPoolStudents, adminKey]);

  const [poolTab, setPoolTab] = useState<PoolTab>('inactive');
  const [filters, setFilters] = useState<LeadPoolFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showReactivationModal, setShowReactivationModal] = useState(false);
  const [showBulkContactModal, setShowBulkContactModal] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // ─── Retry strategy assignment ──────────────────────────────────────────────
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const [pickerStrategies, setPickerStrategies] = useState<RetryStrategy[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // ─── AI Search state ────────────────────────────────────────────────────────
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<AiPoolSearchMatch[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  // ─── Summary stats ─────────────────────────────────────────────────────────

  const totalInactive = statsInactive ?? 0;
  const totalReactivating = statsReactivating ?? 0;

  const successRate = useMemo(() => {
    const allEntries = students.flatMap((s) => s.reactivation_log ?? []);
    const decided = allEntries.filter((e) => e.outcome !== 'pending');
    const reactivated = allEntries.filter((e) => e.outcome === 'reactivated');
    if (decided.length === 0) return null;
    return Math.round((reactivated.length / decided.length) * 100);
  }, [students]);

  // ─── Tab base lists ─────────────────────────────────────────────────────────

  const inactiveStudents = useMemo(
    () => students.filter((s) => s.lead_status === 'inactive'),
    [students]
  );

  const reactivatingStudents = useMemo(
    () => students.filter((s) => s.lead_status === 'reactivating'),
    [students]
  );

  // ─── Filtered list (inactive tab only) ─────────────────────────────────────

  const filtered = useMemo(() => {
    return inactiveStudents.filter((s) => {
      // churn_tag는 "{태그}: {사유}"로 저장되므로 카테고리 prefix로 매칭 (bare 태그도 매칭됨)
      if (filters.churnTag && !(s.churn_tag ?? '').startsWith(filters.churnTag)) return false;
      if (filters.churnType && s.churn_type !== filters.churnType) return false;
      if (filters.churnStage) {
        const cs = getChurnStage(s);
        if (filters.churnStage === CHURN_STAGE_NONE ? cs !== null : cs !== filters.churnStage)
          return false;
      }
      if (filters.grade && s.grade !== filters.grade) return false;
      if (filters.trafficSource && s.traffic_source !== filters.trafficSource) return false;

      if (filters.daysSinceChurn) {
        const threshold = parseInt(filters.daysSinceChurn, 10);
        if (churnedDaysAgo(s) > threshold) return false;
      }

      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const hit = (s.consultation_timeline ?? []).some(
          (e) => e.ai_purified?.toLowerCase().includes(kw) || e.raw_memo?.toLowerCase().includes(kw)
        );
        if (!hit) return false;
      }

      return true;
    });
  }, [inactiveStudents, filters]);

  // 이탈 단계별 건수 (전체 이탈 학생 기준, 퍼널 순서 + 미상)
  const churnStageGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of inactiveStudents) {
      const key = getChurnStage(s) ?? CHURN_STAGE_NONE;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const ordered: { key: string; label: string; count: number }[] = [];
    for (const stage of FUNNEL_FLOW_ORDER) {
      const c = counts.get(stage);
      if (c) ordered.push({ key: stage, label: FUNNEL_STAGE_LABELS[stage], count: c });
    }
    const none = counts.get(CHURN_STAGE_NONE);
    if (none) ordered.push({ key: CHURN_STAGE_NONE, label: '미상', count: none });
    return ordered;
  }, [inactiveStudents]);

  // AI 결과가 있을 때 해당 학생 맵 (id → reason)
  const aiResultMap = useMemo<Map<string, string>>(() => {
    if (!aiResults) return new Map();
    return new Map(aiResults.map((m) => [m.id, m.reason]));
  }, [aiResults]);

  // 현재 탭의 기본 목록에서 AI 결과로 필터/정렬
  const aiFilteredList = useMemo(() => {
    if (!aiResults) return null;
    const baseList = [...inactiveStudents, ...reactivatingStudents];
    return aiResults
      .map((m) => baseList.find((s) => s.id === m.id))
      .filter((s): s is Student => s !== undefined);
  }, [aiResults, inactiveStudents, reactivatingStudents]);

  // ─── Selection ─────────────────────────────────────────────────────────────

  // AI 검색 결과가 있으면 탭/필터 무시하고 AI 결과 목록 사용
  const currentList = aiFilteredList ?? (poolTab === 'inactive' ? filtered : reactivatingStudents);

  // ─── Pagination (client-side) ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(currentList.length / POOL_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedList = currentList.slice((safePage - 1) * POOL_PAGE_SIZE, safePage * POOL_PAGE_SIZE);

  // 필터/검색/탭/AI 결과가 바뀌면 1페이지로
  useEffect(() => {
    setPage(1);
  }, [filters, nameSearch, poolTab, aiResults]);

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map((s) => s.id)));
    }
  }

  // ─── AI Search ─────────────────────────────────────────────────────────────

  async function handleAiSearch() {
    if (!aiQuery.trim() || aiSearching) return;
    setAiSearching(true);
    setAiError(null);
    setAiResults(null);
    try {
      const res = await fetch('/api/crm/ai-pool-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ query: aiQuery.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiError(json.error?.message ?? 'AI 검색에 실패했습니다.');
        return;
      }
      setAiResults(json.data.matches as AiPoolSearchMatch[]);
    } catch {
      setAiError('네트워크 오류가 발생했습니다.');
    } finally {
      setAiSearching(false);
    }
  }

  function clearAiSearch() {
    setAiResults(null);
    setAiError(null);
    setAiQuery('');
    setAiSearchOpen(false);
  }

  async function openStrategyPicker() {
    setShowStrategyPicker(true);
    if (pickerStrategies.length > 0) return;
    setPickerLoading(true);
    try {
      const res = await fetch('/api/crm/retry-strategies', {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      setPickerStrategies(json.data ?? []);
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleAssignToStrategy(strategyId: string, strategyName: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/crm/retry-strategies/${strategyId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ student_ids: ids }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setShowStrategyPicker(false);
        setBulkSuccessMessage(`${ids.length}명이 "${strategyName}" 전략에 배정되었습니다.`);
        onRetryAssignSuccess?.();
      } else {
        alert('배정에 실패했습니다.');
      }
    } finally {
      setAssigning(false);
    }
  }

  // ─── Grade options ─────────────────────────────────────────────────────────

  const gradeOptions = useMemo(
    () => Array.from(new Set(inactiveStudents.map((s) => s.grade))).sort(),
    [inactiveStudents]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Bulk success banner */}
      {bulkSuccessMessage && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-medium text-emerald-700">{bulkSuccessMessage}</p>
          <button
            type="button"
            onClick={() => setBulkSuccessMessage(null)}
            className="text-xs text-emerald-500 hover:text-emerald-700"
          >
            닫기
          </button>
        </div>
      )}

      {/* Retry strategy context banner */}
      {retryContext && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2">
            <ArrowRight size={14} className="text-blue-500" />
            <p className="text-sm text-blue-700">
              <span className="font-semibold">{retryContext.name}</span> 전략으로 배정 중 — 리드를
              선택하세요
            </p>
          </div>
          <button
            type="button"
            onClick={onRetryContextClear}
            className="text-xs text-blue-400 hover:text-blue-600 transition-colors"
          >
            해제
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="flex gap-3 flex-wrap">
        <SummaryCard label="총 이탈" value={totalInactive} sub="inactive 학생" />
        <SummaryCard label="재활성화 시도 중" value={totalReactivating} sub="reactivating 학생" />
        <SummaryCard
          label="성공률"
          value={successRate !== null ? `${successRate}%` : '-'}
          sub={successRate !== null ? '결과 확인 기준' : '기록 없음'}
        />
      </div>

      {/* Name search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          placeholder="이름으로 검색..."
          className="w-full pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
        />
        {nameSearch && (
          <button
            onClick={() => setNameSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            { key: 'inactive', label: `이탈 학생 (${totalInactive})` },
            { key: 'reactivating', label: `재활성화 시도 중 (${totalReactivating})` },
          ] as { key: PoolTab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setPoolTab(key);
              setSelectedIds(new Set());
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              poolTab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* AI Search bar */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAiSearchOpen((o) => !o);
              if (!aiSearchOpen) setTimeout(() => aiInputRef.current?.focus(), 50);
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
              aiSearchOpen || aiResults
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-100'
            }`}
          >
            <Sparkles size={12} />
            AI 검색
          </button>

          {aiSearchOpen && (
            <>
              <input
                ref={aiInputRef}
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                placeholder="예: 비용 문제로 이탈한 고3 수학 학생"
                className="flex-1 text-sm border border-purple-200 bg-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400/30 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={handleAiSearch}
                disabled={aiSearching || !aiQuery.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-500 disabled:opacity-50 transition-colors"
              >
                {aiSearching ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Search size={12} />
                )}
                {aiSearching ? '분석 중...' : '검색'}
              </button>
            </>
          )}

          {aiResults && (
            <button
              type="button"
              onClick={clearAiSearch}
              className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700 ml-auto"
            >
              <X size={12} />
              AI 결과 초기화
            </button>
          )}
        </div>

        {aiError && (
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle size={12} />
            {aiError}
          </div>
        )}

        {aiResults && (
          <p className="text-xs text-purple-600 font-medium">
            AI 검색 결과: {aiResults.length}명 매칭
            <span className="text-purple-400 font-normal ml-1">— 관련성 높은 순 정렬</span>
          </p>
        )}
      </div>

      {/* Inactive tab: filter bar (AI 검색 중에는 숨김) */}
      {poolTab === 'inactive' && !aiResults && churnStageGroups.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
          <span className="font-medium text-gray-500">이탈 단계</span>
          {churnStageGroups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() =>
                setFilters((f) => ({ ...f, churnStage: f.churnStage === g.key ? '' : g.key }))
              }
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filters.churnStage === g.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {g.label}{' '}
              <b className={filters.churnStage === g.key ? '' : 'text-gray-800'}>{g.count}</b>
            </button>
          ))}
        </div>
      )}

      {poolTab === 'inactive' && !aiResults && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="상담 내용 키워드 검색..."
              value={filters.keyword}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-44"
            />
          </div>

          <select
            value={filters.churnType}
            onChange={(e) =>
              setFilters((f) => ({ ...f, churnType: e.target.value as ChurnType | '' }))
            }
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">이탈 유형 전체</option>
            <option value="potential">잠재 이탈</option>
            <option value="closed">완전 이탈</option>
          </select>

          <select
            value={filters.churnTag}
            onChange={(e) => setFilters((f) => ({ ...f, churnTag: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">이탈 사유 전체</option>
            <option value="회신 없음">회신 없음</option>
            <option value="노쇼">노쇼</option>
            <option value="미응시">미응시</option>
            <option value="미결제">미결제</option>
            <option value="기타">기타</option>
          </select>

          <select
            value={filters.churnStage}
            onChange={(e) => setFilters((f) => ({ ...f, churnStage: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">이탈 단계 전체</option>
            {churnStageGroups.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label} ({g.count})
              </option>
            ))}
          </select>

          <select
            value={filters.grade}
            onChange={(e) => setFilters((f) => ({ ...f, grade: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">학년 전체</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={filters.daysSinceChurn}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                daysSinceChurn: e.target.value as LeadPoolFilters['daysSinceChurn'],
              }))
            }
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">기간 전체</option>
            <option value="30">30일 이내</option>
            <option value="60">60일 이내</option>
            <option value="90">90일 이내</option>
            <option value="180">180일 이내</option>
          </select>

          {Object.values(filters).some((v) => v !== '') && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
      )}

      {/* Select all row */}
      {currentList.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.size === currentList.length && currentList.length > 0}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
          />
          <span className="text-xs text-gray-500">전체 선택 ({currentList.length}명)</span>
        </div>
      )}

      {/* Student list */}
      {poolLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="text-sm">검색 중...</span>
        </div>
      ) : poolError ? (
        <div className="flex items-center gap-2 py-8 justify-center text-red-500">
          <AlertCircle size={16} />
          <p className="text-sm">{poolError}</p>
        </div>
      ) : !hasSearched ? (
        <div className="py-16 text-center text-sm text-gray-400">
          이름을 입력하면 리드풀 학생을 검색합니다.
        </div>
      ) : currentList.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          {aiResults
            ? 'AI 검색 결과가 없습니다. 다른 표현으로 다시 시도해보세요.'
            : poolTab === 'inactive'
              ? '조건에 맞는 이탈 학생이 없습니다.'
              : '재활성화 시도 중인 학생이 없습니다.'}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pagedList.map((s) => {
              const aiReason = aiResultMap.get(s.id);
              return (
                <div key={s.id}>
                  <StudentPoolCard
                    student={s}
                    selected={selectedIds.has(s.id)}
                    onToggle={(e) => {
                      e.stopPropagation();
                      toggleStudent(s.id);
                    }}
                    onClick={() => onStudentClick(s)}
                  />
                  {aiReason && (
                    <div className="flex items-start gap-1.5 mt-1 px-2">
                      <Sparkles size={11} className="text-purple-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-purple-600 leading-relaxed">{aiReason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {currentList.length > POOL_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4 pb-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-40 disabled:hover:border-gray-200"
              >
                이전
              </button>
              <span className="text-xs text-gray-500">
                {safePage} / {totalPages} 페이지 · 총 {currentList.length}명
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-40 disabled:hover:border-gray-200"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* Strategy picker dropdown (위치: bulk action bar 바로 위) */}
      {showStrategyPicker && !retryContext && (
        <div className="fixed bottom-20 right-6 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 min-w-[200px]">
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <p className="text-xs font-bold text-gray-700">전략 선택</p>
            <button
              onClick={() => setShowStrategyPicker(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          </div>
          {pickerLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={14} className="animate-spin text-gray-400" />
            </div>
          ) : pickerStrategies.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-2">
              전략이 없습니다.
              <br />
              재시도 세일즈 탭에서 먼저 만드세요.
            </p>
          ) : (
            pickerStrategies.map((s) => (
              <button
                key={s.id}
                onClick={() => handleAssignToStrategy(s.id, s.name)}
                disabled={assigning}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {s.name}
              </button>
            ))
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between bg-gray-900 text-white rounded-xl px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">{selectedIds.size}명 선택됨</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowBulkContactModal(true)}
              className="text-sm font-medium bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-400 transition-colors"
            >
              연락 기록
            </button>
            <button
              type="button"
              onClick={() => setShowReactivationModal(true)}
              className="text-sm font-bold bg-white text-gray-900 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              재활성화 시작
            </button>
            {/* 재시도 세일즈 배정 */}
            {retryContext ? (
              <button
                type="button"
                onClick={() => handleAssignToStrategy(retryContext.id, retryContext.name)}
                disabled={assigning}
                className="flex items-center gap-1.5 text-sm font-bold bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                <ArrowRight size={13} />
                {assigning ? '배정 중...' : `"${retryContext.name}" 배정`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  showStrategyPicker ? setShowStrategyPicker(false) : openStrategyPicker()
                }
                className="flex items-center gap-1.5 text-sm font-bold bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                재시도 배정
                <ChevronDown size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk contact modal */}
      {showBulkContactModal && (
        <BulkContactModal
          studentCount={selectedIds.size}
          adminKey={adminKey}
          studentIds={Array.from(selectedIds)}
          onClose={() => setShowBulkContactModal(false)}
          onSuccess={(count) => {
            setSelectedIds(new Set());
            setShowBulkContactModal(false);
            setBulkSuccessMessage(`${count}명의 상담 기록이 저장되었습니다.`);
            if (nameSearch.trim()) fetchPoolStudents(nameSearch.trim());
          }}
        />
      )}

      {/* Reactivation modal */}
      {showReactivationModal && (
        <ReactivationModal
          mode="bulk"
          studentIds={Array.from(selectedIds)}
          adminKey={adminKey}
          onClose={() => setShowReactivationModal(false)}
          onSuccess={() => {
            const count = selectedIds.size;
            setSelectedIds(new Set());
            setShowReactivationModal(false);
            setBulkSuccessMessage(
              `${count}명 재활성화 시도 시작 — 칸반 '재활성화 시도 중' 섹션으로 이동됩니다.`
            );
            if (nameSearch.trim()) fetchPoolStudents(nameSearch.trim());
            onRefetch();
          }}
        />
      )}
    </div>
  );
}
