/**
 * SAT RW 논리 작업 카테고리 자동 적용
 *
 * 7개 카테고리:
 * 1. NAME    - 역할/관계/목적에 올바른 이름 부여 (WiC, Transitions, TSP, CID-목적형)
 * 2. RETRIEVE - 텍스트에 명시된 정보 위치 파악 (CID-사실형)
 * 3. INFER   - 전제에서 결론 도출 (Inferences)
 * 4. VALIDATE - 주장을 지지/반박하는 증거 선택 (COE)
 * 5. RECONCILE - 두 텍스트 간 논리적 관계 식별 (CXC)
 * 6. BUILD   - 노트에서 수사적 목표 달성 문장 선택 (RS)
 * 7. APPLY   - 문법/구두점 규칙 적용 (Boundaries, FSS)
 */

import { readFileSync, writeFileSync } from 'fs';

const lines = readFileSync('master_sat_ontology_v2.jsonl', 'utf8').trim().split('\n');
const questions = lines.map(l => JSON.parse(l));

/**
 * 질문을 7개 카테고리 중 하나로 분류
 * 분류 순서: 스킬 → 질문 스템 패턴
 */
function classifyQuestion(q) {
  const skill = q.skill || '';
  const question = (q.question || '').toLowerCase();

  // --- APPLY: Standard English Conventions ---
  if (skill.includes('Boundaries') || skill.includes('Form, Structure, and Sense')) {
    return {
      category: 'APPLY',
      reason: 'Standard English Conventions — apply grammar/punctuation rule'
    };
  }

  // --- RECONCILE: Cross-Text Connections ---
  if (skill.includes('Cross-Text Connections')) {
    return {
      category: 'RECONCILE',
      reason: 'Cross-Text — identify logical relationship between two texts'
    };
  }

  // --- BUILD: Rhetorical Synthesis ---
  if (skill.includes('Rhetorical Synthesis')) {
    return {
      category: 'BUILD',
      reason: 'Rhetorical Synthesis — select sentence from notes to achieve goal'
    };
  }

  // --- VALIDATE: Command of Evidence ---
  if (skill.includes('Command of Evidence')) {
    return {
      category: 'VALIDATE',
      reason: 'Command of Evidence — select evidence supporting/undermining claim'
    };
  }

  // --- INFER: Inferences ---
  if (skill.includes('Inferences')) {
    // But check: if "complete the text" with a WORD, it could be misclassified
    // Inferences always complete with a proposition/clause, not a word
    return {
      category: 'INFER',
      reason: 'Inferences — derive conclusion from given premises'
    };
  }

  // --- NAME: Transitions ---
  if (skill.includes('Transitions')) {
    return {
      category: 'NAME',
      reason: 'Transitions — name the logical relationship between adjacent statements'
    };
  }

  // --- NAME or RETRIEVE: Central Ideas and Details ---
  if (skill.includes('Central Ideas and Details')) {
    // RETRIEVE indicators: "according to the text", "based on the text, what", "what is true about"
    const retrievePatterns = [
      'according to the text',
      'based on the text, what',
      'what is true about',
      'what does the narrator',
      'how old was',
      'what challenge',
      'how do',
      'how does',
      'what was',
      'what did',
      'what is one reason',
      'what would have been',
    ];
    const isRetrieve = retrievePatterns.some(p => question.includes(p));

    if (isRetrieve) {
      return {
        category: 'RETRIEVE',
        reason: 'Central Ideas — locate explicitly stated fact'
      };
    } else {
      return {
        category: 'NAME',
        reason: 'Central Ideas — characterize main idea/purpose/topic'
      };
    }
  }

  // --- NAME: Words in Context ---
  if (skill.includes('Words in Context')) {
    return {
      category: 'NAME',
      reason: 'Words in Context — name the semantic role/meaning the blank or word occupies'
    };
  }

  // --- NAME: Text Structure and Purpose ---
  if (skill.includes('Text Structure and Purpose')) {
    return {
      category: 'NAME',
      reason: 'Text Structure and Purpose — name the organizational structure, purpose, or function'
    };
  }

  // --- Stem-based fallback for empty/missing skill ---
  // RECONCILE: "based on the texts" (plural) signals cross-text comparison
  if (question.includes('based on the texts') ||
      question.includes('how would the author of text 2') ||
      question.includes('how would') && question.includes('text 2') ||
      question.includes('difference in how the author')) {
    return {
      category: 'RECONCILE',
      reason: 'Stem-inferred: cross-text comparison (skill field empty)'
    };
  }

  // VALIDATE: evidence/data/quotation supporting a claim
  if (question.includes('most effectively uses data') ||
      question.includes('most directly support') ||
      question.includes('most effectively illustrates') ||
      question.includes('best supports') ||
      question.includes('supported by the text') ||
      question.includes('support the') && question.includes('claim') ||
      question.includes('support the') && question.includes('example') ||
      question.includes('support the') && question.includes('hypothesis') ||
      question.includes('finding, if true')) {
    return {
      category: 'VALIDATE',
      reason: 'Stem-inferred: evidence selection (skill field empty)'
    };
  }

  // INFER: conclusion/inference drawing
  if (question.includes('what can be concluded') ||
      question.includes('what conclusion') ||
      question.includes('which inference is best supported') ||
      question.includes('most logically completes') ||
      question.includes('likely have') ||
      question.includes('most likely')) {
    return {
      category: 'INFER',
      reason: 'Stem-inferred: conclusion/inference (skill field empty)'
    };
  }

  // NAME: main idea / structure / purpose
  if (question.includes('main idea') ||
      question.includes('main purpose') ||
      question.includes('primarily') ||
      question.includes('best states')) {
    return {
      category: 'NAME',
      reason: 'Stem-inferred: main idea/purpose (skill field empty)'
    };
  }

  // RETRIEVE: explicit fact lookup from text
  if (question.includes('according to') ||
      question.includes('for what reason') ||
      question.includes('how can humans') ||
      question.includes('what percentage') ||
      question.includes('what does') ||
      question.includes('what is') && question.includes('based on the text')) {
    return {
      category: 'RETRIEVE',
      reason: 'Stem-inferred: explicit fact retrieval (skill field empty)'
    };
  }

  // Fallback
  return {
    category: 'UNKNOWN',
    reason: `Unclassified skill: ${skill}`
  };
}

