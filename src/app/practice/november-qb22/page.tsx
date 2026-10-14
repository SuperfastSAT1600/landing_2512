'use client';

import { useState, useCallback } from 'react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';
import { BluebookPageShell } from '@/components/shared/BluebookPageShell';
import { BluebookQuestionUnit } from '@/components/shared/BluebookQuestionUnit';

const TEST_ID = 'november-qb22';
const TEST_LABEL = '11월 SAT 예상 22문항';
const TEST_DESC = 'CB 문제은행 8월 18일 추가분 · 쌍둥이 없는 22문항';

type QuestionType = 'spr' | 'mcq';

interface MCQOption { label: string; text: string; }
interface Question {
  id: string;
  skill: string;
  difficulty: string;
  domain: string;
  passage: string;
  question: string;
  type: QuestionType;
  answers?: string[];
  options?: MCQOption[];
  correctOption?: string;
}

type Phase = 'gate' | 'leaderboard' | 'test' | 'result' | 'review';

interface LeaderboardEntry { rank: number; maskedId: string; correctCount: number; totalCount: number; score: number; }
interface Stats { leaderboard: LeaderboardEntry[]; questionStats: Record<string, { correct: number; total: number }>; }

const DIFF_COLOR: Record<string, string> = { Hard: '#ef4444', Medium: '#f59e0b', Easy: '#22c55e' };

const SCATTERPLOT_TABLE = `<p style="font-size:13px;color:#475569;margin-bottom:6px;">Cutting board sale prices by width (10 boards total)</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:12px;">
  <thead><tr style="background:#f1f5f9;">
    <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">Width (cm)</th>
    <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">Sale price ($)</th>
  </tr></thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">24</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">10</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">24</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">15</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">30</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">20</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">36</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">30</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">42</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">40</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">54</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">45</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">62</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">55</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">68</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">70</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">72</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">85</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">76</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">60</td></tr>
  </tbody>
</table>`;

const CARDS_TABLE = `<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:12px;">
  <thead><tr style="background:#f1f5f9;">
    <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Shape</th>
    <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Number of cards</th>
  </tr></thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Square</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">\\(5\\)</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Circle</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">\\(9\\)</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Triangle</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">\\(14\\)</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Star</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">\\(12\\)</td></tr>
  </tbody>
</table>`;

const DATA_Q_TABLE = `<p style="font-weight:600;margin-bottom:6px;">Data Set Q</p>
<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:12px;">
  <thead><tr style="background:#f1f5f9;">
    <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">Value</th>
    <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">Frequency</th>
  </tr></thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(a\\)</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(110\\)</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(b\\)</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(30\\)</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(c\\)</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(0\\)</td></tr>
  </tbody>
</table>
<p style="font-weight:600;margin-bottom:6px;">Data Set R</p>
<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:12px;">
  <thead><tr style="background:#f1f5f9;">
    <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">Value</th>
    <th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">Frequency</th>
  </tr></thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(a\\)</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(0\\)</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(b\\)</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(3\\)</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(c\\)</td><td style="border:1px solid #cbd5e1;padding:6px 10px;text-align:center;">\\(11\\)</td></tr>
  </tbody>
</table>`;

const TRIANGLE_XYZ = `<svg viewBox="0 0 240 160" width="240" height="160" style="display:block;margin:0 auto 12px;">
  <polygon points="30,130 30,30 210,130" fill="none" stroke="#1e293b" strokeWidth="2"/>
  <rect x="30" y="110" width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="1.5"/>
  <text x="16" y="26" fontSize="14" fontWeight="700" fill="#1e293b">X</text>
  <text x="16" y="148" fontSize="14" fontWeight="700" fill="#1e293b">Y</text>
  <text x="214" y="148" fontSize="14" fontWeight="700" fill="#1e293b">Z</text>
  <text x="34" y="82" fontSize="13" fill="#475569">75</text>
  <text x="112" y="148" fontSize="13" fill="#475569">560</text>
  <text x="120" y="76" fontSize="13" fill="#475569">c</text>
</svg>`;

