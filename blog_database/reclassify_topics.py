"""
8-category topic reclassification
- Rule-based for known labels
- GPT fallback for Science / Unknown
"""
import sys
import json
import time
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

BASELINE = "../master_sat_ontology_v2.jsonl"
NEW_FILE = "qb_rw_98_parsed.jsonl"
OUTPUT_BASELINE = "baseline_rw_reclassified.jsonl"
OUTPUT_NEW = "qb_rw_98_reclassified.jsonl"

CATEGORIES = [
    "Literature",
    "History",
    "Social Science",
    "Life Science",
    "Physical Science",
    "Earth & Environment",
    "Technology & Engineering",
    "Art & Music",
]

RULE_MAP = {
    # Literature
    "Literature": "Literature",
    "Poetry": "Literature",
    "Memoir": "Literature",
    "Fiction": "Literature",
    "Novel": "Literature",
    "Science Fiction": "Literature",
    # History
    "History": "History",
    "History - Biography": "History",
    "Historical Political Actions": "History",
    "Historical Voyage": "History",
    "Science History": "History",
    "Film History": "History",
    "Art History": "History",
    # Social Science
    "Social Science": "Social Science",
    "Economics": "Social Science",
    "Psychology": "Social Science",
    "Psychological Study": "Social Science",
    "Anthropology": "Social Science",
    "Sociology": "Social Science",
    "Linguistics": "Social Science",
    "Language": "Social Science",
    "Archaeology": "Social Science",
    "Political Science": "Social Science",
    "Cultural Studies": "Social Science",
    "Culture": "Social Science",
    "Cultural Practice": "Social Science",
    "Education": "Social Science",
    "Law": "Social Science",
    "Media": "Social Science",
    "Media Studies": "Social Science",
    "Family Relations": "Social Science",
    "Global Trade Incident": "Social Science",
    "Current Events": "Social Science",
    "Sports": "Social Science",
    # Life Science
    "Biology": "Life Science",
    "Marine Biology": "Life Science",
    "Wildlife Biology": "Life Science",
    "Biological Sciences": "Life Science",
    "Zoology": "Life Science",
    "Ornithology": "Life Science",
    "Animal Behavior": "Life Science",
    "Neuroscience": "Life Science",
    "Ecology": "Life Science",
    "Health": "Life Science",
    "Nature Conservation": "Life Science",
    "Agriculture": "Life Science",
    "Science - Ecology": "Life Science",
    # Physical Science
    "Physics": "Physical Science",
    "Chemistry": "Physical Science",
    "Astronomy": "Physical Science",
    "Material Science": "Physical Science",
    "Science - Glaciology": "Physical Science",
    # Earth & Environment
    "Geography": "Earth & Environment",
    "Geology": "Earth & Environment",
    "Environmental Science": "Earth & Environment",
    "Environmental Studies": "Earth & Environment",
    "Environment": "Earth & Environment",
    "Meteorology": "Earth & Environment",
    "Earth Sciences": "Earth & Environment",
    # Technology & Engineering
    "Technology": "Technology & Engineering",
    "Architecture": "Technology & Engineering",
    "Engineering": "Technology & Engineering",
    "Inventions": "Technology & Engineering",
    "Design": "Technology & Engineering",
    "Civic Design": "Technology & Engineering",
    "Urban Planning": "Technology & Engineering",
    "Transportation": "Technology & Engineering",
    "Publishing": "Technology & Engineering",
    # Art & Music
    "Art": "Art & Music",
    "Arts": "Art & Music",
    "Art and Design": "Art & Music",
    "Art and Fashion": "Art & Music",
    "Art and Science": "Art & Music",
    "Art and Perception": "Art & Music",
    "Art Criticism": "Art & Music",
    "Art - Sculpture": "Art & Music",
    "Art/Film": "Art & Music",
    "Arts and Culture": "Art & Music",
    "Music": "Art & Music",
    "Music and Society": "Art & Music",
    "Dance": "Art & Music",
    "Film": "Art & Music",
    "Film Production": "Art & Music",
    "Craftsmanship": "Art & Music",
    "Craft": "Art & Music",
    "Craft and Structure": "Art & Music",
    "Recreation": "Art & Music",
    "Games": "Art & Music",
    "Business": "Social Science",
    "Paleontology": "Life Science",
    "Philosophy": "Social Science",
    "Autobiography": "Literature",
}

