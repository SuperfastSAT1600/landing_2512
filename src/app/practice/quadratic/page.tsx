'use client';

import { useState, useCallback, useEffect } from 'react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';

/* ── Types ─────────────────────────────────────────── */
interface Choice { A: string; B: string; C: string; D: string }
interface Question {
  id: string;
  skill: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  passage: string;
  question: string;
  choices: Choice;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  rationale: string;
}

type Phase = 'gate' | 'leaderboard' | 'test';

interface LeaderboardEntry {
  rank: number;
  maskedId: string;
  correctCount: number;
  totalCount: number;
  score: number;
}

interface Stats {
  leaderboard: LeaderboardEntry[];
  questionStats: Record<string, { correct: number; total: number }>;
}

/* ── Skill config ───────────────────────────────────── */
const SKILLS = [
  { key: 'general',      label: 'Quadratic Formula' },
  { key: 'even',         label: 'Even-Coefficient Form' },
  { key: 'discriminant', label: 'Discriminant' },
  { key: 'vieta',        label: "Vieta's Formulas" },
] as const;
type SkillKey = typeof SKILLS[number]['key'];

const DIFF_COLOR: Record<string, string> = {
  Hard: '#ef4444', Medium: '#f59e0b', Easy: '#22c55e',
};

/* ── Questions ──────────────────────────────────────── */
const P_GENERAL = 'For \\(ax^2 + bx + c = 0\\) where \\(a \\neq 0\\), the quadratic formula gives:\\[x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\]';
const P_EVEN   = 'When \\(b = 2b\'\\), the formula simplifies to:\\[x = \\frac{-b\' \\pm \\sqrt{b\'^2 - ac}}{a}\\](The denominator reduces from \\(2a\\) to \\(a\\), making computation easier.)';
const P_DISC   = '\\(D = b^2 - 4ac\\)<br/>\\(D > 0\\): two distinct real roots &nbsp;|&nbsp; \\(D = 0\\): one repeated root &nbsp;|&nbsp; \\(D < 0\\): no real roots';
const P_VIETA  = 'For roots \\(\\alpha, \\beta\\) of \\(ax^2 + bx + c = 0\\):\\[\\alpha + \\beta = -\\frac{b}{a}, \\quad \\alpha\\beta = \\frac{c}{a}\\]';

