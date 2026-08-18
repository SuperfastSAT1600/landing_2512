"""
구조 패턴 클러스터링 — 상위 패턴 + 예시 출력
"""
import sys
import json
import argparse
from collections import Counter
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()

INPUT_BASELINE = "baseline_passage_structure.jsonl"
INPUT_NEW = "qb_rw_98_passage_structure.jsonl"


def load_jsonl(path):
    records = []
    try:
        with open(path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
    except FileNotFoundError:
        print(f"파일 없음: {path}")
    return records


def get_passage(r):
    return (r.get('passage') or r.get('content', {}).get('passage', '') or '')[:200]


def get_skill(r):
    return r.get('skill') or r.get('metadata', {}).get('skill', '')


def print_top(pattern_groups, top_n=20):
    print(f"\n{'='*65}")
    print(f"  구조 패턴 Top {top_n}")
    print(f"{'='*65}")
    ranked = sorted(pattern_groups.items(), key=lambda x: -len(x[1]))[:top_n]
    for rank, (pattern, records) in enumerate(ranked, 1):
        example = get_passage(records[0])
        skill = get_skill(records[0])
        print(f"\n[{rank:02d}] {len(records):4d}회  {pattern}")
        print(f"       Skill: {skill}")
        print(f"       예시: {example[:150]}...")


def semantic_group(patterns, client):
    prompt = f"""Group these SAT passage structural patterns into 10-15 named clusters.
Each cluster should represent a recurring rhetorical structure type.

Patterns (one per line):
{chr(10).join(f'- {p}' for p in patterns[:200])}

Return JSON:
{{
  "clusters": [
    {{
      "name": "cluster name",
      "patterns": ["pattern1", "pattern2", ...]
    }}
  ]
}}"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=3000,
        temperature=0,
    )
    return json.loads(response.choices[0].message.content).get('clusters', [])


def run(semantic=False):
    baseline = load_jsonl(INPUT_BASELINE)
    new_qs = load_jsonl(INPUT_NEW)
    all_records = baseline + new_qs

    valid = [r for r in all_records if r.get('structural_pattern')]
    print(f"전체 레코드: {len(all_records)} / 패턴 있음: {len(valid)}")

    # 1. 정규화 기반 빈도 집계
    pattern_groups = {}
    for r in valid:
        key = r['structural_pattern'].strip().lower()
        pattern_groups.setdefault(key, []).append(r)

    print(f"고유 패턴 수: {len(pattern_groups)}")
    print_top(pattern_groups)

    # 2. 시맨틱 그룹핑 (--semantic 플래그 시)
    if semantic:
        dotenv.load_dotenv()
        client = OpenAI()
        unique_patterns = list(pattern_groups.keys())
        print(f"\n시맨틱 그룹핑 중 ({len(unique_patterns)}개 패턴)...")
        clusters = semantic_group(unique_patterns, client)

        print(f"\n{'='*65}")
        print(f"  시맨틱 클러스터 ({len(clusters)}개)")
        print(f"{'='*65}")
        for c in clusters:
            name = c.get('name', '')
            members = c.get('patterns', [])
            total = sum(len(pattern_groups.get(p, [])) for p in members)
            example_records = []
            for p in members:
                example_records.extend(pattern_groups.get(p, []))
            example = get_passage(example_records[0]) if example_records else ''
            print(f"\n[{name}] — {total}회")
            print(f"  예시: {example[:120]}...")
            for p in members[:3]:
                print(f"  - {p}")
            if len(members) > 3:
                print(f"  ... 외 {len(members)-3}개")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--semantic", action="store_true", help="GPT 시맨틱 그룹핑 실행")
    args = parser.parse_args()
    run(semantic=args.semantic)
