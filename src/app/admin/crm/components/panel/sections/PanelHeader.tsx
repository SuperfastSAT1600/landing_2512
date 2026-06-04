'use client';

import { X, ChevronDown, Check, Copy, Eye } from 'lucide-react';
import type { Student, FunnelStage } from '@/types/crm';
import { FUNNEL_STAGE_LABELS, SCHOOL_TYPE_LABELS } from '@/types/crm';
import { SALES_STAGES_ONLY } from '../constants';

interface Props {
  localStudent: Student;
  duplicateNames?: string[];
  portalCopied: boolean;
  portalLoading: boolean;
  deleting: boolean;
  funnelChanging: boolean;
  showFunnelMenu: boolean;
  showReactivateForm: boolean;
  reactivateStrategy: string;
  reactivating: boolean;
  onClose: () => void;
  onCopyPortalLink: () => void;
  onPreviewPortal: () => void;
  onDelete: () => void;
  onToggleFunnelMenu: () => void;
  onFunnelChange: (stage: FunnelStage) => void;
  onShowPayment: () => void;
  onShowChurn: () => void;
  onShowReactivate: () => void;
  onHideReactivate: () => void;
  onReactivateStrategyChange: (v: string) => void;
  onStartReactivation: () => void;
  onLeadStatusChange: (status: 'active' | 'inactive') => void;
}

export function PanelHeader({
  localStudent, duplicateNames = [], portalCopied, portalLoading, deleting, funnelChanging,
  showFunnelMenu, showReactivateForm, reactivateStrategy, reactivating,
  onClose, onCopyPortalLink, onPreviewPortal, onDelete, onToggleFunnelMenu, onFunnelChange,
  onShowPayment, onShowChurn, onShowReactivate, onHideReactivate,
  onReactivateStrategyChange, onStartReactivation, onLeadStatusChange,
}: Props) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-gray-100 bg-white shrink-0">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-[18px] font-bold text-gray-900 leading-tight">{localStudent.name}</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {localStudent.grade} · {SCHOOL_TYPE_LABELS[localStudent.school_type]} · {localStudent.desired_subjects}
          </p>
          {duplicateNames.length > 0 && (
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-1.5 leading-snug">
              동명이인 주의 — {duplicateNames.join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <button
            onClick={onPreviewPortal}
            disabled={portalLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-50 transition-colors"
            title="학부모 포털 미리보기"
          >
            {portalLoading ? (
              <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Eye size={12} />
            )}
            미리보기
          </button>
          <button
            onClick={onCopyPortalLink}
            disabled={portalLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
            title="학부모 포털 링크 복사"
          >
            {portalCopied ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <Copy size={12} />
            )}
            {portalCopied ? '복사됨' : '포털'}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {localStudent.lead_status === 'active' && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-300 hover:border-red-400 rounded-full transition-colors disabled:opacity-50"
          >
            {deleting ? '삭제 중...' : '리드 삭제'}
          </button>
        )}

        <div className="relative">
          {showFunnelMenu && (
            <div className="fixed inset-0 z-20" onClick={onToggleFunnelMenu} />
          )}
          <button
            onClick={onToggleFunnelMenu}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              localStudent.lead_status === 'inactive'
                ? 'bg-gray-100 text-gray-500 cursor-default'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700 cursor-pointer'
            }`}
          >
            {funnelChanging ? (
              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {localStudent.funnel_stage === 'churned' ? '이탈' : localStudent.funnel_stage}. {FUNNEL_STAGE_LABELS[localStudent.funnel_stage]}
                {localStudent.lead_status !== 'inactive' && <ChevronDown size={11} />}
              </>
            )}
          </button>
          {showFunnelMenu && !funnelChanging && (
            <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1.5 min-w-[230px] overflow-hidden">
              {SALES_STAGES_ONLY.map(stage => (
                <button
                  key={stage}
                  onClick={() => onFunnelChange(stage)}
                  className={`w-full text-left px-4 py-2 text-[13px] hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                    stage === localStudent.funnel_stage ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-700'
                  }`}
                >
                  <span className="w-4 shrink-0">
                    {stage === localStudent.funnel_stage && <Check size={12} className="text-blue-500" />}
                  </span>
                  {stage}. {FUNNEL_STAGE_LABELS[stage]}
                </button>
              ))}
            </div>
          )}
        </div>

        {localStudent.lead_status === 'active' && (
          <button
            onClick={onShowPayment}
            className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-300 hover:border-blue-400 rounded-full transition-colors"
          >
            결제 완료
          </button>
        )}

        {localStudent.lead_status === 'active' && (
          <button
            onClick={onShowChurn}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-full transition-colors"
          >
            이탈 처리
          </button>
        )}

        {localStudent.lead_status === 'inactive' && !showReactivateForm && (
          <button
            onClick={onShowReactivate}
            className="px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-full transition-colors"
          >
            재활성화 시작
          </button>
        )}

        {localStudent.lead_status === 'reactivating' && (
          <>
            <span className="px-3 py-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full">재활성화 중</span>
            <button
              onClick={() => onLeadStatusChange('active')}
              className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-full transition-colors"
            >
              활성화
            </button>
            <button
              onClick={() => {
                if (window.confirm('재활성화 시도를 중단하고 이탈 확정하시겠습니까?')) {
                  onLeadStatusChange('inactive');
                }
              }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-full transition-colors"
            >
              이탈 확정
            </button>
          </>
        )}
      </div>

      {localStudent.lead_status === 'inactive' && showReactivateForm && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-700">재활성화 전략 메모</p>
          <textarea
            value={reactivateStrategy}
            onChange={e => onReactivateStrategyChange(e.target.value)}
            placeholder="어떤 전략으로 재접근할 것인지 기록하세요..."
            rows={3}
            className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-amber-400"
          />
          <div className="flex gap-2">
            <button
              onClick={onStartReactivation}
              disabled={reactivating || !reactivateStrategy.trim()}
              className="flex-1 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {reactivating ? '시작 중...' : '재활성화 시작'}
            </button>
            <button
              onClick={onHideReactivate}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
