"""
concept_structure의 function 레이블 시퀀스 기반 패턴 클러스터링
1. 고유 function 레이블 추출
2. GPT로 ~12개 표준 어휘에 매핑
3. 표준 시퀀스 빈도 집계 → Top 패턴 출력
"""
import sys
import json
import time
from collections import Counter
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

INPUT_BASELINE = "baseline_passage_structure.jsonl"

STANDARD_LABELS = [
    "INTRODUCE",     # 인물/주제/소재 소개 (첫 등장)
    "BACKGROUND",    # 역사적 배경, 일반 사실, 상황 설정
    "CLAIM",         # 핵심 주장, 논제, 테제
    "EVIDENCE",      # 주장을 뒷받침하는 근거/데이터
    "FEATURE",       # 주제/인물의 특징, 속성, 성질 설명
    "ACTION",        # 누군가가 한 행동, 업적, 절차
    "ELABORATION",   # 앞 내용의 단순 부연/확장 설명
    "PIVOT",         # but/however 등으로 방향 전환
    "QUALIFY",       # 조건, 예외, 한계, 단서
    "PROBLEM",       # 문제 제기, 도전, 격차
    "FINDING",       # 연구/조사 결과
    "EXAMPLE",       # 구체적 예시
    "IMPLICATION",   # 결론, 함의, 의의
    "BLANK",         # 빈칸 (Words in Context / Form·Structure)
]

MAP_PROMPT = """You have a list of function descriptions extracted from SAT passage concept analyses.
Map each description to exactly one of these standard labels:

INTRODUCE - first mention of a person, subject, or topic being discussed
BACKGROUND - historical context, general facts, scene-setting before the main point
CLAIM - the main argument, thesis, assertion, or position of the passage
EVIDENCE - data, statistics, or research that supports a claim
FEATURE - characteristics, attributes, or properties of the subject (NOT actions)
ACTION - something a person/group did, accomplished, or performed
ELABORATION - simple expansion or clarification of the immediately preceding point
PIVOT - a contrast or reversal using but, however, yet, instead, rather
QUALIFY - a condition, exception, limitation, or caveat on a claim
PROBLEM - a challenge, issue, gap, difficulty, or question introduced
FINDING - the result of a study, experiment, or investigation
EXAMPLE - a concrete instance or illustration of a general point
IMPLICATION - conclusion, significance, takeaway, or what something means
BLANK - the missing word/phrase element in the passage

Descriptions to map (one per line):
{descriptions}

Return JSON: {{"mappings": {{"description": "STANDARD_LABEL", ...}}}}"""


def load_jsonl(path):
    records = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def extract_all_functions(records):
    funcs = set()
    for r in records:
        for c in r.get('concept_structure', []):
            fn = c.get('function', '').strip().lower()
            if fn:
                funcs.add(fn)
    return sorted(funcs)


def batch_map(functions, batch_size=80):
    mapping = {}
    batches = [functions[i:i+batch_size] for i in range(0, len(functions), batch_size)]
    print(f"고유 function 레이블: {len(functions)}개 → {len(batches)}개 배치로 매핑")

    for i, batch in enumerate(batches):
        desc_str = '\n'.join(f'- {f}' for f in batch)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": MAP_PROMPT.format(descriptions=desc_str)}],
            response_format={"type": "json_object"},
            max_tokens=2000,
            temperature=0,
        )
        result = json.loads(response.choices[0].message.content)
        mappings = result.get('mappings', {})
        for desc, label in mappings.items():
            if label in STANDARD_LABELS:
                mapping[desc] = label
            else:
                mapping[desc] = 'ELABORATION'  # fallback
        print(f"  배치 {i+1}/{len(batches)} 완료 ({len(mapping)}개 매핑됨)")
        time.sleep(0.3)

    return mapping


def apply_mapping(records, mapping):
    for r in records:
        seq = []
        for c in r.get('concept_structure', []):
            fn = c.get('function', '').strip().lower()
            label = mapping.get(fn, 'DETAIL')
            seq.append(label)
        r['standard_sequence'] = seq
    return records


def print_top_patterns(records, top_n=20):
    valid = [r for r in records if r.get('standard_sequence')]
    seq_counter = Counter(
        ' → '.join(r['standard_sequence']) for r in valid
    )

    print(f"\n{'='*65}")
    print(f"  표준 시퀀스 Top {top_n}  (전체 유효: {len(valid)}개)")
    print(f"{'='*65}")

    for rank, (seq, cnt) in enumerate(seq_counter.most_common(top_n), 1):
        # 예시 지문 1개
        example = next(
            (r for r in valid if ' → '.join(r['standard_sequence']) == seq), None
        )
        passage = ''
        if example:
            passage = (example.get('passage') or '')[:100]
        pct = cnt / len(valid) * 100
        print(f"\n[{rank:02d}] {cnt:4d}회 ({pct:.1f}%)  {seq}")
        if passage:
            print(f"      예: {passage}...")

    # skill별 top 3
    print(f"\n{'='*65}")
    print("  Skill별 Top 3 시퀀스")
    print(f"{'='*65}")

    from collections import defaultdict
    by_skill = defaultdict(list)
    for r in valid:
        skill = r.get('skill', '').split()[-1] if r.get('skill') else '?'
        by_skill[skill].append(' → '.join(r['standard_sequence']))

    for skill in ['Context', 'Details', 'Evidence', 'Inferences',
                  'Connections', 'Purpose', 'Transitions', 'Synthesis',
                  'Boundaries', 'Sense']:
        if skill not in by_skill:
            continue
        top3 = Counter(by_skill[skill]).most_common(3)
        print(f"\n  [{skill}] (n={len(by_skill[skill])})")
        for seq, cnt in top3:
            print(f"    {cnt:3d}회  {seq}")


def save_mapping(mapping, path="function_label_mapping_v2.json"):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    print(f"매핑 저장: {path}")


def save_records(records, path="baseline_passage_structure_v3.jsonl"):
    with open(path, 'w', encoding='utf-8') as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    print(f"레코드 저장: {path}")


if __name__ == "__main__":
    records = load_jsonl(INPUT_BASELINE)
    valid = [r for r in records if r.get('concept_structure')]
    print(f"로드: {len(records)}개 / concept_structure 있음: {len(valid)}개")

    # 1. 고유 function 추출
    all_funcs = extract_all_functions(valid)
    print(f"고유 function 레이블: {len(all_funcs)}개")

    # 2. GPT 매핑
    mapping = batch_map(all_funcs)
    save_mapping(mapping)

    # 3. 표준 시퀀스 적용
    records = apply_mapping(records, mapping)
    save_records(records)

    # 4. Top 패턴 출력
    print_top_patterns(records)
