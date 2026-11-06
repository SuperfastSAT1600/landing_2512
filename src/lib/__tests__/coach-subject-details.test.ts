import { describe, it, expect } from 'vitest';
import { groupSubjectDetails } from '../coach-subject-details';

describe('groupSubjectDetails', () => {
    it('splits SAT and AP and strips the prefix', () => {
        expect(groupSubjectDetails(['SAT Math', 'AP Calculus BC', 'AP Physics 1', 'SAT RW'])).toEqual({
            sat: ['Math', 'RW'],
            ap: ['Calculus BC', 'Physics 1'],
            other: [],
        });
    });

    it('keeps SAT in Math, RW order and AP alphabetical', () => {
        const g = groupSubjectDetails(['SAT RW', 'SAT Math', 'AP Statistics', 'AP Biology']);
        expect(g.sat).toEqual(['Math', 'RW']);
        expect(g.ap).toEqual(['Biology', 'Statistics']);
    });

    it('returns empty groups for empty or missing input', () => {
        const empty = { sat: [], ap: [], other: [] };
        expect(groupSubjectDetails([])).toEqual(empty);
        expect(groupSubjectDetails(undefined)).toEqual(empty);
    });

    it('puts unprefixed entries in other instead of guessing', () => {
        expect(groupSubjectDetails(['Academic Writing']).other).toEqual(['Academic Writing']);
    });

    it('drops duplicates', () => {
        expect(groupSubjectDetails(['AP Biology', 'AP Biology']).ap).toEqual(['Biology']);
    });
});

import { deriveSubjectDetails } from '../coach-subject-details';

describe('deriveSubjectDetails', () => {
    it('normalizes onboarding form subjects', () => {
        expect(deriveSubjectDetails({
            onboardingSubjects: ['SAT Reading & Writing', 'SAT Math', 'AP Biology'],
        })).toEqual(['SAT RW', 'SAT Math', 'AP Biology']);
    });

    it('splits comma-separated free-text AP entries and drops bare unknowns', () => {
        expect(deriveSubjectDetails({
            onboardingSubjects: ['AP Microeconomics, AP Macroeconomics,', 'Economics'],
        })).toEqual(['AP Microeconomics', 'AP Macroeconomics']);
    });

    it('returns empty when nothing is found', () => {
        expect(deriveSubjectDetails({})).toEqual([]);
    });
});