const QUESTIONS: Question[] = [
  /* ── 1. Quadratic Formula — 8 questions ── */
  {
    id: 'qg-01', skill: 'general', difficulty: 'Easy',
    passage: P_GENERAL,
    question: 'What are the roots of \\(x^2 - 5x + 3 = 0\\)?',
    choices: { A: '\\(x = \\dfrac{5 \\pm \\sqrt{13}}{2}\\)', B: '\\(x = \\dfrac{5 \\pm \\sqrt{37}}{2}\\)', C: '\\(x = \\dfrac{-5 \\pm \\sqrt{13}}{2}\\)', D: '\\(x = \\dfrac{5 \\pm \\sqrt{13}}{4}\\)' },
    correct_answer: 'A',
    rationale: '\\(a=1,\\ b=-5,\\ c=3\\)<br/>\\(D = (-5)^2 - 4(1)(3) = 25 - 12 = 13\\)\\[x = \\frac{5 \\pm \\sqrt{13}}{2}\\]',
  },
  {
    id: 'qg-02', skill: 'general', difficulty: 'Easy',
    passage: P_GENERAL,
    question: 'What are the roots of \\(2x^2 + 3x - 1 = 0\\)?',
    choices: { A: '\\(x = \\dfrac{-3 \\pm \\sqrt{7}}{4}\\)', B: '\\(x = \\dfrac{-3 \\pm \\sqrt{17}}{4}\\)', C: '\\(x = \\dfrac{3 \\pm \\sqrt{17}}{4}\\)', D: '\\(x = \\dfrac{-3 \\pm \\sqrt{17}}{2}\\)' },
    correct_answer: 'B',
    rationale: '\\(a=2,\\ b=3,\\ c=-1\\)<br/>\\(D = 9 + 8 = 17\\)\\[x = \\frac{-3 \\pm \\sqrt{17}}{4}\\]',
  },
  {
    id: 'qg-03', skill: 'general', difficulty: 'Easy',
    passage: '',
    question: 'What are the roots of \\(x^2 + x - 3 = 0\\)?',
    choices: { A: '\\(x = \\dfrac{-1 \\pm \\sqrt{13}}{2}\\)', B: '\\(x = \\dfrac{-1 \\pm \\sqrt{11}}{2}\\)', C: '\\(x = \\dfrac{1 \\pm \\sqrt{13}}{2}\\)', D: '\\(x = \\dfrac{-1 \\pm \\sqrt{5}}{2}\\)' },
    correct_answer: 'A',
    rationale: '\\(D = 1 + 12 = 13\\)\\[x = \\frac{-1 \\pm \\sqrt{13}}{2}\\]',
  },
  {
    id: 'qg-04', skill: 'general', difficulty: 'Medium',
    passage: '',
    question: 'What are the roots of \\(2x^2 - x - 2 = 0\\)?',
    choices: { A: '\\(x = \\dfrac{1 \\pm \\sqrt{17}}{4}\\)', B: '\\(x = \\dfrac{-1 \\pm \\sqrt{17}}{4}\\)', C: '\\(x = \\dfrac{1 \\pm \\sqrt{15}}{4}\\)', D: '\\(x = \\dfrac{1 \\pm \\sqrt{17}}{2}\\)' },
    correct_answer: 'A',
    rationale: '\\(a=2,\\ b=-1,\\ c=-2\\)<br/>\\(D = 1 + 16 = 17\\)\\[x = \\frac{1 \\pm \\sqrt{17}}{4}\\]',
  },
  {
    id: 'qg-05', skill: 'general', difficulty: 'Medium',
    passage: '',
    question: 'What are the roots of \\(x^2 - 2x - 5 = 0\\)?',
    choices: { A: '\\(x = 1 \\pm \\sqrt{6}\\)', B: '\\(x = 2 \\pm \\sqrt{6}\\)', C: '\\(x = 1 \\pm \\sqrt{5}\\)', D: '\\(x = 1 \\pm 2\\sqrt{6}\\)' },
    correct_answer: 'A',
    rationale: '\\(D = 4 + 20 = 24 = 4 \\times 6\\)\\[x = \\frac{2 \\pm 2\\sqrt{6}}{2} = 1 \\pm \\sqrt{6}\\]',
  },
  {
    id: 'qg-06', skill: 'general', difficulty: 'Medium',
    passage: '',
    question: 'What are the roots of \\(3x^2 + 5x - 1 = 0\\)?',
    choices: { A: '\\(x = \\dfrac{-5 \\pm \\sqrt{37}}{6}\\)', B: '\\(x = \\dfrac{-5 \\pm \\sqrt{13}}{6}\\)', C: '\\(x = \\dfrac{5 \\pm \\sqrt{37}}{6}\\)', D: '\\(x = \\dfrac{-5 \\pm \\sqrt{37}}{3}\\)' },
    correct_answer: 'A',
    rationale: '\\(D = 25 + 12 = 37\\)\\[x = \\frac{-5 \\pm \\sqrt{37}}{6}\\]',
  },
  {
    id: 'qg-07', skill: 'general', difficulty: 'Hard',
    passage: '',
    question: 'What are the roots of \\(x^2 - \\sqrt{3}\\,x - 1 = 0\\)?',
    choices: { A: '\\(x = \\dfrac{\\sqrt{3} \\pm \\sqrt{7}}{2}\\)', B: '\\(x = \\dfrac{\\sqrt{3} \\pm \\sqrt{5}}{2}\\)', C: '\\(x = \\dfrac{-\\sqrt{3} \\pm \\sqrt{7}}{2}\\)', D: '\\(x = \\dfrac{\\sqrt{3} \\pm \\sqrt{11}}{2}\\)' },
    correct_answer: 'A',
    rationale: '\\(b = -\\sqrt{3},\\ c = -1\\)<br/>\\(D = 3 + 4 = 7\\)\\[x = \\frac{\\sqrt{3} \\pm \\sqrt{7}}{2}\\]',
  },
  {
    id: 'qg-08', skill: 'general', difficulty: 'Hard',
    passage: '',
    question: 'What are the roots of \\(x^2 - (\\sqrt{2}+1)x + \\sqrt{2} = 0\\)?',
    choices: { A: '\\(x = \\sqrt{2}\\) or \\(x = 1\\)', B: '\\(x = \\sqrt{2}\\) or \\(x = -1\\)', C: '\\(x = -\\sqrt{2}\\) or \\(x = 1\\)', D: '\\(x = 1+\\sqrt{2}\\) or \\(x = 1-\\sqrt{2}\\)' },
    correct_answer: 'A',
    rationale: '\\(D = (\\sqrt{2}+1)^2 - 4\\sqrt{2} = 3 - 2\\sqrt{2} = (\\sqrt{2}-1)^2\\)\\[x = \\frac{(\\sqrt{2}+1) \\pm (\\sqrt{2}-1)}{2} \\implies x = \\sqrt{2} \\text{ or } x = 1\\]',
  },

  /* ── 2. Even-Coefficient Form — 7 questions ── */
  {
    id: 'qe-01', skill: 'even', difficulty: 'Easy',
    passage: P_EVEN,
    question: 'Use the even-coefficient formula to find the roots of \\(x^2 - 4x + 1 = 0\\).',
    choices: { A: '\\(x = 2 \\pm \\sqrt{3}\\)', B: '\\(x = 2 \\pm \\sqrt{5}\\)', C: '\\(x = -2 \\pm \\sqrt{3}\\)', D: '\\(x = 4 \\pm \\sqrt{3}\\)' },
    correct_answer: 'A',
    rationale: '\\(b = -4 = 2(-2) \\Rightarrow b\' = -2\\)<br/>\\(D\' = b\'^2 - ac = 4 - 1 = 3\\)\\[x = \\frac{2 \\pm \\sqrt{3}}{1} = 2 \\pm \\sqrt{3}\\]',
  },
  {
    id: 'qe-02', skill: 'even', difficulty: 'Easy',
    passage: '',
    question: 'Use the even-coefficient formula to find the roots of \\(2x^2 - 8x + 3 = 0\\).',
    choices: { A: '\\(x = \\dfrac{4 \\pm \\sqrt{10}}{2}\\)', B: '\\(x = \\dfrac{4 \\pm \\sqrt{22}}{2}\\)', C: '\\(x = \\dfrac{2 \\pm \\sqrt{10}}{2}\\)', D: '\\(x = \\dfrac{4 \\pm \\sqrt{10}}{4}\\)' },
    correct_answer: 'A',
    rationale: '\\(b = -8 = 2(-4) \\Rightarrow b\' = -4\\)<br/>\\(D\' = 16 - (2)(3) = 10\\)\\[x = \\frac{4 \\pm \\sqrt{10}}{2}\\]',
  },
  {
    id: 'qe-03', skill: 'even', difficulty: 'Easy',
    passage: '',
    question: 'Use the even-coefficient formula to find the roots of \\(x^2 + 6x + 2 = 0\\).',
    choices: { A: '\\(x = -3 \\pm \\sqrt{7}\\)', B: '\\(x = 3 \\pm \\sqrt{7}\\)', C: '\\(x = -3 \\pm \\sqrt{11}\\)', D: '\\(x = -6 \\pm \\sqrt{7}\\)' },
    correct_answer: 'A',
    rationale: '\\(b = 6 = 2(3) \\Rightarrow b\' = 3\\)<br/>\\(D\' = 9 - 2 = 7\\)\\[x = -3 \\pm \\sqrt{7}\\]',
  },
  {
    id: 'qe-04', skill: 'even', difficulty: 'Medium',
    passage: '',
    question: 'Use the even-coefficient formula to find the roots of \\(3x^2 - 12x + 7 = 0\\).',
    choices: { A: '\\(x = \\dfrac{6 \\pm \\sqrt{15}}{3}\\)', B: '\\(x = \\dfrac{6 \\pm \\sqrt{57}}{6}\\)', C: '\\(x = \\dfrac{12 \\pm \\sqrt{15}}{6}\\)', D: '\\(x = \\dfrac{6 \\pm \\sqrt{15}}{6}\\)' },
    correct_answer: 'A',
    rationale: '\\(b = -12 = 2(-6) \\Rightarrow b\' = -6\\)<br/>\\(D\' = 36 - (3)(7) = 15\\)\\[x = \\frac{6 \\pm \\sqrt{15}}{3}\\]',
  },
  {
    id: 'qe-05', skill: 'even', difficulty: 'Medium',
    passage: '',
    question: 'Use the even-coefficient formula to find the roots of \\(x^2 - 10x + 7 = 0\\).',
    choices: { A: '\\(x = 5 \\pm 3\\sqrt{2}\\)', B: '\\(x = 5 \\pm 2\\sqrt{3}\\)', C: '\\(x = 10 \\pm 3\\sqrt{2}\\)', D: '\\(x = 5 \\pm 3\\sqrt{7}\\)' },
    correct_answer: 'A',
    rationale: '\\(b = -10 = 2(-5) \\Rightarrow b\' = -5\\)<br/>\\(D\' = 25 - 7 = 18 = 9 \\times 2\\)\\[x = 5 \\pm \\sqrt{18} = 5 \\pm 3\\sqrt{2}\\]',
  },
  {
    id: 'qe-06', skill: 'even', difficulty: 'Medium',
    passage: '',
    question: 'Use the even-coefficient formula to find the roots of \\(2x^2 + 4x - 1 = 0\\).',
    choices: { A: '\\(x = \\dfrac{-2 \\pm \\sqrt{6}}{2}\\)', B: '\\(x = \\dfrac{2 \\pm \\sqrt{6}}{2}\\)', C: '\\(x = \\dfrac{-2 \\pm \\sqrt{6}}{4}\\)', D: '\\(x = \\dfrac{-4 \\pm \\sqrt{6}}{2}\\)' },
    correct_answer: 'A',
    rationale: '\\(b = 4 = 2(2) \\Rightarrow b\' = 2\\)<br/>\\(D\' = 4 + 2 = 6\\)\\[x = \\frac{-2 \\pm \\sqrt{6}}{2}\\]',
  },
  {
    id: 'qe-07', skill: 'even', difficulty: 'Hard',
    passage: '',
    question: 'Use the even-coefficient formula to find the roots of \\(x^2 - 8x + 11 = 0\\).',
    choices: { A: '\\(x = 4 \\pm \\sqrt{5}\\)', B: '\\(x = 8 \\pm \\sqrt{5}\\)', C: '\\(x = 4 \\pm \\sqrt{11}\\)', D: '\\(x = 4 \\pm \\sqrt{21}\\)' },
    correct_answer: 'A',
    rationale: '\\(b = -8 = 2(-4) \\Rightarrow b\' = -4\\)<br/>\\(D\' = 16 - 11 = 5\\)\\[x = 4 \\pm \\sqrt{5}\\]',
  },

  /* ── 3. Discriminant — 8 questions ── */
  {
    id: 'qd-01', skill: 'discriminant', difficulty: 'Easy',
    passage: P_DISC,
    question: 'For \\(x^2 - 3x + k = 0\\) to have two distinct real roots, what is the range of \\(k\\)?',
    choices: { A: '\\(k < \\dfrac{9}{4}\\)', B: '\\(k \\leq \\dfrac{9}{4}\\)', C: '\\(k > \\dfrac{9}{4}\\)', D: '\\(k > -\\dfrac{9}{4}\\)' },
    correct_answer: 'A',
    rationale: 'Two real roots \\(\\Rightarrow D > 0\\)<br/>\\(D = 9 - 4k > 0 \\Rightarrow k < \\dfrac{9}{4}\\)',
  },
  {
    id: 'qd-02', skill: 'discriminant', difficulty: 'Easy',
    passage: '',
    question: 'For \\(2x^2 - 4x + k = 0\\) to have exactly one repeated root, what is the value of \\(k\\)?',
    choices: { A: '\\(k = 2\\)', B: '\\(k = 4\\)', C: '\\(k = 1\\)', D: '\\(k = 8\\)' },
    correct_answer: 'A',
    rationale: 'Repeated root \\(\\Rightarrow D = 0\\)<br/>\\(D = 16 - 8k = 0 \\Rightarrow k = 2\\)',
  },
  {
    id: 'qd-03', skill: 'discriminant', difficulty: 'Medium',
    passage: '',
    question: 'For \\(x^2 + 2kx + k + 6 = 0\\) to have real roots, what is the range of \\(k\\)?',
    choices: { A: '\\(k \\leq -2\\) or \\(k \\geq 3\\)', B: '\\(-2 \\leq k \\leq 3\\)', C: '\\(k < -2\\) or \\(k > 3\\)', D: '\\(k \\leq -3\\) or \\(k \\geq 2\\)' },
    correct_answer: 'A',
    rationale: 'Real roots \\(\\Rightarrow D \\geq 0\\)<br/>\\(\\frac{D}{4} = k^2 - (k+6) = k^2 - k - 6 \\geq 0\\)<br/>\\((k-3)(k+2) \\geq 0 \\Rightarrow k \\leq -2\\) or \\(k \\geq 3\\)',
  },
  {
    id: 'qd-04', skill: 'discriminant', difficulty: 'Medium',
    passage: '',
    question: 'For \\(kx^2 - 2x + 1 = 0\\) (\\(k \\neq 0\\)) to have two distinct real roots, which condition must hold?',
    choices: { A: '\\(k < 1\\) and \\(k \\neq 0\\)', B: '\\(k > 1\\)', C: '\\(0 < k < 1\\)', D: '\\(k < 0\\)' },
    correct_answer: 'A',
    rationale: 'Two real roots \\(\\Rightarrow D > 0\\)<br/>\\(D = 4 - 4k > 0 \\Rightarrow k < 1\\)<br/>Also \\(k \\neq 0\\) to keep it quadratic.',
  },
  {
    id: 'qd-05', skill: 'discriminant', difficulty: 'Medium',
    passage: '',
    question: 'For \\(x^2 - (k+2)x + 4 = 0\\) to have two distinct real roots, what is the range of \\(k\\)?',
    choices: { A: '\\(k < -6\\) or \\(k > 2\\)', B: '\\(-6 < k < 2\\)', C: '\\(k \\leq -6\\) or \\(k \\geq 2\\)', D: '\\(k < -2\\) or \\(k > 6\\)' },
    correct_answer: 'A',
    rationale: '\\(D > 0 \\Rightarrow (k+2)^2 - 16 > 0\\)<br/>\\(|k+2| > 4 \\Rightarrow k < -6\\) or \\(k > 2\\)',
  },
  {
    id: 'qd-06', skill: 'discriminant', difficulty: 'Medium',
    passage: '',
    question: 'For \\(x^2 + px + p = 0\\) (\\(p \\neq 0\\)) to have a repeated root, what is the value of \\(p\\)?',
    choices: { A: '\\(p = 4\\)', B: '\\(p = 2\\)', C: '\\(p = 1\\)', D: '\\(p = -4\\)' },
    correct_answer: 'A',
    rationale: '\\(D = 0 \\Rightarrow p^2 - 4p = 0 \\Rightarrow p(p-4) = 0\\)<br/>Since \\(p \\neq 0\\), we get \\(p = 4\\).',
  },
  {
    id: 'qd-07', skill: 'discriminant', difficulty: 'Hard',
    passage: '',
    question: 'For \\(2x^2 - kx + 8 = 0\\) to have real roots, what is the range of \\(k\\)?',
    choices: { A: '\\(k \\leq -8\\) or \\(k \\geq 8\\)', B: '\\(-8 \\leq k \\leq 8\\)', C: '\\(k < -8\\) or \\(k > 8\\)', D: '\\(k \\leq -4\\) or \\(k \\geq 4\\)' },
    correct_answer: 'A',
    rationale: 'Real roots \\(\\Rightarrow D \\geq 0\\)<br/>\\(D = k^2 - 64 \\geq 0 \\Rightarrow |k| \\geq 8\\)<br/>\\(k \\leq -8\\) or \\(k \\geq 8\\)',
  },
  {
    id: 'qd-08', skill: 'discriminant', difficulty: 'Hard',
    passage: '',
    question: 'For \\(x^2 - 2kx + 3k + 4 = 0\\) to have two distinct real roots, what is the range of \\(k\\)?',
    choices: { A: '\\(k < -1\\) or \\(k > 4\\)', B: '\\(-1 < k < 4\\)', C: '\\(k \\leq -1\\) or \\(k \\geq 4\\)', D: '\\(k < -4\\) or \\(k > 1\\)' },
    correct_answer: 'A',
    rationale: '\\(\\frac{D}{4} > 0 \\Rightarrow k^2 - (3k+4) > 0\\)<br/>\\(k^2 - 3k - 4 > 0 \\Rightarrow (k-4)(k+1) > 0\\)<br/>\\(k < -1\\) or \\(k > 4\\)',
  },

  /* ── 4. Vieta's Formulas — 7 questions ── */
  {
    id: 'qv-01', skill: 'vieta', difficulty: 'Easy',
    passage: P_VIETA,
    question: 'Let \\(\\alpha, \\beta\\) be the roots of \\(x^2 - 3x + 1 = 0\\). Find \\(\\alpha^2 + \\beta^2\\).',
    choices: { A: '7', B: '9', C: '11', D: '5' },
    correct_answer: 'A',
    rationale: '\\(\\alpha+\\beta = 3,\\ \\alpha\\beta = 1\\)<br/>\\(\\alpha^2+\\beta^2 = (\\alpha+\\beta)^2 - 2\\alpha\\beta = 9 - 2 = 7\\)',
  },
  {
    id: 'qv-02', skill: 'vieta', difficulty: 'Easy',
    passage: '',
    question: 'Let \\(\\alpha, \\beta\\) be the roots of \\(x^2 + 2x - 3 = 0\\). Find \\((\\alpha - \\beta)^2\\).',
    choices: { A: '16', B: '4', C: '8', D: '12' },
    correct_answer: 'A',
    rationale: '\\(\\alpha+\\beta = -2,\\ \\alpha\\beta = -3\\)<br/>\\((\\alpha-\\beta)^2 = (\\alpha+\\beta)^2 - 4\\alpha\\beta = 4 + 12 = 16\\)',
  },
  {
    id: 'qv-03', skill: 'vieta', difficulty: 'Easy',
    passage: '',
    question: 'Which monic quadratic has roots \\(3\\) and \\(-2\\)?',
    choices: { A: '\\(x^2 - x - 6 = 0\\)', B: '\\(x^2 + x - 6 = 0\\)', C: '\\(x^2 - x + 6 = 0\\)', D: '\\(x^2 + x + 6 = 0\\)' },
    correct_answer: 'A',
    rationale: 'Sum \\(= 3 + (-2) = 1\\), Product \\(= 3 \\times (-2) = -6\\)<br/>\\(x^2 - x - 6 = 0\\)',
  },
  {
    id: 'qv-04', skill: 'vieta', difficulty: 'Medium',
    passage: '',
    question: 'Let \\(\\alpha, \\beta\\) be the roots of \\(x^2 - 5x + 2 = 0\\). Find \\(\\dfrac{1}{\\alpha} + \\dfrac{1}{\\beta}\\).',
    choices: { A: '\\(\\dfrac{5}{2}\\)', B: '\\(\\dfrac{2}{5}\\)', C: '\\(-\\dfrac{5}{2}\\)', D: '5' },
    correct_answer: 'A',
    rationale: '\\(\\dfrac{1}{\\alpha} + \\dfrac{1}{\\beta} = \\dfrac{\\alpha+\\beta}{\\alpha\\beta} = \\dfrac{5}{2}\\)',
  },
  {
    id: 'qv-05', skill: 'vieta', difficulty: 'Hard',
    passage: '',
    question: 'Let \\(\\alpha, \\beta\\) be the roots of \\(x^2 + 4x + 1 = 0\\). Find \\(\\alpha^3 + \\beta^3\\).',
    choices: { A: '−52', B: '52', C: '−44', D: '−56' },
    correct_answer: 'A',
    rationale: '\\(\\alpha+\\beta = -4,\\ \\alpha\\beta = 1\\)<br/>\\(\\alpha^3+\\beta^3 = (\\alpha+\\beta)^3 - 3\\alpha\\beta(\\alpha+\\beta)\\)<br/>\\(= (-4)^3 - 3(1)(-4) = -64 + 12 = -52\\)',
  },
  {
    id: 'qv-06', skill: 'vieta', difficulty: 'Medium',
    passage: '',
    question: 'The sum of the roots of \\(x^2 + px + q = 0\\) is 3 and their product is −4. Find \\(p + q\\).',
    choices: { A: '−7', B: '7', C: '−1', D: '1' },
    correct_answer: 'A',
    rationale: 'Sum \\(= 3 \\Rightarrow -p = 3 \\Rightarrow p = -3\\)<br/>Product \\(= -4 \\Rightarrow q = -4\\)<br/>\\(p + q = -3 + (-4) = -7\\)',
  },
  {
    id: 'qv-07', skill: 'vieta', difficulty: 'Hard',
    passage: '',
    question: 'Let \\(\\alpha, \\beta\\) have sum 2 and product −3. Find \\(\\alpha^2 - \\alpha\\beta + \\beta^2\\).',
    choices: { A: '13', B: '7', C: '10', D: '16' },
    correct_answer: 'A',
    rationale: '\\(\\alpha+\\beta = 2,\\ \\alpha\\beta = -3\\)<br/>\\(\\alpha^2+\\beta^2 = (\\alpha+\\beta)^2 - 2\\alpha\\beta = 4 + 6 = 10\\)<br/>\\(\\alpha^2 - \\alpha\\beta + \\beta^2 = 10 - (-3) = 13\\)',
  },
];

