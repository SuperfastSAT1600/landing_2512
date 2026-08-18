'use client';

import { Icon } from '@iconify/react';

interface SubmitConfirmationScreenProps {
  elapsedSeconds: number;
  answeredCount: number;
  totalQuestions: number;
  avgConfidence: number | null;
  savedWordCount: number;
  submitting: boolean;
  onConfirm: () => void;
  onGoBack: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SubmitConfirmationScreen({
  elapsedSeconds,
  answeredCount,
  totalQuestions,
  avgConfidence,
  savedWordCount,
  submitting,
  onConfirm,
  onGoBack,
}: SubmitConfirmationScreenProps) {
  const unansweredCount = totalQuestions - answeredCount;

  const stats = [
    {
      icon: 'fluent:timer-24-regular',
      label: 'Total Time',
      value: formatTime(elapsedSeconds),
    },
    {
      icon: 'fluent:checkmark-square-24-regular',
      label: 'Questions Answered',
      value: (
        <span>
          <span style={{ color: '#071be9', fontWeight: 700 }}>{answeredCount}</span>
          <span style={{ color: '#6B7280' }}> / {totalQuestions}</span>
          {unansweredCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 13,
                color: '#EF4444',
                fontWeight: 500,
              }}
            >
              ({unansweredCount} unanswered)
            </span>
          )}
        </span>
      ),
    },
    {
      icon: 'fluent:emoji-24-regular',
      label: 'Avg. Confidence',
      value: avgConfidence !== null ? `${Math.round(avgConfidence)}%` : '—',
    },
    {
      icon: 'fluent:book-open-24-regular',
      label: 'Saved Words',
      value: `${savedWordCount}`,
    },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#F4F5F9' }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#EBF4FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon icon="fluent:send-24-regular" width={32} height={32} color="#071be9" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
            Ready to submit?
          </h2>
          <p className="text-gray-500" style={{ fontSize: 15 }}>
            Please review your progress before submitting.
          </p>
        </div>

        {/* Stats card */}
        <div
          className="rounded-2xl mb-6"
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 20px',
                borderBottom: i < stats.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#F4F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon icon={stat.icon} width={20} height={20} color="#4B5563" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Warning if unanswered */}
        {unansweredCount > 0 && (
          <div
            className="rounded-xl p-4 mb-6 flex gap-3"
            style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}
          >
            <Icon icon="fluent:warning-24-regular" width={20} height={20} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
              You have <strong>{unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}</strong>.
              You cannot make changes after submission.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onGoBack}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: 12,
              border: '1.5px solid #D1D5DB',
              background: '#fff',
              color: '#374151',
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: 12,
              border: 'none',
              background: submitting ? '#93C5FD' : '#071be9',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
