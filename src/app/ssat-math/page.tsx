'use client';

import { useState, useCallback } from 'react';
import { AccessGate } from './AccessGate';
import { SetSelect } from './SetSelect';
import { TestScreen } from './TestScreen';
import { ResultScreen } from './ResultScreen';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  choice_e: string;
  difficulty: string;
  domain: string;
}

interface GradedDetail {
  answer: string;
  correct: string;
  is_correct: boolean;
}

interface SubmitResult {
  score: number;
  total: number;
  graded_detail: Record<string, GradedDetail>;
}

type Phase = 'select' | 'loading' | 'test' | 'result';

interface TestState {
  setNumber: number;
  questions: Question[];
}

interface ResultState {
  result: SubmitResult;
  elapsedSeconds: number;
  setNumber: number;
  questions: Question[];
}

function MainApp({ studentId }: { studentId: string }) {
  const [phase, setPhase] = useState<Phase>('select');
  const [testState, setTestState] = useState<TestState | null>(null);
  const [resultState, setResultState] = useState<ResultState | null>(null);
  const [loadError, setLoadError] = useState('');

  const handleSelectSet = useCallback(async (setNumber: number) => {
    setPhase('loading');
    setLoadError('');
    try {
      const res = await fetch(`/api/ssat-math/sets/${setNumber}/questions`);
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error?.message ?? '문제를 불러올 수 없습니다.');
        setPhase('select');
        return;
      }
      setTestState({ setNumber, questions: json.data.questions as Question[] });
      setPhase('test');
    } catch {
      setLoadError('네트워크 오류가 발생했습니다.');
      setPhase('select');
    }
  }, []);

  const handleComplete = useCallback((result: SubmitResult, elapsedSeconds: number) => {
    if (!testState) return;
    setResultState({ result, elapsedSeconds, setNumber: testState.setNumber, questions: testState.questions });
    setPhase('result');
  }, [testState]);

  const handleReturnToSelect = useCallback(() => {
    setPhase('select');
    setTestState(null);
    setResultState(null);
  }, []);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-gray-400 text-lg">문제를 불러오는 중...</div>
        {loadError && <p className="text-red-400 mt-4">{loadError}</p>}
      </div>
    );
  }

  if (phase === 'test' && testState) {
    return (
      <TestScreen
        setNumber={testState.setNumber}
        questions={testState.questions}
        studentId={studentId}
        onComplete={handleComplete}
      />
    );
  }

  if (phase === 'result' && resultState) {
    return (
      <ResultScreen
        result={resultState.result}
        setNumber={resultState.setNumber}
        elapsedSeconds={resultState.elapsedSeconds}
        questions={resultState.questions}
        onReturnToSelect={handleReturnToSelect}
      />
    );
  }

  return <SetSelect studentId={studentId} onSelect={handleSelectSet} />;
}

export default function SSATMathPage() {
  return (
    <AccessGate>
      {(studentId) => <MainApp studentId={studentId} />}
    </AccessGate>
  );
}
