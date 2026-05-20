"""
SAT RW 지문 CP 분절 + I/C/CL 라벨링
cp_sequence_analysis_agent.md 기반 전면 재실행

사용법:
  python cp_analyzer.py baseline --headless --concurrency 10
  python cp_analyzer.py new --headless --concurrency 10
  python cp_analyzer.py validate
"""
import sys
import json
import time
import asyncio
import argparse
import os
from pathlib import Path
from openai import AsyncOpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()

client = AsyncOpenAI()

# ── 파일 경로 ──────────────────────────────────────────────
INPUT_BASELINE    = "baseline_rw_reclassified.jsonl"
INPUT_NEW         = "qb_rw_98_reclassified.jsonl"
INPUT_CROSS_TEXT  = "cross_text_new_5.jsonl"
INPUT_RETRY       = "retry_14.jsonl"
INPUT_MISSING     = "missing_to_label.jsonl"
OUTPUT_BASELINE   = "baseline_cp_analysis.jsonl"
OUTPUT_NEW        = "qb_rw_98_cp_analysis.jsonl"
OUTPUT_CROSS_TEXT = "cross_text_new_5_cp_analysis.jsonl"
OUTPUT_RETRY      = "retry_14_cp_analysis.jsonl"
OUTPUT_MISSING    = "missing_cp_analysis.jsonl"
CHECKPOINT        = "cp_checkpoint.json"
ERROR_LOG         = "cp_error_log.jsonl"

# ── 라벨 상수 ─────────────────────────────────────────────
VALID_PASSAGE_TYPES = {"ARG", "EXP", "LIT"}
VALID_BASE_LABELS   = {"I", "C", "CL"}
VALID_CONNECTORS    = {
    "CONN_ADD", "CONN_CONT", "CONN_CAUSE", "CONN_COMP",
    "CONN_EMPH", "CONN_SEQ", "CONN_EX", "CONN_NONE"
}

# ── 프롬프트 ──────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert at analyzing SAT Reading & Writing passages.
Segment each passage into Concept Points (CPs) and label them.

SEGMENTATION RULES:
- CP boundaries: periods (.), semicolons (;), contrast/causal connectors BEFORE a comma
  (however, but, yet, although, despite, therefore, thus, as a result, consequently)
- NOT boundaries: ", which/who/where..." relative clauses, colon elaborations ": ...",
  interrupting modifiers "—...—", introductory modifiers "Despite X, ..." or "In 2020, ..."
- One sentence CAN have 2 CPs if "but/however" splits it into two independent ideas

PASSAGE TYPE (assign one to the whole passage):
- ARG: author or cited subject advocates, critiques, or evaluates — value-laden language present
- EXP: informational only — facts, process, definition, causation — no author judgment
- LIT: fiction, poetry, or memoir excerpt — narrative/character/emotion central

CP LABELS (assign one per CP):
- I  (Information): facts, background, data, process, definition — NO value judgment
- C  (Claim): assertion, evaluation, advocacy, critique — IS value-laden
- CL (Conclusion): final synthesis or takeaway — summarizes preceding CPs

SUFFIXES for I: _bg (introductory background), _sup (supports prior claim/evidence), _ex (concrete example)
SUFFIXES for C or CL: _au (author's own voice), _ot (reporting others' voice), _ct (counter-argument), _rb (rebuttal of counter)
Combine as needed: C_ct_ot = counter from another person, C_rb_au = author's rebuttal

CONNECTOR to next CP (what connects THIS CP to the NEXT one):
CONN_ADD  = furthermore/moreover/also/in addition
CONN_CONT = however/yet/but/on the other hand/nevertheless/although/despite
CONN_CAUSE= therefore/thus/as a result/consequently/hence/so
CONN_COMP = similarly/likewise/in comparison/by contrast
CONN_EMPH = indeed/in fact/certainly/notably
CONN_SEQ  = first/next/then/finally/subsequently
CONN_EX   = for example/for instance/such as/specifically
CONN_NONE = no explicit connector (period or semicolon only)

VALIDATION RULES you must follow:
- ARG passages must have at least one C or CL
- CL can only appear at the last or second-to-last position
- sequence_simple = passage_type + "_" + base labels joined by "-" (no suffixes)
- sequence_full = passage_type + "_" + full labels joined by "-"
- last connector_to_next must be null"""

USER_PROMPT = """Passage:
{passage}

