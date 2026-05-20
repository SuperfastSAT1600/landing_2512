"""어떤 페이지/문제가 아직 파싱 안 되었는지 확인"""
import json, fitz, sys
sys.stdout.reconfigure(encoding='utf-8')

# 완료된 question_id 수집
done_ids = set()
for fname in ['math_qb_p1_42.jsonl', 'math_qb_p43_83.jsonl', 'math_qb_p1_15.jsonl']:
    try:
        with open(fname, encoding='utf-8') as f:
            for line in f:
                r = json.loads(line.strip())
                if r.get('question_id'):
                    done_ids.add(r['question_id'])
    except FileNotFoundError:
        pass

print(f"완료된 문제: {len(done_ids)}개")

# 모든 페이지에서 QID 확인
doc = fitz.open('260414 QB Math_75.pdf')
missing_pages = []
total_q_pages = 0

for i in range(len(doc)):
    text = doc[i].get_text()
    if 'Question ID' not in text:
        continue
    total_q_pages += 1
    # QID 추출
    import re
    m = re.search(r'Question ID ([0-9a-f]{8})', text)
    if m:
        qid = m.group(1)
        if qid not in done_ids:
            missing_pages.append((i+1, qid))

print(f"총 문제 페이지: {total_q_pages}개")
print(f"미완료: {len(missing_pages)}개")
for page_num, qid in missing_pages:
    print(f"  p{page_num:02d}: {qid}")