// Apply classification to all questions
const results = questions.map(q => {
  const { category, reason } = classifyQuestion(q);
  return {
    id: q.id,
    skill: q.skill,
    difficulty: q.difficulty,
    category,
    reason,
    question_stem: q.question,
  };
});

// Count distribution
const dist = {};
results.forEach(r => {
  dist[r.category] = (dist[r.category] || 0) + 1;
});

console.log('\n=== Category Distribution (All', results.length, 'questions) ===');
Object.entries(dist).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
  const pct = ((v/results.length)*100).toFixed(1);
  console.log(`${k.padEnd(10)} ${v.toString().padStart(4)}  (${pct}%)`);
});

// Check for unknowns
const unknowns = results.filter(r => r.category === 'UNKNOWN');
if (unknowns.length > 0) {
  console.log('\n⚠️  UNKNOWN classifications:');
  unknowns.forEach(u => console.log(' -', u.skill, '|', u.question_stem?.substring(0,80)));
}

// Distribution by skill × category
console.log('\n=== Skill × Category Matrix ===');
const skillCatMatrix = {};
results.forEach(r => {
  if (!skillCatMatrix[r.skill]) skillCatMatrix[r.skill] = {};
  skillCatMatrix[r.skill][r.category] = (skillCatMatrix[r.skill][r.category] || 0) + 1;
});
Object.entries(skillCatMatrix).forEach(([skill, cats]) => {
  const total = Object.values(cats).reduce((a,b)=>a+b,0);
  const catStr = Object.entries(cats).map(([k,v])=>`${k}:${v}`).join(', ');
  console.log(`${skill.substring(0,55).padEnd(55)} ${total.toString().padStart(4)}  [${catStr}]`);
});

// Save results
writeFileSync('ontology/all_questions_categorized.jsonl',
  results.map(r => JSON.stringify(r)).join('\n')
);
console.log('\n✅ Saved to ontology/all_questions_categorized.jsonl');

// Save summary JSON
const summary = {
  total: results.length,
  generated_at: new Date().toISOString(),
  category_distribution: dist,
  skill_category_matrix: skillCatMatrix,
  categories: {
    NAME: 'Select the correct label for a role/relationship/purpose defined by the text',
    RETRIEVE: 'Locate explicitly stated information in the text',
    INFER: 'Derive the conclusion that most logically follows from given premises',
    VALIDATE: 'Select evidence that most directly supports or undermines a given claim',
    RECONCILE: 'Identify how two texts\' positions logically relate',
    BUILD: 'Select from notes the sentence that achieves a stated rhetorical goal',
    APPLY: 'Apply a grammar/punctuation rule to produce the correct form',
  }
};
writeFileSync('ontology/category_summary.json', JSON.stringify(summary, null, 2));
console.log('✅ Saved to ontology/category_summary.json');