GPT_PROMPT = """Classify this SAT passage into exactly one of these 8 categories:
1. Literature — fiction, poetry, memoir, novel
2. History — historical events, biography, political history
3. Social Science — economics, psychology, sociology, linguistics, anthropology
4. Life Science — biology, ecology, zoology, medicine, neuroscience, agriculture
5. Physical Science — physics, chemistry, astronomy, materials science
6. Earth & Environment — geology, geography, climate, environmental science
7. Technology & Engineering — engineering, computing, invention, architecture
8. Art & Music — visual art, music, dance, film, performing arts

Passage:
{passage}

Reply with ONLY the category name from the list above. Nothing else."""


def get_raw_topic(r, source):
    if source == "baseline":
        kg = r.get('knowledge_graph') or {}
        t = kg.get('passage_topic', '') if isinstance(kg, dict) else ''
        if not t:
            an = r.get('analysis') or {}
            t = an.get('passage_topic', '') if isinstance(an, dict) else ''
        return (t or '').strip()
    else:
        an = r.get('analysis') or {}
        return (an.get('passage_topic', '') or '').strip()


def get_passage(r, source):
    if source == "baseline":
        return (r.get('passage') or '').strip()
    else:
        return (r.get('content', {}).get('passage') or '').strip()


def gpt_classify(passage):
    if not passage:
        return "Unknown"
    snippet = passage[:800]
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": GPT_PROMPT.format(passage=snippet)}],
        max_tokens=20,
        temperature=0,
    )
    result = response.choices[0].message.content.strip()
    for cat in CATEGORIES:
        if cat.lower() in result.lower():
            return cat
    return "Unknown"


def classify(r, source):
    raw = get_raw_topic(r, source)
    if raw in RULE_MAP:
        return RULE_MAP[raw], "rule"
    # GPT fallback for Science / Unknown / unmapped
    passage = get_passage(r, source)
    cat = gpt_classify(passage)
    return cat, f"gpt({raw})"


def load_jsonl(path):
    records = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def process(records, source, output_path):
    results = []
    gpt_count = 0
    rule_count = 0

    for i, r in enumerate(records):
        cat, method = classify(r, source)
        r['topic_category'] = cat
        results.append(r)

        if method.startswith("gpt"):
            gpt_count += 1
            time.sleep(0.3)

        if method.startswith("rule"):
            rule_count += 1

        if (i + 1) % 50 == 0 or (i + 1) == len(records):
            print(f"  {i+1}/{len(records)} — rule:{rule_count} gpt:{gpt_count}")

    with open(output_path, 'w', encoding='utf-8') as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')

    print(f"  -> {output_path} 저장 완료")
    return results


def print_distribution(records, label):
    from collections import Counter
    cats = Counter(r.get('topic_category', 'Unknown') for r in records)
    total = len(records)
    print(f"\n{'─'*55}")
    print(f"  {label} (n={total})")
    print(f"{'─'*55}")
    for cat in CATEGORIES:
        n = cats.get(cat, 0)
        print(f"  {cat:<30} {n:4d} ({n/total*100:.1f}%)")
    if cats.get('Unknown', 0):
        print(f"  {'Unknown':<30} {cats['Unknown']:4d}")


if __name__ == "__main__":
    print("=== 기존 RW 1,511개 재분류 ===")
    baseline_all = load_jsonl(BASELINE)
    baseline = [r for r in baseline_all if r.get('domain') == 'Reading and Writing']
    baseline_results = process(baseline, "baseline", OUTPUT_BASELINE)
    print_distribution(baseline_results, "기존 RW corpus")

    print("\n=== 신규 QB RW 98개 재분류 ===")
    new_qs = load_jsonl(NEW_FILE)
    new_results = process(new_qs, "new", OUTPUT_NEW)
    print_distribution(new_results, "신규 QB RW98")

    print("\n=== 비교 ===")
    from collections import Counter
    b_cats = Counter(r.get('topic_category', 'Unknown') for r in baseline_results)
    n_cats = Counter(r.get('topic_category', 'Unknown') for r in new_results)
    b_total = len(baseline_results)
    n_total = len(new_results)
    print(f"\n  {'카테고리':<30} {'기존':>14} {'신규(98)':>14}")
    print(f"  {'─'*30} {'─'*14} {'─'*14}")
    for cat in CATEGORIES:
        b = b_cats.get(cat, 0)
        n = n_cats.get(cat, 0)
        flag = " ▲" if n/n_total > b/b_total + 0.05 else (" ▼" if n/n_total < b/b_total - 0.05 else "")
        print(f"  {cat:<30} {b:4d} ({b/b_total*100:.1f}%)  {n:4d} ({n/n_total*100:.1f}%){flag}")

    print(f"\n{'='*55}")
    print("  완료")
    print(f"{'='*55}")
