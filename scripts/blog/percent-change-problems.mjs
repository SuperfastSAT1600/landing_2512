// 퍼센트 변화(greater / less / more than) 10문항 — 내부 학생용 포스트의 문제 데이터
// 출처: College Board QB Math(2026-04, 2026-07-30 PDF 정답·해설 확인), 10월 모의·11월 세트(정답은 직접 풀이)
// 지문은 시험 원문(영어), 해설은 한국어. 수식은 \( \) (블로그 MathJax).
const r = String.raw;

const QB_JUL = 'QB Math 2026-07-30';
const QB_APR = 'QB Math 2026-04';

export const PROBLEMS = [
  {
    id: '98818acf', source: QB_JUL, skill: 'Percentages', level: 'Hard', answer: '2.31',
    stem: r`The number of audiobooks in a library increased by \(131\%\) from last year to this year. The number of audiobooks in the library last year was \(n\), and the number of audiobooks in the library this year is \(bn\), where \(b\) and \(n\) are constants. What is the value of \(b\)?`,
    solution: r`\(131\%\) 증가는 원래 값에 \(131\%\)를 더한다는 뜻입니다. 올해 수는 \(n + 1.31n = 2.31n\)이고, 이것이 \(bn\)이므로 \(b = 2.31\)입니다. 증가는 \(\times(1 + r)\)로 읽으면 됩니다.`,
    trap: r`\(131\%\)를 소수로 바꾼 \(1.31\)을 그대로 \(b\)로 쓰는 실수입니다. \(1.31n\)은 늘어난 양일 뿐 올해 전체 수가 아닙니다.`,
  },
  {
    id: 'oct-f0945cc0', source: '10월 모의', skill: 'Percentages', answer: '1200',
    stem: r`\(234\) is \(p\%\) greater than \(18\). What is the value of \(p\)?`,
    solution: r`\(234 \div 18 = 13\)이므로 \(234\)는 \(18\)의 \(13\)배입니다. 그런데 "greater than"은 늘어난 양을 기준값으로 나눈 비율이라 \(13 - 1 = 12\)배, 즉 \(1200\%\)입니다. \(\frac{234 - 18}{18} \times 100 = 1200\)으로 확인할 수 있습니다.`,
    trap: r`\(13\)배를 곧바로 \(1300\)이라고 쓰는 실수입니다. \(1300\%\)는 "\(18\)의 \(1300\%\)가 \(234\)"일 때 맞는 값이고, "\(1200\%\) greater"가 같은 뜻입니다.`,
  },
  {
    id: '6feae9c3', source: QB_JUL, skill: 'Percentages', level: 'Hard', answer: 'C',
    stem: r`At a recreation center, visitors used the exercise room for a total of \(t\) hours in July. At the same recreation center, visitors used the exercise room for \(3.49t\) hours in August. What is the percent increase in the number of hours visitors used the exercise room from July to August?`,
    choices: [r`\(2.49\%\)`, r`\(3.49\%\)`, r`\(249\%\)`, r`\(349\%\)`],
    solution: r`늘어난 시간은 \(3.49t - t = 2.49t\)입니다. 기준은 처음 값인 \(t\)이므로 \(\frac{2.49t}{t} = 2.49\), 퍼센트로 \(249\%\)입니다.`,
    trap: r`D의 \(349\%\)는 8월이 7월의 \(349\%\)라는 뜻이라 증가율이 아닙니다. 증가율은 늘어난 양을 기준값으로 나눠야 하므로 \(1\)을 빼는 단계가 반드시 들어갑니다.`,
  },
  {
    id: 'nov-d2476aed', source: '11월 세트', skill: 'Nonlinear functions', answer: '8',
    stem: r`A laboratory culture of bacteria grows according to the model \(P(t) = 250(1.08)^{t}\), where \(t\) represents the elapsed time in hours. By what percentage does the population increase each hour?`,
    solution: r`\(t\)가 \(1\) 늘 때마다 \(P\)는 \(1.08\)배가 됩니다. \(1.08 = 1 + 0.08\)이므로 매시간 \(8\%\)씩 증가합니다.`,
    trap: r`\(1.08\)을 \(108\%\) 증가로 읽는 실수입니다. \(1.08\)은 "원래의 \(108\%\)"이고, 증가율은 \(1\)을 뺀 \(0.08\)입니다. \(250\)은 처음 값이라 증가율과 무관합니다.`,
  },
  {
    id: '58ba7239', source: QB_APR, skill: 'Percentages', level: 'Hard', answer: '302.4',
    stem: r`The number \(a\) is \(55\%\) less than the number \(b\). The number \(b\) is \(320\%\) greater than \(160\). What is the value of \(a\)?`,
    solution: r`\(b\)는 \(160\)보다 \(320\%\) greater이므로 \(b = 160 + 3.2(160) = 672\)입니다. \(a\)는 \(b\)보다 \(55\%\) less이므로 \(a = b - 0.55b = 0.45b\)이고, \(a = 0.45(672) = 302.4\)입니다.`,
    trap: r`\(320\%\) greater를 \(\times 3.2\)로 계산하면 \(b = 512\), \(a = 230.4\)가 됩니다. \(55\%\) less를 \(\times 0.55\)로 계산하면 \(a = 369.6\)입니다. greater는 \(\times(1 + r)\), less는 \(\times(1 - r)\)입니다.`,
  },
  {
    id: '28ff3966', source: QB_JUL, skill: 'Percentages', level: 'Hard', answer: 'B',
    stem: r`A square scale drawing has a side length of \(55\) inches, and \(1\) inch on the drawing represents an actual distance of \(19\) miles. A larger version of the same drawing is printed as a square with the side length \(65\%\) longer than the side length of the previous drawing. On the larger drawing, which of the following is closest to the actual distance, in miles, represented by \(1\) inch?`,
    choices: [r`\(6.65\)`, r`\(11.52\)`, r`\(31.35\)`, r`\(35.75\)`],
    solution: r`같은 도면을 확대한 것이라, 원래 도면의 \(1\) inch가 나타내던 \(19\) miles를 큰 도면에서는 \(1.65\) inches가 나타냅니다. 그래서 \(1\) inch는 \(\frac{19}{1.65} \approx 11.52\) miles입니다.`,
    trap: r`C의 \(31.35\)는 \(19 \times 1.65\), A의 \(6.65\)는 \(19 \times 0.35\), D의 \(35.75\)는 \(55 \times 0.65\)입니다. 도면이 커지면 \(1\) inch가 나타내는 거리는 커지는 게 아니라 줄어듭니다. \(55\) inches는 풀이에 쓰이지 않는 정보입니다.`,
  },
  {
    id: '8bb94668', source: QB_JUL, skill: 'Percentages', level: 'Hard', answer: 'D',
    stem: r`The speeds of objects A, B, and C are \(a\) meters per second, \(b\) meters per second, and \(c\) meters per second, respectively. If the speed of object A is \(5{,}900\%\) of the speed of object C and the speed of object C is \(0.008\%\) of the speed of object B, which expression represents the value of \(a + b\) in terms of \(c\)?`,
    choices: [r`\(1{,}840c\)`, r`\(5{,}908c\)`, r`\(6{,}025c\)`, r`\(12{,}559c\)`],
    solution: r`\(5{,}900\%\)는 \(59\)이므로 \(a = 59c\)입니다. \(0.008\%\)는 \(\frac{0.008}{100} = 0.00008\)이므로 \(c = 0.00008b\)이고, \(b = \frac{c}{0.00008} = 12{,}500c\)입니다. 따라서 \(a + b = 59c + 12{,}500c = 12{,}559c\)입니다.`,
    trap: r`\(0.008\%\)를 \(0.008\)로 바꾸는 실수가 가장 흔합니다. 퍼센트는 항상 \(100\)으로 나누고, 이미 소수인 퍼센트도 예외가 아닙니다. \(c\)가 \(b\)의 \(0.008\%\)라서 \(b\)는 \(c\)의 수만 배라는 점으로 답의 크기를 점검할 수 있습니다.`,
  },
  {
    id: '7bbfbe70', source: QB_JUL, skill: 'Nonlinear functions', level: 'Hard', answer: 'D',
    stem: r`A lab analyst observes a sample of a substance. An exponential model estimates that the mass, in grams, of the sample decreases by \(24\%\) every \(22.96\) minutes. Which of the following equations could represent this model, where \(M\) is the estimated mass, in grams, of the sample \(t\) minutes after the lab analyst began observing the sample?`,
    choices: [r`\(M = 100(0.24)^{t + 22.96}\)`, r`\(M = 100(0.24)^{\frac{t}{22.96}}\)`, r`\(M = 100(0.76)^{t + 22.96}\)`, r`\(M = 100(0.76)^{\frac{t}{22.96}}\)`],
    solution: r`\(24\%\) 감소는 \(\times(1 - 0.24) = \times 0.76\)입니다. \(22.96\)분마다 한 번씩 곱해지므로 곱하는 횟수는 \(\frac{t}{22.96}\)이고, \(M = 100(0.76)^{\frac{t}{22.96}}\)입니다.`,
    trap: r`A와 B는 줄어든 양 \(0.24\)를 밑으로 썼고, A와 C는 지수에 \(t + 22.96\)을 썼습니다. 밑은 "남는 비율", 지수는 "곱해진 횟수"입니다.`,
  },
  {
    id: 'oct-52d70e35', source: '10월 모의', skill: 'Nonlinear functions', answer: '44',
    stem: r`\(f(x) = 231(1.20)^{\frac{x}{4}}\)<br>For the given function \(f\), the value of \(f(x)\) increases by \(p\%\) for every increase of \(x\) by \(8\). What is the value of \(p\)?`,
    solution: r`\(x\)가 \(8\) 늘면 지수 \(\frac{x}{4}\)는 \(2\) 늘어납니다. 그래서 \(f(x)\)는 \(1.20^2 = 1.44\)배가 되고, \(p = 44\)입니다.`,
    trap: r`\(20\%\)가 두 번이니 \(40\%\)라고 더하는 실수입니다. 곱하기로 늘어나는 구조라 \(1.2 \times 1.2 = 1.44\)입니다. \(144\)를 그대로 쓰는 실수도 있습니다.`,
  },
  {
    id: 'oct-9fddfb77', source: '10월 모의', skill: 'Nonlinear functions', answer: '1952',
    stem: r`The function \(f(n) = 7(20.52)^{\frac{n}{4}}\) gives each term of a sequence as a function of the term's position, \(n\), where \(n\) is a whole number. The value of the term in position \(14\) is \(p\%\) more than the value of the term in position \(10\). What is the value of \(p\)?`,
    solution: r`위치가 \(10\)에서 \(14\)로 \(4\) 늘면 지수가 \(1\) 늘어나므로, 값은 \(20.52\)배가 됩니다. \(20.52\)배는 \(20.52 - 1 = 19.52\), 즉 \(1952\%\) more입니다.`,
    trap: r`\(20.52\)배를 \(2052\)로 바로 쓰는 실수입니다. 2번 문제와 같은 구조로, more than은 배율에서 \(1\)을 뺀 값입니다.`,
  },
];
