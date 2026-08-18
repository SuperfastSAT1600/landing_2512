import { renderHook, act } from '@testing-library/react';
import { useVocabTracker } from '../useVocabTracker';
import { SavedWord } from '@/types/diagnosis';

describe('useVocabTracker', () => {
  it('should initialize with empty saved words', () => {
    const { result } = renderHook(() => useVocabTracker());
    expect(result.current.savedWords).toEqual([]);
  });

  it('should add a word to saved words via toggleWord', () => {
    const { result } = renderHook(() => useVocabTracker());
    const word: SavedWord = {
      word: 'epitome',
      questionId: 'q1',
      section: 'passage',
      optionId: null,
      positionIndex: 5,
    };

    act(() => {
      result.current.toggleWord(word);
    });

    expect(result.current.savedWords).toHaveLength(1);
    expect(result.current.savedWords[0]).toEqual(word);
  });

  it('should remove a word from saved words when toggled again', () => {
    const { result } = renderHook(() => useVocabTracker());
    const word: SavedWord = {
      word: 'epitome',
      questionId: 'q1',
      section: 'passage',
      optionId: null,
      positionIndex: 5,
    };

    act(() => {
      result.current.toggleWord(word);
    });
    expect(result.current.savedWords).toHaveLength(1);

    act(() => {
      result.current.toggleWord(word);
    });
    expect(result.current.savedWords).toHaveLength(0);
  });

  it('should correctly identify if a word is saved', () => {
    const { result } = renderHook(() => useVocabTracker());
    const word: SavedWord = {
      word: 'epitome',
      questionId: 'q1',
      section: 'passage',
      optionId: null,
      positionIndex: 5,
    };

    expect(result.current.isWordSaved('epitome', 'q1', 5)).toBe(false);

    act(() => {
      result.current.toggleWord(word);
    });

    expect(result.current.isWordSaved('epitome', 'q1', 5)).toBe(true);
  });

  it('should distinguish between same word at different positions', () => {
    const { result } = renderHook(() => useVocabTracker());
    const word1: SavedWord = {
      word: 'epitome',
      questionId: 'q1',
      section: 'passage',
      optionId: null,
      positionIndex: 5,
    };

    const word2: SavedWord = {
      word: 'epitome',
      questionId: 'q1',
      section: 'passage',
      optionId: null,
      positionIndex: 12,
    };

    act(() => {
      result.current.toggleWord(word1);
    });

    expect(result.current.isWordSaved('epitome', 'q1', 5)).toBe(true);
    expect(result.current.isWordSaved('epitome', 'q1', 12)).toBe(false);

    act(() => {
      result.current.toggleWord(word2);
    });

    expect(result.current.isWordSaved('epitome', 'q1', 5)).toBe(true);
    expect(result.current.isWordSaved('epitome', 'q1', 12)).toBe(true);
  });

  it('should get words for a specific question', () => {
    const { result } = renderHook(() => useVocabTracker());
    const word1: SavedWord = {
      word: 'epitome',
      questionId: 'q1',
      section: 'passage',
      optionId: null,
      positionIndex: 5,
    };

    const word2: SavedWord = {
      word: 'verbose',
      questionId: 'q2',
      section: 'passage',
      optionId: null,
      positionIndex: 3,
    };

    act(() => {
      result.current.toggleWord(word1);
      result.current.toggleWord(word2);
    });

    const q1Words = result.current.getWordsForQuestion('q1');
    expect(q1Words).toHaveLength(1);
    expect(q1Words[0].word).toBe('epitome');

    const q2Words = result.current.getWordsForQuestion('q2');
    expect(q2Words).toHaveLength(1);
    expect(q2Words[0].word).toBe('verbose');
  });

  it('should clear all words via clearAllWords', () => {
    const { result } = renderHook(() => useVocabTracker());
    const word1: SavedWord = {
      word: 'epitome',
      questionId: 'q1',
      section: 'passage',
      optionId: null,
      positionIndex: 5,
    };

    const word2: SavedWord = {
      word: 'verbose',
      questionId: 'q1',
      section: 'option',
      optionId: 'A',
      positionIndex: 2,
    };

    act(() => {
      result.current.toggleWord(word1);
      result.current.toggleWord(word2);
    });

    expect(result.current.savedWords).toHaveLength(2);

    act(() => {
      result.current.clearAllWords();
    });

    expect(result.current.savedWords).toHaveLength(0);
  });

  it('should persist saved words across question navigation', () => {
    const { result } = renderHook(() => useVocabTracker());
    const word: SavedWord = {
      word: 'epitome',
      questionId: 'q1',
      section: 'passage',
      optionId: null,
      positionIndex: 5,
    };

    act(() => {
      result.current.toggleWord(word);
    });

    // Simulate navigation (state persists in hook)
    expect(result.current.isWordSaved('epitome', 'q1', 5)).toBe(true);
    expect(result.current.getWordsForQuestion('q1')).toHaveLength(1);
  });
});
