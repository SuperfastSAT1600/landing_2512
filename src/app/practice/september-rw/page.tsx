'use client';

import { useState, useCallback, useEffect } from 'react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';
import { useTestTimer } from '@/app/diagnosis/hooks/useTestTimer';

const TEST_ID = 'september-rw-final-14';
const TEST_LABEL = '9월 SAT RW 파이널 연습';
const TEST_DESC = '14문항 (4지선다)';

interface MCQOption {
  label: string;
  text: string;
}

interface Question {
  id: string;
  skill: string;
  difficulty: string;
  passage: string;
  question: string;
  options: MCQOption[];
  correctOption: string;
}

type Phase = 'gate' | 'leaderboard' | 'test' | 'result' | 'review';

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

const Q01_PASSAGE = `<p>Plants require nickel for growth, and some research suggests that they take up essential elements more readily than elements they do not need. On this account, soil polluted with nickel might appear particularly _____ to remediation using plants. A finding by Stephan Pauleit and colleagues complicates that expectation, however: plants accumulated cadmium, a nonessential element, faster than nickel. The team therefore advised checking for cadmium before attempting to remove nickel from soil in this way.</p>`;

const Q02_PASSAGE = `<p>Modern dingoes in eastern and western Australia form genetically distinct groups. A widespread explanation attributes the division to the dingo fence, built roughly 150 years ago to keep the animals away from livestock. Sally Wasef and her colleagues tested this account using DNA from dingo remains that predate the fence, including specimens thousands of years old. Their findings led them to reject the fence as the origin of the present genetic division.</p>`;

const Q03_PASSAGE = `<div style="margin-bottom:20px;">
  <p style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Text 1</p>
  <p>Natalie Arscott and colleagues investigated the value of blackberry plants (<em>Rubus fruticosus</em>) to foraging insects. During flowering, they documented roughly two thousand visits by insects, including <em>Cerceris rybyensis</em> and <em>Apis mellifera</em>. Observations took place from 11 a.m. to 4 p.m. and revealed a broad range of visiting species.</p>
</div>
<div>
  <p style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Text 2</p>
  <p>Max Anderson and colleagues used infrared equipment to compare daytime and nighttime pollination of <em>R. fruticosus</em>. Insect visits were predominantly diurnal: 83% occurred in daylight. Nevertheless, pollen deposition rates during nocturnal visits by moths were substantially higher. The findings address a gap created by the traditional emphasis on daytime pollinators.</p>
</div>`;

const Q04_PASSAGE = `<p>The asteroid 6478 Gault has repeatedly released material over a number of years. Heating by the Sun cannot readily account for the releases: unlike those of certain other asteroids, Gault's episodes do not occur when its orbit brings it nearest the Sun. A collision is also an unsatisfactory explanation, since a single impact would not account for recurring episodes of similar duration. The interpretation advanced by Jane X. Luu and colleagues is more persuasive: instability arising from the asteroid's rotation causes the shedding.</p>`;

const Q05_PASSAGE = `<p style="font-size:13px;font-weight:600;color:#475569;margin-bottom:10px;">Strontium isotope ratios by formation stage</p>
<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px;">
  <thead>
    <tr style="background:#f1f5f9;">
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;">Formation stage</th>
      <th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;font-weight:700;"><sup>87</sup>Sr/<sup>86</sup>Sr</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Core</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">0.71685</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Rim</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">0.71548</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">Matrix</td><td style="border:1px solid #cbd5e1;padding:8px 12px;text-align:center;">0.71416</td></tr>
  </tbody>
</table>
<p>A rock sample from Elba Island contains minerals that formed in three successive stages: the crystal core first, the rim second, and the surrounding matrix last. For the purpose of interpreting this sample, a strontium isotope ratio above 0.710 indicates a contribution from continental crust, with higher ratios indicating a stronger contribution. Values below 0.710 point instead toward a greater mantle contribution. A student reads the ratios in the table and concludes that, as the rock formed, _____.</p>`;

const Q06_PASSAGE = `<p>Sashiko, a Japanese stitching technique developed during the Edo period, served practical as well as decorative purposes. Its geometric designs could enliven a garment's appearance, while rows of closely spaced stitches could _____ worn textiles with resilience. The technique was used to repair fabric and strengthen it for further use.</p>`;

