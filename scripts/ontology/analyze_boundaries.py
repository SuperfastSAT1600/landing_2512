"""
Boundaries question analysis: punctuation × difficulty crosstab + distractor patterns.
"""

import json
import re
from collections import defaultdict

JSONL_PATH = "C:/vibecoding/landing_2512/master_sat_ontology_v2.jsonl"

# ---------------------------------------------------------------------------
# Punctuation classification
# ---------------------------------------------------------------------------
PUNCT_PATTERNS = [
    ("semicolon",    re.compile(r";", re.IGNORECASE)),
    ("colon",        re.compile(r":", re.IGNORECASE)),
    ("em_dash",      re.compile(r"—|--", re.IGNORECASE)),
    ("comma",        re.compile(r",", re.IGNORECASE)),
    ("period",       re.compile(r"\.", re.IGNORECASE)),
]
PUNCT_LABELS = ["semicolon", "colon", "em_dash", "comma", "period", "no_punct"]


def classify_punct(text: str) -> str:
    """Return the dominant punctuation type in a choice text."""
    for label, pat in PUNCT_PATTERNS:
        if pat.search(text):
            return label
    return "no_punct"


# ---------------------------------------------------------------------------
# Load Boundaries questions
# ---------------------------------------------------------------------------
questions = []
with open(JSONL_PATH, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        if "Boundaries" in obj.get("skill", ""):
            questions.append(obj)

print(f"Total Boundaries questions loaded: {len(questions)}\n")

# ---------------------------------------------------------------------------
# Annotate each question
# ---------------------------------------------------------------------------
for q in questions:
    correct_key = q["correct_answer"].strip().upper()
    choices = q.get("choices", {})

    # Correct answer punctuation
    correct_text = choices.get(correct_key, "")
    q["_correct_punct"] = classify_punct(correct_text)

    # Distractor (wrong answer) punctuation list
    distractors = []
    for key, text in choices.items():
        if key.strip().upper() != correct_key:
            distractors.append(classify_punct(text))
    q["_distractors"] = distractors

difficulties = ["Easy", "Medium", "Hard"]

# ---------------------------------------------------------------------------
# 1. Correct-punctuation × difficulty crosstab
# ---------------------------------------------------------------------------
# Count
cross = defaultdict(lambda: defaultdict(int))
for q in questions:
    cross[q["_correct_punct"]][q["difficulty"]] += 1

total_by_diff = defaultdict(int)
for q in questions:
    total_by_diff[q["difficulty"]] += 1

grand_total = len(questions)

print("=" * 70)
print("1. CORRECT PUNCTUATION × DIFFICULTY CROSSTAB")
print("=" * 70)

# Header
header = f"{'Correct Punct':<14}" + "".join(f"{d:>10}" for d in difficulties) + f"{'Total':>10}"
print(header)
print("-" * len(header))

row_totals = {}
for punct in PUNCT_LABELS:
    counts = [cross[punct][d] for d in difficulties]
    row_total = sum(counts)
    row_totals[punct] = row_total
    row = f"{punct:<14}" + "".join(f"{c:>10}" for c in counts) + f"{row_total:>10}"
    print(row)

# Totals row
print("-" * len(header))
tots = [total_by_diff[d] for d in difficulties]
print(f"{'TOTAL':<14}" + "".join(f"{t:>10}" for t in tots) + f"{grand_total:>10}")

# Row-% table (% within each punct type across difficulties)
print()
print("Row % (within punct type):")
print(f"{'Correct Punct':<14}" + "".join(f"{d:>10}" for d in difficulties))
print("-" * (14 + 30))
for punct in PUNCT_LABELS:
    counts = [cross[punct][d] for d in difficulties]
    row_total = row_totals[punct]
    if row_total == 0:
        pcts = ["   0.0%"] * 3
    else:
        pcts = [f"{c/row_total*100:>9.1f}%" for c in counts]
    print(f"{punct:<14}" + "".join(pcts))

# Column-% table (% within each difficulty column)
print()
print("Column % (within difficulty):")
print(f"{'Correct Punct':<14}" + "".join(f"{d:>10}" for d in difficulties))
print("-" * (14 + 30))
for punct in PUNCT_LABELS:
    counts = [cross[punct][d] for d in difficulties]
    pcts = []
    for d, c in zip(difficulties, counts):
        base = total_by_diff[d]
        pcts.append(f"{c/base*100:>9.1f}%" if base else "   0.0%")
    print(f"{punct:<14}" + "".join(pcts))


# ---------------------------------------------------------------------------
# 2. Per correct-punct: distractor punctuation breakdown
# ---------------------------------------------------------------------------
print()
print("=" * 70)
print("2. DISTRACTOR PUNCTUATION % BY CORRECT PUNCTUATION TYPE")
print("   (what wrong-answer choices contain, when the correct answer is X)")
print("=" * 70)

dist_counts = defaultdict(lambda: defaultdict(int))  # [correct_punct][distractor_punct]
dist_totals = defaultdict(int)  # [correct_punct] total distractors

for q in questions:
    cp = q["_correct_punct"]
    for dp in q["_distractors"]:
        dist_counts[cp][dp] += 1
        dist_totals[cp] += 1

# Header
print(f"{'Correct→':<14}" + "".join(f"{p:>12}" for p in PUNCT_LABELS))
print("-" * (14 + 12 * len(PUNCT_LABELS)))

for cp in PUNCT_LABELS:
    total = dist_totals[cp]
    if total == 0:
        pcts = ["        —"] * len(PUNCT_LABELS)
    else:
        pcts = [f"{dist_counts[cp][dp]/total*100:>11.1f}%" for dp in PUNCT_LABELS]
    n_label = f"{cp}(n={row_totals[cp]})"
    print(f"{n_label:<14}" + "".join(pcts))


# ---------------------------------------------------------------------------
# 3. Semicolon-correct and Comma-correct: Easy vs Hard distractor comparison
# ---------------------------------------------------------------------------
print()
print("=" * 70)
print("3. EASY vs HARD DISTRACTOR PATTERNS")
print("=" * 70)

def distractor_breakdown(questions, correct_punct, difficulty):
    counts = defaultdict(int)
    total = 0
    for q in questions:
        if q["_correct_punct"] == correct_punct and q["difficulty"] == difficulty:
            for dp in q["_distractors"]:
                counts[dp] += 1
                total += 1
    return counts, total

for focus_punct in ["semicolon", "comma"]:
    print()
    print(f"  Correct answer = {focus_punct.upper()}")
    print(f"  {'Distractor Punct':<16}" +
          "".join(f"{d:>18}" for d in ["Easy", "Hard"]))
    print("  " + "-" * (16 + 36))

    easy_counts, easy_total = distractor_breakdown(questions, focus_punct, "Easy")
    hard_counts, hard_total = distractor_breakdown(questions, focus_punct, "Hard")

    n_easy = sum(1 for q in questions if q["_correct_punct"] == focus_punct and q["difficulty"] == "Easy")
    n_hard = sum(1 for q in questions if q["_correct_punct"] == focus_punct and q["difficulty"] == "Hard")
    print(f"  {'Questions':16}  n={n_easy:<6}  (distractors={easy_total})    n={n_hard:<6}  (distractors={hard_total})")
    print()

    for dp in PUNCT_LABELS:
        e_pct = f"{easy_counts[dp]/easy_total*100:.1f}%" if easy_total else "—"
        h_pct = f"{hard_counts[dp]/hard_total*100:.1f}%" if hard_total else "—"
        e_cell = f"n={easy_counts[dp]} ({e_pct})"
        h_cell = f"n={hard_counts[dp]} ({h_pct})"
        print(f"  {dp:<16}{e_cell:>18}{h_cell:>18}")

print()
print("Done.")
