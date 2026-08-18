"""
SAT RW 지문 concept 단위 구조 패턴 분석
- Rhetorical Synthesis 제외
- 100개 단위 배치 처리 + 사람이 검토 후 계속 여부 결정
"""
import sys
import json
import time
import random
import argparse
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

INPUT_BASELINE = "baseline_rw_reclassified.jsonl"
INPUT_NEW = "qb_rw_98_reclassified.jsonl"
OUTPUT_BASELINE = "baseline_passage_structure.jsonl"
OUTPUT_NEW = "qb_rw_98_passage_structure.jsonl"
CHECKPOINT = "passage_structure_checkpoint.json"

PROMPT = """You are analyzing the conceptual structure of a short SAT Reading and Writing passage.

Your task is NOT to split by periods. Instead, identify the meaningful CONCEPT UNITS in this passage — chunks of meaning that serve a distinct function in the text as a whole. A concept unit may be part of a sentence, a full sentence, or span multiple sentences.

For each concept unit:
1. Quote the exact text (or a shortened version if long)
2. Describe its function in the passage as a whole (e.g., "introduces the subject", "pivots to the real topic using 'but'", "provides concrete evidence", "qualifies the claim with a condition")

Then describe the OVERALL STRUCTURAL PATTERN of this passage in one line — what kind of text is this, how does it move from start to finish?

Passage:
{passage}

Return JSON:
{{
  "concepts": [
    {{
      "text": "...",
      "function": "..."
    }}
  ],
  "structural_pattern": "one-line description of the overall pattern"
}}"""


def analyze_passage(passage):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": PROMPT.format(passage=passage[:1500])}],
        response_format={"type": "json_object"},
        max_tokens=800,
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)


def load_jsonl(path):
    records = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def load_checkpoint():
    try:
        with open(CHECKPOINT, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_checkpoint(cp):
    with open(CHECKPOINT, 'w', encoding='utf-8') as f:
        json.dump(cp, f)


def get_id(r, source):
    if source == "baseline":
        return r.get('question_id') or r.get('id', '')
    return r.get('metadata', {}).get('question_id', '')


def get_passage(r, source):
    if source == "baseline":
        return (r.get('passage') or '').strip()
    return (r.get('content', {}).get('passage') or '').strip()


def get_skill(r, source):
    if source == "baseline":
        return r.get('skill', '')
    return r.get('metadata', {}).get('skill', '')


def print_samples(batch, k=5):
    samples = random.sample(batch, min(k, len(batch)))
    print(f"\n{'='*60}")
    print(f"  배치 검토 샘플 ({len(samples)}개)")
    print(f"{'='*60}")
    for i, r in enumerate(samples, 1):
        skill = r.get('skill') or r.get('metadata', {}).get('skill', '')
        passage = r.get('passage') or r.get('content', {}).get('passage', '')
        concepts = r.get('concept_structure', [])
        pattern = r.get('structural_pattern', '')

        print(f"\n--- Sample {i} ---")
        print(f"Skill  : {skill}")
        print(f"Passage: {passage[:150]}{'...' if len(passage) > 150 else ''}")
        print("Concepts:")
        for j, c in enumerate(concepts, 1):
            fn = c.get('function', '')
            tx = c.get('text', '')[:80]
            print(f"  {j}. [{fn}] {tx}")
        print(f"Pattern: {pattern}")
    print(f"\n{'='*60}")


def save_partial(results, output_path):
    with open(output_path, 'w', encoding='utf-8') as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')


def process(records, source, output_path, batch_size=100, no_review=False):
    cp = load_checkpoint()
    results = []
    batch_results = []
    skip = error = api_calls = 0
    start_time = time.time()

    targets = [r for r in records if get_skill(r, source) != 'Rhetorical Synthesis']
    print(f"대상: {len(targets)}개 (Rhetorical Synthesis 제외)")

    for i, r in enumerate(targets):
        qid = get_id(r, source)
        passage = get_passage(r, source)
        ck_key = f"{source}_{qid}" if qid else f"{source}_{i}"

        if not passage:
            r['concept_structure'] = []
            r['structural_pattern'] = ''
            results.append(r)
            skip += 1
            continue

        # 체크포인트 복원 (배치 카운트에 포함 안 함)
        if ck_key in cp:
            r['concept_structure'] = cp[ck_key]['concept_structure']
            r['structural_pattern'] = cp[ck_key]['structural_pattern']
            results.append(r)
            skip += 1
            continue

        try:
            result = analyze_passage(passage)
            r['concept_structure'] = result.get('concepts', [])
            r['structural_pattern'] = result.get('structural_pattern', '')

            cp[ck_key] = {
                'concept_structure': r['concept_structure'],
                'structural_pattern': r['structural_pattern'],
            }
            results.append(r)
            batch_results.append(r)
            api_calls += 1
            time.sleep(0.2)

        except Exception as e:
            print(f"  ERROR [{qid}]: {e}")
            r['concept_structure'] = []
            r['structural_pattern'] = ''
            results.append(r)
            error += 1

        # 배치 단위 검토
        if not no_review and len(batch_results) >= batch_size:
            elapsed = time.time() - start_time
            eta = elapsed / api_calls * (len(targets) - i - 1) if api_calls else 0
            print(f"\n[배치 완료] {api_calls}개 분석 / 경과 {elapsed/60:.1f}분 / 예상 잔여 {eta/60:.1f}분")
            save_checkpoint(cp)
            print_samples(batch_results)
            batch_results = []

            ans = input("계속 진행할까요? (y/n): ").strip().lower()
            if ans != 'y':
                save_partial(results, output_path)
                print(f"\n중단. 현재까지 {len(results)}개 저장 → {output_path}")
                print("재실행하면 체크포인트에서 이어집니다.")
                sys.exit(0)

    save_checkpoint(cp)
    save_partial(results, output_path)

    elapsed = time.time() - start_time
    print(f"\n완료: {output_path}")
    print(f"총 {len(results)}개 / API 호출 {api_calls}회 / skip {skip} / error {error} / {elapsed/60:.1f}분")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["baseline", "new"], default="baseline", nargs="?")
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--no-review", action="store_true")
    args = parser.parse_args()

    if args.mode == "new":
        print("=== 신규 98개 구조 분석 ===")
        records = load_jsonl(INPUT_NEW)
        process(records, "new", OUTPUT_NEW, args.batch_size, no_review=True)
    else:
        print("=== 기존 1,511개 구조 분석 ===")
        records = load_jsonl(INPUT_BASELINE)
        process(records, "baseline", OUTPUT_BASELINE, args.batch_size, args.no_review)
