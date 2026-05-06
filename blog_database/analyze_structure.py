"""
SAT RW 지문 문장 구조 분석
- Rhetorical Synthesis 제외
- 각 문장에 논리적 기능 레이블 부여 (GPT-4o-mini)
- 시퀀스 저장 → 클러스터링용
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

INPUT_FILE = "baseline_rw_reclassified.jsonl"
OUTPUT_FILE = "baseline_rw_structure.jsonl"
CHECKPOINT_FILE = "structure_checkpoint.json"

LABELS = [
    "Background",
    "Claim",
    "Evidence",
    "Elaboration",
    "Contrast",
    "Concession",
    "Example",
    "Definition",
    "Problem",
    "Solution",
    "Finding",
    "Conclusion",
]

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


def split_sentences(text):
    text = text.strip()
    # 마침표/느낌표/물음표 기준 분절, 약어 처리
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z\"])', text)
    return [s.strip() for s in sentences if s.strip()]


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


def load_checkpoint():
    try:
        with open(CHECKPOINT_FILE, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_checkpoint(done_ids):
    with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
        json.dump(done_ids, f)


def load_jsonl(path):
    records = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def get_id(r):
    return r.get('question_id') or r.get('id') or r.get('metadata', {}).get('question_id', '')


def get_passage(r):
    return (r.get('passage') or r.get('content', {}).get('passage', '') or '').strip()


def get_skill(r):
    return r.get('skill') or r.get('metadata', {}).get('skill', '')


def process():
    records = load_jsonl(INPUT_FILE)
    checkpoint = load_checkpoint()

    # Rhetorical Synthesis 제외
    targets = [r for r in records if get_skill(r) != 'Rhetorical Synthesis']
    print(f"전체 RW: {len(records)}개 / Rhetorical Synthesis 제외 후: {len(targets)}개")

    results = []
    skip = 0
    error = 0

    for i, r in enumerate(targets):
        qid = get_id(r)
        passage = get_passage(r)

        if not passage:
            skip += 1
            continue

        # 체크포인트: 이미 처리된 문제 스킵
        if qid and qid in checkpoint:
            r['sentence_analysis'] = checkpoint[qid]['sentence_analysis']
            r['structure_template'] = checkpoint[qid]['structure_template']
            results.append(r)
            skip += 1
            continue

        try:
            sentences = label_passage(passage)
            template = [s['label'] for s in sentences if 'label' in s]

            r['sentence_analysis'] = sentences
            r['structure_template'] = template

            if qid:
                checkpoint[qid] = {
                    'sentence_analysis': sentences,
                    'structure_template': template,
                }

            results.append(r)

            if (i + 1) % 50 == 0:
                save_checkpoint(checkpoint)
                print(f"  {i+1}/{len(targets)} 처리 완료 (skip:{skip} error:{error})")

            time.sleep(0.2)

        except Exception as e:
            print(f"  ERROR [{qid}]: {e}")
            error += 1
            r['sentence_analysis'] = []
            r['structure_template'] = []
            results.append(r)

    save_checkpoint(checkpoint)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')

    print(f"\n저장 완료: {OUTPUT_FILE}")
    print(f"처리: {len(results)}개 / skip: {skip} / error: {error}")
    return results


if __name__ == "__main__":
    process()