/* ── Helpers ────────────────────────────────────────── */
const LETTERS = ['A', 'B', 'C', 'D'] as const;

const TEST_ID = 'quadratic-equations-30';

/* ── Main component ─────────────────────────────────── */
export default function QuadraticPracticePage() {
  const [phase, setPhase] = useState<Phase>('gate');
  const [instagramId, setInstagramId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [gateError, setGateError] = useState('');
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeSkill, setActiveSkill] = useState<SkillKey>('general');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { setCurrentIndex(0); }, [activeSkill]);

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = accessCode.trim();
    const cleanIg = instagramId.trim();
    if (!cleanCode || !cleanIg) return;

    setValidating(true);
    setGateError('');
    try {
      const res = await fetch('/api/test-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, instagramId: cleanIg, testId: TEST_ID }),
      });
      const data = await res.json();
      if (!data.valid) {
        const msgs: Record<string, string> = {
          invalid_code: 'Invalid access code.',
          code_inactive: 'This code is no longer active.',
          code_expired: 'This code has expired.',
          capacity_exceeded: 'This code has reached its limit. Please get a new code.',
        };
        setGateError(msgs[data.error] ?? 'Something went wrong. Please try again.');
        return;
      }
      setInstagramId(cleanIg.startsWith('@') ? cleanIg : `@${cleanIg}`);

      const statsRes = await fetch(`/api/practice/stats?testId=${TEST_ID}`);
      if (statsRes.ok) setStats(await statsRes.json());

      setPhase('leaderboard');
    } catch {
      setGateError('Network error. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleAnswer = useCallback((qId: string, choice: string) => {
    setAnswers(prev => ({ ...prev, [qId]: choice }));
    setRevealed(prev => ({ ...prev, [qId]: true }));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < 1) { showToast('Solve at least 1 question before submitting.'); return; }

    setSubmitting(true);
    const correctCount = Object.entries(answers).filter(([qId, ans]) => {
      const q = QUESTIONS.find(q => q.id === qId);
      return q?.correct_answer === ans;
    }).length;

    try {
      await fetch('/api/practice/quadratic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramId,
          studentName: studentName || null,
          answers,
          correctCount,
          totalCount: answeredCount,
          questionResults: Object.fromEntries(
            Object.entries(answers).map(([qId, ans]) => {
              const q = QUESTIONS.find(q => q.id === qId);
              return [qId, q?.correct_answer === ans];
            })
          ),
        }),
      });
      setSubmitted(true);
      showToast(`Submitted! ${correctCount}/${answeredCount} correct (${Math.round(correctCount / answeredCount * 100)}%)`);
    } catch {
      showToast('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Gate phase ─────────────────────────────────── */
  if (phase === 'gate') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '48px 40px', width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>SuperfastSAT</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Quadratic Equations — 30 Problems</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 1.6 }}>
            Quadratic Formula · Even-Coefficient Form · Discriminant · Vieta&apos;s Formulas
          </p>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 36 }}>Enter your Instagram ID to begin</p>
          <form onSubmit={handleGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Access code" value={accessCode} onChange={e => setAccessCode(e.target.value)} required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <input type="text" placeholder="@instagram_id" value={instagramId} onChange={e => setInstagramId(e.target.value)} required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
            <input type="text" placeholder="Name (optional)" value={studentName} onChange={e => setStudentName(e.target.value)}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
            {gateError && (
              <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'left', padding: '4px 2px' }}>
                {gateError}
              </div>
            )}
            <button type="submit" disabled={!accessCode.trim() || !instagramId.trim() || validating}
              style={{ width: '100%', padding: '13px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: !accessCode.trim() || !instagramId.trim() || validating ? 'not-allowed' : 'pointer', opacity: !accessCode.trim() || !instagramId.trim() || validating ? 0.4 : 1, marginTop: 4 }}>
              {validating ? 'Checking...' : 'Start Practice'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Leaderboard phase ──────────────────────────── */
  if (phase === 'leaderboard') {
    const lb = stats?.leaderboard ?? [];
    const rankColor = (i: number) => i === 0 ? '#ffffff' : i === 1 ? '#a1a1aa' : i === 2 ? '#71717a' : '#3f3f46';
    const scoreColor = (i: number) => i === 0 ? '#6085FF' : i < 3 ? '#a1a1aa' : '#52525b';
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#09090b', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ width: '100%', maxWidth: 400, padding: '36px 24px 20px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#6085FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>SuperfastSAT</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em' }}>Leaderboard</h2>
          <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>
            {lb.length > 0 ? `${lb.length} students completed this set` : 'No submissions yet. Be the first.'}
          </p>
        </div>

        {/* List */}
        <div style={{ width: '100%', maxWidth: 400, flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {lb.map((entry, i) => (
            <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12 }}>
              <span style={{ width: 22, fontSize: 11, fontWeight: 700, color: rankColor(i), textAlign: 'right', flexShrink: 0 }}>{entry.rank}</span>
              <span style={{ flex: 1, fontSize: 13, color: i < 3 ? '#e4e4e7' : '#52525b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.maskedId}
              </span>
              <span style={{ fontSize: 11, color: '#3f3f46', flexShrink: 0, marginRight: 8 }}>{entry.correctCount}/{entry.totalCount}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(i), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{entry.score}%</span>
            </div>
          ))}
          {lb.length === 0 && <div style={{ textAlign: 'center', color: '#3f3f46', paddingTop: 60, fontSize: 13 }}>No data</div>}
        </div>

        {/* CTA */}
        <div style={{ width: '100%', maxWidth: 400, padding: '20px 24px 32px', flexShrink: 0 }}>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#3f3f46', margin: '0 0 14px', letterSpacing: '0.02em' }}>
            Can you break into the top 3?
          </p>
          <button
            onClick={() => setPhase('test')}
            style={{ width: '100%', padding: '14px 0', background: '#071be9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            Start →
          </button>
        </div>
      </div>
    );
  }

  /* ── Test phase ─────────────────────────────────── */
  const groupQuestions = QUESTIONS.filter(q => q.skill === activeSkill);
  const currentQuestion = groupQuestions[currentIndex] ?? null;
  const isRevealed = currentQuestion ? !!revealed[currentQuestion.id] : false;
  const userAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === groupQuestions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.entries(answers).filter(([qId, ans]) => {
    const q = QUESTIONS.find(q => q.id === qId);
    return q?.correct_answer === ans;
  }).length;

  return (
    <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: submitted ? '#1e293b' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Test header */}
      <div style={{ height: 52, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Quadratic Equations — 30 Problems</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{answeredCount} / 30 &nbsp;({correctCount} correct)</span>
          <button onClick={handleSubmit} disabled={submitting || submitted || answeredCount < 1}
            style={{ padding: '6px 14px', background: submitted ? '#22c55e' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: submitted || submitting || answeredCount < 1 ? 'default' : 'pointer', opacity: answeredCount < 1 ? 0.4 : 1 }}>
            {submitted ? 'Submitted ✓' : submitting ? 'Submitting...' : 'Submit Results'}
          </button>
        </div>
      </div>

      {/* Skill tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', overflowX: 'auto', background: '#f8fafc', flexShrink: 0 }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {SKILLS.map(sk => {
            const skAnswered = QUESTIONS.filter(q => q.skill === sk.key && answers[q.id]).length;
            const skTotal = QUESTIONS.filter(q => q.skill === sk.key).length;
            return (
              <button key={sk.key} onClick={() => setActiveSkill(sk.key)}
                style={{ padding: '10px 18px', fontSize: 13, fontWeight: activeSkill === sk.key ? 700 : 500, color: activeSkill === sk.key ? '#1e293b' : '#64748b', background: 'transparent', border: 'none', borderBottom: activeSkill === sk.key ? '2px solid #1e293b' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {sk.label} <span style={{ fontSize: 11, color: '#94a3b8' }}>{skAnswered}/{skTotal}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question area */}
      {currentQuestion && (
        <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
          {/* Passage panel */}
          {currentQuestion.passage ? (
            <>
              <div className="test-passage-panel">
                <div style={{ padding: '24px 28px 24px 24px' }}>
                  <div className="test-passage-content">
                    <ContentRenderer content={currentQuestion.passage} />
                  </div>
                </div>
              </div>
              <div className="test-resizer" />
            </>
          ) : null}

          {/* Question panel */}
          <div className="test-question-panel" style={currentQuestion.passage ? {} : { flex: 1 }}>
            <div style={{ padding: '24px', maxWidth: 680, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {currentIndex + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: DIFF_COLOR[currentQuestion.difficulty] }}>
                  {currentQuestion.difficulty}
                </span>
              </div>

              <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}>
                <ContentRenderer content={currentQuestion.question} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {LETTERS.map(letter => {
                  const text = currentQuestion.choices[letter];
                  const isSelected = userAnswer === letter;
                  const isCorrect = currentQuestion.correct_answer === letter;
                  let bg = '#fff', borderColor = '#e5e7eb', color = '#1e293b';
                  if (isRevealed) {
                    if (isCorrect) { bg = '#f0fdf4'; borderColor = '#22c55e'; color = '#15803d'; }
                    else if (isSelected) { bg = '#fef2f2'; borderColor = '#ef4444'; color = '#b91c1c'; }
                  } else if (isSelected) {
                    bg = '#eff6ff'; borderColor = '#3b82f6'; color = '#1d4ed8';
                  }
                  return (
                    <button key={letter}
                      className={`bluebook-option btn-press${isSelected ? ' selected' : ''}`}
                      onClick={() => !isRevealed && handleAnswer(currentQuestion.id, letter)}
                      style={{ background: bg, borderColor, color, cursor: isRevealed ? 'default' : 'pointer', textAlign: 'left' }}>
                      <span className="bluebook-option-label">{letter}</span>
                      <span className="bluebook-option-text"><ContentRenderer content={text} /></span>
                    </button>
                  );
                })}
              </div>

              {/* Rationale + question stats */}
              {isRevealed && (
                <>
                  <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Solution</p>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                      <ContentRenderer content={currentQuestion.rationale} />
                    </div>
                  </div>
                  {(() => {
                    const qStat = stats?.questionStats[currentQuestion.id];
                    if (!qStat || qStat.total === 0) return null;
                    const pct = Math.round((qStat.correct / qStat.total) * 100);
                    return (
                      <div style={{ marginTop: 10, display: 'flex', gap: 16, alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: '#22c55e', fontWeight: 700 }}>{pct}% correct</span>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>{100 - pct}% incorrect</span>
                        <span style={{ color: '#94a3b8' }}>({qStat.total} students)</span>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="bluebook-footer" style={{ flexShrink: 0 }}>
        <button onClick={() => !isFirst && setCurrentIndex(i => i - 1)} disabled={isFirst}
          style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1, color: '#374151' }}>
          Back
        </button>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{currentIndex + 1} / {groupQuestions.length}</span>
        <button className="bluebook-next-btn btn-press" onClick={() => !isLast && setCurrentIndex(i => i + 1)} disabled={isLast}
          style={{ opacity: isLast ? 0.4 : 1, cursor: isLast ? 'not-allowed' : 'pointer' }}>
          Next
        </button>
      </div>
    </div>
  );
}
