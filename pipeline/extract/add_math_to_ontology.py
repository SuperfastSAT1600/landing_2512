"""math_qb_parsed.jsonl → master_sat_ontology_v3.jsonl 추가 (미추가분)"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

ONT = "../master_sat_ontology_v3.jsonl"
MATH = "math_qb_parsed.jsonl"

# 온톨로지 기존 ID
ont_ids = set()
with open(ONT, encoding='utf-8') as f:
    for line in f:
        r = json.loads(line.strip())
        qid = r.get('id','') or r.get('metadata',{}).get('question_id','')
        ont_ids.add(qid)

print(f"기존 온톨로지: {len(ont_ids)}개")

# Math 레코드 추가
added = 0
with open(MATH, encoding='utf-8') as f, open(ONT, 'a', encoding='utf-8') as out:
    for line in f:
        r = json.loads(line.strip())
        qid = r.get('question_id','')
        if qid and qid not in ont_ids:
            entry = {
                "id": qid,
                "subject": "Math",
                "domain": r.get('domain',''),
                "skill": r.get('skill',''),
                "difficulty": r.get('difficulty',''),
                "date_added": "2026-04-30",
                "content": {
                    "question_text": r.get('question_text',''),
                    "choices": r.get('choices'),
                    "correct_answer": r.get('correct_answer',''),
                    "explanation": r.get('explanation',''),
                    "has_figure": r.get('has_figure', False),
                    "figure_description": r.get('figure_description'),
                    "question_type": r.get('question_type','multiple_choice'),
                    "latex": True,
                },
                "source_file": r.get('source_file',''),
            }
            out.write(json.dumps(entry, ensure_ascii=False) + "\n")
            added += 1
            print(f"  추가: {qid} [{r.get('difficulty')}] {r.get('domain','')}")

print(f"\n온톨로지 추가 완료: {added}개")
print(f"온톨로지 총합: {len(ont_ids) + added}개")
