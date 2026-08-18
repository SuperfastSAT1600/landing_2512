"""baseline_cp_analysis.jsonl의 빈 skill 필드 복구"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

OUTPUT = "baseline_cp_analysis.jsonl"

# 소스에서 ID→skill 매핑 구축
skill_map = {}
sources = [
    "baseline_rw_reclassified.jsonl",
    "missing_cp_analysis.jsonl",
    "missing_to_label.jsonl",
    "../master_sat_ontology_v3.jsonl",
]

for src in sources:
    try:
        with open(src, encoding='utf-8') as f:
            for line in f:
                r = json.loads(line.strip())
                qid = r.get('id','') or r.get('metadata',{}).get('question_id','')
                sk = r.get('skill','') or r.get('metadata',{}).get('skill','')
                if qid and sk and qid not in skill_map:
                    skill_map[qid] = sk
    except FileNotFoundError:
        pass

print(f"skill 소스: {len(skill_map)}개 ID")

# baseline_cp_analysis.jsonl 읽기 + 수정
records = []
with open(OUTPUT, encoding='utf-8') as f:
    for line in f:
        records.append(json.loads(line.strip()))

fixed = 0
still_empty = []
for r in records:
    if not r.get('skill','').strip():
        qid = r.get('id','')
        if qid in skill_map:
            r['skill'] = skill_map[qid]
            fixed += 1
        else:
            still_empty.append(qid)

print(f"수정: {fixed}개")
print(f"여전히 빈 것: {len(still_empty)}개")
if still_empty:
    print("미복구 IDs:", still_empty[:10])

# 덮어쓰기
with open(OUTPUT, 'w', encoding='utf-8') as f:
    for r in records:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

print(f"저장 완료: {len(records)}개")
