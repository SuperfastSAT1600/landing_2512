"""
신규 98개에 표준 레이블 매핑 적용 + 기존+신규 합산 패턴 비교
"""
import sys
import json
import time
from collections import Counter, defaultdict
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

INPUT_NEW = "qb_rw_98_passage_structure.jsonl"
INPUT_BASELINE_V3 = "baseline_passage_structure_v3.jsonl"
OUTPUT_NEW_V3 = "qb_rw_98_passage_structure_v3.jsonl"
MAPPING_FILE = "function_label_mapping_v2.json"

STANDARD_LABELS = [
    "INTRODUCE", "BACKGROUND", "CLAIM", "EVIDENCE",
    "FEATURE", "ACTION", "ELABORATION", "PIVOT",
    "QUALIFY", "PROBLEM", "FINDING", "EXAMPLE",
    "IMPLICATION", "BLANK",
]

MAP_PROMPT = """Map each function description to exactly one standard label:

INTRODUCE - first mention of a person, subject, or topic
BACKGROUND - historical context, general facts, scene-setting
CLAIM - main argument, thesis, assertion, position
EVIDENCE - data, statistics, research supporting a claim
FEATURE - characteristics, attributes, or properties of the subject
ACTION - something a person/group did, accomplished, or performed
ELABORATION - simple expansion or clarification of the preceding point
PIVOT - contrast or reversal using but, however, yet, instead
QUALIFY - condition, exception, limitation, caveat
PROBLEM - a challenge, issue, gap, or difficulty introduced
FINDING - result of a study, experiment, or investigation
EXAMPLE - a concrete instance or illustration
IMPLICATION - conclusion, significance, takeaway
BLANK - the missing word/phrase element in the passage

Descriptions to map:
{descriptions}

Return JSON: {{"mappings": {{"description": "STANDARD_LABEL", ...}}}}"""


def load_jsonl(path):
    records = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def load_mapping():
    with open(MAPPING_FILE, encoding='utf-8') as f:
        return json.load(f)


def get_skill(r):
    return r.get('metadata', {}).get('skill', '')


def map_new_functions(records, existing_mapping):
    # 신규에서 기존 매핑에 없는 function 추출
    new_funcs = set()
    for r in records:
        for c in r.get('concept_structure', []):
            fn = c.get('function', '').strip().lower()
            if fn and fn not in existing_mapping:
                new_funcs.add(fn)

    print(f"신규 고유 function: {len(new_funcs)}개 중 매핑 필요: {len(new_funcs)}개")

    new_mapping = {}
    if new_funcs:
        funcs = list(new_funcs)
        batches = [funcs[i:i+80] for i in range(0, len(funcs), 80)]
        for batch in batches:
            desc_str = '\n'.join(f'- {f}' for f in batch)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": MAP_PROMPT.format(descriptions=desc_str)}],
                response_format={"type": "json_object"},
                max_tokens=2000,
                temperature=0,
            )
            result = json.loads(response.choices[0].message.content)
            for desc, label in result.get('mappings', {}).items():
                new_mapping[desc] = label if label in STANDARD_LABELS else 'ELABORATION'
            time.sleep(0.3)

    return {**existing_mapping, **new_mapping}


def apply_mapping(records, mapping):
    for r in records:
        seq = []
        for c in r.get('concept_structure', []):
            fn = c.get('function', '').strip().lower()
            label = mapping.get(fn, 'ELABORATION')
            seq.append(label)
        r['standard_sequence'] = seq
    return records


def print_comparison(baseline, new_qs):
    b_valid = [r for r in baseline if r.get('standard_sequence') and 'Synthesis' not in r.get('skill', '')]
    n_valid = [r for r in new_qs if r.get('standard_sequence') and get_skill(r) != 'Rhetorical Synthesis']

    b_seqs = Counter(' → '.join(r['standard_sequence']) for r in b_valid)
    n_seqs = Counter(' → '.join(r['standard_sequence']) for r in n_valid)

    print(f"\n{'='*65}")
    print(f"  기존 vs 신규 — Top 15 패턴 비교")
    print(f"  기존: {len(b_valid)}개 / 신규: {len(n_valid)}개")
    print(f"{'='*65}")
    print(f"\n  {'패턴':<45} {'기존':>10} {'신규':>10}")
    print(f"  {'─'*45} {'─'*10} {'─'*10}")

    all_patterns = set(list(b_seqs.keys())[:20] + list(n_seqs.keys())[:20])
    ranked = sorted(all_patterns, key=lambda p: -(b_seqs.get(p,0) + n_seqs.get(p,0)))

    for p in ranked[:20]:
        b = b_seqs.get(p, 0)
        n = n_seqs.get(p, 0)
        b_pct = b / len(b_valid) * 100
        n_pct = n / len(n_valid) * 100
        flag = ' ▲' if n_pct > b_pct + 3 else (' ▼' if n_pct < b_pct - 3 else '')
        print(f"  {p:<45} {b:3d}({b_pct:.1f}%) {n:3d}({n_pct:.1f}%){flag}")

    # 신규에만 있는 패턴
    new_only = [(p, c) for p, c in n_seqs.most_common() if p not in b_seqs]
    if new_only:
        print(f"\n  [ 신규에만 등장한 패턴 ]")
        for p, c in new_only[:10]:
            print(f"  {c:3d}회  {p}")


if __name__ == "__main__":
    print("=== 신규 98개 표준 레이블 매핑 ===")
    new_records = load_jsonl(INPUT_NEW)
    existing_mapping = load_mapping()

    combined_mapping = map_new_functions(new_records, existing_mapping)
    new_records = apply_mapping(new_records, combined_mapping)

    with open(OUTPUT_NEW_V3, 'w', encoding='utf-8') as f:
        for r in new_records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    print(f"저장: {OUTPUT_NEW_V3}")

    print("\n=== 기존 + 신규 패턴 비교 ===")
    baseline = load_jsonl(INPUT_BASELINE_V3)
    print_comparison(baseline, new_records)
