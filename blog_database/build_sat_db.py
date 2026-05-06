"""
build_sat_db.py — SAT Questions SQLite Database Builder

Usage:
    python build_sat_db.py           # build (skip if DB exists)
    python build_sat_db.py --rebuild # drop and recreate
    python build_sat_db.py --verify  # run verification queries only
"""

import argparse
import json
import sqlite3
import sys
from datetime import date
from pathlib import Path

DATA_DIR = Path(__file__).parent
DB_PATH = DATA_DIR / "sat_questions.db"

# qb98 uses short skill names; expand to canonical full form matching baseline
SKILL_MAP = {
    "Central Ideas and Details": "Information and Ideas Central Ideas and Details",
    "Command of Evidence": "Information and Ideas Command of Evidence",
    "Inferences": "Information and Ideas Inferences",
    "Words in Context": "Craft and Structure Words in Context",
    "Text Structure and Purpose": "Craft and Structure Text Structure and Purpose",
    "Cross-Text Connections": "Craft and Structure Cross-Text Connections",
    "Rhetorical Synthesis": "Expression of Ideas Rhetorical Synthesis",
    "Transitions": "Expression of Ideas Transitions",
    "Boundaries": "Standard English Conventions Boundaries",
    "Form, Structure, and Sense": "Standard English Conventions Form, Structure, and Sense",
}

SCHEMA_SQL = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS questions (
    id                        TEXT PRIMARY KEY NOT NULL,
    source_batch              TEXT NOT NULL,
    source_file               TEXT,
    test                      TEXT NOT NULL DEFAULT 'SAT',
    domain                    TEXT NOT NULL DEFAULT 'Reading and Writing',
    skill                     TEXT NOT NULL,
    difficulty                TEXT NOT NULL,
    topic_category            TEXT,
    passage_topic             TEXT,
    passage                   TEXT NOT NULL,
    question                  TEXT NOT NULL,
    choices                   TEXT NOT NULL,
    correct_answer            TEXT NOT NULL,
    rationale                 TEXT,
    analysis_json             TEXT,
    correct_answer_concept    TEXT,
    incorrect_answer_analysis TEXT,
    knowledge_graph_json      TEXT,
    date_added                TEXT
);

CREATE TABLE IF NOT EXISTS cp_analysis (
    question_id               TEXT PRIMARY KEY NOT NULL REFERENCES questions(id),
    passage_type              TEXT NOT NULL,
    cp_count                  INTEGER NOT NULL,
    passage_structure_pattern TEXT NOT NULL,
    sequence_simple           TEXT NOT NULL,
    sequence_full             TEXT NOT NULL,
    ambiguous_flag            TEXT,
    cps_json                  TEXT NOT NULL,
    text1_sequence            TEXT,
    text2_sequence            TEXT
);

CREATE TABLE IF NOT EXISTS passage_structure_v1 (
    question_id               TEXT PRIMARY KEY NOT NULL REFERENCES questions(id),
    concept_structure_json    TEXT,
    structural_pattern        TEXT,
    standard_sequence_json    TEXT
);

CREATE TABLE IF NOT EXISTS wrong_answers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     TEXT NOT NULL REFERENCES questions(id),
    source          TEXT NOT NULL,
    skill           TEXT NOT NULL,
    letter          TEXT NOT NULL,
    wrong_answer    TEXT NOT NULL,
    original_reason TEXT,
    category        TEXT NOT NULL,
    one_line_reason TEXT
);

CREATE TABLE IF NOT EXISTS _meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""

INDEXES_SQL = """
CREATE INDEX IF NOT EXISTS idx_q_skill         ON questions(skill);
CREATE INDEX IF NOT EXISTS idx_q_difficulty    ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_q_topic_cat     ON questions(topic_category);
CREATE INDEX IF NOT EXISTS idx_q_passage_topic ON questions(passage_topic);
CREATE INDEX IF NOT EXISTS idx_q_source_batch  ON questions(source_batch);
CREATE INDEX IF NOT EXISTS idx_q_skill_diff    ON questions(skill, difficulty);
CREATE INDEX IF NOT EXISTS idx_cp_passage_type       ON cp_analysis(passage_type);
CREATE INDEX IF NOT EXISTS idx_cp_cp_count           ON cp_analysis(cp_count);
CREATE INDEX IF NOT EXISTS idx_cp_structure_pattern  ON cp_analysis(passage_structure_pattern);
CREATE INDEX IF NOT EXISTS idx_cp_sequence_simple    ON cp_analysis(sequence_simple);
CREATE INDEX IF NOT EXISTS idx_cp_type_count         ON cp_analysis(passage_type, cp_count);
CREATE INDEX IF NOT EXISTS idx_wa_question_id  ON wrong_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_wa_category     ON wrong_answers(category);
CREATE INDEX IF NOT EXISTS idx_wa_skill_cat    ON wrong_answers(skill, category);
"""


