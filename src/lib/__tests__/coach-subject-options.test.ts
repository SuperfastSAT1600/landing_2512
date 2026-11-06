import { describe, it, expect } from 'vitest';
import { COACH_SUBJECT_OPTIONS, ONBOARDING_SUBJECTS, broadSubjectsFor } from '../coach-subject-options';

describe('COACH_SUBJECT_OPTIONS', () => {
    it('is the normalized onboarding form list, with no duplicates', () => {
        expect(COACH_SUBJECT_OPTIONS[0]).toBe('SAT RW');
        expect(COACH_SUBJECT_OPTIONS).toContain('SAT Math');
        expect(COACH_SUBJECT_OPTIONS).toContain('AP Calculus BC');
        expect(COACH_SUBJECT_OPTIONS).toHaveLength(ONBOARDING_SUBJECTS.length);
        expect(new Set(COACH_SUBJECT_OPTIONS).size).toBe(COACH_SUBJECT_OPTIONS.length);
    });
});

describe('broadSubjectsFor', () => {
    it('derives SAT/AP categories from details', () => {
        expect(broadSubjectsFor(['SAT Math', 'AP Biology'])).toEqual(['SAT', 'AP']);
        expect(broadSubjectsFor(['AP Biology'])).toEqual(['AP']);
        expect(broadSubjectsFor(['SAT RW'])).toEqual(['SAT']);
    });

    it('ignores unprefixed entries and returns null when nothing is classifiable', () => {
        expect(broadSubjectsFor(['Academic Writing'])).toBeNull();
        expect(broadSubjectsFor([])).toBeNull();
    });
});
