'use client';

import React from 'react';

interface BluebookPageShellProps {
  sectionTitle: string;
  timer?: React.ReactNode;
  headerRight?: React.ReactNode;
  showBanner?: boolean;
  /** Optional strip rendered between header and layout (e.g. question nav dots) */
  navStrip?: React.ReactNode;
  /** Rendered in test-passage-panel. null → single-panel mode */
  passage?: React.ReactNode;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext: () => void;
  prevHidden?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
  footerCenter?: React.ReactNode;
}

export function BluebookPageShell({
  sectionTitle,
  timer,
  headerRight,
  showBanner,
  navStrip,
  passage,
  children,
  onPrev,
  onNext,
  prevHidden,
  nextDisabled,
  nextLabel = 'Next',
  footerCenter,
}: BluebookPageShellProps) {
  return (
    <div
      style={{
        height: 'calc(100vh - 56px)',
        marginTop: 56,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <div className="bluebook-header">
        <div className="bluebook-header-left">
          <span className="bluebook-section-title">{sectionTitle}</span>
        </div>
        <div className="bluebook-header-center">{timer}</div>
        <div className="bluebook-header-right">{headerRight}</div>
      </div>

      {showBanner && (
        <div className="bluebook-banner">THIS IS A PRACTICE TEST</div>
      )}

      {navStrip}

      <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {passage && (
          <>
            <div className="test-passage-panel">
              <div style={{ padding: '24px 28px 24px 24px' }}>{passage}</div>
            </div>
            <div className="test-resizer" />
          </>
        )}

        <div className={`test-question-panel${passage ? ' has-passage' : ''}`}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 120px' }}>
            {children}
          </div>
        </div>
      </div>

      <div className="bluebook-footer">
        <button
          type="button"
          onClick={onPrev}
          className="bluebook-next-btn"
          style={{
            opacity: prevHidden ? 0 : 1,
            pointerEvents: prevHidden ? 'none' : 'auto',
          }}
        >
          Back
        </button>

        {footerCenter ?? <span />}

        <button
          type="button"
          onClick={onNext}
          disabled={!!nextDisabled}
          className="bluebook-next-btn"
          style={{ opacity: nextDisabled ? 0.4 : 1 }}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