def jdumps(obj):
    if obj is None:
        return None
    return json.dumps(obj, ensure_ascii=False)


def load_jsonl(path):
    records = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def create_schema(conn, rebuild=False):
    cur = conn.cursor()
    if rebuild:
        for table in ["wrong_answers", "passage_structure_v1", "cp_analysis", "questions", "_meta"]:
            cur.execute(f"DROP TABLE IF EXISTS {table}")
        print("Dropped existing tables.")
    for stmt in SCHEMA_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            cur.execute(stmt)
    for stmt in INDEXES_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            cur.execute(stmt)
    conn.commit()
    print("Schema created.")


def load_baseline_questions(conn):
    path = DATA_DIR / "baseline_rw_reclassified.jsonl"
    records = load_jsonl(path)
    rows = []
    for r in records:
        kg = r.get("knowledge_graph") or {}
        passage_topic = kg.get("passage_topic") or (r.get("analysis") or {}).get("passage_topic")
        rows.append({
            "id": r["id"],
            "source_batch": "baseline",
            "source_file": r.get("source"),
            "test": r.get("test", "SAT"),
            "domain": r.get("domain", "Reading and Writing"),
            "skill": r["skill"],
            "difficulty": r["difficulty"],
            "topic_category": r.get("topic_category"),
            "passage_topic": passage_topic,
            "passage": r["passage"],
            "question": r["question"],
            "choices": jdumps(r.get("choices")),
            "correct_answer": r["correct_answer"],
            "rationale": r.get("rationale"),
            "analysis_json": jdumps(r.get("analysis")),
            "correct_answer_concept": None,
            "incorrect_answer_analysis": None,
            "knowledge_graph_json": jdumps(r.get("knowledge_graph")),
            "date_added": "2026-03-01",
        })
    conn.executemany("""
        INSERT OR IGNORE INTO questions VALUES (
            :id, :source_batch, :source_file, :test, :domain, :skill, :difficulty,
            :topic_category, :passage_topic, :passage, :question, :choices,
            :correct_answer, :rationale, :analysis_json, :correct_answer_concept,
            :incorrect_answer_analysis, :knowledge_graph_json, :date_added
        )
    """, rows)
    conn.commit()
    ids = {r["id"] for r in records}
    print(f"Baseline questions inserted: {len(rows)}")
    return ids


def load_qb98_questions(conn):
    path = DATA_DIR / "qb_rw_98_reclassified.jsonl"
    if not path.exists():
        path = DATA_DIR / "qb_rw_98_parsed.jsonl"
    records = load_jsonl(path)
    rows = []
    for r in records:
        meta = r.get("metadata", r)
        content = r.get("content", r)
        analysis = r.get("analysis", {}) or {}
        qid = meta.get("question_id") or meta.get("id")
        short_skill = meta.get("skill", "")
        full_skill = SKILL_MAP.get(short_skill, short_skill)
        rows.append({
            "id": qid,
            "source_batch": "qb98",
            "source_file": meta.get("source_file"),
            "test": "SAT",
            "domain": "Reading and Writing",
            "skill": full_skill,
            "difficulty": meta.get("difficulty"),
            "topic_category": r.get("topic_category"),
            "passage_topic": analysis.get("passage_topic"),
            "passage": content.get("passage", ""),
            "question": content.get("question_text") or content.get("question", ""),
            "choices": jdumps(content.get("choices")),
            "correct_answer": content.get("correct_answer", ""),
            "rationale": content.get("explanation") or content.get("rationale"),
            "analysis_json": None,
            "correct_answer_concept": analysis.get("correct_answer_concept"),
            "incorrect_answer_analysis": jdumps(analysis.get("incorrect_answer_analysis")),
            "knowledge_graph_json": None,
            "date_added": "2026-04-14",
        })
    conn.executemany("""
        INSERT OR IGNORE INTO questions VALUES (
            :id, :source_batch, :source_file, :test, :domain, :skill, :difficulty,
            :topic_category, :passage_topic, :passage, :question, :choices,
            :correct_answer, :rationale, :analysis_json, :correct_answer_concept,
            :incorrect_answer_analysis, :knowledge_graph_json, :date_added
        )
    """, rows)
    conn.commit()
    ids = {r["id"] for r in rows}
    print(f"QB98 questions inserted: {len(rows)}")
    return ids


