import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import path from 'path';
import readline from 'readline';
import type { SATQuestion } from '../app/api/ontology/schema';

const CORPUS_PATH = path.join(process.cwd(), 'master_sat_ontology_v2.jsonl');

let cache: SATQuestion[] | null = null;

/**
 * Loads and caches the SAT ontology corpus from the JSONL file.
 * Subsequent calls return the in-memory cache without re-reading disk.
 *
 * @returns Array of SATQuestion records (empty if file not found)
 */
export async function loadCorpus(): Promise<SATQuestion[]> {
  if (cache !== null) return cache;

  try {
    await access(CORPUS_PATH);
  } catch {
    console.warn(`[ontology] Corpus file not found at ${CORPUS_PATH}. Returning empty corpus.`);
    cache = [];
    return cache;
  }

  const questions: SATQuestion[] = [];
  const fileStream = createReadStream(CORPUS_PATH, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as SATQuestion;
      questions.push(parsed);
    } catch {
      console.warn(`[ontology] Failed to parse line: ${trimmed.slice(0, 80)}`);
    }
  }

  cache = questions;
  return cache;
}

/** Clears the module-scope cache (useful for tests). */
export function clearCorpusCache(): void {
  cache = null;
}
