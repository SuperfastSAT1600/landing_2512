import { useState, useCallback } from 'react';
import { SavedWord } from '@/types/diagnosis';

/**
 * Custom hook for managing student vocabulary tracking during tests
 * Maintains saved words across question navigation within a test session
 */
export function useVocabTracker() {
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);

  /**
   * Toggle a word's saved status
   * If the word exists in savedWords, remove it; otherwise add it
   */
  const toggleWord = useCallback((word: SavedWord) => {
    setSavedWords((prev) => {
      const exists = prev.some(
        (w) =>
          w.word === word.word &&
          w.questionId === word.questionId &&
          w.positionIndex === word.positionIndex
      );

      if (exists) {
        // Remove the word
        return prev.filter(
          (w) =>
            !(
              w.word === word.word &&
              w.questionId === word.questionId &&
              w.positionIndex === word.positionIndex
            )
        );
      } else {
        // Add the word
        return [...prev, word];
      }
    });
  }, []);

  /**
   * Check if a specific word is in the saved list
   */
  const isWordSaved = useCallback(
    (word: string, questionId: string, positionIndex: number): boolean => {
      return savedWords.some(
        (w) =>
          w.word === word &&
          w.questionId === questionId &&
          w.positionIndex === positionIndex
      );
    },
    [savedWords]
  );

  /**
   * Get all saved words for a specific question
   */
  const getWordsForQuestion = useCallback(
    (questionId: string): SavedWord[] => {
      return savedWords.filter((w) => w.questionId === questionId);
    },
    [savedWords]
  );

  /**
   * Clear all saved words (utility function)
   */
  const clearAllWords = useCallback(() => {
    setSavedWords([]);
  }, []);

  return {
    savedWords,
    toggleWord,
    isWordSaved,
    getWordsForQuestion,
    clearAllWords,
  };
}
