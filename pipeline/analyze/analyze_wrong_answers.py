"""
오답 이유 분류 — rationale 필드 파싱 후 전수 분류
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

INPUT_BASELINE = "baseline_rw_reclassified.jsonl"
INPUT_NEW = "qb_rw_98_reclassified.jsonl"
OUTPUT = "wrong_answer_patterns.jsonl"

WRONG_CATEGORIES = [
    "Out of scope",       # 지문에 없는 내용
    "Overgeneralization", # 지문보다 넓게 주장
    "Contradiction",      # 지문과 반대
    "Distortion",         # 지문 단어 사용하지만 의미 왜곡
    "Partial match",      # 일부 조건만 충족
    "Misattribution",     # 맞는 내용이지만 주체/대상이 다름
    "Pre-pivot reading",  # but/however 이전 내용을 정답으로 오독
    "Degree error",       # 강도/범위가 지나치게 강하거나 약함
]

PROMPT = """A student got this SAT question wrong. Classify WHY this answer choice is incorrect.

Passage: {passage}
Question: {question}
Wrong answer choice {letter}: {wrong_answer}
Why it's wrong: {reason}

Classify into exactly ONE category:
- Out of scope: introduces content not in the passage
- Overgeneralization: makes a broader claim than the passage supports
- Contradiction: states the opposite of what the passage says
- Distortion: uses passage words/ideas but twists their meaning
- Partial match: only satisfies part of what the question requires
- Misattribution: correct idea but wrong subject, object, or direction
- Pre-pivot reading: focuses on the part before a contrast pivot (but/however/yet)
- Degree error: the claim is too strong or too weak relative to the passage

Return JSON: {{"category": "...", "one_line_reason": "..."}}"""


def classify_wrong(passage, question, letter, wrong_answer, reason):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": PROMPT.format(
            passage=passage[:800],
            question=question[:300],
            letter=letter,
            wrong_answer=wrong_answer[:200],
            reason=reason[:300]
        )}],
        response_format={"type": "json_object"},
        max_tokens=100,
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


def get_passage(r, source):
    if source == "baseline":
        return (r.get('passage') or '').strip()
    return (r.get('content', {}).get('passage') or r.get('passage') or '').strip()


def get_question(r, source):
    if source == "baseline":
        return (r.get('question_text') or r.get('question') or '').strip()
    return (r.get('content', {}).get('question_text') or r.get('content', {}).get('question') or '').strip()


def get_correct(r, source):
    if source == "baseline":
        return r.get('correct_answer', '')
    return r.get('content', {}).get('correct_answer', '') or r.get('correct_answer', '')





def get_choices(r, source):
    if source == "baseline":
        return r.get('choices') or r.get('answer_choices') or {}
    return r.get('content', {}).get('choices') or r.get('choices') or {}


def parse_wrong_from_rationale(rationale, correct_letter):
    wrong = {}
    parts = re.split(r'Choice ([A-D])\b', rationale)
    i = 1
    while i < len(parts) - 1:
        letter = parts[i]
        text = parts[i + 1].strip()
        if letter != correct_letter and ('incorrect' in text[:80].lower() or 'not the best' in text[:80].lower()):
            wrong[letter] = text[:400]
        i += 2
    return wrong


def get_wrong_analysis(r, source):
    if source == "baseline":
        correct = r.get('correct_answer', '')
        rationale = r.get('rationale', '')
    else:
        content = r.get('content', {})
        correct = content.get('correct_answer', '') or r.get('correct_answer', '')
        rationale = content.get('explanation', '') or content.get('rationale', '') or r.get('rationale', '')
    return parse_wrong_from_rationale(rationale, correct)


def get_skill(r, source):
    if source == "baseline":
        return r.get('skill', '')
    return r.get('metadata', {}).get('skill', '')


def get_id(r, source):
    if source == "baseline":
        return r.get('question_id') or r.get('id', '')
    return r.get('metadata', {}).get('question_id', '')


def process_all():
    baseline = load_jsonl(INPUT_BASELINE)
    new_qs = load_jsonl(INPUT_NEW)

    all_wrong = []
    total = 0
    error = 0

    for source, records in [("baseline", baseline), ("new", new_qs)]:
        targets = [r for r in records if get_skill(r, source) != 'Rhetorical Synthesis']
        print(f"\n{source}: {len(targets)}개 처리 중...")

        for i, r in enumerate(targets):
            qid = get_id(r, source)
            passage = get_passage(r, source)
            question = get_question(r, source)
            correct = get_correct(r, source)
            choices = get_choices(r, source)
            wrong_analysis = get_wrong_analysis(r, source)
            skill = get_skill(r, source)

            if not passage or not wrong_analysis:
                continue

            for letter, reason in wrong_analysis.items():
                if not reason or letter == correct:
                    continue

                wrong_text = choices.get(letter, '') if isinstance(choices, dict) else ''

                try:
                    result = classify_wrong(passage, question, letter, wrong_text, reason)
                    all_wrong.append({
                        'question_id': qid,
                        'source': source,
                        'skill': skill,
                        'letter': letter,
                        'wrong_answer': wrong_text,
                        'original_reason': reason,
                        'category': result.get('category', 'Unknown'),
                        'one_line_reason': result.get('one_line_reason', ''),
                    })
                    total += 1
                    time.sleep(0.15)

                except Exception as e:
                    error += 1

            if (i + 1) % 100 == 0:
                print(f"  {i+1}/{len(targets)} (총 오답:{total} error:{error})")

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        for w in all_wrong:
            f.write(json.dumps(w, ensure_ascii=False) + '\n')

    print(f"\n저장 완료: {OUTPUT}")
    print(f"총 오답 케이스: {total}개 / error: {error}개")
    return all_wrong


if __name__ == "__main__":
    process_all()
