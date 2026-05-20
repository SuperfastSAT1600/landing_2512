"""
신규 QB RW 98개 문장 구조 분석 (기존과 동일 방식)
"""
import sys
import json
import time
import re
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

INPUT_FILE = "qb_rw_98_reclassified.jsonl"
OUTPUT_FILE = "qb_rw_98_structure.jsonl"

PROMPT = """Analyze this SAT passage sentence by sentence.
For each sentence, assign exactly one logical function label from this list:
Background, Claim, Evidence, Elaboration, Contrast, Concession, Example, Definition, Problem, Solution, Finding, Conclusion

Rules:
- Background: general fact or context that sets the scene
- Claim: the main argument or thesis being made
- Evidence: data, research, or facts that support a claim
- Elaboration: further explanation of the previous sentence
- Contrast: introduces an opposing idea or reversal
- Concession: acknowledges the other side before asserting a position
- Example: a specific instance illustrating a point
- Definition: explains the meaning of a term
- Problem: identifies a difficulty or gap
- Solution: addresses a problem or offers a remedy
- Finding: result of a study or investigation
- Conclusion: final implication or takeaway

Passage:
{passage}

Return JSON only:
{{
  "sentences": [
    {{"text": "...", "label": "Background"}},
    {{"text": "...", "label": "Claim"}}
  ]
}}"""


def label_passage(passage):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": PROMPT.format(passage=passage[:1500])}],
        response_format={"type": "json_object"},
        max_tokens=1024,
        temperature=0,
    )
    result = json.loads(response.choices[0].message.content)
    return result.get("sentences", [])


def load_jsonl(path):
    records = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def process():
    records = load_jsonl(INPUT_FILE)
    targets = [r for r in records if r.get('metadata', {}).get('skill') != 'Rhetorical Synthesis']
    print(f"신규 98개 중 Rhetorical Synthesis 제외: {len(targets)}개 처리")

    results = []
    for i, r in enumerate(targets):
        passage = (r.get('content', {}).get('passage') or '').strip()
        if not passage:
            r['sentence_analysis'] = []
            r['structure_template'] = []
            results.append(r)
            continue

        try:
            sentences = label_passage(passage)
            r['sentence_analysis'] = sentences
            r['structure_template'] = [s['label'] for s in sentences if 'label' in s]
            results.append(r)
            print(f"  [{i+1:02d}/{len(targets)}] {r['metadata']['skill'][:25]}: {' → '.join(r['structure_template'])}")
            time.sleep(0.2)
        except Exception as e:
            print(f"  ERROR [{i+1}]: {e}")
            r['sentence_analysis'] = []
            r['structure_template'] = []
            results.append(r)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')

    print(f"\n저장 완료: {OUTPUT_FILE} ({len(results)}개)")


if __name__ == "__main__":
    process()