const Q07_PASSAGE = `<div style="margin-bottom:20px;">
  <p style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Text 1</p>
  <p>Field voles in parts of Finland are heavily preyed on by least weasels. Tero Klemola and colleagues temporarily reduced this predation and observed a substantial increase in vole numbers. Their result supports the ecological principle that predators regulate the abundance of their prey.</p>
</div>
<div>
  <p style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Text 2</p>
  <p>In a Quebec study by Michel Crête and Hélène Jolicoeur, keeping wolves away from an area did not significantly increase the number of moose there. Studies reporting increases after predator removal often examine small animals that reproduce quickly. Moose are larger and reproduce slowly, a difference that may help explain the contrasting outcome.</p>
</div>`;

const Q08_PASSAGE = `<p>Ground-penetrating radar can reveal where moisture has entered an old building: wet and dry masonry return contrasting signals. Yet the very water that makes a saturated area easy to locate can limit what the instrument reveals behind it. _____ water absorbs and scatters radar energy, so a clear image of a damp region may coexist with a poor image of defects deeper inside the wall.</p>`;

const Q09_PASSAGE = `<p style="font-size:13px;font-weight:600;color:#475569;margin-bottom:10px;">Economic Indicators of Goat Farms in France by Feeding System in 2018</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:16px;">
  <thead>
    <tr style="background:#f1f5f9;">
      <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;font-weight:700;">Feeding system</th>
      <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;font-weight:700;">Milk per goat (kg/yr)</th>
      <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;font-weight:700;">Milk revenue (€/goat/yr)</th>
      <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;font-weight:700;">Feeding cost (€/goat/yr)</th>
      <th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;font-weight:700;">Gross margin (€/goat/yr)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">Grazing</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">705</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">480.8</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">152.9</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">364</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">Fresh forage</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">860</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">617.5</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">248.5</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">364</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">Corn silage</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">931</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">653.6</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">220.6</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">456</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">Alfalfa hay</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">925</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">649.4</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">245.1</td><td style="border:1px solid #cbd5e1;padding:8px 10px;text-align:center;">423</td></tr>
  </tbody>
</table>
<p>A farmer in Northern Italy wants to select the feeding system likely to yield the largest profit. She examines the French Livestock Institute's 2018 comparison of French goat farms, shown in the table. Gross margin deducts certain costs, including feed, from total revenue; that revenue need not come entirely from milk. Before adopting the system with the highest reported margin, she considers whether its apparent advantage is likely to persist under other conditions.</p>`;

const Q10_PASSAGE = `<p>Goats have repeatedly been blamed for degraded landscapes. Researchers Cara Loomis and Carol Kerven question the causal reasoning behind such accounts, arguing that they _____. The animals' resilience allows them to persist where harsh conditions make survival difficult for other livestock. Their continued presence can therefore reflect deterioration produced by overcultivation or erosion, even as observers point to that presence as the explanation for the deterioration.</p>`;

const Q11_PASSAGE = `<p>Ancient Roman sumptuary laws, including the Lex Iulia sumptuaria, sought to curb competitive displays of wealth at lavish gatherings. Yet authorities rarely enforced these laws vigorously. Wealthy offenders could afford the fines, which they treated as a routine cost of privilege; moreover, penalties against prominent people were publicly announced. Historians suggest that restrained enforcement could actually have helped officials avoid frustrating the laws' purpose, because _____.</p>`;

const Q12_PASSAGE = `<ul style="list-style:disc;padding-left:20px;font-size:14px;line-height:1.8;color:#1e293b;">
  <li>Early Shinkansen trains generated pressure waves that produced loud booms as the trains emerged from tunnels.</li>
  <li>Engineer Eiji Nakatsu observed that a kingfisher enters water quickly with very little splash.</li>
  <li>The bird's beak broadens gradually from its tip toward its head, enabling a smooth transition between air and water.</li>
  <li>Engineers modeled a redesigned train nose on this gradually widening shape.</li>
  <li>The new shape improved the transition from tunnel to open air and reduced pressure buildup, eliminating the booms.</li>
</ul>`;

const Q13_PASSAGE = `<p>Research by Raj Desai and colleagues links stronger democratic institutions with reduced inflationary pressures. A comparison from 2017 runs against this general tendency: Belgium, with relatively strong institutions, had inflation of 2.12%, whereas Equatorial Guinea, with weaker institutions, had inflation of 0.74%. Relative to the pattern the researchers identified, the comparison is therefore _____.</p>`;

