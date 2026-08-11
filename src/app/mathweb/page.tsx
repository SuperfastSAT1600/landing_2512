'use client';

import { useState, useCallback } from 'react';
import { AccessGate } from './AccessGate';
import { ConceptGraph } from './ConceptGraph';
import { FlashcardModal, type Problem } from './FlashcardModal';

export default function MathWebPage() {
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [flipped, setFlipped] = useState(false);

  const handleNodeClick = useCallback((problem: Problem) => {
    setSelectedProblem(problem);
    setFlipped(false);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedProblem(null);
    setFlipped(false);
  }, []);

  const handleFlip = useCallback(() => setFlipped(f => !f), []);

  return (
    <AccessGate>
      <main className="fixed inset-0 bg-[#000000]">
        <ConceptGraph onNodeClick={handleNodeClick} />
        <FlashcardModal
          problem={selectedProblem}
          flipped={flipped}
          onFlip={handleFlip}
          onClose={handleClose}
        />
      </main>
    </AccessGate>
  );
}
