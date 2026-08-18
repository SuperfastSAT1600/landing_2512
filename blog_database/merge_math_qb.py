"""모든 Math QB 파싱 결과 병합 → math_qb_parsed.jsonl"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

SOURCES = [
    "math_qb_p1_42.jsonl",
    "math_qb_p43_83.jsonl",
    "math_qb_p1_15.jsonl",
    "math_qb_retry.jsonl",
]

seen = {}  # question_id → record (중복 제거)
for src in SOURCES:
    try:
        with open(src, encoding='utf-8') as f:
            for line in f:
                r = json.loads(line.strip())
                qid = r.get('question_id','')
                if qid and qid not in seen:
                    seen[qid] = r
        print(f"로드: {src}")
    except FileNotFoundError:
        print(f"없음: {src}")

print(f"\n중복 제거 후: {len(seen)}개")

# 최종 저장
with open("math_qb_parsed.jsonl", 'w', encoding='utf-8') as f:
    for r in seen.values():
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

print(f"저장 완료: math_qb_parsed.jsonl")

# 통계
difficulties = {}
domains = {}
has_latex = 0
has_fig = 0
for r in seen.values():
    d = r.get('difficulty','?')
    difficulties[d] = difficulties.get(d,0)+1
    dom = r.get('domain','?')
    domains[dom] = domains.get(dom,0)+1
    if '$' in r.get('question_text',''):
        has_latex += 1
    if r.get('has_figure'):
        has_fig += 1

print("\n=== 통계 ===")
print(f"총 문제: {len(seen)}개")
print(f"LaTeX 포함: {has_latex}개 ({100*has_latex//len(seen)}%)")
print(f"Figure 있음: {has_fig}개 ({100*has_fig//len(seen)}%)")
print("\n난이도:")
for k,v in sorted(difficulties.items()):
    print(f"  {k}: {v}개")
print("\n도메인:")
for k,v in sorted(domains.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}개")