const TRIANGLE_QRS = `<svg viewBox="0 0 240 160" width="240" height="160" style="display:block;margin:0 auto 12px;">
  <polygon points="30,130 30,30 210,130" fill="none" stroke="#1e293b" strokeWidth="2"/>
  <rect x="30" y="110" width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="1.5"/>
  <text x="16" y="26" fontSize="14" fontWeight="700" fill="#1e293b">Q</text>
  <text x="16" y="148" fontSize="14" fontWeight="700" fill="#1e293b">R</text>
  <text x="214" y="148" fontSize="14" fontWeight="700" fill="#1e293b">S</text>
  <text x="112" y="148" fontSize="13" fill="#475569">25</text>
</svg>`;

const TRIANGLE_ABC_CDE = `<p style="font-size:13px;color:#475569;margin-bottom:8px;">Figure: segment AE intersects DB at C; AB ∥ DE, forming triangles ABC and CDE.</p>
<svg viewBox="0 0 280 180" width="280" height="180" style="display:block;margin:0 auto 8px;">
  <line x1="20" y1="160" x2="140" y2="80" stroke="#1e293b" strokeWidth="2"/>
  <line x1="140" y1="80" x2="260" y2="160" stroke="#1e293b" strokeWidth="2"/>
  <line x1="20" y1="160" x2="260" y2="160" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 3"/>
  <line x1="60" y1="20" x2="220" y2="20" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 3"/>
  <line x1="20" y1="160" x2="60" y2="20" stroke="#1e293b" strokeWidth="2"/>
  <line x1="260" y1="160" x2="220" y2="20" stroke="#1e293b" strokeWidth="2"/>
  <text x="7" y="168" fontSize="13" fontWeight="700" fill="#1e293b">B</text>
  <text x="262" y="168" fontSize="13" fontWeight="700" fill="#1e293b">E</text>
  <text x="47" y="16" fontSize="13" fontWeight="700" fill="#1e293b">A</text>
  <text x="222" y="16" fontSize="13" fontWeight="700" fill="#1e293b">D</text>
  <text x="134" y="74" fontSize="13" fontWeight="700" fill="#1e293b">C</text>
  <text x="90" y="108" fontSize="12" fill="#3b82f6">x°</text>
  <text x="58" y="38" fontSize="12" fill="#3b82f6">y°</text>
  <text x="196" y="38" fontSize="12" fill="#3b82f6">z°</text>
</svg>`;

const GRAPH_F = `<p style="font-size:13px;color:#475569;margin-bottom:6px;">Graph of \\(y = f(x)\\) — the curve passes through \\((0,\\ 3)\\) on the \\(y\\)-axis.</p>
<svg viewBox="0 0 220 180" width="220" height="180" style="display:block;margin:0 auto 8px;">
  <line x1="20" y1="90" x2="200" y2="90" stroke="#94a3b8" strokeWidth="1"/>
  <line x1="110" y1="10" x2="110" y2="170" stroke="#94a3b8" strokeWidth="1"/>
  <path d="M 40,150 Q 80,60 110,123 Q 140,170 180,50" fill="none" stroke="#3b82f6" strokeWidth="2.5"/>
  <circle cx="110" cy="123" r="4" fill="#1e293b"/>
  <text x="116" y="127" fontSize="12" fill="#1e293b">\\((0,3)\\)</text>
  <text x="196" y="94" fontSize="12" fill="#64748b">x</text>
  <text x="112" y="8" fontSize="12" fill="#64748b">y</text>
</svg>`;