def _extract_cp_row(r, question_id):
    return {
        "question_id": question_id,
        "passage_type": r.get("passage_type", ""),
        "cp_count": r.get("cp_count", 0),
        "passage_structure_pattern": r.get("passage_structure_pattern", ""),
        "sequence_simple": r.get("sequence_simple", ""),
        "sequence_full": r.get("sequence_full", ""),
        "ambiguous_flag": r.get("ambiguous_flag"),
        "cps_json": jdumps(r.get("cps", [])),
        "text1_sequence": r.get("text1_sequence"),
        "text2_sequence": r.get("text2_sequence"),
    }


def load_cp_analysis(conn, baseline_ids, qb98_ids):
    rows = []

    # Baseline CP
    for r in load_jsonl(DATA_DIR / "baseline_cp_analysis.jsonl"):
        qid = r.get("id")
        if qid not in baseline_ids:
            continue
        rows.append(_extract_cp_row(r, qid))

    # QB98 CP
    for r in load_jsonl(DATA_DIR / "qb_rw_98_cp_analysis.jsonl"):
        meta = r.get("metadata", r)
        qid = meta.get("question_id") or meta.get("id")
        if qid not in qb98_ids:
            continue
        rows.append(_extract_cp_row(r, qid))

    conn.executemany("""
        INSERT OR IGNORE INTO cp_analysis VALUES (
            :question_id, :passage_type, :cp_count, :passage_structure_pattern,
            :sequence_simple, :sequence_full, :ambiguous_flag, :cps_json,
            :text1_sequence, :text2_sequence
        )
    """, rows)
    conn.commit()
    print(f"CP analysis inserted: {len(rows)}")


def load_passage_structure(conn):
    rows = []

    def make_row(r, qid):
        return {
            "question_id": qid,
            "concept_structure_json": jdumps(r.get("concept_structure")),
            "structural_pattern": r.get("structural_pattern"),
            "standard_sequence_json": jdumps(r.get("standard_sequence")),
        }

    for r in load_jsonl(DATA_DIR / "baseline_passage_structure_v3.jsonl"):
        rows.append(make_row(r, r["id"]))

    ps_qb98 = DATA_DIR / "qb_rw_98_passage_structure_v3.jsonl"
    if ps_qb98.exists():
        for r in load_jsonl(ps_qb98):
            meta = r.get("metadata", r)
            qid = meta.get("question_id") or meta.get("id") or r.get("id")
            rows.append(make_row(r, qid))

    conn.executemany("""
        INSERT OR IGNORE INTO passage_structure_v1 VALUES (
            :question_id, :concept_structure_json, :structural_pattern, :standard_sequence_json
        )
    """, rows)
    conn.commit()
    print(f"Passage structure inserted: {len(rows)}")


def load_wrong_answers(conn):
    records = load_jsonl(DATA_DIR / "wrong_answer_patterns.jsonl")
    rows = []
    for r in records:
        cat = r.get("category", "")
        if cat:
            cat = cat.strip().title()
        rows.append({
            "question_id": r["question_id"],
            "source": r.get("source", "baseline"),
            "skill": r.get("skill", ""),
            "letter": r.get("letter", ""),
            "wrong_answer": r.get("wrong_answer", ""),
            "original_reason": r.get("original_reason"),
            "category": cat,
            "one_line_reason": r.get("one_line_reason"),
        })
    conn.executemany("""
        INSERT INTO wrong_answers
            (question_id, source, skill, letter, wrong_answer, original_reason, category, one_line_reason)
        VALUES
            (:question_id, :source, :skill, :letter, :wrong_answer, :original_reason, :category, :one_line_reason)
    """, rows)
    conn.commit()
    print(f"Wrong answers inserted: {len(rows)}")


def write_meta(conn, baseline_count, qb98_count):
    conn.executemany("INSERT OR REPLACE INTO _meta VALUES (?, ?)", [
        ("build_date", str(date.today())),
        ("baseline_count", str(baseline_count)),
        ("qb98_count", str(qb98_count)),
        ("total_count", str(baseline_count + qb98_count)),
        ("schema_version", "1"),
    ])
    conn.commit()


