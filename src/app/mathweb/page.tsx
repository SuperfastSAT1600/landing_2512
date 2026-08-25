'use client';

import { useState, useCallback } from 'react';
import { AccessGate } from './AccessGate';
import { ConceptGraph } from './ConceptGraph';
import { FlashcardModal, type Problem } from './FlashcardModal';

export default function MathWebPage() {
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNodeClick = useCallback((problem: Problem, ids: string[], index: number) => {
    setSelectedProblem(problem);
    setNodeIds(ids);
    setCurrentIndex(index);
    setFlipped(false);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedProblem(null);
    setFlipped(false);
  }, []);

  const handleFlip = useCallback(() => setFlipped(f => !f), []);

  const navigate = useCallback(async (direction: 'prev' | 'next') => {
    if (nodeIds.length === 0) return;
    const nextIndex = direction === 'prev'
      ? (currentIndex - 1 + nodeIds.length) % nodeIds.length
      : (currentIndex + 1) % nodeIds.length;
    try {
      const res = await fetch(`/api/mathweb/problems/${nodeIds[nextIndex]}`);
      if (!res.ok) return;
      const json = await res.json();
      setSelectedProblem(json.data as Problem);
      setCurrentIndex(nextIndex);
      setFlipped(false);
    } catch { /* silently ignore */ }
  }, [nodeIds, currentIndex]);

  return (
    <AccessGate>
      <main className="fixed inset-0 bg-[#000000]">
        <ConceptGraph onNodeClick={handleNodeClick} />
        <FlashcardModal
          problem={selectedProblem}
          flipped={flipped}
          onFlip={handleFlip}
          onClose={handleClose}
          onPrev={() => navigate('prev')}
          onNext={() => navigate('next')}
          currentIndex={currentIndex}
          total={nodeIds.length}
        />
      </main>
    </AccessGate>
  );
}