const QUESTIONS: Question[] = [
  {
    id: 'qb22-01', skill: 'Form, Structure, and Sense', difficulty: 'Easy', domain: 'RW',
    passage: '',
    question: `<p>During World War II, codebreakers played an essential role in deciphering coded messages. In the US military, more than 10,000 women ______ as codebreakers, making up nearly half of all US codebreakers.</p><p>Which choice completes the text so that it conforms to the conventions of Standard English?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: 'having served' },
      { label: 'B', text: 'to serve' },
      { label: 'C', text: 'served' },
      { label: 'D', text: 'serving' },
    ],
    correctOption: 'C',
  },
  {
    id: 'qb22-02', skill: 'Words in Context', difficulty: 'Medium', domain: 'RW',
    passage: '',
    question: `<p>Yanzhe Fu et al. suggest that the extinct aquatic insect <em>Karataviella popovi</em> utilized a brood care strategy that mitigated the risk of oxygen deficiency. This determination rests on the researchers' analysis of fossils uncovered at a particularly ______ site: China's Haifanggou Formation, which has yielded a vast diversity of fossils, including those of long-proboscid scorpionflies.</p><p>Which choice completes the text with the most logical and precise word or phrase?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: 'fruitful' },
      { label: 'B', text: 'unassailable' },
      { label: 'C', text: 'obscure' },
      { label: 'D', text: 'quantified' },
    ],
    correctOption: 'A',
  },
  {
    id: 'qb22-03', skill: 'Words in Context', difficulty: 'Hard', domain: 'RW',
    passage: '',
    question: `<p>The Polynesian languages, a group of related languages originating on islands in the Pacific, typically have ______ array of consonant sounds. For example, the Mangareva language of the South Pacific has nine consonants, and 'Ōlelo Hawai'i, the language of the Native Hawaiian people, has eight. Globally, however, the median number of consonants per language is over twenty-two.</p><p>Which choice completes the text with the most logical and precise word or phrase?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: 'an unvarying' },
      { label: 'B', text: 'a musical' },
      { label: 'C', text: 'an exclusive' },
      { label: 'D', text: 'a modest' },
    ],
    correctOption: 'D',
  },
  {
    id: 'qb22-04', skill: 'Boundaries', difficulty: 'Hard', domain: 'RW',
    passage: '',
    question: `<p>For the past 20 million years, Earth's magnetic poles in the far north and far south have remained roughly where they are today. This has not always been the ______ throughout geologic history, Earth's magnetic poles have swapped places several times through a process called polar wandering.</p><p>Which choice completes the text so that it conforms to the conventions of Standard English?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: 'case, though' },
      { label: 'B', text: 'case, though,' },
      { label: 'C', text: 'case; though,' },
      { label: 'D', text: 'case, though;' },
    ],
    correctOption: 'D',
  },
  {
    id: 'qb22-05', skill: 'Linear functions', difficulty: 'Easy', domain: 'Algebra',
    passage: '',
    question: `<p>A computer company pays customers for trading in old computers. The payment \\(p\\), in dollars, is the original retail price of a computer minus \\(\\$150\\) for each year since the computer was released. Which equation represents this situation for a computer with an original retail price of \\(\\$690\\) when it was released \\(t\\) years ago, where \\(t\\) is a whole number and \\(1 \\leq t \\leq 4\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(p = 150 - 690t\\)' },
      { label: 'B', text: '\\(p = 690 - 150t\\)' },
      { label: 'C', text: '\\(t = 150 - 690p\\)' },
      { label: 'D', text: '\\(t = 690 - 150p\\)' },
    ],
    correctOption: 'B',
  },
  {
    id: 'qb22-06', skill: 'Systems of two linear equations', difficulty: 'Medium', domain: 'Algebra',
    passage: '',
    question: `<p>\\(y - 6 = \\dfrac{4}{5}(x + 5)\\)</p><p>\\(y - v = \\dfrac{4}{5}(x + 10)\\)</p><p>In the given system of equations, \\(v\\) is a constant. The system has infinitely many solutions. What is the value of \\(v\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(0\\)' },
      { label: 'B', text: '\\(2\\)' },
      { label: 'C', text: '\\(4\\)' },
      { label: 'D', text: '\\(12\\)' },
    ],
    correctOption: 'B',
  },
  {
    id: 'qb22-07', skill: 'Linear functions', difficulty: 'Hard', domain: 'Algebra',
    passage: '',
    question: `<p>A train traveled \\(173\\) miles in the first \\(3\\) hours of a trip and traveled at an average speed of \\(53\\) miles per hour for the remainder of the trip. Which equation gives the total number of miles, \\(y\\), the train traveled if the trip was \\(x\\) hours long and \\(x > 3\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(y = 53x + 173\\)' },
      { label: 'B', text: '\\(y = 53x + 14\\)' },
      { label: 'C', text: '\\(y = 14x + 226\\)' },
      { label: 'D', text: '\\(y = 14x + 53\\)' },
    ],
    correctOption: 'B',
  },
  {
    id: 'qb22-08', skill: 'Systems of two linear equations', difficulty: 'Hard', domain: 'Algebra',
    passage: '',
    question: `<p>\\(x + y = 20\\)</p><p>One of the two equations in a system of linear equations is given. The system has exactly one solution. Which equation could be the second equation in the system?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(3x + 3y = 60\\)' },
      { label: 'B', text: '\\(-x - y = 40\\)' },
      { label: 'C', text: '\\(3x + 3y = 14\\)' },
      { label: 'D', text: '\\(x - y = 20\\)' },
    ],
    correctOption: 'D',
  },
  {
    id: 'qb22-09', skill: 'Equivalent expressions', difficulty: 'Easy', domain: 'Advanced Math',
    passage: '',
    question: `<p>Which expression is equivalent to \\(100x^2 + 2{,}600\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(100(26x^2)\\)' },
      { label: 'B', text: '\\(100(x^2 + 26)\\)' },
      { label: 'C', text: '\\(2{,}600(100x^2)\\)' },
      { label: 'D', text: '\\(2{,}600(100x^2 + 1)\\)' },
    ],
    correctOption: 'B',
  },
  {
    id: 'qb22-10', skill: 'Nonlinear equations', difficulty: 'Easy', domain: 'Advanced Math',
    passage: '',
    question: `<p style="text-align:center;">\\(\\dfrac{1}{x} + 8 = \\dfrac{1}{6} + 8\\)</p><p>What is the solution to the given equation?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(1\\)' },
      { label: 'B', text: '\\(6\\)' },
      { label: 'C', text: '\\(8\\)' },
      { label: 'D', text: '\\(14\\)' },
    ],
    correctOption: 'B',
  },
  {
    id: 'qb22-11', skill: 'Nonlinear functions', difficulty: 'Medium', domain: 'Advanced Math',
    passage: GRAPH_F,
    question: `<p>The graph of \\(y = f(x)\\) is shown. What is the \\(y\\)-intercept of \\(y = f(x) + 5\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\((0,\\ 8)\\)' },
      { label: 'B', text: '\\((0,\\ 5)\\)' },
      { label: 'C', text: '\\((0,\\ 3)\\)' },
      { label: 'D', text: '\\((0,\\ 0)\\)' },
    ],
    correctOption: 'A',
  },
  {
    id: 'qb22-12', skill: 'Equivalent expressions', difficulty: 'Medium', domain: 'Advanced Math',
    passage: '',
    question: `<p>Which expression is equivalent to \\(\\dfrac{4x + 1}{x - 9}\\), where \\(x > 9\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(4 + \\dfrac{37}{x - 9}\\)' },
      { label: 'B', text: '\\(4 + \\dfrac{35}{x - 9}\\)' },
      { label: 'C', text: '\\(4 + \\dfrac{1}{x - 9}\\)' },
      { label: 'D', text: '\\(4 - \\dfrac{1}{x - 9}\\)' },
    ],
    correctOption: 'A',
  },
  {
    id: 'qb22-13', skill: 'Nonlinear functions', difficulty: 'Hard', domain: 'Advanced Math',
    passage: '',
    question: `<p>A certain bowl was sold online for prices varying between \\(\\$7\\) and \\(\\$13\\). The number of bowls sold can be modeled by a quadratic function based on the price, where \\(5\\) bowls were sold for \\(\\$12\\) each and the maximum of \\(9\\) bowls were sold for \\(\\$10\\) each. According to the model, what is the number of bowls that were sold for \\(\\$8\\) each?</p>`,
    type: 'spr',
    answers: ['5'],
  },
  {
    id: 'qb22-14', skill: 'One-variable data', difficulty: 'Easy', domain: 'PSDA',
    passage: CARDS_TABLE,
    question: `<p>The table summarizes the distribution of shape printed on one side for cards in a deck of cards. How many cards in the deck have a triangle printed on one side?</p>`,
    type: 'spr',
    answers: ['14'],
  },
  {
    id: 'qb22-15', skill: 'Ratios, rates, proportional relationships', difficulty: 'Medium', domain: 'PSDA',
    passage: '',
    question: `<p>There is a proportional relationship between \\(p\\) and \\(t\\). If \\(p = 5{,}130\\) when \\(t = 6{,}840\\), then what is the value of \\(p\\) when \\(t = 5{,}472\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(7{,}296\\)' },
      { label: 'B', text: '\\(7{,}182\\)' },
      { label: 'C', text: '\\(4{,}104\\)' },
      { label: 'D', text: '\\(3{,}762\\)' },
    ],
    correctOption: 'C',
  },
  {
    id: 'qb22-16', skill: 'Two-variable data', difficulty: 'Medium', domain: 'PSDA',
    passage: SCATTERPLOT_TABLE,
    question: `<p>The owner of a restaurant supply store selects \\(10\\) cutting boards to put on sale. The table shows the width \\(x\\), in centimeters, of each cutting board and its corresponding sale price \\(y\\), in dollars. According to the data, which statement is true?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: 'Cutting boards with width greater than \\(48\\) cm have an average sale price of \\(\\$59.00\\).' },
      { label: 'B', text: 'Cutting boards with width greater than \\(48\\) cm have an average sale price of \\(\\$40.00\\).' },
      { label: 'C', text: 'Cutting boards with width between \\(18\\) and \\(48\\) cm have an average sale price of \\(\\$31.20\\).' },
      { label: 'D', text: 'Cutting boards with width between \\(18\\) and \\(48\\) cm have an average sale price of \\(\\$23.00\\).' },
    ],
    correctOption: 'D',
  },
  {
    id: 'qb22-17', skill: 'One-variable data', difficulty: 'Hard', domain: 'PSDA',
    passage: DATA_Q_TABLE,
    question: `<p>Data sets Q and R are summarized in the tables shown, where \\(a\\), \\(b\\), and \\(c\\) are positive, consecutive integers and \\(a < b < c\\). Which statement comparing the means of the data sets is true?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: 'The mean of data set R is \\(\\dfrac{2(11)}{14}\\) less than the mean of data set Q.' },
      { label: 'B', text: 'The mean of data set R is \\(\\dfrac{2(11)}{14}\\) greater than the mean of data set Q.' },
      { label: 'C', text: 'The mean of data set Q is \\(10\\) times the mean of data set R.' },
      { label: 'D', text: 'The means of the two data sets are equal.' },
    ],
    correctOption: 'B',
  },
  {
    id: 'qb22-18', skill: 'Area and volume', difficulty: 'Easy', domain: 'Geometry',
    passage: '',
    question: `<p>The length of one side of an equilateral triangle is \\(28\\) inches. What is the perimeter, in inches, of this triangle?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(28\\)' },
      { label: 'B', text: '\\(31\\)' },
      { label: 'C', text: '\\(84\\)' },
      { label: 'D', text: '\\(112\\)' },
    ],
    correctOption: 'C',
  },
  {
    id: 'qb22-19', skill: 'Lines, angles, and triangles', difficulty: 'Medium', domain: 'Geometry',
    passage: TRIANGLE_ABC_CDE,
    question: `<p>In the figure, \\(\\overline{AE}\\) intersects \\(\\overline{DB}\\) at point \\(C\\) and \\(\\overline{AB}\\) is parallel to \\(\\overline{DE}\\), creating triangles \\(ABC\\) and \\(CDE\\). If \\(x = 63\\) and \\(y = 2x - 47\\), what is the value of \\(z\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(38\\)' },
      { label: 'B', text: '\\(47\\)' },
      { label: 'C', text: '\\(63\\)' },
      { label: 'D', text: '\\(79\\)' },
    ],
    correctOption: 'A',
  },
  {
    id: 'qb22-20', skill: 'Right triangles and trigonometry', difficulty: 'Medium', domain: 'Geometry',
    passage: TRIANGLE_XYZ,
    question: `<p>In right triangle \\(XYZ\\) shown, angle \\(Y\\) is a right angle, \\(XY = 75\\), and \\(YZ = 560\\). If \\(\\cos Z = \\dfrac{560}{c}\\), what is the value of \\(c\\)?</p>`,
    type: 'spr',
    answers: ['565'],
  },
  {
    id: 'qb22-21', skill: 'Right triangles and trigonometry', difficulty: 'Hard', domain: 'Geometry',
    passage: TRIANGLE_QRS,
    question: `<p>In right triangle \\(QRS\\) shown, angle \\(R\\) is a right angle, \\(RS = 25\\), and \\(QR < RS\\). Which expression represents the length of \\(\\overline{QS}\\)?</p>`,
    type: 'mcq',
    options: [
      { label: 'A', text: '\\(25 \\cos Q\\)' },
      { label: 'B', text: '\\(25 \\sin Q\\)' },
      { label: 'C', text: '\\(\\dfrac{25}{\\cos Q}\\)' },
      { label: 'D', text: '\\(\\dfrac{25}{\\sin Q}\\)' },
    ],
    correctOption: 'D',
  },
  {
    id: 'qb22-22', skill: 'Circles', difficulty: 'Hard', domain: 'Geometry',
    passage: '',
    question: `<p>A circle has center \\(O\\), and points \\(A\\) and \\(U\\) lie on the circle. Line segments \\(AE\\) and \\(UE\\) are tangent to the circle at points \\(A\\) and \\(U\\), respectively. The distance between point \\(O\\) and point \\(E\\) is \\(510\\) centimeters and the distance between point \\(O\\) and point \\(U\\) is \\(78\\) centimeters. What is the area, in square centimeters, of quadrilateral \\(OAEU\\)?</p>`,
    type: 'spr',
    answers: ['39312'],
  },
];

function normalizeAnswer(s: string): string {
  return s.trim().replace(/\s+/g, '').toLowerCase();
}

function checkSPR(input: string, accepted: string[]): boolean {
  const norm = normalizeAnswer(input);
  if (accepted.some(a => normalizeAnswer(a) === norm)) return true;
  const n = parseFloat(input.replace(/,/g, ''));
  if (isNaN(n)) return false;
  return accepted.some(a => {
    const m = parseFloat(a.replace(/,/g, ''));
    return !isNaN(m) && Math.abs(n - m) < 0.001;
  });
}

function checkAnswer(q: Question, userAnswer: string): boolean {
  if (q.type === 'mcq') return userAnswer === q.correctOption;
  return checkSPR(userAnswer, q.answers ?? []);
}

export default function NovemberQB22Page() {
  const [phase, setPhase] = useState<Phase>('gate');
  const [accessCode, setAccessCode] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [gateError, setGateError] = useState('');
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');
  const [correctCount, setCorrectCount] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = accessCode.trim().toUpperCase();
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
          capacity_exceeded: 'This code has reached its limit.',
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

  const handleAnswer = useCallback((qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  }, []);

  const handleReveal = useCallback((qId: string) => {
    setRevealed(prev => ({ ...prev, [qId]: true }));
  }, []);

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < 1) { showToast('Solve at least 1 question before submitting.'); return; }
    setSubmitting(true);
    const correct = QUESTIONS.filter(q => checkAnswer(q, answers[q.id] ?? '')).length;
    setCorrectCount(correct);
    const questionResults = Object.fromEntries(
      QUESTIONS.map(q => [q.id, checkAnswer(q, answers[q.id] ?? '')])
    );
    try {
      await fetch('/api/practice/november-qb22/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramId, answers, correctCount: correct, totalCount: answeredCount, questionResults }),
      });
      setSubmitted(true);
      const updatedStats = await fetch(`/api/practice/stats?testId=${TEST_ID}`).then(r => r.json()).catch(() => null);
      if (updatedStats) setStats(updatedStats);
      setPhase('result');
    } catch {
      showToast('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Gate ── */
  if (phase === 'gate') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '48px 40px', width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>SuperfastSAT</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{TEST_LABEL}</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 1.6 }}>{TEST_DESC}</p>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 36 }}>Enter your access code and Instagram ID to begin</p>
          <form onSubmit={handleGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Access code" value={accessCode} onChange={e => setAccessCode(e.target.value)} required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <input type="text" placeholder="@instagram_id" value={instagramId} onChange={e => setInstagramId(e.target.value)} required
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#1e293b', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
            {gateError && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{gateError}</p>}
            <button type="submit" disabled={!accessCode.trim() || !instagramId.trim() || validating}
              style={{ width: '100%', padding: '13px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: !accessCode.trim() || !instagramId.trim() || validating ? 'not-allowed' : 'pointer', opacity: !accessCode.trim() || !instagramId.trim() || validating ? 0.4 : 1, marginTop: 4 }}>
              {validating ? 'Checking...' : 'Start Practice'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Leaderboard ── */
  if (phase === 'leaderboard') {
    const lb = stats?.leaderboard ?? [];
    const rankColor = (i: number) => i === 0 ? '#ffffff' : i === 1 ? '#a1a1aa' : i === 2 ? '#71717a' : '#3f3f46';
    const scoreColor = (i: number) => i === 0 ? '#6085FF' : i < 3 ? '#a1a1aa' : '#52525b';
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#09090b', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 400, padding: '36px 24px 20px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#6085FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>SuperfastSAT</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Leaderboard</h2>
          <p style={{ fontSize: 13, color: '#52525b', margin: '0 0 4px' }}>{TEST_LABEL}</p>
          <p style={{ fontSize: 12, color: '#3f3f46', margin: 0 }}>
            {lb.length > 0 ? `${lb.length} students completed this set` : 'No submissions yet. Be the first.'}
          </p>
        </div>
        <div style={{ width: '100%', maxWidth: 400, flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {lb.map((entry, i) => (
            <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12 }}>
              <span style={{ width: 22, fontSize: 11, fontWeight: 700, color: rankColor(i), textAlign: 'right', flexShrink: 0 }}>{entry.rank}</span>
              <span style={{ flex: 1, fontSize: 13, color: i < 3 ? '#e4e4e7' : '#52525b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.maskedId}</span>
              <span style={{ fontSize: 11, color: '#3f3f46', flexShrink: 0, marginRight: 8 }}>{entry.correctCount}/{entry.totalCount}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(i), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{entry.score}%</span>
            </div>
          ))}
          {lb.length === 0 && <div style={{ textAlign: 'center', color: '#3f3f46', paddingTop: 60, fontSize: 13 }}>No data</div>}
        </div>
        <div style={{ width: '100%', maxWidth: 400, padding: '20px 24px 32px', flexShrink: 0 }}>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#3f3f46', margin: '0 0 14px', letterSpacing: '0.02em' }}>Can you break into the top 3?</p>
          <button onClick={() => setPhase('test')}
            style={{ width: '100%', padding: '14px 0', background: '#071be9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}>
            Start →
          </button>
        </div>
      </div>
    );
  }

  /* ── Result ── */
  if (phase === 'result') {
    const lb = stats?.leaderboard ?? [];
    const myMasked = '@' + instagramId.replace(/^@/, '')[0] + '***';
    const myEntry = lb.find(e => e.maskedId === myMasked);
    const rankColor = (i: number) => i === 0 ? '#ffffff' : i === 1 ? '#a1a1aa' : i === 2 ? '#71717a' : '#3f3f46';
    const scoreColor = (i: number) => i === 0 ? '#6085FF' : i < 3 ? '#a1a1aa' : '#52525b';
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#09090b', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 400, padding: '28px 24px 16px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#6085FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>SuperfastSAT</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Your Result</h2>
          {myEntry ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)', borderRadius: 10, padding: '10px 20px', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: '#a1a1aa' }}>Rank</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#6085FF', letterSpacing: '-0.03em' }}>#{myEntry.rank}</span>
              <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{myEntry.score}%</span>
              <span style={{ fontSize: 12, color: '#52525b' }}>{myEntry.correctCount}/{myEntry.totalCount}</span>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)', borderRadius: 10, padding: '10px 20px', marginTop: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{correctCount} / {QUESTIONS.length}</span>
              <span style={{ fontSize: 14, color: '#a1a1aa' }}>{Math.round((correctCount / QUESTIONS.length) * 100)}%</span>
            </div>
          )}
        </div>
        <div style={{ width: '100%', maxWidth: 400, padding: '4px 24px 8px', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#27272a', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>— {lb.length} students —</div>
        </div>
        <div style={{ width: '100%', maxWidth: 400, flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {lb.map((entry, i) => {
            const isMe = entry.maskedId === myMasked;
            return (
              <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', padding: '11px 8px', borderRadius: isMe ? 8 : 0, marginBottom: isMe ? 2 : 0, borderBottom: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)', gap: 12, background: isMe ? 'rgba(96,133,255,0.1)' : 'transparent', border: isMe ? '1px solid rgba(96,133,255,0.25)' : undefined }}>
                <span style={{ width: 22, fontSize: 11, fontWeight: 700, color: isMe ? '#6085FF' : rankColor(i), textAlign: 'right', flexShrink: 0 }}>{entry.rank}</span>
                <span style={{ flex: 1, fontSize: 13, color: isMe ? '#c7d2fe' : i < 3 ? '#e4e4e7' : '#52525b', fontFamily: 'monospace', fontWeight: isMe ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.maskedId}{isMe && <span style={{ fontSize: 10, color: '#6085FF', marginLeft: 6 }}>← you</span>}
                </span>
                <span style={{ fontSize: 11, color: '#3f3f46', flexShrink: 0, marginRight: 8 }}>{entry.correctCount}/{entry.totalCount}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isMe ? '#6085FF' : scoreColor(i), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{entry.score}%</span>
              </div>
            );
          })}
        </div>
        <div style={{ width: '100%', maxWidth: 400, padding: '16px 24px 28px', flexShrink: 0 }}>
          <button onClick={() => setPhase('test')}
            style={{ width: '100%', padding: '13px 0', background: 'transparent', color: '#52525b', border: '1px solid #27272a', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  /* ── Test ── */
  const currentQ = QUESTIONS[currentIndex] ?? null;
  const isRevealed = currentQ ? !!revealed[currentQ.id] : false;
  const userAnswer = currentQ ? (answers[currentQ.id] ?? '') : '';
  const isCorrect = isRevealed && currentQ ? checkAnswer(currentQ, userAnswer) : false;
  const isWrong = isRevealed && !!userAnswer && !isCorrect;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === QUESTIONS.length - 1;
  const answeredCount = Object.keys(answers).filter(id => answers[id]).length;
  const totalCorrect = QUESTIONS.filter(q => checkAnswer(q, answers[q.id] ?? '')).length;

  const navStrip = (
    <div style={{ borderBottom: '1px solid #e5e7eb', overflowX: 'auto', background: '#f8fafc', flexShrink: 0, padding: '8px 16px' }}>
      <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
        {QUESTIONS.map((q, idx) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = idx === currentIndex;
          const domainColors: Record<string, string> = { RW: '#8b5cf6', Algebra: '#3b82f6', 'Advanced Math': '#0ea5e9', PSDA: '#f59e0b', Geometry: '#10b981' };
          return (
            <button key={q.id} onClick={() => setCurrentIndex(idx)}
              style={{
                width: 30, height: 30, borderRadius: 6,
                border: isCurrent ? `2px solid ${domainColors[q.domain] ?? '#1e293b'}` : '1px solid #e5e7eb',
                background: isCurrent ? (domainColors[q.domain] ?? '#1e293b') : isAnswered ? '#3b82f6' : '#fff',
                color: isCurrent || isAnswered ? '#fff' : '#94a3b8',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );

  const headerRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{answeredCount} / 22 &nbsp;({totalCorrect} correct)</span>
      <button onClick={handleSubmit} disabled={submitting || submitted || answeredCount < 1}
        style={{ padding: '6px 14px', background: submitted ? '#22c55e' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: submitted || submitting || answeredCount < 1 ? 'default' : 'pointer', opacity: answeredCount < 1 ? 0.4 : 1 }}>
        {submitted ? 'Submitted ✓' : submitting ? 'Submitting...' : 'Submit Results'}
      </button>
    </div>
  );

  const passageNode = currentQ?.passage && currentQ.passage.trim() ? (
    <div className="test-passage-content">
      <ContentRenderer content={currentQ.passage} />
    </div>
  ) : undefined;

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
      <BluebookPageShell
        sectionTitle={TEST_LABEL}
        headerRight={headerRight}
        navStrip={navStrip}
        passage={passageNode}
        onPrev={() => setCurrentIndex(i => i - 1)}
        prevHidden={isFirst}
        onNext={() => setCurrentIndex(i => i + 1)}
        nextDisabled={isLast}
        footerCenter={
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{currentIndex + 1} / {QUESTIONS.length}</span>
        }
      >
        {currentQ && (
          <BluebookQuestionUnit
            questionNumber={currentIndex + 1}
            question={<ContentRenderer content={currentQ.question} />}
            skill={currentQ.skill}
            difficulty={currentQ.difficulty}
            difficultyColor={DIFF_COLOR[currentQ.difficulty]}
            {...(currentQ.type === 'spr' ? {
              shortAnswer: userAnswer,
              onShortAnswer: (val) => handleAnswer(currentQ.id, val),
              shortAnswerPlaceholder: 'Enter answer',
              shortAnswerFeedback: isRevealed ? { isCorrect, correctAnswer: isWrong ? (currentQ.answers?.[0] ?? '') : undefined } : null,
            } : {
              options: currentQ.options,
              selectedAnswer: userAnswer,
              onSelect: (val: string) => {
                handleAnswer(currentQ.id, val);
                handleReveal(currentQ.id);
              },
              feedback: isRevealed && userAnswer ? { selectedLabel: userAnswer, correctLabel: currentQ.correctOption ?? '' } : null,
            })}
          >
            {currentQ.type === 'spr' && !isRevealed && userAnswer && (
              <button onClick={() => handleReveal(currentQ.id)}
                style={{ marginTop: 8, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1e293b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Check
              </button>
            )}
          </BluebookQuestionUnit>
        )}
      </BluebookPageShell>
    </>
  );
}
