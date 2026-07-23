'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, Trash2, Search, X, ArrowUpRight } from 'lucide-react';
import { Student, RetryStage, RETRY_STAGES, RetryStrategy } from '@/types/crm';
import { StudentCard } from './StudentCard';

interface RetryKanbanProps {
  adminKey: string;
  onStudentClick: (student: Student) => void;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStrategyChange?: (ctx: { id: string; name: string } | null) => void;
  onNavigateToPool?: () => void;
  enrolledStudentId?: string | null;
  onEnrolledHandled?: () => void;
}

interface RetryColumnProps {
  stage: RetryStage;
  students: Student[];
  onStudentClick: (student: Student) => void;
  onRemove: (student: Student) => void;
}

function RetryColumn({ stage, students, onStudentClick, onRemove }: RetryColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex flex-col w-40 sm:w-44 shrink-0">
      <div className="px-2 py-2 border-b border-gray-200">
        <p className="text-[11px] font-semibold leading-tight truncate text-gray-600">{stage}</p>
        <span className="text-[10px] text-gray-400">{students.length}명</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-24 p-1.5 flex flex-col gap-1.5 transition-colors ${isOver ? 'bg-blue-50' : ''}`}
      >
        <SortableContext items={students.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {students.map(s => {
            const days = s.retry_assigned_at
              ? Math.floor((Date.now() - new Date(s.retry_assigned_at).getTime()) / 86400000)
              : null;
            return (
              <div key={s.id} className="flex flex-col gap-0.5">
                <StudentCard
                  student={s}
                  onClick={() => onStudentClick(s)}
                  onChurn={() => onRemove(s)}
                />
                {days !== null && (
                  <p className="text-[10px] text-gray-400 pl-1">
                    배정 {days === 0 ? '오늘' : `${days}일째`}
                  </p>
                )}
              </div>
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}

export function RetryKanban({ adminKey, onStudentClick, onStudentUpdate, onStrategyChange, onNavigateToPool, enrolledStudentId, onEnrolledHandled }: RetryKanbanProps) {
  const [strategies, setStrategies] = useState<RetryStrategy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!enrolledStudentId) return;
    setStudents(prev => prev.filter(s => s.id !== enrolledStudentId));
    onEnrolledHandled?.();
  }, [enrolledStudentId, onEnrolledHandled]);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [creatingStrategy, setCreatingStrategy] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const headers = { 'x-admin-key': adminKey, 'Content-Type': 'application/json' };

  const fetchStrategies = useCallback(async () => {
    const res = await fetch('/api/crm/retry-strategies?type=retry', { headers: { 'x-admin-key': adminKey } });
    const json = await res.json();
    setStrategies(json.data ?? []);
  }, [adminKey]);

  useEffect(() => { fetchStrategies(); }, [fetchStrategies]);

  const fetchStudents = useCallback(async (strategyId: string) => {
    setLoadingStudents(true);
    const res = await fetch(`/api/crm/students?retry_strategy_id=${strategyId}`, {
      headers: { 'x-admin-key': adminKey },
    });
    const json = await res.json();
    setStudents(json.data ?? []);
    setLoadingStudents(false);
  }, [adminKey]);

  useEffect(() => {
    if (selectedId) fetchStudents(selectedId);
    else setStudents([]);
  }, [selectedId, fetchStudents]);

  useEffect(() => {
    if (!onStrategyChange) return;
    const strategy = strategies.find(s => s.id === selectedId);
    onStrategyChange(strategy ? { id: strategy.id, name: strategy.name } : null);
  }, [selectedId, strategies, onStrategyChange]);

  const handleCreateStrategy = async () => {
    if (!newStrategyName.trim()) return;
    const res = await fetch('/api/crm/retry-strategies', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: newStrategyName.trim() }),
    });
    if (res.ok) {
      const json = await res.json();
      setStrategies(prev => [...prev, json.data]);
      setSelectedId(json.data.id);
      setNewStrategyName('');
      setCreatingStrategy(false);
    } else {
      alert('전략 생성에 실패했습니다.');
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    if (!confirm('이 전략을 삭제하면 포함된 학생들은 리드풀로 돌아갑니다. 계속할까요?')) return;
    const res = await fetch(`/api/crm/retry-strategies/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      setStrategies(prev => prev.filter(s => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    } else {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleAddLead = async (student: Student) => {
    const res = await fetch(`/api/crm/retry-strategies/${selectedId}/students`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ student_id: student.id }),
    });
    if (res.ok) {
      const json = await res.json();
      setStudents(prev => [...prev, json.data]);
      setSearchResults(prev => prev.filter(s => s.id !== student.id));
    } else {
      alert('학생 추가에 실패했습니다.');
    }
  };

  const handleRemoveLead = async (student: Student) => {
    if (!confirm(`${student.name}을(를) 이 전략에서 제거할까요?`)) return;
    const res = await fetch(`/api/crm/students/${student.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ retry_strategy_id: null, retry_stage: null, retry_assigned_at: null }),
    });
    if (res.ok) {
      setStudents(prev => prev.filter(s => s.id !== student.id));
    }
  };

  const handleLeadSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearchingLeads(true);
    const res = await fetch(`/api/crm/students?pool=true&search=${encodeURIComponent(query)}`, {
      headers: { 'x-admin-key': adminKey },
    });
    const json = await res.json();
    // 이미 이 전략에 있는 학생 제외
    const existingIds = new Set(students.map(s => s.id));
    setSearchResults((json.data ?? []).filter((s: Student) => !existingIds.has(s.id)));
    setSearchingLeads(false);
  }, [adminKey, students]);

  useEffect(() => {
    const t = setTimeout(() => handleLeadSearch(leadSearch), 300);
    return () => clearTimeout(t);
  }, [leadSearch, handleLeadSearch]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = ({ active }: DragStartEvent) => {
    const s = students.find(s => s.id === active.id);
    setActiveStudent(s ?? null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveStudent(null);
    if (!over || active.id === over.id) return;
    const stage = over.id as RetryStage;
    if (!RETRY_STAGES.includes(stage)) return;
    const student = students.find(s => s.id === active.id);
    if (!student || student.retry_stage === stage) return;

    setStudents(prev => prev.map(s => s.id === active.id ? { ...s, retry_stage: stage } : s));
    await fetch(`/api/crm/students/${active.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ retry_stage: stage }),
    });
    onStudentUpdate(active.id as string, { retry_stage: stage });
  };

  const getStudentsByStage = (stage: RetryStage) =>
    students.filter(s => s.retry_stage === stage);

  return (
    <div className="flex gap-4 h-full">
      {/* Strategy sidebar */}
      <div className="w-48 shrink-0 border-r border-gray-200 pr-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-700">전략 목록</p>
          <button
            onClick={() => setCreatingStrategy(true)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="새 전략 만들기"
          >
            <Plus size={14} />
          </button>
        </div>

        {creatingStrategy && (
          <div className="mb-2 flex gap-1">
            <input
              autoFocus
              type="text"
              placeholder="전략 이름"
              value={newStrategyName}
              onChange={e => setNewStrategyName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateStrategy();
                if (e.key === 'Escape') { setCreatingStrategy(false); setNewStrategyName(''); }
              }}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={handleCreateStrategy}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              추가
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {strategies.length === 0 && !creatingStrategy && (
            <p className="text-[11px] text-gray-400 py-2">전략이 없습니다. + 버튼으로 추가하세요.</p>
          )}
          {strategies.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                selectedId === s.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="truncate">{s.name}</span>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteStrategy(s.id); }}
                className={`ml-1 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ${
                  selectedId === s.id ? 'text-gray-300 hover:text-red-400' : 'text-gray-400 hover:text-red-400'
                }`}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban area */}
      <div className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            좌측에서 전략을 선택하거나 새로 만드세요.
          </div>
        ) : (
          <>
            {/* Strategy name & description */}
            {(() => {
              const strategy = strategies.find(s => s.id === selectedId);
              if (!strategy) return null;
              return (
                <div className="mb-4 rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{strategy.name}</p>
                  {editingDesc ? (
                    <div className="flex flex-col gap-1.5">
                      <textarea
                        autoFocus
                        rows={3}
                        value={descDraft}
                        onChange={e => setDescDraft(e.target.value)}
                        placeholder="전략 내용을 입력하세요..."
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/crm/retry-strategies/${selectedId}`, {
                              method: 'PATCH', headers,
                              body: JSON.stringify({ description: descDraft }),
                            });
                            if (res.ok) {
                              const json = await res.json();
                              setStrategies(prev => prev.map(s => s.id === selectedId ? json.data : s));
                            }
                            setEditingDesc(false);
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
                        >저장</button>
                        <button
                          onClick={() => setEditingDesc(false)}
                          className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-100"
                        >취소</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setDescDraft(strategy.description ?? ''); setEditingDesc(true); }}
                      className="w-full text-left text-xs text-gray-500 hover:text-gray-700 min-h-[28px]"
                    >
                      {strategy.description || <span className="text-gray-300 italic">전략 내용 추가...</span>}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Add lead button */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setShowAddLead(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Plus size={12} />
                리드 추가
              </button>
              {onNavigateToPool && (
                <button
                  onClick={onNavigateToPool}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  <ArrowUpRight size={12} />
                  전체 리드풀에서 선택
                </button>
              )}

              {showAddLead && (
                <div className="relative flex-1 max-w-xs">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="리드풀에서 이름 검색..."
                    value={leadSearch}
                    onChange={e => setLeadSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {leadSearch && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {searchingLeads && (
                        <p className="px-3 py-2 text-xs text-gray-400">검색 중...</p>
                      )}
                      {!searchingLeads && searchResults.length === 0 && (
                        <p className="px-3 py-2 text-xs text-gray-400">검색 결과가 없습니다.</p>
                      )}
                      {searchResults.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { handleAddLead(s); setLeadSearch(''); setShowAddLead(false); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className="text-gray-400">{s.parent_phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showAddLead && (
                <button
                  onClick={() => { setShowAddLead(false); setLeadSearch(''); }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {loadingStudents ? (
              <p className="text-sm text-gray-400">로딩 중...</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-3">
                  {RETRY_STAGES.map(stage => (
                    <RetryColumn
                      key={stage}
                      stage={stage}
                      students={getStudentsByStage(stage)}
                      onStudentClick={onStudentClick}
                      onRemove={handleRemoveLead}
                    />
                  ))}
                </div>

                <DragOverlay>
                  {activeStudent && (
                    <StudentCard
                      student={activeStudent}
                      onClick={() => {}}
                      onChurn={() => {}}
                      overlay
                    />
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </>
        )}
      </div>
    </div>
  );
}