def verify(conn):
    checks = [
        ("V1  Total questions", "SELECT COUNT(*) FROM questions", lambda n: n == 1609),
        ("V2a Baseline count", "SELECT COUNT(*) FROM questions WHERE source_batch='baseline'", lambda n: n == 1511),
        ("V2b QB98 count", "SELECT COUNT(*) FROM questions WHERE source_batch='qb98'", lambda n: n == 98),
        ("V5  CP analysis count", "SELECT COUNT(*) FROM cp_analysis", lambda n: n >= 1400),
        ("V6  RS has no CP", """
            SELECT COUNT(*) FROM questions q LEFT JOIN cp_analysis cp ON q.id=cp.question_id
            WHERE q.skill LIKE '%Rhetorical Synthesis%' AND cp.question_id IS NULL
        """, lambda n: n == 188),
        ("V8a Wrong answers total", "SELECT COUNT(*) FROM wrong_answers", lambda n: n == 3528),
        ("V8b Unique WA questions", "SELECT COUNT(DISTINCT question_id) FROM wrong_answers", lambda n: n >= 1190),
        ("V9  No orphan WA", """
            SELECT COUNT(*) FROM wrong_answers wa
            WHERE NOT EXISTS (SELECT 1 FROM questions q WHERE q.id=wa.question_id)
        """, lambda n: n == 0),
        ("V10 Passage structure", "SELECT COUNT(*) FROM passage_structure_v1", lambda n: n >= 1590),
        ("V15 Category normalized", """
            SELECT COUNT(*) FROM wrong_answers
            WHERE category != RTRIM(LTRIM(category))
               OR SUBSTR(category,1,1) = LOWER(SUBSTR(category,1,1))
        """, lambda n: n == 0),
        ("V17 No null id/skill/diff", "SELECT COUNT(*) FROM questions WHERE id IS NULL OR skill IS NULL OR difficulty IS NULL", lambda n: n == 0),
    ]

    all_pass = True
    print("\n=== Verification ===")
    for label, sql, expect in checks:
        result = conn.execute(sql).fetchone()[0]
        ok = expect(result)
        status = "PASS" if ok else "FAIL"
        if not ok:
            all_pass = False
        print(f"  [{status}] {label}: {result}")

    # Spot-check queries (just run, no assertion)
    print("\n--- Spot checks ---")
    rows = conn.execute("""
        SELECT q.skill, COUNT(*) n FROM questions q
        JOIN cp_analysis cp ON q.id=cp.question_id
        WHERE q.difficulty='Hard' AND cp.passage_type='ARG'
        GROUP BY q.skill ORDER BY n DESC LIMIT 3
    """).fetchall()
    print(f"  Hard ARG questions by skill: {rows}")

    rows = conn.execute("""
        SELECT category, COUNT(*) n FROM wrong_answers GROUP BY category ORDER BY n DESC LIMIT 5
    """).fetchall()
    print(f"  Top wrong answer categories: {rows}")

    rows = conn.execute("""
        SELECT skill, COUNT(*) n FROM questions WHERE source_batch='qb98' GROUP BY skill ORDER BY n DESC
    """).fetchall()
    print(f"  QB98 skill distribution: {rows}")

    return all_pass


def main():
    parser = argparse.ArgumentParser(description="Build SAT questions SQLite DB")
    parser.add_argument("--rebuild", action="store_true", help="Drop and recreate all tables")
    parser.add_argument("--verify", action="store_true", help="Run verification queries only")
    args = parser.parse_args()

    if args.verify:
        if not DB_PATH.exists():
            print(f"DB not found: {DB_PATH}")
            sys.exit(1)
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA foreign_keys = ON")
        ok = verify(conn)
        conn.close()
        sys.exit(0 if ok else 1)

    if DB_PATH.exists() and not args.rebuild:
        print(f"DB already exists: {DB_PATH}")
        print("Use --rebuild to recreate, or --verify to check.")
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA foreign_keys = ON")
        verify(conn)
        conn.close()
        return

    print(f"Building: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        create_schema(conn, rebuild=args.rebuild)
        baseline_ids = load_baseline_questions(conn)
        qb98_ids = load_qb98_questions(conn)
        load_cp_analysis(conn, baseline_ids, qb98_ids)
        load_passage_structure(conn)
        load_wrong_answers(conn)
        write_meta(conn, len(baseline_ids), len(qb98_ids))
        ok = verify(conn)
        print(f"\nDB built: {DB_PATH} ({DB_PATH.stat().st_size / 1024 / 1024:.1f} MB)")
        if not ok:
            print("WARNING: Some verification checks failed.")
    except Exception as e:
        conn.close()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
