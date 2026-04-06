// Unified SAT Question Ontology Schema
// Merges blog_database (nested + analysis) and master_sat_ontology (flat + knowledge_graph) formats

export type SATDomain = 'Reading and Writing' | 'Math';
export type SATDifficulty = 'Easy' | 'Medium' | 'Hard';
export type AnswerChoice = 'A' | 'B' | 'C' | 'D';

export type SATSkill =
  // Craft and Structure
  | 'Craft and Structure Words in Context'
  | 'Craft and Structure Text Structure and Purpose'
  | 'Craft and Structure Cross-Text Connections'
  // Information and Ideas
  | 'Information and Ideas Central Ideas and Details'
  | 'Information and Ideas Command of Evidence'
  | 'Information and Ideas Inferences'
  // Standard English Conventions
  | 'Standard English Conventions Boundaries'
  | 'Standard English Conventions Form, Structure, and Sense'
  // Expression of Ideas
  | 'Expression of Ideas Rhetorical Synthesis'
  | 'Expression of Ideas Transitions';

export interface KnowledgeGraph {
  parent_concept: string;
  prerequisite: string;
  passage_topic?: string;
  concept_tags?: string[];
}

// Skill-specific analysis fields (preserved from blog_database)
export interface TransitionsAnalysis {
  target_transition_category: string;
  sentence_1_summary: string;
  sentence_2_summary: string;
  passage_topic: string;
}

export interface WICAnalysis {
  target_word_pos: string;
  passage_logical_flow: string;
  passage_topic: string;
  synonyms_for_correct_answer: string[];
}

export type SkillAnalysis = TransitionsAnalysis | WICAnalysis | Record<string, unknown>;

export interface SATQuestion {
  id: string;               // 8-char hex, unique per question
  test: 'SAT';
  domain: SATDomain;
  skill: SATSkill | string; // string fallback for new skills
  difficulty: SATDifficulty;
  passage: string;
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: AnswerChoice;
  rationale: string;
  knowledge_graph: KnowledgeGraph;
  analysis?: SkillAnalysis;  // skill-specific enrichment from blog_database
  source: string;            // original source file
}

// CB skill → domain mapping (for migration scripts)
export const SKILL_TO_DOMAIN: Record<string, SATDomain> = {
  'Craft and Structure Words in Context': 'Reading and Writing',
  'Craft and Structure Text Structure and Purpose': 'Reading and Writing',
  'Craft and Structure Cross-Text Connections': 'Reading and Writing',
  'Information and Ideas Central Ideas and Details': 'Reading and Writing',
  'Information and Ideas Command of Evidence': 'Reading and Writing',
  'Information and Ideas Inferences': 'Reading and Writing',
  'Standard English Conventions Boundaries': 'Reading and Writing',
  'Standard English Conventions Form, Structure, and Sense': 'Reading and Writing',
  'Expression of Ideas Rhetorical Synthesis': 'Reading and Writing',
  'Expression of Ideas Transitions': 'Reading and Writing',
};

// Source file → CB skill (for blog_database migration)
export const SOURCE_TO_SKILL: Record<string, SATSkill> = {
  transitions: 'Expression of Ideas Transitions',
  words_in_context: 'Craft and Structure Words in Context',
  boundaries: 'Standard English Conventions Boundaries',
  form_structure_sense: 'Standard English Conventions Form, Structure, and Sense',
  rhetorical_synthesis: 'Expression of Ideas Rhetorical Synthesis',
  text_structure_purpose: 'Craft and Structure Text Structure and Purpose',
};