const Q14_PASSAGE = `<p>During the wave of stock market liberalizations that included South Korea's in 1987, several countries began permitting foreign investment in domestic companies. Research by Ross Levine and Sara Zervos found no enduring rise in corporate investment following liberalization. Peter Blair Henry, by contrast, reported substantial average increases during the first three years after such changes. These results need not conflict: together, they suggest that liberalization _____.</p>`;

const QUESTIONS: Question[] = [
  {
    id: 'sep-rw-01', skill: 'Words in Context', difficulty: 'Medium',
    passage: Q01_PASSAGE,
    question: '<p>Which choice completes the text with the most logical and precise word or phrase?</p>',
    options: [
      { label: 'A', text: 'impervious' },
      { label: 'B', text: 'amenable' },
      { label: 'C', text: 'incidental' },
      { label: 'D', text: 'injurious' },
    ],
    correctOption: 'B',
  },
  {
    id: 'sep-rw-02', skill: 'Command of Evidence', difficulty: 'Hard',
    passage: Q02_PASSAGE,
    question: '<p>Which finding would most directly support the researchers\' rejection of this explanation?</p>',
    options: [
      { label: 'A', text: 'Dingoes living about 2,000 years ago already exhibited the broad geographic genetic structure found in dingoes today.' },
      { label: 'B', text: 'Dingo remains more than 3,000 years old were recovered from both eastern and western Australia.' },
      { label: 'C', text: 'The fence prevented many dingoes from entering areas where livestock were raised.' },
      { label: 'D', text: 'Some dingoes on each side of the fence share ancestry with a related canid species.' },
    ],
    correctOption: 'A',
  },
  {
    id: 'sep-rw-03', skill: 'Cross-text Connections', difficulty: 'Hard',
    passage: Q03_PASSAGE,
    question: '<p>How would the author of Text 2 most likely assess the study described in Text 1?</p>',
    options: [
      { label: 'A', text: 'Its records probably classified some nighttime interactions as daytime ones, distorting the relative frequency of the two.' },
      { label: 'B', text: 'Its observation schedule may have left out a group of interactions that is important to the plants\' pollination.' },
      { label: 'C', text: 'Its selection of a single plant species makes its findings incompatible with the results reported in Text 2.' },
      { label: 'D', text: 'Its relatively large number of recorded visits makes it unlikely that any pollinator group with a major effect was overlooked.' },
    ],
    correctOption: 'B',
  },
  {
    id: 'sep-rw-04', skill: 'Text Structure and Purpose', difficulty: 'Medium',
    passage: Q04_PASSAGE,
    question: '<p>Which choice best describes the organization of the text?</p>',
    options: [
      { label: 'A', text: 'A recurring event is introduced, two accounts of it are rejected, and a third is endorsed as a reasonable explanation.' },
      { label: 'B', text: 'A recurring event is introduced, two accounts of it are reconciled, and a combined explanation is proposed.' },
      { label: 'C', text: 'Two competing theories are outlined, and measurements are reported that conclusively establish a third.' },
      { label: 'D', text: 'An observation is contrasted with earlier reports, and the reliability of those reports is called into question.' },
    ],
    correctOption: 'A',
  },
  {
    id: 'sep-rw-05', skill: 'Command of Evidence (Quantitative)', difficulty: 'Hard',
    passage: Q05_PASSAGE,
    question: '<p>Which choice most effectively uses the data to complete the text?</p>',
    options: [
      { label: 'A', text: 'the crustal contribution strengthened continuously' },
      { label: 'B', text: 'the magma shifted completely from a crustal source to a mantle source' },
      { label: 'C', text: 'the contribution of crustal material remained unchanged' },
      { label: 'D', text: 'the crustal contribution weakened without disappearing' },
    ],
    correctOption: 'D',
  },
  {
    id: 'sep-rw-06', skill: 'Words in Context', difficulty: 'Easy',
    passage: Q06_PASSAGE,
    question: '<p>Which choice completes the text with the most logical and precise word or phrase?</p>',
    options: [
      { label: 'A', text: 'imbue' },
      { label: 'B', text: 'depict' },
      { label: 'C', text: 'regale' },
      { label: 'D', text: 'belie' },
    ],
    correctOption: 'A',
  },
  {
    id: 'sep-rw-07', skill: 'Cross-text Connections', difficulty: 'Hard',
    passage: Q07_PASSAGE,
    question: '<p>How would the author of Text 2 most likely assess the principle described in Text 1?</p>',
    options: [
      { label: 'A', text: 'It is well supported, provided that studies exclude large predators such as wolves.' },
      { label: 'B', text: 'It has little evidential basis because predator-removal experiments generally use unreliable methods.' },
      { label: 'C', text: 'It is supported in some settings, but the characteristics of the prey may limit where it applies.' },
      { label: 'D', text: 'It is equally applicable to moose and voles, although the relevant studies have not yet been conducted.' },
    ],
    correctOption: 'C',
  },
  {
    id: 'sep-rw-08', skill: 'Transitions', difficulty: 'Medium',
    passage: Q08_PASSAGE,
    question: '<p>Which choice completes the text with the most logical transition?</p>',
    options: [
      { label: 'A', text: 'Nevertheless,' },
      { label: 'B', text: 'Consequently,' },
      { label: 'C', text: 'Indeed,' },
      { label: 'D', text: 'Similarly,' },
    ],
    correctOption: 'C',
  },
  {
    id: 'sep-rw-09', skill: 'Command of Evidence (Quantitative)', difficulty: 'Hard',
    passage: Q09_PASSAGE,
    question: '<p>Which finding, if true, would most directly give the farmer reason to question the apparent advantage of that system?</p>',
    options: [
      { label: 'A', text: 'Suitable grazing land is less readily available in Northern Italy than in the French regions represented in the comparison, potentially making grazing more expensive.' },
      { label: 'B', text: 'The corn-silage ration commonly includes soybean meal, whose price can vary substantially from one year to the next, exposing the system to changes in feed costs.' },
      { label: 'C', text: 'Corn silage can be preserved for extended periods, making its availability less dependent on seasonal grazing conditions.' },
      { label: 'D', text: 'Goats fed alfalfa hay produce nearly as much milk as those fed corn silage, even though their reported gross margin is lower.' },
    ],
    correctOption: 'B',
  },
  {
    id: 'sep-rw-10', skill: 'Inferences', difficulty: 'Hard',
    passage: Q10_PASSAGE,
    question: '<p>In context, which choice best completes the main argument presented in the text?</p>',
    options: [
      { label: 'A', text: 'can mistake an unusually destructive herd for evidence about all goats' },
      { label: 'B', text: 'can rely on secondhand reports instead of observations of damaged land' },
      { label: 'C', text: 'can minimize the degree to which goats compete with other livestock' },
      { label: 'D', text: 'can treat a consequence of environmental decline as its source' },
    ],
    correctOption: 'D',
  },
  {
    id: 'sep-rw-11', skill: 'Inferences', difficulty: 'Hard',
    passage: Q11_PASSAGE,
    question: '<p>Which choice most logically completes the text?</p>',
    options: [
      { label: 'A', text: 'fines imposed on wealthy offenders were smaller than those imposed on poorer citizens' },
      { label: 'B', text: 'the laws were intended to raise public revenue rather than discourage status competition' },
      { label: 'C', text: 'widely publicized penalties could themselves advertise an offender\'s ability to spend lavishly' },
      { label: 'D', text: 'public announcements prevented affluent offenders from treating fines as affordable costs' },
    ],
    correctOption: 'C',
  },
  {
    id: 'sep-rw-12', skill: 'Rhetorical Synthesis', difficulty: 'Easy',
    passage: Q12_PASSAGE,
    question: '<p>The student wants to explain the mechanism by which the redesigned nose solved the noise problem. Which choice most effectively uses relevant information from the notes to accomplish this goal?</p>',
    options: [
      { label: 'A', text: 'Nakatsu became interested in redesigning the train after watching a kingfisher enter water with little splash.' },
      { label: 'B', text: 'A nose that widened gradually, like a kingfisher\'s beak, eased the train\'s passage from tunnel to open air, reducing the pressure buildup responsible for the booms.' },
      { label: 'C', text: 'The redesigned train copied the kingfisher\'s movement between air and water, allowing it to travel through tunnels more quickly.' },
      { label: 'D', text: 'Kingfishers have beaks that gradually broaden toward their heads, and Shinkansen trains operate at high speeds.' },
    ],
    correctOption: 'B',
  },
  {
    id: 'sep-rw-13', skill: 'Words in Context', difficulty: 'Easy',
    passage: Q13_PASSAGE,
    question: '<p>Which choice completes the text with the most logical and precise word or phrase?</p>',
    options: [
      { label: 'A', text: 'unsubstantiated' },
      { label: 'B', text: 'inevitable' },
      { label: 'C', text: 'indecipherable' },
      { label: 'D', text: 'anomalous' },
    ],
    correctOption: 'D',
  },
  {
    id: 'sep-rw-14', skill: 'Inferences', difficulty: 'Hard',
    passage: Q14_PASSAGE,
    question: '<p>Which choice most logically completes the text?</p>',
    options: [
      { label: 'A', text: 'can be associated with an initial investment boost that is not sustained over the longer term' },
      { label: 'B', text: 'usually begins increasing investment only after the first three years have passed' },
      { label: 'C', text: 'produces more stable investment growth than any alternative economic policy' },
      { label: 'D', text: 'has no effect on investment at any point following its introduction' },
    ],
    correctOption: 'A',
  },
];

