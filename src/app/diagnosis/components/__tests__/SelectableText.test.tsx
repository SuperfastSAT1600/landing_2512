/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SelectableText } from '../SelectableText';
import { SavedWord } from '@/types/diagnosis';

// Mock ContentRenderer — use dangerouslySetInnerHTML so SelectableText processes real word tokens
vi.mock('../ContentRenderer', () => ({
  ContentRenderer: ({ content }: { content: string }) => (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  ),
}));

describe('SelectableText', () => {
  const mockOnWordClick = vi.fn();

  beforeEach(() => {
    mockOnWordClick.mockClear();
  });

  it('should render content from ContentRenderer', () => {
    render(
      <SelectableText
        content="<p>Hello world</p>"
        questionId="q1"
        section="passage"
        savedWords={[]}
        onWordClick={mockOnWordClick}
      />
    );

    expect(document.querySelector('.selectable-text')).toBeTruthy();
  });

  it('should make words clickable', async () => {
    render(
      <SelectableText
        content="<p>Hello world</p>"
        questionId="q1"
        section="passage"
        savedWords={[]}
        onWordClick={mockOnWordClick}
      />
    );

    await waitFor(() => {
      const wordSpans = document.querySelectorAll('.vocab-word-span');
      expect(wordSpans.length).toBeGreaterThan(0);
    });
  });

  it('should call onWordClick when a word is clicked', async () => {
    render(
      <SelectableText
        content="<p>Hello world</p>"
        questionId="q1"
        section="passage"
        savedWords={[]}
        onWordClick={mockOnWordClick}
      />
    );

    await waitFor(() => {
      const wordSpans = document.querySelectorAll('.vocab-word-span');
      if (wordSpans.length > 0) {
        fireEvent.click(wordSpans[0]);
      }
    });

    await waitFor(() => {
      expect(mockOnWordClick).toHaveBeenCalled();
    });
  });

  it('should apply vocab-saved class to saved words', async () => {
    const savedWords: SavedWord[] = [
      {
        word: 'hello',
        questionId: 'q1',
        section: 'passage',
        optionId: null,
        positionIndex: 0,
      },
    ];

    render(
      <SelectableText
        content="<p>Hello world</p>"
        questionId="q1"
        section="passage"
        savedWords={savedWords}
        onWordClick={mockOnWordClick}
      />
    );

    await waitFor(() => {
      const savedWordSpans = document.querySelectorAll('.vocab-saved');
      expect(savedWordSpans.length).toBeGreaterThan(0);
    });
  });

  it('should pass correct word data to onWordClick callback', async () => {
    render(
      <SelectableText
        content="<p>Hello world</p>"
        questionId="q1"
        section="passage"
        savedWords={[]}
        onWordClick={mockOnWordClick}
      />
    );

    await waitFor(() => {
      const wordSpans = document.querySelectorAll('.vocab-word-span');
      if (wordSpans.length > 0) {
        fireEvent.click(wordSpans[0]);
      }
    });

    await waitFor(() => {
      const callArgs = mockOnWordClick.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('word');
      expect(callArgs[0]).toHaveProperty('questionId');
      expect(callArgs[0]).toHaveProperty('section');
      expect(callArgs[0]).toHaveProperty('positionIndex');
      expect(callArgs[0].questionId).toBe('q1');
      expect(callArgs[0].section).toBe('passage');
    });
  });

  it('should handle option section correctly', async () => {
    render(
      <SelectableText
        content="<p>This is option A</p>"
        questionId="q1"
        section="option"
        optionId="A"
        savedWords={[]}
        onWordClick={mockOnWordClick}
      />
    );

    await waitFor(() => {
      const wordSpans = document.querySelectorAll('.vocab-word-span');
      if (wordSpans.length > 0) {
        fireEvent.click(wordSpans[0]);
      }
    });

    await waitFor(() => {
      const callArgs = mockOnWordClick.mock.calls[0];
      expect(callArgs[0].section).toBe('option');
      expect(callArgs[0].optionId).toBe('A');
    });
  });

  it('should provide correct position information', async () => {
    render(
      <SelectableText
        content="<p>Hello world</p>"
        questionId="q1"
        section="passage"
        savedWords={[]}
        onWordClick={mockOnWordClick}
      />
    );

    await waitFor(() => {
      const wordSpans = document.querySelectorAll('.vocab-word-span');
      if (wordSpans.length > 0) {
        fireEvent.click(wordSpans[0]);
      }
    });

    await waitFor(() => {
      const callArgs = mockOnWordClick.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('top');
      expect(callArgs[1]).toHaveProperty('left');
      expect(typeof callArgs[1].top).toBe('number');
      expect(typeof callArgs[1].left).toBe('number');
    });
  });
});
