'use client';

import { useState, useEffect } from 'react';
import { X, Send, Clock } from 'lucide-react';
import { Student } from '@/types/crm';
import { CoachData } from '@/lib/coaches-data';

interface CoachOfferModalProps {
  student: Student;
  adminKey: string;
  onSent: () => void;
  onClose: () => void;
}

export function CoachOfferModal({ student, adminKey, onSent, onClose }: CoachOfferModalProps) {
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const res = await fetch('/api/admin/coaches', {
          headers: { 'x-admin-key': adminKey },
        });
        const data = await res.json();
        if (data.success) {
          const active = (data.coaches as CoachData[]).filter(c => c.isActive);
          setCoaches(active);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCoaches(false);
      }
    };
    fetchCoaches();
  }, [adminKey]);

  const toggleCoach = (slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedSlugs.size === 0) {
      alert('코치를 최소 1명 선택해주세요.');
      return;
    }

    setSending(true);
    try {
      const deadline = new Date(Date.now() + deadlineHours * 3600 * 1000).toISOString();

      const res = await fetch('/api/crm/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          student_id: student.id,
          coach_slugs: Array.from(selectedSlugs),
          response_deadline: deadline,
        }),
      });

      if (res.ok) {
        onSent();
      } else {
        const data = await res.json();
        alert(data.error?.message ?? '오퍼 발송에 실패했습니다.');
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-50 rounded-xl border border-gray-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">코치 오퍼 발송</h2>
            <p className="text-xs text-gray-500 mt-0.5">{student.name} 학생</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Coach list */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">
              코치 선택 ({selectedSlugs.size}명 선택)
            </label>
            {loadingCoaches ? (
              <div className="text-center text-gray-400 py-6 text-sm">코치 목록 불러오는 중...</div>
            ) : coaches.length === 0 ? (
              <div className="text-center text-gray-400 py-6 text-sm">활성 코치가 없습니다.</div>
            ) : (
              <div className="space-y-1.5">
                {coaches.map(coach => {
                  const selected = selectedSlugs.has(coach.slug);
                  return (
                    <button
                      key={coach.slug}
                      type="button"
                      onClick={() => toggleCoach(coach.slug)}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                        ${selected
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {/* Photo / avatar */}
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {coach.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coach.photo} alt={coach.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-gray-400">
                            {coach.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{coach.name}</p>
                        <p className="text-xs text-gray-500 truncate">{coach.slug}</p>
                      </div>
                      {selected && (
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
              <Clock size={11} />
              응답 데드라인
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={deadlineHours}
                onChange={e => setDeadlineHours(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={168}
                className="w-20 bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-900 text-center outline-none transition-all"
              />
              <span className="text-sm text-gray-400">시간 후</span>
              <span className="text-xs text-gray-400">
                ({new Date(Date.now() + deadlineHours * 3600 * 1000).toLocaleString('ko-KR', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })})
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSend}
            disabled={sending || selectedSlugs.size === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Send size={13} />
            {sending ? '발송 중...' : `오퍼 발송 (${selectedSlugs.size}명)`}
          </button>
        </div>
      </div>
    </div>
  );
}