function checkAnswer(q: Question, input: string): boolean {
  return input.trim().toUpperCase() === q.correctOption;
}

export default function SeptemberRWPage() {
  const [phase, setPhase] = useState<Phase>('gate');
  const [accessCode, setAccessCode] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [gateError, setGateError] = useState('');
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [crossedOut, setCrossedOut] = useState<Record<string, Set<string>>>({});

  const timer = useTestTimer(15, phase === 'test' && !submitted);

  useEffect(() => {
    if (timer.remaining === 0 && phase === 'test' && !submitting && !submitted) {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.remaining]);

  const toggleCrossOut = useCallback((qId: string, label: string) => {
    setCrossedOut(prev => {
      const set = new Set(prev[qId] ?? []);
      set.has(label) ? set.delete(label) : set.add(label);
      return { ...prev, [qId]: set };
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = accessCode.trim().toUpperCase();
    const cleanIg = instagramId.trim().replace(/^@+/, '');
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

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    const answeredCount = Object.keys(answers).filter(id => answers[id]).length;
    if (answeredCount < 1) { showToast('Solve at least 1 question before submitting.'); return; }

    setSubmitting(true);
    const correct = QUESTIONS.filter(q => checkAnswer(q, answers[q.id] ?? '')).length;
    setCorrectCount(correct);

    const questionResults = Object.fromEntries(
      QUESTIONS.map(q => [q.id, checkAnswer(q, answers[q.id] ?? '')])
    );

    try {
      await fetch('/api/practice/september-rw/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramId,
          answers,
          correctCount: correct,
          totalCount: answeredCount,
          questionResults,
        }),
      });
      setSubmitted(true);
      setPhase('result');

      fetch(`/api/practice/stats?testId=${TEST_ID}`).then(r => r.json()).then(data => { if (data) setStats(data); }).catch(() => null);
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
            <input type="text" placeholder="instagram_id (@ 없이 입력)" value={instagramId} onChange={e => setInstagramId(e.target.value)} required
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
              <span style={{ flex: 1, fontSize: 13, color: i < 3 ? '#e4e4e7' : '#52525b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.maskedId}
              </span>
              <span style={{ fontSize: 11, color: '#3f3f46', flexShrink: 0, marginRight: 8 }}>{entry.correctCount}/{entry.totalCount}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(i), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{entry.score}%</span>
            </div>
          ))}
          {lb.length === 0 && <div style={{ textAlign: 'center', color: '#3f3f46', paddingTop: 60, fontSize: 13 }}>No data</div>}
        </div>

        <div style={{ width: '100%', maxWidth: 400, padding: '20px 24px 32px', flexShrink: 0 }}>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#3f3f46', margin: '0 0 14px', letterSpacing: '0.02em' }}>
            Can you break into the top 3?
          </p>
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
    const rankColor = (i: number) => i === 0 ? '#ffffff' : i === 1 ? '#c0c0c0' : i === 2 ? '#a0a0a0' : '#71717a';
    const scoreColor = (i: number) => i === 0 ? '#6085FF' : i < 3 ? '#c0c0c0' : '#a1a1aa';
    const percentile = myEntry && lb.length > 0
      ? Math.round((1 - (myEntry.rank - 1) / lb.length) * 100)
      : null;
    const myScore = myEntry ? myEntry.score : Math.round((correctCount / QUESTIONS.length) * 100);
    const myCorrect = myEntry ? myEntry.correctCount : correctCount;
    const myTotal = myEntry ? myEntry.totalCount : QUESTIONS.length;
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#09090b', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '24px 24px 0', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#6085FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>SuperfastSAT</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#a1a1aa', margin: '0 0 12px', letterSpacing: '-0.02em' }}>Your Result</h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, width: '100%', background: 'rgba(96,133,255,0.1)', border: '1px solid rgba(96,133,255,0.35)', borderRadius: 14, padding: '16px 24px' }}>
            {myEntry ? (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#6085FF', fontWeight: 600, marginBottom: 2 }}>Rank</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#6085FF', letterSpacing: '-0.04em', lineHeight: 1 }}>#{myEntry.rank}</div>
                </div>
                <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.1)' }} />
              </>
            ) : null}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600, marginBottom: 2 }}>Score</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{myScore}%</div>
            </div>
            <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600, marginBottom: 2 }}>Correct</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{myCorrect}<span style={{ fontSize: 18, color: '#52525b' }}>/{myTotal}</span></div>
            </div>
          </div>

          {percentile !== null && (
            <div style={{ margin: '10px 0 0', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#6085FF', fontWeight: 700 }}>상위 {percentile}%</span>
                <span style={{ fontSize: 11, color: '#3f3f46' }}>{lb.length}명 중 #{myEntry!.rank}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${percentile}%`, background: 'linear-gradient(90deg, #3b5bdb, #6085FF)', borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}

          <button
            onClick={() => { setCurrentIndex(0); setPhase('review'); }}
            style={{ display: 'block', width: '100%', margin: '10px 0 0', padding: '14px 0', background: '#6085FF', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            틀린 문제 리뷰하기 →
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 480, padding: '8px 24px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 11, color: '#3f3f46', fontWeight: 600, letterSpacing: '0.08em' }}>{lb.length} students</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 480, flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {lb.map((entry, i) => {
            const isMe = entry.maskedId === myMasked;
            return (
              <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', padding: '13px 12px', borderRadius: isMe ? 10 : 0, marginBottom: isMe ? 2 : 0, borderBottom: isMe ? 'none' : '1px solid rgba(255,255,255,0.06)', gap: 14, background: isMe ? 'rgba(96,133,255,0.1)' : 'transparent', border: isMe ? '1px solid rgba(96,133,255,0.25)' : undefined }}>
                <span style={{ width: 28, fontSize: 15, fontWeight: 700, color: isMe ? '#6085FF' : rankColor(i), textAlign: 'right', flexShrink: 0 }}>{entry.rank}</span>
                <span style={{ flex: 1, fontSize: 15, color: isMe ? '#c7d2fe' : i < 3 ? '#e4e4e7' : '#a1a1aa', fontFamily: 'monospace', fontWeight: isMe ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.maskedId}{isMe && <span style={{ fontSize: 11, color: '#6085FF', marginLeft: 8 }}>← you</span>}
                </span>
                <span style={{ fontSize: 13, color: '#52525b', flexShrink: 0, marginRight: 4 }}>{entry.correctCount}/{entry.totalCount}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: isMe ? '#6085FF' : scoreColor(i), flexShrink: 0, minWidth: 46, textAlign: 'right' }}>{entry.score}%</span>
              </div>
            );
          })}
        </div>

        <div style={{ width: '100%', maxWidth: 480, padding: '12px 24px 24px', flexShrink: 0 }}>
          <button onClick={() => setPhase('test')}
            style={{ width: '100%', padding: '13px 0', background: 'transparent', color: '#3f3f46', border: '1px solid #27272a', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  /* ── Review ── */
  if (phase === 'review') {
    const wrongQuestions = QUESTIONS.filter(q => !checkAnswer(q, answers[q.id] ?? ''));
    const reviewIndex = Math.min(currentIndex, Math.max(0, wrongQuestions.length - 1));
    const rq = wrongQuestions[reviewIndex] ?? null;
    const rAnswer = rq ? (answers[rq.id] ?? '') : '';
    const rIsFirst = reviewIndex === 0;
    const rIsLast = reviewIndex === wrongQuestions.length - 1;

    if (wrongQuestions.length === 0) {
      return (
        <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Perfect Score!</p>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>No wrong answers to review.</p>
            <button onClick={() => setPhase('result')} style={{ padding: '10px 24px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Back to Results
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
        <div style={{ height: 52, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Review — 틀린 문제</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>{reviewIndex + 1} / {wrongQuestions.length}</span>
            <button onClick={() => setPhase('result')}
              style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ← Results
            </button>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #e5e7eb', overflowX: 'auto', background: '#f8fafc', flexShrink: 0, padding: '8px 16px' }}>
          <div className="test-nav-grid" style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
            {wrongQuestions.map((q, i) => (
              <button key={q.id} onClick={() => setCurrentIndex(i)}
                className={`test-nav-dot ${i === reviewIndex ? 'current' : 'answered'}`}>
                {QUESTIONS.indexOf(q) + 1}
              </button>
            ))}
          </div>
        </div>

        {rq && (
          <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
            {rq.passage.trim() ? (
              <>
                <div className="test-passage-panel">
                  <div style={{ padding: '24px 28px 24px 24px' }}>
                    <div className="test-passage-content">
                      <ContentRenderer content={rq.passage} />
                    </div>
                  </div>
                </div>
                <div className="test-resizer" />
              </>
            ) : null}

            <div className="test-question-panel" style={rq.passage.trim() ? {} : { flex: 1 }}>
              <div style={{ padding: '24px', maxWidth: 680, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: '#1e293b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0 }}>
                    {QUESTIONS.indexOf(rq) + 1}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                    {rq.skill}
                  </span>
                </div>

                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}>
                  <ContentRenderer content={rq.question} />
                </div>

                <div className="space-y-3" style={{ marginBottom: 16 }}>
                  {rq.options.map(opt => {
                    const isThisCorrect = opt.label === rq.correctOption;
                    const isThisWrong = opt.label === rAnswer && !isThisCorrect;
                    return (
                      <div key={opt.label} className="flex items-center gap-2">
                        <button type="button" disabled className="bluebook-option"
                          style={isThisCorrect ? { borderColor: '#22c55e', background: '#f0fdf4' } : isThisWrong ? { borderColor: '#ef4444', background: '#fef2f2' } : {}}>
                          <span className="bluebook-option-label"
                            style={isThisCorrect ? { background: '#22c55e', borderColor: '#22c55e', color: '#fff' } : isThisWrong ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}}>
                            {opt.label}
                          </span>
                          <span className="bluebook-option-text">
                            <ContentRenderer content={opt.text} />
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: '14px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, marginTop: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>✗ Incorrect</p>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                    Answer: <strong>({rq.correctOption}) {rq.options.find(o => o.label === rq.correctOption)?.text}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bluebook-footer" style={{ flexShrink: 0 }}>
          <button onClick={() => setCurrentIndex(reviewIndex - 1)} disabled={rIsFirst}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, cursor: rIsFirst ? 'not-allowed' : 'pointer', opacity: rIsFirst ? 0.4 : 1, color: '#374151' }}>
            Back
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{reviewIndex + 1} / {wrongQuestions.length}</span>
          <button className="bluebook-next-btn btn-press" onClick={() => setCurrentIndex(reviewIndex + 1)}
            disabled={rIsLast} style={{ opacity: rIsLast ? 0.4 : 1, cursor: rIsLast ? 'not-allowed' : 'pointer' }}>
            Next
          </button>
        </div>
      </div>
    );
  }

  /* ── Test ── */
  const currentQuestion = QUESTIONS[currentIndex] ?? null;
  const userAnswer = currentQuestion ? (answers[currentQuestion.id] ?? '') : '';
  const isRevealed = submitted;
  const isCorrect = isRevealed && checkAnswer(currentQuestion!, userAnswer);
  const isWrong = isRevealed && !!userAnswer && !checkAnswer(currentQuestion!, userAnswer);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === QUESTIONS.length - 1;
  const answeredCount = Object.keys(answers).filter(id => answers[id]).length;

  return (
    <div style={{ height: 'calc(100vh - 56px)', marginTop: 56, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ height: 52, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{TEST_LABEL}</span>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {timer.remaining !== null && (
            <span className={`bluebook-timer ${timer.isWarning ? 'warning' : ''} ${timer.isDanger ? 'danger' : ''}`}>
              {timer.format(timer.remaining)}
            </span>
          )}
        </div>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>{answeredCount} / {QUESTIONS.length}</span>
      </div>

      <div style={{ borderBottom: '1px solid #e5e7eb', overflowX: 'auto', background: '#f8fafc', flexShrink: 0, padding: '8px 16px' }}>
        <div className="test-nav-grid" style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
          {QUESTIONS.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = idx === currentIndex;
            return (
              <button key={q.id} onClick={() => setCurrentIndex(idx)}
                className={`test-nav-dot ${isCurrent ? 'current' : isAnswered ? 'answered' : ''}`}>
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {currentQuestion && (
        <div className="test-layout" style={{ flex: 1, overflow: 'hidden' }}>
          {currentQuestion.passage.trim() ? (
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

          <div className="test-question-panel" style={currentQuestion.passage.trim() ? {} : { flex: 1 }}>
            <div style={{ padding: '24px', maxWidth: 680, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: '#1e293b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0 }}>
                  {currentIndex + 1}
                </span>
                <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                  {currentQuestion.skill}
                </span>
              </div>

              <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, marginBottom: 20, color: '#1e293b' }}>
                <ContentRenderer content={currentQuestion.question} />
              </div>

              <div className="space-y-3" style={{ marginBottom: 16 }}>
                {currentQuestion.options.map(opt => {
                  const isSelected = userAnswer === opt.label;
                  const isCrossed = crossedOut[currentQuestion.id]?.has(opt.label);
                  const isThisCorrect = isRevealed && opt.label === currentQuestion.correctOption;
                  const isThisWrong = isRevealed && isSelected && opt.label !== currentQuestion.correctOption;
                  return (
                    <div key={opt.label} className="flex items-center gap-2">
                      {!isRevealed && (
                        <button type="button" onClick={() => toggleCrossOut(currentQuestion.id, opt.label)}
                          className={`bluebook-option-crossout btn-press ${isCrossed ? 'active' : ''}`} title="Cross out">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                      <button type="button"
                        onClick={() => !isRevealed && handleAnswer(currentQuestion.id, opt.label)}
                        className={`bluebook-option btn-press ${isSelected && !isRevealed ? 'selected' : ''} ${isCrossed && !isSelected ? 'crossedout' : ''}`}
                        style={isThisCorrect ? { borderColor: '#22c55e', background: '#f0fdf4' } : isThisWrong ? { borderColor: '#ef4444', background: '#fef2f2' } : {}}>
                        <span className="bluebook-option-label"
                          style={isThisCorrect ? { background: '#22c55e', borderColor: '#22c55e', color: '#fff' } : isThisWrong ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}}>
                          {opt.label}
                        </span>
                        <span className="bluebook-option-text">
                          <ContentRenderer content={opt.text} />
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {isRevealed && (
                <div style={{ padding: '14px 16px', background: isCorrect ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isCorrect ? '#86efac' : '#fca5a5'}`, borderRadius: 10, marginTop: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: isCorrect ? '#15803d' : '#dc2626', marginBottom: isWrong ? 4 : 0 }}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </p>
                  {isWrong && (
                    <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                      Answer: <strong>({currentQuestion.correctOption}) {currentQuestion.options.find(o => o.label === currentQuestion.correctOption)?.text}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bluebook-footer" style={{ flexShrink: 0 }}>
        <button onClick={() => !isFirst && setCurrentIndex(i => i - 1)} disabled={isFirst}
          style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1, color: '#374151' }}>
          Back
        </button>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{currentIndex + 1} / {QUESTIONS.length}</span>
        {isLast && answeredCount === QUESTIONS.length && !submitted ? (
          <button onClick={handleSubmit} disabled={submitting}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Submitting...' : 'Submit Results'}
          </button>
        ) : (
          <button className="bluebook-next-btn btn-press" onClick={() => !isLast && setCurrentIndex(i => i + 1)}
            disabled={isLast} style={{ opacity: isLast ? 0.4 : 1, cursor: isLast ? 'not-allowed' : 'pointer' }}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
