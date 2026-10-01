export interface Problem {
  id: string;
  coach: string;
  index: number;
  section: 'Math' | 'RW';
  title: string;
  skill: string;
  difficulty: string;
  isGridIn: boolean;
  passage?: PassageTable | PassageText | PassageTwoTexts;
  question: string;
  statements?: string[];
  choices?: { A: string; B: string; C?: string; D?: string };
  correctAnswer: string;
  reason: string;
}

export interface PassageTable {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface PassageText {
  type: 'text';
  paragraphs: string[];
}

export interface PassageTwoTexts {
  type: 'two-texts';
  text1: string;
  text2: string;
}

export interface Coach {
  id: string;
  name: string;
  tagline: string;
  problems: Problem[];
}

export const coaches: Coach[] = [
  {
    id: 'brandon',
    name: 'Brandon',
    tagline: '그림을 주지 않거나 새로 등장한 유형 위주 — 9월에 처음 나왔거나 예상 정답률 35% 이하',
    problems: [
      {
        id: 'brandon-1',
        coach: 'Brandon',
        index: 1,
        section: 'Math',
        title: 'Similar triangles without a figure',
        skill: 'Lines, angles, and triangles',
        difficulty: '35%',
        isGridIn: false,
        question:
          'In isosceles triangle $ABC$, $AB = AC$. Point $D$ lies on segment $\\overline{BC}$ such that $BD = \\frac{3}{4}BC$. Points $E$ and $F$ lie on segments $\\overline{AB}$ and $\\overline{AC}$, respectively. If $\\angle BED \\cong \\angle CFD$ and $BE = 12$, what is the length of $CF$?',
        choices: { A: '4', B: '16', C: '72', D: '96' },
        correctAnswer: 'B',
        reason:
          '그림을 주지 않는 기하 문항입니다. 조건만 글로 주고 도형은 학생이 직접 그려야 합니다. 그려 놓으면 이등변삼각형 밑각과 AA 닮음으로 풀리지만, $BD = \\frac{3}{4}BC$를 닮음비로 그대로 쓰면 틀립니다. 닮음비는 $BD : CD = 3 : 1$이라는 것을 그림 없이 잡아야 합니다. 이 방식의 기하 문항이 9월에 여럿 나왔고 10월에도 이어질 가능성이 높습니다.',
      },
      {
        id: 'brandon-2',
        coach: 'Brandon',
        index: 2,
        section: 'Math',
        title: 'Quadratic model after outlier removal',
        skill: 'Two-variable data: Models and scatterplots',
        difficulty: '27%',
        isGridIn: false,
        question:
          'A scatterplot shows 9 data points and the quadratic model $y = 0.19x^2 - 1.24x + 7.57$. The data point at $x = 0$ was identified as a recording error and removed. If the new best-fit quadratic model for the remaining data is $y = ax^2 + bx + c$, which of the following must be true?',
        statements: ['$a > 0.19$', '$c < 7.57$'],
        choices: { A: 'I only', B: 'II only', C: 'Both I and II', D: 'Neither' },
        correctAnswer: 'B',
        reason:
          '9월 수학에서 예상 정답률이 가장 낮은 축에 속한 문항입니다. 계산이 아니라 계수가 어느 방향으로 움직이는지 추론해야 합니다. $c$가 $x = 0$에서의 모델 값이라는 것을 떠올리면 II는 빠르게 판단됩니다. 점 하나를 빼면 곡선이 더 많이 휜다고 착각해 I까지 참으로 고르는 C 함정이 설계되어 있습니다.',
      },
      {
        id: 'brandon-3',
        coach: 'Brandon',
        index: 3,
        section: 'Math',
        title: 'Similar cylinders — surface area to volume',
        skill: 'Area and volume',
        difficulty: '30%',
        isGridIn: true,
        question:
          "Cylinders $A$ and $B$ are similar right circular cylinders. The total surface area of cylinder $A$ is $486\\pi$ cm² and its height equals its diameter. The ratio of the diameter of $A$ to the diameter of $B$ is 3 to 4. If the volume of cylinder $B$ is $k\\pi$ cm³, what is the value of $k$?",
        correctAnswer: '3456',
        reason:
          '겉넓이 → 반지름 → 닮음비 → 부피까지 세 단계를 이어가야 합니다. 각 단계에 실수 포인트가 하나씩 있습니다. 밑면 두 개를 빠뜨리거나, 닮음비를 부피에 세제곱하지 않으면 틀립니다. 단답형이라 보기로 검산도 할 수 없습니다.',
      },
      {
        id: 'brandon-4',
        coach: 'Brandon',
        index: 4,
        section: 'RW',
        title: 'Table + hypothesis support (new question type)',
        skill: 'Command of Evidence (Quantitative)',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'table',
          headers: ['Species', 'Family', 'Habitat', 'Preferred substrate', 'Frontation angle (°)'],
          rows: [
            ['Vulpes macrotis', 'Canidae', 'open', 'terrestrial', '54.14'],
            ['Nyctereutes procyonoides', 'Canidae', 'closed', 'arboreal', '56.51'],
            ['Leptailurus serval', 'Felidae', 'open', 'terrestrial', '65.80'],
            ['Leopardus wiedii', 'Felidae', 'closed', 'arboreal', '67.61'],
            ['Leopardus guigna', 'Felidae', 'closed', 'terrestrial', '67.90'],
          ],
        },
        question:
          'By examining trait distributions across phylogenetic lineages, evolutionary biologists can determine whether trait similarities result from shared ancestry, leading to consistent presence of the trait among closely related species, or from convergent evolution under similar selective pressures, leading to the independent appearance of the trait in more distantly related species occupying similar ecological niches. Hypothesizing that orbit (eye socket) orientation in the families Canidae and Felidae (both within the order Carnivora) is primarily driven by the latter mechanism, a researcher measured frontation angles—the extent to which orbits face downward or upward—in felid and canid species occupying various habitats and preferring different substrates.\n\nAssuming the data in the table are broadly representative, do the data support the researcher\'s hypothesis as presented in the text?',
        choices: {
          A: 'Yes, because frontation angles show a moderately strong relationship with ecological niches, with two out of the three species with the highest frontation angles either inhabiting closed habitats or preferring terrestrial substrates.',
          B: 'No, because frontation angles cluster by taxonomic family rather than by ecological categories, with similar values measured for species from the same family despite their occupation of different ecological niches.',
          C: 'No, because frontation angles are relatively consistent across ecological categories, with values for species inhabiting closed arboreal habitats and species inhabiting open terrestrial habitats ranging from 56.51 to 67.61 and from 54.14 to 65.80, respectively.',
          D: 'Yes, because frontation angles are lower for canid species than for felid species regardless of habitat or preferred substrate, with values for species from the same taxonomic family clustering in a relatively narrow range.',
        },
        correctAnswer: 'B',
        reason:
          '9월에 처음 등장한 유형입니다. 긴 과학 지문 + 5열 표 + 가설 지지 여부 판정을 한 문항에 묶었습니다. 가설이 "the latter mechanism"으로만 표현되어 앞 문장에서 수렴 진화라는 것을 직접 찾아야 합니다. D는 관찰은 맞지만 결론이 틀렸고, C는 결론은 맞지만 핵심 근거를 비껴갑니다.',
      },
      {
        id: 'brandon-5',
        coach: 'Brandon',
        index: 5,
        section: 'RW',
        title: 'Long scientific passage — inference',
        skill: 'Inferences',
        difficulty: '38%',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'As observed in a 2011 study by Emilio García-Robledo and Alfonso Corzo, macroalgal proliferation may have a suppressive effect on the abundance of chlorophytes and other microphytobenthos (MPB)—chlorophyll-producing microbes inhabiting marine sediment—in part by reducing the amount of sunlight available to MPB. Examining benthic chlorophyll concentrations (a widely used proxy for MPB biomass) in mudflats near Cobb Island and other coastal sites in Virginia, Alice F. Besterman and Michael L. Pace found that those concentrations did not negatively correlate with macroalgal proliferation. However, they noted that MPB may respond to low-light conditions by producing higher-than-normal concentrations of chlorophyll, and they thus concluded that _____',
          ],
        },
        question: 'Which choice most logically completes the text?',
        choices: {
          A: 'although elevated levels of macroalgae do not always correspond to increased levels of benthic chlorophyll, there is likely a larger trend in MPB biomass that is related to macroalgal presence but unrelated to light conditions.',
          B: 'although their finding was inconsistent with that of García-Robledo and Corzo, this discrepancy was not attributable to the ability of MPB to accelerate chlorophyll production to mitigate the negative impact of macroalgal accumulations.',
          C: 'the effect of macroalgal concentrations on MPB abundance that García-Robledo and Corzo reported was not observed near Cobb Island and other Virginia sites because low-light conditions likely are not generalizable across the sites in the studies.',
          D: 'researchers ought to account for the possibility that because MPB have the capacity to compensate for reduced sunlight availability, benthic chlorophyll concentrations may not always be a reliable indicator of MPB biomass.',
        },
        correctAnswer: 'D',
        reason:
          '"엽록소 농도 = MPB 생물량의 대용치"라는 전제를 끝까지 붙잡아야 결론이 보입니다. 두 연구를 대비하고 However로 한 번 뒤집은 뒤 결론을 추론하는 구조입니다. B는 지문의 인과를 정반대로 말하는데 표현이 비슷해 헷갈립니다.',
      },
      {
        id: 'brandon-6',
        coach: 'Brandon',
        index: 6,
        section: 'RW',
        title: 'Philosophy argument — which quote best challenges it (new question type)',
        skill: 'Command of Evidence (Textual)',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'Elizabeth Gaskell, who was born in 1810, is the author of North and South. In a commonsense view, "Elizabeth Gaskell was born in 1810" and "the author of North and South was born in 1810" are identical in meaning and thus—because "was born in 1810" is constant—"Elizabeth Gaskell" is identical to "the author of North and South." But this conclusion conflicts with the principle, foundational to logic and mathematics, that identical entities are necessarily substitutable in any possible world (i.e., if A = B, then B can always be substituted for A), since it was possible for Gaskell to exist but to not write North and South. This situation suggests that there may be something wrong with our principle about the substitutability of identical entities.',
          ],
        },
        question:
          'In a paper for a philosophy class, a student wants to challenge the line of reasoning presented in the text. Which quotation from a work of philosophy would be most effective for the student to include?',
        choices: {
          A: '"In everyday speech, we tend to talk about circumstantial characteristics of individuals (e.g., a person behaves shyly at a party) as though they are inherent characteristics of those individuals (we say the person is shy) though unfair; this tendency is more efficient than spelling out all the contingent circumstances every time we want to communicate about individuals."',
          B: '"A proper name is a mere tag that refers to an individual but lacks any content; although it and a description of an attribute of a person may happen to evoke the same person in our minds, equating them is a mistake, since a name communicates no properties of the person, while a description does."',
          C: '"Although the principle that two entities that are identical are necessarily substitutable sounds plausible and is useful in everyday life, it is very hard to demonstrate the validity of this principle through a logical proof without making some highly debatable assumptions."',
          D: '"When scholars write about an author, they typically use the author\'s full name or last name, whereas acquaintances would typically have referred to that author by first name alone; though different parts of the same proper name are used in different contexts, it would be incorrect to think that different people are therefore being referenced."',
        },
        correctAnswer: 'B',
        reason:
          '9월에 처음 등장한 유형입니다. 논증을 challenge하라는 말은 결론이 아니라 전제를 공격하라는 뜻입니다. 논증의 약점은 첫 전제—이름과 서술을 동일시한 것—입니다. B는 고유명사와 서술 표현의 차이를 지적해 첫 전제를 무너뜨립니다.',
      },
    ],
  },
  {
    id: 'ben',
    name: 'Ben',
    tagline: '함정이 명확하고 핵심 스킬 하나로 해결되는 문항 — 한 번 이해하면 다시 틀리지 않는 유형',
    problems: [
      {
        id: 'ben-1',
        coach: 'Ben',
        index: 1,
        section: 'Math',
        title: 'Quadratic model after outlier removal',
        skill: 'Two-variable data: Models and scatterplots',
        difficulty: '27%',
        isGridIn: false,
        question:
          'A scatterplot shows 9 data points and the quadratic model $y = 0.19x^2 - 1.24x + 7.57$. The data point at $x = 0$ was identified as a recording error and removed. If the new best-fit quadratic model for the remaining data is $y = ax^2 + bx + c$, which of the following must be true?',
        statements: ['$a > 0.19$', '$c < 7.57$'],
        choices: { A: 'I only', B: 'II only', C: 'Both I and II', D: 'Neither' },
        correctAnswer: 'B',
        reason:
          'I과 II를 모두 참으로 고르는 C 보기가 핵심 함정입니다. "점을 빼면 곡선이 더 많이 휜다"는 직관이 학생들을 C로 끌어들입니다. 그러나 $x = 0$의 높은 점이 있었기 때문에 기존 모델이 더 급하게 휘어야 했고, 그 점을 제거하면 반대로 $a$가 작아집니다. $c$는 $x = 0$ 지점의 모델값임을 알면 II는 5초 안에 판단됩니다.',
      },
      {
        id: 'ben-2',
        coach: 'Ben',
        index: 2,
        section: 'Math',
        title: 'Similar cylinders — surface area to volume',
        skill: 'Area and volume',
        difficulty: '30%',
        isGridIn: true,
        question:
          "Cylinders $A$ and $B$ are similar right circular cylinders. The total surface area of cylinder $A$ is $486\\pi$ cm² and its height equals its diameter. The ratio of the diameter of $A$ to the diameter of $B$ is 3 to 4. If the volume of cylinder $B$ is $k\\pi$ cm³, what is the value of $k$?",
        correctAnswer: '3456',
        reason:
          '실수 포인트가 세 곳입니다. ① 겉넓이에서 밑면 두 개를 빠뜨리기, ② 높이 $= 2r$을 바로 대입하지 않아 변수가 두 개로 남기, ③ 닮음비 $\\frac{4}{3}$을 부피에 세제곱하지 않기. 이 세 포인트를 체크리스트로 외워 두면 단답형에서도 확실히 득점할 수 있습니다.',
      },
      {
        id: 'ben-3',
        coach: 'Ben',
        index: 3,
        section: 'Math',
        title: 'Rational function — horizontal and vertical translation',
        skill: 'Nonlinear functions',
        difficulty: '45%',
        isGridIn: false,
        question:
          'The graph of $f$ is translated 2 units down and 7 units to the right to produce the graph of $g(x)$. If $f(x) = \\dfrac{a - 14}{x} + 6$, which of the following defines $g(x)$?',
        choices: {
          A: '$g(x) = \\dfrac{a-14}{x+7} + 4$',
          B: '$g(x) = \\dfrac{a-14}{x-7} + 4$',
          C: '$g(x) = \\dfrac{a-16}{x+7} + 6$',
          D: '$g(x) = \\dfrac{a-16}{x-7} + 6$',
        },
        correctAnswer: 'B',
        reason:
          '함정은 부호 하나입니다. 오른쪽 7 이동은 $x - 7$, 아래 2 이동은 전체에서 $-2$. 분자 $a - 14$는 평행이동과 무관합니다. 이 원리만 정확히 알면 30초 이내에 B를 고를 수 있습니다. C·D처럼 분자를 바꾼 보기가 그럴듯해 보이는 이유도 알아 두면 같은 유형에서 흔들리지 않습니다.',
      },
      {
        id: 'ben-4',
        coach: 'Ben',
        index: 4,
        section: 'RW',
        title: 'Long subject + participial phrase',
        skill: 'Form, Structure, and Sense',
        difficulty: '50%',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'As part of his I GOT UP series, Japanese conceptual artist On Kawara spent over a decade—with near daily consistency—mailing postcards to friends declaring what time he got up each day, resulting in pieces such as I Got Up at 8.42 A.M., Jun 30 1977. Such meticulous documentation of mundane _____ artworks that "resonate with existential, psychological and scientific implications about the time-space continuum," according to the New York Times, became Kawara\'s life\'s work.',
          ],
        },
        question:
          'Which choice completes the text so that it conforms to the conventions of Standard English?',
        choices: {
          A: 'information generated',
          B: 'information, generating',
          C: 'information, has generated',
          D: 'information generates',
        },
        correctAnswer: 'B',
        reason:
          '본동사 became이 문장 끝에 있어서 빈칸이 본동사 자리처럼 보입니다. 주어 Such meticulous documentation을 찾고 나면, 빈칸 뒤 전체는 became에 연결되는 수식어구여야 합니다. 접속사 없이 정동사를 하나 더 넣으면 문장이 두 개로 엉킵니다.',
      },
      {
        id: 'ben-5',
        coach: 'Ben',
        index: 5,
        section: 'RW',
        title: 'Indeed — reinforcing the previous claim',
        skill: 'Transitions',
        difficulty: '55%',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'Samuel Adams employed the pseudonym "Populus"—the collective name for citizens of ancient Rome—in political essays he wrote in 1768, a choice that accomplished far more than simply concealing his authorship. _____ it wasn\'t an arbitrary pen name but rather a complex rhetorical strategy through which Adams aligned his pro-independence views with the venerated republican ideals of the ancient world, thereby bolstering the authority of his writing.',
          ],
        },
        question: 'Which choice completes the text with the most logical transition?',
        choices: {
          A: 'Indeed,',
          B: 'In addition,',
          C: 'Conversely,',
          D: 'However,',
        },
        correctAnswer: 'A',
        reason:
          '둘째 문장이 "not X but Y" 구조라 대조처럼 보여 However나 Conversely로 끌립니다. 그러나 둘째 문장은 첫 문장의 주장(저자 숨기기 이상)을 구체화해 강화하는 관계입니다. Indeed(앞 주장 확인·강화) vs In addition(별개의 새 내용 추가)의 차이를 한 번 정리해 두면 Transitions 고난도에서 흔들리지 않습니다.',
      },
      {
        id: 'ben-6',
        coach: 'Ben',
        index: 6,
        section: 'RW',
        title: 'There — place adverb as transition',
        skill: 'Transitions',
        difficulty: '45%',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'The Cheruku rasamu mango variety is from the South Asian country of India. _____ in 2018, 18.8 million metric tons of mangoes were produced.',
          ],
        },
        question: 'Which choice completes the text with the most logical transition?',
        choices: {
          A: 'Hence,',
          B: 'There,',
          C: 'In fact,',
          D: 'Specifically,',
        },
        correctAnswer: 'B',
        reason:
          '9월에 처음 정답으로 등장한 There의 특수 용법입니다. 학생들이 외운 연결어 목록에 없는 장소 부사라 대부분 처음부터 지웁니다. 둘째 문장에 장소가 빠져 있다는 것을 알아채는 것이 핵심입니다. There가 앞 문장의 "India"를 받아 "인도에서"가 됩니다. 한 번 보면 절대 다시 틀리지 않는 문항입니다.',
      },
    ],
  },
  {
    id: 'park',
    name: '박시원',
    tagline: '판정 실수가 생기기 쉬운 문항 — 데이터 해석, 추론, 대명사 용법 각각 기준 하나면 풀림',
    problems: [
      {
        id: 'park-1',
        coach: '박시원',
        index: 1,
        section: 'RW',
        title: 'P50 table + hypothesis support',
        skill: 'Command of Evidence (Quantitative)',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'table',
          headers: ['Species', 'P50 (megapascal)', 'Mean elevation (m)', 'Rainforest occupancy (%)'],
          rows: [
            ['Paracryphia alticola', '−2.1', '1,011', '91'],
            ['Ascarina rubricaulis', '−2.28', '825', '86'],
            ['Amborella trichopoda', '−2.77', '756', '82'],
            ['Hedycarya parvifolia', '−3.19', '956', '86'],
            ['Zygogynum crassifolium', '−4.05', '57', '24'],
          ],
        },
        question:
          'P50—the pressure in the xylem (water-conducting tissue) at which a plant loses 50% of its hydraulic conductivity due to embolisms (air bubbles in the water flow)—is a key index of xylem embolism resistance and, by extension, tolerance of water stress; lower P50 values indicate lower vulnerability to xylem embolisms. Studies have found that variation in this functional trait corresponds with the distribution of plant species along moisture gradients. A student hypothesizes that this pattern would persist in woody species in New Caledonia, which is home to moist tropical rainforests, dry forests, and a range of elevations. To test the hypothesis, the student analyzes P50 values as well as mean elevation and rainforest occupancy rates for New Caledonian woody species.\n\nWhich choice best describes the extent to which the student\'s hypothesis is supported by data from the table?',
        choices: {
          A: 'Although the data indicate that species\' vulnerability to xylem embolisms varies within a relatively narrow range, their rainforest occupancy rates and elevation distributions vary much more widely; the hypothesis is therefore not supported.',
          B: 'The data suggest a pattern in which species with enhanced tolerance to water stress are generally found at higher elevations and have higher rainforest occupancy, a relationship that holds across the majority of species examined; the hypothesis is therefore strongly supported.',
          C: 'The data indicate that compared with Zygogynum crassifolium, which has the lowest rainforest occupancy rate and occurs at the lowest mean elevation, Paracryphia alticola, which has the highest rainforest occupancy rate and occurs at the highest mean elevation, is more vulnerable to water stress; the hypothesis is therefore strongly supported.',
          D: 'Although the data suggest a pattern in which species\' resistance to xylem embolisms tends to increase with decreasing elevation and rainforest occupancy, Hedycarya parvifolia is an exception to this trend; the hypothesis is therefore moderately supported.',
        },
        correctAnswer: 'D',
        reason:
          'B와 D 사이에서 많이 틀립니다. B는 전반적 패턴을 말하지만 Hedycarya(P50 −3.19인데 고도 956 m, 점유율 86%)가 패턴과 맞지 않아 "strongly supported"가 과장입니다. D는 Hedycarya 예외를 정확히 인정하면서 가설이 부분 지지된다고 결론 냅니다.',
      },
      {
        id: 'park-2',
        coach: '박시원',
        index: 2,
        section: 'RW',
        title: 'Inference from comparison — sea otter tool use',
        skill: 'Inferences',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'Researchers who examined data from radio-tagged southern sea otters (Enhydra lutris nereis) identified fitness benefits gained by otters that used tools. By using fixed stones as anvils, tool-using otters gained access to high-quality, hard-shelled prey (e.g., mussels and clams) that they could usually not access through biting alone. Non-tool-using otters foraged abundant, energy-poor, easily extractable prey instead (e.g., snails). Even when easily processed prey were depleted, tool-using otters were able to maintain their caloric intake by increasing their consumption of hard-shelled prey.',
          ],
        },
        question:
          'What does the text most strongly suggest about southern sea otters in environments where snails, mussels, and clams are present?',
        choices: {
          A: 'Those otters that do not use tools will likely have more robust health than those otters that do use tools.',
          B: 'Those otters that do not use tools will likely need to process larger amounts of prey to meet their energy requirements than will those otters that use tools.',
          C: 'Those otters that consume mussels and clams without the use of tools will likely spend less time foraging than will those otters that use tools to access the same prey resources.',
          D: 'Those otters whose diet consists mainly of snails will likely exhibit less tooth damage than will those otters that use tools to consume mussels and clams.',
        },
        correctAnswer: 'B',
        reason:
          'D가 매력적인 오답입니다. 지문에 치아 손상 언급이 없으므로 지문 밖 추론입니다. B는 도구 없는 해달이 달팽이를 더 많이 먹어야 했다는 지문 내용에서 직접 이어집니다.',
      },
      {
        id: 'park-3',
        coach: '박시원',
        index: 3,
        section: 'RW',
        title: 'Demonstrative pronoun — these vs that/this/each',
        skill: 'Form, Structure, and Sense',
        difficulty: 'Easy',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'Both Nakuru, Kenya, and Ibarra, Ecuador, are located at less than one degree latitude. In other words, _____ cities basically sit right on the equator!',
          ],
        },
        question:
          'Which choice completes the text so that it conforms to the conventions of Standard English?',
        choices: { A: 'these', B: 'that', C: 'this', D: 'each' },
        correctAnswer: 'A',
        reason:
          '두 도시를 앞에서 복수로 언급했으므로 복수 지시 대명사 these가 필요합니다. "Both A and B" 뒤에 받는 대명사는 복수라는 것을 확인하는 습관을 만드는 문항입니다.',
      },
      {
        id: 'park-4',
        coach: '박시원',
        index: 4,
        section: 'Math',
        title: 'Parabola with vertex constraints — greatest value of b',
        skill: 'Nonlinear functions',
        difficulty: 'Hard',
        isGridIn: true,
        question:
          'The graph of $y = -ax^2 + bx + c$ has a vertex at $(1, 20)$, where $a$, $b$, and $c$ are positive integer constants. What is the greatest possible value of $b$?',
        correctAnswer: '38',
        reason:
          '꼭짓점 $(1, 20)$이므로 $y = -a(x-1)^2 + 20$. 전개하면 $b = 2a$이고 $c = 20 - a$. $c > 0$이 되려면 $a < 20$, 정수이므로 $a$의 최대값은 19. 따라서 $b = 2 \\times 19 = 38$. 단답형에서 $c > 0$ 조건을 빠뜨리면 $b$를 무한히 키울 수 있다고 착각하게 됩니다.',
      },
      {
        id: 'park-5',
        coach: '박시원',
        index: 5,
        section: 'Math',
        title: 'Arithmetic sequence as a linear function',
        skill: 'Linear functions',
        difficulty: 'Hard',
        isGridIn: false,
        question:
          'In a sequence of numbers, each term is 10 greater than the preceding term. The first term is 15, and $f(n)$ represents the $n^{\\text{th}}$ term in the sequence. Which of the following functions models this situation?',
        choices: {
          A: '$f(n) = 15(10)^{(n-1)}$',
          B: '$f(n) = 15(10)^{n}$',
          C: '$f(n) = 15 + 10n$',
          D: '$f(n) = 15 + (n-1)(10)$',
        },
        correctAnswer: 'D',
        reason:
          'A·B는 지수 성장(등비수열)으로 잘못 판단한 경우, C는 인덱스 오류입니다. $n = 1$일 때 $f(1) = 15$여야 하는데 C는 25가 나옵니다. D는 $f(1) = 15$로 조건을 만족합니다.',
      },
      {
        id: 'park-6',
        coach: '박시원',
        index: 6,
        section: 'Math',
        title: 'Exponential function — reading the y-intercept from the equation',
        skill: 'Nonlinear functions',
        difficulty: 'Hard',
        isGridIn: false,
        question:
          'The function $f$ is defined by $f(x) = a(2.7)^x + 2.7^b$, where $a$ and $b$ are integers with $0 < a < b$. Two functions $g$ and $h$ are equivalent to $f$:\n\n$$\\text{I.} \\quad g(x) = a(2.7)^x + k \\qquad \\text{II.} \\quad h(x) = a(2.7^x + m)$$\n\nFor which of the following can the y-coordinate of the y-intercept be directly determined from the equation without additional calculation?',
        choices: {
          A: 'II only',
          B: 'Neither',
          C: 'Both I and II',
          D: 'I only',
        },
        correctAnswer: 'B',
        reason:
          'I의 $g(x) = a(2.7)^x + k$에서 y절편은 $a + k$인데, 이 값은 두 상수의 합이라 식에서 곧장 읽히지 않습니다. II의 $h(x) = a(2.7^x + m)$에서 y절편은 $a(1+m)$으로 역시 두 상수를 계산해야 합니다. 둘 다 y절편을 단일 상수나 계수로 표시하지 않으므로 정답은 B입니다.',
      },
    ],
  },
  {
    id: 'laura',
    name: 'Laura',
    tagline: '"문장 구조가 유도하는 함정" — 지문이 직접 말하지 않는 논리적 방향을 스스로 잡아야 함',
    problems: [
      {
        id: 'laura-1',
        coach: 'Laura',
        index: 1,
        section: 'RW',
        title: 'Consumer revolution argument + sampling bias',
        skill: 'Inferences',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'Support for the argument that a "consumer revolution"—in which possession of consumer goods among an increasingly wide range of socioeconomic groups surged despite only marginal wage growth—occurred in England between 1600 and 1750 has largely hinged on scholars\' analyses of probate inventories (detailed legal records of deceased persons\' possessions). Reexamining these data, Gregory Clark notes that while inventories from the period appear consistent with the consumer-revolution argument, the proportion of the population whose wills included such documentation decreased considerably between 1600 and 1750, with this documentation increasingly representing more affluent individuals. Clark\'s findings thus directly raise the possibility that _____',
          ],
        },
        question: 'Which choice most logically completes the text?',
        choices: {
          A: 'probate inventories from 1600 to 1750 that have been analyzed by scholars exaggerated the number of consumer goods that relatively prosperous individuals possessed.',
          B: 'scholars\' previous conclusions based on analysis of probate inventories from 1600 to 1750 overstated broader demographic shifts in the possession of consumer goods.',
          C: 'advocates of the consumer-revolution argument may have failed to account for the possibility that the increased acquisition of consumer goods in England between 1600 and 1750 was attributable to an increase in the proportion of wealthy individuals.',
          D: 'wage increases in England between 1600 and 1750 did not account for the widespread acquisition of consumer goods among less-wealthy individuals.',
        },
        correctAnswer: 'B',
        reason:
          'Clark의 발견: 유언장에 기록된 사람들이 점점 더 부유층만 대표하게 됐다. 그렇다면 기존 학자들이 그 기록을 근거로 내린 "광범위한 계층에 걸친 소비 증가" 결론은 과장됐을 수 있다. A는 부유층의 재산을 기록이 과장했다고 말하는데, Clark은 그런 말을 하지 않았다. B가 핵심: 표본이 점점 부유층만 반영하게 됐으므로, 그 표본으로 내린 "모든 계층" 결론이 과장됐다.',
      },
      {
        id: 'laura-2',
        coach: 'Laura',
        index: 2,
        section: 'RW',
        title: 'Granted followed by a result, not a contrast',
        skill: 'Transitions',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'Photogrammetry, used by digital artists to develop 3D assets for video games, yields objects with precise mathematical proportions. Granted, as they are formed from perfect geometric shapes, such 3D elements lack organic realism; _____ post-modeling processes such as UV surface mapping are needed to add the appearance of imperfect organic properties.',
          ],
        },
        question: 'Which choice completes the text with the most logical transition?',
        choices: {
          A: 'however,',
          B: 'similarly,',
          C: 'in sum,',
          D: 'consequently,',
        },
        correctAnswer: 'D',
        reason:
          '"Granted, [문제점]" 뒤에는 보통 "but" 또는 "however"가 온다는 패턴 때문에 A를 고르기 쉽습니다. 그러나 세미콜론 앞뒤를 정확히 보면: lack organic realism → post-modeling processes are needed. 이것은 대조가 아니라 인과 관계입니다. "Granted" 양보절이 이미 대조를 처리했고, 세미콜론 이후는 그 결과가 됩니다.',
      },
      {
        id: 'laura-3',
        coach: 'Laura',
        index: 3,
        section: 'RW',
        title: 'What the word describes — motivations, not people',
        skill: 'Words in Context',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'While some of the Mediterranean islands inhabited by prehistoric peoples were rich in resources and easily accessible from the mainland, others were resource-poor and could only be reached by grueling, hazardous, multiday voyages in rowboats. The motivations of the people who settled the latter are thus, from our modern perspective, _____.',
          ],
        },
        question: 'Which choice most logically completes the text?',
        choices: {
          A: 'pragmatic',
          B: 'ambivalent',
          C: 'enigmatic',
          D: 'impulsive',
        },
        correctAnswer: 'C',
        reason:
          '빈칸이 묘사하는 것은 정착민의 성격이 아니라 우리 현대인의 관점에서 본 그들의 동기입니다. 자원도 부족하고 목숨을 걸어야 하는 섬에 왜 갔는지 — 우리 눈에는 이유가 전혀 이해되지 않습니다. A(pragmatic = 실용적)를 고르는 학생은 정착민의 성격을 묘사한다고 읽습니다. "from our modern perspective"를 놓치면 A로 가게 됩니다.',
      },
      {
        id: 'laura-4',
        coach: 'Laura',
        index: 4,
        section: 'Math',
        title: 'Isosceles triangle — exterior angle',
        skill: 'Lines, angles, and triangles',
        difficulty: 'Hard',
        isGridIn: true,
        question:
          'In triangle $PQR$, the measure of angle $P$ is $(4x + 17)°$, the measure of angle $Q$ is $(5x + 16)°$, $PQ = 6$, and $QR = 6$. Side $\\overline{PR}$ is extended through point $R$ to point $S$. The measure of angle $QRS$ is $y°$. What is the value of $y$?',
        correctAnswer: '123',
        reason:
          '각 P와 Q의 식이 있고 삼각형 내각 합이 180°이면 방정식을 세울 수 있다 — 처럼 보이지만 미지수가 $x$와 각 R, 두 개입니다. $PQ = QR = 6$이라는 조건이 열쇠입니다. $PQ = QR$이면 두 변에 인접하지 않는 꼭짓점의 대각이 같으므로 각 R = 각 P = $(4x + 17)°$. 이렇게 세 각을 모두 $x$로 표현하면 풀립니다. 외각 $y$ = 각 P + 각 Q.',
      },
      {
        id: 'laura-5',
        coach: 'Laura',
        index: 5,
        section: 'Math',
        title: 'Reflection + vertical shift — direction of x-intercept',
        skill: 'Nonlinear functions',
        difficulty: 'Hard',
        isGridIn: false,
        question:
          'The function $f$ is defined by $f(x) = 11x^3$. The graph of $y = f(-x) + c$ in the $xy$-plane, where $c$ is a positive integer constant, has an x-intercept at $(r, 0)$ and a y-intercept at $(0, t)$, where $r$ and $t$ are constants. Which of the following must be true about $r$ and $t$?',
        choices: {
          A: '$r < 0$ and $t < 0$',
          B: '$r < 0$ and $t > 0$',
          C: '$r > 0$ and $t > 0$',
          D: '$r > 0$ and $t < 0$',
        },
        correctAnswer: 'C',
        reason:
          '$f(-x) = -11x^3$. 여기에 양의 정수 $c$를 더하면 $y = -11x^3 + c$. x절편: $r^3 = c/11 > 0$이므로 $r > 0$. y절편: $t = c > 0$. 학생들이 틀리는 지점: $f(-x)$는 y축 기준 반사이므로 x절편이 왼쪽으로 이동한다고 착각합니다. 그러나 $f(x) = 11x^3$의 x절편은 이미 원점이고, 수직이동 $c$가 더해져 x절편이 양의 방향으로 생깁니다.',
      },
      {
        id: 'laura-6',
        coach: 'Laura',
        index: 6,
        section: 'Math',
        title: 'Two equations, one line — infinitely many solutions',
        skill: 'Systems of two linear equations',
        difficulty: 'Hard',
        isGridIn: false,
        question:
          'For each real number $r$, which of the following points lies on the graph of each equation in the $xy$-plane?\n\n$$5x + 8y = 9$$\n$$15x + 24y = 27$$',
        choices: {
          A: '$\\left(r,\\ -\\dfrac{5r}{8}+\\dfrac{9}{8}\\right)$',
          B: '$\\left(-\\dfrac{5r}{8}+\\dfrac{9}{8},\\ r\\right)$',
          C: '$\\left(-\\dfrac{5r}{8}+9,\\ \\dfrac{5r}{8}+27\\right)$',
          D: '$\\left(\\dfrac{r}{3}+9,\\ -\\dfrac{r}{3}+27\\right)$',
        },
        correctAnswer: 'A',
        reason:
          '두 식이 있으면 대입법이나 소거법을 쓰는 것이 학생의 반응입니다. 그런데 $15x + 24y = 27$은 $5x + 8y = 9$에 정확히 3을 곱한 식입니다. 두 식은 같은 직선이고, 해는 그 직선 위의 모든 점입니다. "for each real number $r$"가 해가 무한히 존재함을 암시합니다. $5x + 8y = 9$를 $y$에 대해 풀면 $y = -\\frac{5}{8}x + \\frac{9}{8}$이고, $x = r$로 놓으면 A가 됩니다.',
      },
    ],
  },
  {
    id: 'julie',
    name: 'Julie',
    tagline: '"두 대상 사이의 관계를 끝까지 따라가야 하는" 문항 — 중간에 끊으면 오답',
    problems: [
      {
        id: 'julie-1',
        coach: 'Julie',
        index: 1,
        section: 'RW',
        title: 'Quote that shows the reason, not the action',
        skill: 'Command of Evidence (Textual)',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'The Age of Innocence is a 1920 novel by Edith Wharton set in New York City in the 1870s. In the novel, Newland Archer arrives late to an opera performance, which the narrator attributes to Newland\'s enjoyment of anticipation: _____',
          ],
        },
        question: 'Which quotation from The Age of Innocence most effectively illustrates the claim?',
        choices: {
          A: '"[T]hinking over a pleasure to come often gave [Newland] a subtler satisfaction than its realisation."',
          B: '"When Newland Archer opened the door at the back of the club box the curtain had just gone up on the garden scene. There was no reason why the young man should not have come earlier, for he had dined at seven, alone with his mother and sister."',
          C: '"It surprised [Newland] that life should be going on in the old way when his own reactions to it had so completely changed."',
          D: '"It was Madame Nilsson\'s first appearance [in an opera] that winter, and what the daily press had already learned to describe as \'an exceptionally brilliant audience\' had gathered to hear her."',
        },
        correctAnswer: 'A',
        reason:
          'B는 Newland가 늦게 도착하는 행동을 묘사합니다. 늦었다는 사실이 지문과 일치해 B를 고르기 쉽습니다. 그러나 지문은 "enjoyment of anticipation"이 늦은 이유라고 말합니다 — 이 주장을 설명하는 인용문이 필요합니다. A는 "기대하는 즐거움이 실제보다 더 미묘한 만족을 줬다"고 직접 서술합니다. 행동(B)과 이유(A)를 구분하는 것이 핵심입니다.',
      },
      {
        id: 'julie-2',
        coach: 'Julie',
        index: 2,
        section: 'RW',
        title: 'Which column, which month — reading the table correctly',
        skill: 'Command of Evidence (Quantitative)',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'table',
          headers: [
            'Month',
            'Average high (°F)',
            'Average low (°F)',
            'Average male wing centroid size (mm)',
            'Average female wing centroid size (mm)',
          ],
          rows: [
            ['June', '80', '56', '2.01', '2.31'],
            ['May', '73', '50', '1.98', '2.27'],
            ['July', '87', '62', '2.02', '2.31'],
            ['October', '67', '44', '1.98', '2.29'],
          ],
        },
        question:
          'Drosophila (fruit flies) have generation times of 10–12 days, so seasonal changes in rainfall and other environmental conditions can drive seasonal fluctuations in chromosome rearrangements. Drosophila body size (for which wing centroid size serves as a proxy measure) correlates with reproductive fitness. Banu Sebnem Onder and Cansu Fidan Aksoy measured the wing sizes of members of a D. melanogaster population collected monthly between May and October. Their research suggests that Drosophila collected in relatively cooler months should tend to have lower reproductive fitness, as is illustrated by the finding that _____\n\nWhich choice most effectively uses data from the table to complete the assertion?',
        choices: {
          A: 'the average male wing centroid size was 1.98 mm in May but was 2.31 mm in June.',
          B: 'the average female wing centroid size was smaller in May than in July.',
          C: 'the average male wing centroid size was consistently smaller than the average female wing centroid size in all four months in the table.',
          D: 'the average monthly low temperature was lower in May than in June.',
        },
        correctAnswer: 'B',
        reason:
          'A는 "6월 수컷 = 2.31 mm"라고 하지만, 표에서 6월 수컷은 2.01 mm입니다. 2.31은 6월 암컷 값입니다. 숫자가 구체적으로 적혀 있어 설득력 있게 보이지만, 행과 열을 잘못 읽은 것입니다. B는 5월(기온 낮음) 암컷 날개 크기(2.27)가 7월(기온 높음)보다 작다(2.31) — 기온이 낮은 달의 날개가 더 작다는 가설을 정확히 지지합니다.',
      },
      {
        id: 'julie-3',
        coach: 'Julie',
        index: 3,
        section: 'RW',
        title: 'Two texts — which direction does the connection go?',
        skill: 'Cross-Text Connections',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'two-texts',
          text1:
            'Oil extraction and other human activities are sources of atmospheric methane (CH₄), but so too are naturally occurring emissions, such as those from termite mounds. This biogenic CH₄ is challenging to track given natural sources\' variability and spatial diffusion, but one promising approach is to use CH₄ flux data from extant monitoring infrastructure—specifically, eddy covariance (EC) towers—to model biogenic CH₄ emissions in unmonitored areas.',
          text2:
            'Malone et al. studied EC tower-based estimates and found that in areas where biogenic CH₄ emissions were elevated, EC towers tended to underestimate actual emissions. This occurred because EC towers, designed for average conditions, have limited sensitivity to high-flux events.',
        },
        question:
          'Based on the texts, Malone et al. (Text 2) would most likely agree with which statement about the "approach" described in Text 1?',
        choices: {
          A: 'It would only be viable if EC towers could detect smaller fluxes than they currently can.',
          B: 'It could compromise the accuracy of the biogenic CH₄ emissions data that EC towers collect in areas with elevated emissions.',
          C: 'It is likely to be useful for determining biogenic CH₄ emissions in unmonitored areas of some regions but not of most regions.',
          D: 'It may suggest that biogenic CH₄ emissions in unmonitored areas are higher than they actually are.',
        },
        correctAnswer: 'D',
        reason:
          'Text 2: EC 타워는 배출이 높은 지역에서 실제 배출량을 과소평가합니다. Text 1의 접근법: EC 타워 데이터로 미모니터링 지역의 배출량을 모델링합니다. 연결하면: EC 타워가 높은 배출 지역을 낮게 잡으므로 그 데이터 기반 모델도 실제보다 낮게 추정합니다. 즉 모델이 "낮다"고 할수록 실제는 그보다 높다는 D가 됩니다. 방향을 한 단계 더 추적하지 않으면 B나 C로 가기 쉽습니다.',
      },
      {
        id: 'julie-4',
        coach: 'Julie',
        index: 4,
        section: 'Math',
        title: 'Pyramid surface area — slant height matters',
        skill: 'Area and volume',
        difficulty: 'Hard',
        isGridIn: false,
        question:
          'A right square pyramid has a height of 15 cm. A second right square pyramid has a height of 30 cm. The area of the base of each pyramid is 100 cm².\n\nWhich of the following is closest to the difference in the surface area of the second pyramid and the first pyramid, in cm²?',
        choices: { A: '315', B: '506', C: '292', D: '214' },
        correctAnswer: 'C',
        reason:
          '높이가 두 배이면 겉넓이도 두 배에 가까울 것 같다는 직관이 함정입니다. 옆면의 넓이는 사면의 높이(slant height)에 따라 결정됩니다. 피라미드 1: $l_1 = \\sqrt{15^2 + 5^2} \\approx 15.81$, 피라미드 2: $l_2 = \\sqrt{30^2 + 5^2} \\approx 30.41$. 겉넓이 차 $= 20 \\times (l_2 - l_1) \\approx 292$. 사면의 높이 계산을 빠뜨리면 A나 D가 나옵니다.',
      },
      {
        id: 'julie-5',
        coach: 'Julie',
        index: 5,
        section: 'Math',
        title: 'Percent change applied twice — multiply, not add',
        skill: 'Nonlinear functions',
        difficulty: 'Hard',
        isGridIn: false,
        question:
          'For the given function $f(x) = 231(1.20)^{\\frac{x}{4}}$, the value of $f(x)$ increases by $p\\%$ for every increase of $x$ by 8. What is the value of $p$?',
        choices: { A: '20', B: '31', C: '40', D: '44' },
        correctAnswer: 'D',
        reason:
          '$x$가 4 증가할 때마다 20% 증가이므로 $x$가 8 증가하면 20% + 20% = 40%라고 계산하면 C가 됩니다. 그러나 퍼센트 증가는 더하는 것이 아니라 곱해야 합니다. $(1.20)^2 = 1.44$이므로 44% 증가.',
      },
      {
        id: 'julie-6',
        coach: 'Julie',
        index: 6,
        section: 'Math',
        title: '"125% greater than" — greater than adds to the base',
        skill: 'Percentages',
        difficulty: 'Hard',
        isGridIn: false,
        question:
          'A number $f$ is 125% greater than a positive number $g$. A number $h$ is 40% less than $f$. The number $h$ is how many times the number $g$?',
        choices: { A: '1.35', B: '1.85', C: '0.90', D: '0.54' },
        correctAnswer: 'A',
        reason:
          '함정이 두 겹입니다. 첫 번째: "125% greater than $g$"는 $f = 1.25g$가 아니라 $f = g + 1.25g = 2.25g$입니다. greater than은 기준값에 더하는 것입니다. 두 번째: $h = 0.60 \\times 2.25g = 1.35g$. B(1.85)는 $125\\% - 40\\% = 85\\%$ greater로 계산한 잘못된 값입니다.',
      },
    ],
  },
  {
    id: 'dana',
    name: 'Dana Jung',
    tagline: '"논리 방향을 먼저 잡고 세부 내용을 채운다" — 인과 방향, 지문 보장 추론, 주어의 이동',
    problems: [
      {
        id: 'dana-1',
        coach: 'Dana Jung',
        index: 1,
        section: 'RW',
        title: 'Causal direction — does the condition require or eliminate equipment?',
        skill: 'Words in Context',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'Commercial truck drivers sometimes transport temperature-sensitive goods like fresh produce through a variety of external conditions that can affect temperatures inside cargo areas, _____ the use of specialized equipment to continuously and automatically monitor and adjust refrigeration settings to prevent the goods from spoiling.',
          ],
        },
        question:
          'Which choice completes the text so that it conforms to the conventions of Standard English?',
        choices: {
          A: 'obviating',
          B: 'extolling',
          C: 'necessitating',
          D: 'rescinding',
        },
        correctAnswer: 'C',
        reason:
          '정답을 고르려면 단어의 뜻보다 문장이 만들어 내는 인과 방향을 먼저 읽어야 합니다. 외부 조건이 냉장 화물칸 온도에 영향을 줄 수 있다 → 이것이 장비의 필요성을 어떻게 만드는가? 정답 C(necessitating)는 조건 → 문제 → 장비 필요의 인과 사슬을 완성합니다. A(obviating = 제거하다)를 고르면 "조건이 장비의 필요성을 없앤다"는 뜻이 되어 방향이 완전히 반대가 됩니다.',
      },
      {
        id: 'dana-2',
        coach: 'Dana Jung',
        index: 2,
        section: 'RW',
        title: 'What the text actually guarantees — Roman sumptuary laws',
        skill: 'Inferences',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'The Lex Orchia sumptuaria of 182–181 BCE was one in a succession of ancient Roman sumptuary laws governing expenditures on luxury, primarily regulating large banquets and other lavish events. Such laws, enacted against a backdrop of anxiety about social dynamism, were intended to limit aspirational overreaching for status but were infrequently enforced. Moreover, enforcement was generally limited to fines, which, when levied against high-profile offenders, were widely announced. The affluent accepted fines as merely a tax on privilege, even as the amounts increased with frequent revisions to the laws. Historians have therefore argued that enforcing sumptuary laws only minimally may have been a way to avoid undermining the laws\' aims, given that _____',
          ],
        },
        question: 'Which choice most logically completes the text?',
        choices: {
          A: 'the few fines that were imposed under the laws were tolerable to wealthy offenders and thus did not help the laws serve their intended purpose.',
          B: 'the public announcement of fines could signal offenders\' wealth and status, placing enforcement of the laws in conflict with their intent.',
          C: 'less-affluent citizens were reluctant to risk incurring a fine and thus voluntarily complied with the laws even in the absence of regular enforcement.',
          D: 'authorities focused enforcement on the wealthiest offenders, recognizing that pursuing offenders who were unable to pay the fines could weaken fines\' effectiveness as a deterrent.',
        },
        correctAnswer: 'B',
        reason:
          '지문이 알려주는 사실 두 가지: ① 부유층은 벌금을 "특권세"로 여겼다. ② 고액 벌금을 받은 사람의 이름이 공개되었다. 이 두 사실을 연결하면 B가 필연적으로 따라옵니다. 벌금 부과 사실이 공개되면 → 부자라는 신호 → 법이 막으려 했던 지위 과시를 오히려 촉진 → 집행이 법의 목적과 충돌합니다. SAT는 말이 되는 답이 아니라 지문이 실제로 보장하는 답을 요구합니다.',
      },
      {
        id: 'dana-3',
        coach: 'Dana Jung',
        index: 3,
        section: 'RW',
        title: 'Subject shifts — mango variety to India',
        skill: 'Transitions',
        difficulty: 'Hard',
        isGridIn: false,
        passage: {
          type: 'text',
          paragraphs: [
            'The Cheruku rasamu mango variety is from the South Asian country of India. _____ in 2018, 18.8 million metric tons of mangoes were produced.',
          ],
        },
        question: 'Which choice completes the text with the most logical transition?',
        choices: {
          A: 'Hence,',
          B: 'There,',
          C: 'In fact,',
          D: 'Specifically,',
        },
        correctAnswer: 'B',
        reason:
          '첫 문장의 주어는 "Cheruku rasamu 망고 품종"입니다. 빈칸 뒤 문장의 주어는 "인도"입니다. 정답 B(There = "그곳에서", 즉 인도에서)는 첫 문장에서 언급된 나라로 시선을 이동시킵니다. A(Hence = 따라서)를 선택하면 "Cheruku rasamu가 인도산이기 때문에 인도에서 1,880만 톤이 생산되었다"는 억지 인과가 됩니다. 주어가 바뀌었다는 사실을 먼저 확인하면 B가 유일한 선택입니다.',
      },
      {
        id: 'dana-4',
        coach: 'Dana Jung',
        index: 4,
        section: 'Math',
        title: 'Parameter controls the number of solutions',
        skill: 'Nonlinear equations in one variable',
        difficulty: 'Hard',
        isGridIn: true,
        question:
          'In the given equation $-8x^2 + bx - 98 = 0$, $b$ is a positive integer. The equation has no real solution. What is the largest possible value of $b$?',
        correctAnswer: '55',
        reason:
          '파라미터 $b$ 하나가 해의 개수를 결정합니다. 판별식 $D = b^2 - 4(-8)(-98) = b^2 - 3136$. 실수 해가 없으려면 $D < 0$이므로 $b^2 < 3136$, $|b| < 56$. $b$는 양의 정수이므로 최대값은 55입니다. 자주 발생하는 실수: $a = -8$, $c = -98$이 모두 음수임을 놓쳐 $4ac = -3136$으로 계산하면 조건 방향이 반전됩니다.',
      },
      {
        id: 'dana-5',
        coach: 'Dana Jung',
        index: 5,
        section: 'Math',
        title: 'Slope interpretation — identify the axes first',
        skill: 'Two-variable data: Models and scatterplots',
        difficulty: 'Hard',
        isGridIn: false,
        question:
          'A group of 10 gardeners recorded data on the germination rates of their tomato crop for one growing season. The scatterplot shows the relationship between the number of tomato seeds planted, $x$, and the number of tomato seeds that germinated, $y$, for each of the gardeners. A line of best fit is also shown.\n\nWhich of the following is the best interpretation of the slope of the line of best fit in this context?',
        choices: {
          A: 'The number of tomato seeds planted is predicted to increase by 60 seeds every 100 days.',
          B: 'The number of tomato seeds planted is predicted to increase by 300 seeds every 100 days.',
          C: 'The number of tomato seeds that germinate is predicted to increase by 60 seeds for every additional 100 tomato seeds that are planted.',
          D: 'The number of tomato seeds that germinate is predicted to increase by 300 seeds for every additional 100 tomato seeds that are planted.',
        },
        correctAnswer: 'C',
        reason:
          '두 가지 함정이 동시에 작동합니다. 첫 번째: 보기 A와 B는 x축 변수를 "days(날 수)"로 바꿨습니다. 지문에서 x는 심은 씨앗 수이고 days는 아무 데도 등장하지 않습니다. 두 번째: 기울기 값을 0.60(=60/100)이 아닌 3.0(=300/100)으로 혼동하게 만듭니다. 기울기 해석 3단계: ① x축 변수 확인 → ② y축 변수 확인 → ③ slope = Δy/Δx를 문장화.',
      },
      {
        id: 'dana-6',
        coach: 'Dana Jung',
        index: 6,
        section: 'Math',
        title: 'What does the intersection mean in context?',
        skill: 'Systems of two linear equations',
        difficulty: 'Easy',
        isGridIn: true,
        question:
          'A company that provides tours at a national park takes groups of 20 people at a time. The company\'s revenue is $120 per adult and $90 per student. If the company\'s revenue for one group consisting of adults and students was $2,040, how many people in the group were students?',
        correctAnswer: '12',
        reason:
          '쉬운 문항처럼 보이지만, Systems에서 가장 중요한 개념을 가장 직관적으로 보여줍니다. 두 조건이 동시에 성립해야 합니다: $a + s = 20$ (총 인원) / $120a + 90s = 2{,}040$ (총 수익). 두 직선의 교점 $(8, 12)$은 이 두 조건을 동시에 만족하는 유일한 조합입니다. 어떤 맥락이 주어지더라도 "두 식의 교점 = 두 조건이 동시에 성립하는 유일한 상태"라는 뜻을 파악하면 풀립니다.',
      },
    ],
  },
];
