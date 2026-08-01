import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DiagnosticTestView } from '../DiagnosticTestView';
import type { DiagnosticTestData } from '../../data/diagnostic-test-1';

// Minimal mock test data with a passage so SelectableText renders vocab words
const mockTestData: DiagnosticTestData = {
  id: 'test-1',
  title: 'Test',
  directions: null,
  timeLimit: 30,
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      section: 'Reading and Writing' as const,
      domain: 'Craft and Structure' as const,
      skill: 'Words in Context',
      difficulty: 'Medium' as const,
      passage: '<p>The quick brown fox jumps over the lazy dog</p>',
      question: 'What does the fox do?',
      options: [
        { id: 'A', text: 'jumps', type: 'correct' },
        { id: 'B', text: 'sits', type: 'distractor' },
      ],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      section: 'Reading and Writing' as const,
      domain: 'Information and Ideas' as const,
      skill: 'Central Ideas and Details',
      difficulty: 'Easy' as const,
      passage: '<p>Another passage here</p>',
      question: 'Second question?',
      options: [
        { id: 'A', text: 'yes', type: 'correct' },
        { id: 'B', text: 'no', type: 'distractor' },
      ],
    },
  ],
};

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    )),
    button: React.forwardRef(({ children, ...props }: Record<string, unknown>, ref: React.Ref<HTMLButtonElement>) => (
      <button ref={ref} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the hooks
vi.mock('../../hooks/useTestTimer', () => ({
  useTestTimer: () => ({
    remaining: 1800,
    isWarning: false,
    isDanger: false,
    format: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
  }),
}));

vi.mock('../../hooks/useVocabTracker', () => ({
  useVocabTracker: () => ({
    savedWords: [],
    toggleWord: vi.fn(),
    isWordSaved: () => false,
  }),
}));

// Mock child components that aren't relevant
vi.mock('../ContentRenderer', () => ({
  ContentRenderer: ({ content }: { content: string }) => (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  ),
}));

vi.mock('../TestCalculator', () => ({
  TestCalculator: () => null,
}));

vi.mock('../QuestionNavGrid', () => ({
  QuestionNavGrid: ({ onNavigate }: { onNavigate: (index: number) => void }) => (
    <div data-testid="question-nav">
      <button onClick={() => onNavigate(1)} data-testid="nav-to-q2">Q2</button>
    </div>
  ),
}));

vi.mock('../ConfidencePicker', () => ({
  ConfidencePicker: () => null,
}));

vi.mock('../TestSubmittedScreen', () => ({
  TestSubmittedScreen: () => <div>Submitted</div>,
}));

function renderStartedTest() {
  const result = render(
    <DiagnosticTestView testData={mockTestData} />
  );

  // Click "Begin Test" to get to the test-taking UI
  const startButton = screen.getByText('Begin Test');
  fireEvent.click(startButton);

  return result;
}

async function selectAWord(): Promise<HTMLElement | null> {
  // Wait for SelectableText to process words into spans
  await act(async () => {
    await new Promise(r => setTimeout(r, 50));
  });

  const wordSpan = document.querySelector('.vocab-word-span') as HTMLElement | null;
  if (wordSpan) {
    fireEvent.click(wordSpan);
  }
  return wordSpan;
}

describe('Vocab Save Button Dismiss', () => {
  // REQ-001: Click outside word clears selection and hides Save button
  describe('REQ-001: Click outside dismisses save button', () => {
    it('should hide save button when clicking outside word spans and save button', async () => {
      renderStartedTest();
      await selectAWord();

      // Save button should be visible
      const saveBtn = document.querySelector('.vocab-save-btn');
      expect(saveBtn).toBeTruthy();

      // Click on a non-word area (the main test container)
      fireEvent.mouseDown(document.body);

      // Save button should be gone
      expect(document.querySelector('.vocab-save-btn')).toBeNull();
    });

    it('should NOT hide save button when clicking on a word span', async () => {
      renderStartedTest();
      await selectAWord();

      expect(document.querySelector('.vocab-save-btn')).toBeTruthy();

      // Click on a word span (mousedown)
      const wordSpan = document.querySelector('.vocab-word-span') as HTMLElement;
      fireEvent.mouseDown(wordSpan);

      // Save button should still be visible
      expect(document.querySelector('.vocab-save-btn')).toBeTruthy();
    });

    it('should NOT hide save button when clicking on the save button itself', async () => {
      renderStartedTest();
      await selectAWord();

      const saveBtn = document.querySelector('.vocab-save-btn') as HTMLElement;
      expect(saveBtn).toBeTruthy();

      fireEvent.mouseDown(saveBtn);

      // Save button should still be visible (mousedown doesn't dismiss it)
      expect(document.querySelector('.vocab-save-btn')).toBeTruthy();
    });
  });

  // REQ-002: Escape key clears selection
  describe('REQ-002: Escape key dismisses save button', () => {
    it('should hide save button when Escape is pressed', async () => {
      renderStartedTest();
      await selectAWord();

      expect(document.querySelector('.vocab-save-btn')).toBeTruthy();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(document.querySelector('.vocab-save-btn')).toBeNull();
    });

    it('should not hide save button on other key presses', async () => {
      renderStartedTest();
      await selectAWord();

      expect(document.querySelector('.vocab-save-btn')).toBeTruthy();

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(document.querySelector('.vocab-save-btn')).toBeTruthy();
    });
  });

  // REQ-003: Save/Unsave action hides button
  describe('REQ-003: Save action dismisses button', () => {
    it('should hide save button after clicking Save', async () => {
      renderStartedTest();
      await selectAWord();

      const saveBtn = document.querySelector('.vocab-save-btn') as HTMLElement;
      expect(saveBtn).toBeTruthy();

      fireEvent.click(saveBtn);

      expect(document.querySelector('.vocab-save-btn')).toBeNull();
    });
  });

  // REQ-004: Question navigation clears selection
  describe('REQ-004: Navigation dismisses save button', () => {
    it('should hide save button when navigating to next question', async () => {
      renderStartedTest();
      await selectAWord();

      expect(document.querySelector('.vocab-save-btn')).toBeTruthy();

      // Click Next button
      const nextBtn = screen.getByText('Next');
      fireEvent.click(nextBtn);

      expect(document.querySelector('.vocab-save-btn')).toBeNull();
    });
  });
});
