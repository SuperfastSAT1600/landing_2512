"""
master_sat_ontology_v3.jsonl 생성
- baseline_rw_reclassified.jsonl (1,511개) + date_added: 2026-03-01
- qb_rw_98_reclassified.jsonl (98개)    + date_added: 2026-04-14
- Math 문제 (domain != Reading and Writing) 원본에서 그대로 복사
"""
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

BASELINE_RW = "baseline_rw_reclassified.jsonl"
NEW_RW = "qb_rw_98_reclassified.jsonl"
BASELINE_ORIG = "../master_sat_ontology_v2.jsonl"
OUTPUT = "../master_sat_ontology_v3.jsonl"


def load_jsonl(path):
    records = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


# 1. RW 기존 문제 (재분류 완료본)
rw_baseline = load_jsonl(BASELINE_RW)
for r in rw_baseline:
    r['date_added'] = '2026-03-01'

# 2. RW 신규 98문제
rw_new = load_jsonl(NEW_RW)
for r in rw_new:
    r['date_added'] = '2026-04-14'

# 3. Math 문제 — 원본에서 그대로 (RW 아닌 것들)
orig_all = load_jsonl(BASELINE_ORIG)
math_records = [r for r in orig_all if r.get('domain') != 'Reading and Writing']
for r in math_records:
    r['date_added'] = '2026-03-01'

all_records = rw_baseline + rw_new + math_records

with open(OUTPUT, 'w', encoding='utf-8') as f:
    for r in all_records:
        f.write(json.dumps(r, ensure_ascii=False) + '\n')

print(f"RW 기존:  {len(rw_baseline):4d}개  (2026-03-01)")
print(f"RW 신규:  {len(rw_new):4d}개  (2026-04-14)")
print(f"Math:     {len(math_records):4d}개  (2026-03-01)")
print(f"총계:     {len(all_records):4d}개")
print(f"저장 완료: {OUTPUT}")
