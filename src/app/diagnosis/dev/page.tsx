'use client';

import { useState, useEffect } from 'react';
import { VocabSection } from '../components/VocabSection';
import { DiagnosticTestView } from '../components/DiagnosticTestView';
import { diagnosticTest2Vocab } from '../data/diagnostic-test-2-vocab';
import type { DiagnosticTestData } from '../data/diagnostic-test-1';
import type { VocabAnswer } from '@/types/diagnosis';

type Phase = 'loading' | 'vocab' | 'test';

export default function DiagnosisDevPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [testData, setTestData] = useState<DiagnosticTestData | null>(null);
  const [vocabAnswers, setVocabAnswers] = useState<VocabAnswer[]>([]);

  useEffect(() => {
    fetch('/api/diagnosis/test-content')
      .then(r => r.json())
      .then(data => {
        setTestData(data);
        setPhase('vocab');
      });
  }, []);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading test...</p>
        </div>
      </div>
    );
  }

  if (phase === 'vocab') {
    return (
      <>
        <DevBanner label="단어 진단 파트" />
        <VocabSection
          questions={diagnosticTest2Vocab}
          onComplete={(answers) => {
            setVocabAnswers(answers);
            setPhase('test');
          }}
        />
      </>
    );
  }

  if (phase === 'test' && testData) {
    return (
      <>
        <DevBanner label="RW 파트" />
        <div style={{ height: 'calc(100vh - 88px)', marginTop: '88px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <DiagnosticTestView
            testData={testData}
            tokenId=""
            studentEmail="dev@test.com"
            studentName="Dev User"
            testId="diagnostic-test-2"
            timeLimitMinutes={30}
            previousScoreStatus="never_taken"
            vocabAnswers={vocabAnswers}
          />
        </div>
      </>
    );
  }

  return null;
}

function DevBanner({ label }: { label: string }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 text-center py-2 text-xs font-bold text-white"
      style={{ background: '#7c3aed' }}
    >
      DEV MODE · {label} · 제출해도 DB에 저장되지 않음
    </div>
  );
}