Return only valid JSON (no markdown, no explanation):
{{
  "passage_type": "ARG|EXP|LIT",
  "cps": [
    {{
      "text": "exact excerpt from passage",
      "label": "I|C|CL",
      "label_full": "I_bg|C_au|CL_au|...",
      "connector_to_next": "CONN_CONT|CONN_NONE|...|null"
    }}
  ],
  "sequence_full": "ARG_I_bg-C_au-I_sup-CL_au",
  "sequence_simple": "ARG_I-C-I-CL"
}}"""

FEW_SHOT = [
    {
        "role": "user",
        "content": USER_PROMPT.format(passage=(
            "Rejecting the premise that the literary magazine Ebony and Topaz (1927) should present "
            "a unified vision of Black American identity, editor Charles S. Johnson fostered his "
            "contributors' diverse perspectives. Johnson's self-effacement diverged from the editorial "
            "stance of W.E.B. Du Bois and Alain Locke, whose decisions for their publications were "
            "more ______."
        ))
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "passage_type": "ARG",
            "cps": [
                {
                    "text": "Rejecting the premise that the literary magazine Ebony and Topaz (1927) should present a unified vision of Black American identity, editor Charles S. Johnson fostered his contributors' diverse perspectives.",
                    "label": "C",
                    "label_full": "C_au",
                    "connector_to_next": "CONN_CONT"
                },
                {
                    "text": "Johnson's self-effacement diverged from the editorial stance of W.E.B. Du Bois and Alain Locke, whose decisions for their publications were more ______.",
                    "label": "CL",
                    "label_full": "CL_au",
                    "connector_to_next": None
                }
            ],
            "sequence_full": "ARG_C_au-CL_au",
            "sequence_simple": "ARG_C-CL"
        }, ensure_ascii=False)
    },
    {
        "role": "user",
        "content": USER_PROMPT.format(passage=(
            "Ruth Asawa was an accomplished artist who worked in many art forms, including her unique "
            "tied-wire sculptures. She became known for her intricate wire figures and hanging "
            "sculptures that she created by looping wire in a technique she learned in Mexico. "
            "Her interest in using wire as a sculptural medium led her to experiment with different "
            "gauges and types of wire to achieve varying visual effects."
        ))
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "passage_type": "EXP",
            "cps": [
                {
                    "text": "Ruth Asawa was an accomplished artist who worked in many art forms, including her unique tied-wire sculptures.",
                    "label": "I",
                    "label_full": "I_bg",
                    "connector_to_next": "CONN_ADD"
                },
                {
                    "text": "She became known for her intricate wire figures and hanging sculptures that she created by looping wire in a technique she learned in Mexico.",
                    "label": "I",
                    "label_full": "I",
                    "connector_to_next": "CONN_ADD"
                },
                {
                    "text": "Her interest in using wire as a sculptural medium led her to experiment with different gauges and types of wire to achieve varying visual effects.",
                    "label": "CL",
                    "label_full": "CL",
                    "connector_to_next": None
                }
            ],
            "sequence_full": "EXP_I_bg-I-CL",
            "sequence_simple": "EXP_I-I-CL"
        }, ensure_ascii=False)
    }
]


# ── 데이터 로딩 ───────────────────────────────────────────
def get_id(r, source):
    if source == "baseline":
        return r.get("id") or r.get("question_id", "")
    return r.get("metadata", {}).get("question_id", "")


def get_passage(r, source):
    if source == "baseline":
        return (r.get("passage") or "").strip()
    return (r.get("content", {}).get("passage") or "").strip()


def get_skill(r, source):
    if source == "baseline":
        return r.get("skill", "")
    return r.get("metadata", {}).get("skill", "")


def get_difficulty(r, source):
    if source == "baseline":
        return r.get("difficulty", "")
    return r.get("metadata", {}).get("difficulty", "")


def load_jsonl(path):
    records = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


# ── 체크포인트 ────────────────────────────────────────────
def load_checkpoint():
    try:
        with open(CHECKPOINT, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_checkpoint(cp):
    with open(CHECKPOINT, "w", encoding="utf-8") as f:
        json.dump(cp, f, ensure_ascii=False)


# ── 에러 로그 ─────────────────────────────────────────────
def log_error(qid, source, reason):
    entry = {
        "qid": qid,
        "source": source,
        "reason": reason,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
    }
    with open(ERROR_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ── Passage Structure Pattern 자동 도출 ──────────────────
def derive_structure_pattern(sequence_full: str) -> str:
    # passage_type 제거 후 CP 라벨 추출
    parts = sequence_full.split("_", 1)
    if len(parts) < 2:
        return "UNKNOWN"
    labels_str = parts[1]
    labels = [l.strip() for l in labels_str.split("-") if l.strip()]
    base = [l.split("_")[0] for l in labels]

    has_c  = any(b == "C" for b in base)
    has_cl = any(b == "CL" for b in base)
    has_ct = any("_ct" in l for l in labels)
    has_rb = any("_rb" in l for l in labels)

    if has_ct or has_rb:
        return "COUNTER_REBUTTAL"
    if not has_c and not has_cl:
        return "PURE_INFO"
    if has_cl and not has_c:
        return "INFO_TO_CONCL"
    c_count = sum(1 for b in base if b == "C")
    if c_count >= 2:
        # 마지막이 CL이고 앞에 C 구조이면 CLASSICAL_ARG
        if base[-1] == "CL":
            return "CLASSICAL_ARG"
        return "DUAL_CLAIM"
    if base[-1] in ("CL", "C"):
        return "CLAIM_EVIDENCE"
    return "CLAIM_EVIDENCE"


# ── 검증 ─────────────────────────────────────────────────
def validate_result(result: dict, qid: str) -> tuple[bool, str]:
    pt = result.get("passage_type", "")
    if pt not in VALID_PASSAGE_TYPES:
        return False, f"invalid passage_type: {pt}"

    cps = result.get("cps", [])
    if not cps:
        return False, "no CPs"

    seq_simple = result.get("sequence_simple", "")
    seq_labels = seq_simple.split("_", 1)[-1].split("-") if "_" in seq_simple else []

    if len(seq_labels) != len(cps):
        return False, f"cp_count mismatch: {len(cps)} CPs vs {len(seq_labels)} in sequence"

    base_labels = [l.split("_")[0] for l in seq_labels]
    if pt == "ARG" and not any(b in ("C", "CL") for b in base_labels):
        return False, "ARG passage has no C or CL"

    for cp in cps:
        lbl = cp.get("label", "")
        if lbl not in VALID_BASE_LABELS:
            return False, f"invalid label: {lbl}"
        conn = cp.get("connector_to_next")
        if conn is not None and conn not in VALID_CONNECTORS:
            return False, f"invalid connector: {conn}"

    return True, ""


# ── API 호출 (재시도 포함) ────────────────────────────────
async def call_api(passage: str, semaphore: asyncio.Semaphore, max_retries: int = 3):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *FEW_SHOT,
        {"role": "user", "content": USER_PROMPT.format(passage=passage[:2000])}
    ]
    for attempt in range(max_retries):
        try:
            async with semaphore:
                resp = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    response_format={"type": "json_object"},
                    max_tokens=1200,
                    temperature=0,
                )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            err_str = str(e)
            if attempt < max_retries - 1 and ("429" in err_str or "503" in err_str):
                wait = 2 ** attempt
                await asyncio.sleep(wait)
                continue
            raise


# ── 단일 레코드 처리 ──────────────────────────────────────
async def process_one(r, source, semaphore, cp_cache):
    qid     = get_id(r, source)
    passage = get_passage(r, source)
    skill   = get_skill(r, source)
    ck_key  = f"{source}_{qid}"

    # 빈 passage
    if not passage:
        log_error(qid, source, "passage 없음")
        return None

    # RS 제외
    if "Rhetorical" in skill:
        return None

    # 체크포인트 복원
    if ck_key in cp_cache:
        cached = cp_cache[ck_key]
        return {**r, **cached}

    try:
        result = await call_api(passage, semaphore)
    except Exception as e:
        log_error(qid, source, f"API 오류: {e}")
        return None

    # sequence를 GPT 응답이 아닌 cps 배열에서 직접 파생 (mismatch 방지)
    cps = result.get("cps", [])
    pt  = result.get("passage_type", "EXP")
    if cps:
        full_labels   = [cp.get("label_full") or cp.get("label", "I") for cp in cps]
        simple_labels = [cp.get("label", "I") for cp in cps]
        result["sequence_full"]   = f"{pt}_" + "-".join(full_labels)
        result["sequence_simple"] = f"{pt}_" + "-".join(simple_labels)

    ok, reason = validate_result(result, qid)
    if not ok:
        log_error(qid, source, f"검증 실패: {reason}")
        result["ambiguous_flag"] = reason

    result["passage_structure_pattern"] = derive_structure_pattern(
        result.get("sequence_full", "")
    )

    cp_data = {
        "passage_type":              result.get("passage_type"),
        "cp_count":                  len(cps),
        "cps":                       cps,
        "sequence_full":             result.get("sequence_full", ""),
        "sequence_simple":           result.get("sequence_simple", ""),
        "passage_structure_pattern": result.get("passage_structure_pattern"),
        "ambiguous_flag":            result.get("ambiguous_flag", ""),
    }
    cp_cache[ck_key] = cp_data
    return {**r, **cp_data}


# ── 배치 처리 ─────────────────────────────────────────────
async def process_all(records, source, output_path, concurrency, headless, batch_size=100):
    cp_cache = load_checkpoint()
    semaphore = asyncio.Semaphore(concurrency)

    targets = [r for r in records if "Rhetorical" not in get_skill(r, source)]
    print(f"\n대상: {len(targets)}개 (RS 제외)")
    already = sum(1 for r in targets if f"{source}_{get_id(r,source)}" in cp_cache)
    print(f"  체크포인트 복원: {already}개 / 신규 처리: {len(targets)-already}개\n")

    results = []
    api_count = error_count = 0
    start = time.time()

    for batch_start in range(0, len(targets), batch_size):
        batch = targets[batch_start: batch_start + batch_size]

        tasks = [process_one(r, source, semaphore, cp_cache) for r in batch]
        batch_results = await asyncio.gather(*tasks)

        for res in batch_results:
            if res is not None:
                results.append(res)
                ck_key = f"{source}_{get_id(res, source)}"
                if ck_key in cp_cache and "passage_type" in res:
                    api_count += 1
            else:
                error_count += 1

        save_checkpoint(cp_cache)

        done  = batch_start + len(batch)
        elapsed = time.time() - start
        rate  = done / elapsed if elapsed > 0 else 0
        eta   = (len(targets) - done) / rate if rate > 0 else 0
        print(f"[{done}/{len(targets)}] 경과 {elapsed/60:.1f}분 / 예상 잔여 {eta/60:.1f}분 / 에러 {error_count}개")

        if not headless and done < len(targets):
            ans = input("계속? (y/n): ").strip().lower()
            if ans != "y":
                break

    # 저장
    with open(output_path, "w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    elapsed = time.time() - start
    print(f"\n완료 → {output_path}")
    print(f"저장: {len(results)}개 / API 호출: {api_count}회 / 에러: {error_count}개 / {elapsed/60:.1f}분")


# ── 검증 리포트 ───────────────────────────────────────────
def validate_report():
    from collections import Counter

    for path, label in [(OUTPUT_BASELINE, "baseline"), (OUTPUT_NEW, "new")]:
        if not Path(path).exists():
            print(f"{path}: 없음")
            continue

        records = load_jsonl(path)
        pt_counter    = Counter()
        pattern_counter = Counter()
        seq_counter   = Counter()
        ambiguous     = 0

        for r in records:
            pt = r.get("passage_type", "")
            pt_counter[pt] += 1
            pattern_counter[r.get("passage_structure_pattern", "")] += 1
            seq_counter[r.get("sequence_simple", "")] += 1
            if r.get("ambiguous_flag"):
                ambiguous += 1

        total = len(records)
        print(f"\n=== {label} ({total}개) ===")

        print("Passage Type:")
        for k, v in pt_counter.most_common():
            print(f"  {k}: {v} ({v/total*100:.1f}%)")

        print("Structure Pattern:")
        for k, v in pattern_counter.most_common():
            print(f"  {k}: {v} ({v/total*100:.1f}%)")

        top_seqs = seq_counter.most_common(15)
        top_coverage = sum(v for _, v in top_seqs)
        print(f"Top 15 시퀀스 커버리지: {top_coverage}/{total} ({top_coverage/total*100:.1f}%)")
        for seq, cnt in top_seqs:
            print(f"  {cnt:3d}회  {seq}")

        unique = len(seq_counter)
        print(f"고유 시퀀스 수: {unique}")
        print(f"Ambiguous 레코드: {ambiguous}")


# ── 메인 ─────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["baseline", "new", "cross_text", "retry", "missing", "validate"])
    parser.add_argument("--headless",    action="store_true")
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--batch-size",  type=int, default=100)
    args = parser.parse_args()

    if args.mode == "validate":
        validate_report()
        return

    if args.mode == "baseline":
        records     = load_jsonl(INPUT_BASELINE)
        output_path = OUTPUT_BASELINE
        source      = "baseline"
    elif args.mode == "cross_text":
        records     = load_jsonl(INPUT_CROSS_TEXT)
        output_path = OUTPUT_CROSS_TEXT
        source      = "new"
    elif args.mode == "retry":
        records     = load_jsonl(INPUT_RETRY)
        output_path = OUTPUT_RETRY
        source      = "baseline"
    elif args.mode == "missing":
        records     = load_jsonl(INPUT_MISSING)
        output_path = OUTPUT_MISSING
        source      = "new"  # metadata/content 구조
    else:
        records     = load_jsonl(INPUT_NEW)
        output_path = OUTPUT_NEW
        source      = "new"

    headless = args.headless or os.getenv("CI", "").lower() == "true"

    asyncio.run(process_all(
        records, source, output_path,
        concurrency=args.concurrency,
        headless=headless,
        batch_size=args.batch_size,
    ))


if __name__ == "__main__":
    main()
