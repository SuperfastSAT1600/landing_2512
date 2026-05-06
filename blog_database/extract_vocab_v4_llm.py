"""
vocab v4 — GPT-4o-mini로 Hard 문제 핵심어 추출
출력: vocab_v4_llm.json
체크포인트: vocab_v4_checkpoint.json
"""
import json, asyncio, re
from pathlib import Path
from collections import Counter, defaultdict
from openai import AsyncOpenAI
import dotenv

dotenv.load_dotenv()
base = Path(__file__).parent

CP_FILES = [
    "baseline_cp_analysis.jsonl",
    "qb_rw_98_cp_analysis.jsonl",
    "cross_text_new_5_cp_analysis.jsonl",
    "missing_cp_analysis.jsonl",
    "retry_14_cp_analysis.jsonl",
]

TARGET_LABELS = {"C_au", "C_ct", "CL_au", "C_rb", "CL_ot", "C_ot"}
CHECKPOINT    = base / "vocab_v4_checkpoint.json"
BATCH_SIZE    = 8   # 한 번 API 호출에 처리할 문제 수
SEMAPHORE_N   = 5   # 동시 호출 수

def get_qid(r):
    return r.get("id") or (r.get("metadata") or {}).get("question_id", "") or ""

def get_diff(r):
    return r.get("difficulty") or (r.get("metadata") or {}).get("difficulty", "") or ""

def get_skill(r):
    return r.get("skill") or (r.get("metadata") or {}).get("skill", "") or ""

# ── 1. 대상 문장 수집 (Hard 문제의 핵심 CP) ─────────────────────
rows = []
seen = set()
for fname in CP_FILES:
    p = base / fname
    if not p.exists():
        continue
    with open(p, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            qid = get_qid(r)
            if not qid or qid in seen:
                continue
            seen.add(qid)
            rows.append(r)

print(f"로드: {len(rows):,}개 문제")

# Hard + Medium 문제에서 target label CP 추출
target_questions = []
for r in rows:
    diff = get_diff(r)
    if diff not in ("Hard", "Medium"):
        continue
    skill = get_skill(r)
    qid   = get_qid(r)
    cp_texts = []
    for cp in r.get("cps", []):
        label = cp.get("label_full", cp.get("label", ""))
        if label in TARGET_LABELS:
            t = cp.get("text", "").strip()
            if t and len(t.split()) >= 8:  # 너무 짧은 문장 제외
                cp_texts.append({"label": label, "text": t})
    if cp_texts:
        target_questions.append({
            "qid": qid,
            "diff": diff,
            "skill": skill,
            "cps": cp_texts,
        })

print(f"LLM 처리 대상: {len(target_questions):,}개 문제 (Hard/Medium)")

# ── 2. 체크포인트 로드 ───────────────────────────────────────────
checkpoint = {}
if CHECKPOINT.exists():
    with open(CHECKPOINT, encoding="utf-8") as f:
        checkpoint = json.load(f)
    print(f"체크포인트: {len(checkpoint):,}개 이미 처리됨")

remaining = [q for q in target_questions if q["qid"] not in checkpoint]
print(f"남은 처리: {len(remaining):,}개")

# ── 3. 배치 구성 ─────────────────────────────────────────────────
def make_batches(items, size):
    for i in range(0, len(items), size):
        yield items[i:i+size]

SYSTEM_PROMPT = """You are an SAT reading expert analyzing passages for vocabulary instruction.
For each numbered question, you receive sentences from the CLAIM or CONCLUSION part of the passage.
Your task: identify 2-4 words that:
1. Are essential for understanding the argument/claim in those sentences
2. Are academic vocabulary (NOT everyday words like good, bad, show, find, people, world)
3. Could cause a student to misunderstand the argument if unknown
4. Are NOT proper nouns (people names, place names)

Focus on: verbs of assertion (contend, posit, corroborate), abstract nouns (efficacy, supposition, nuance),
academic adjectives (negligible, robust, plausible), or discipline-specific terms that appear across subjects.

Return ONLY valid JSON: {"1": ["word1", "word2"], "2": ["word1", "word2", "word3"], ...}
No explanation, no markdown, just JSON."""

def build_user_prompt(batch):
    lines = []
    for i, q in enumerate(batch, 1):
        texts = " | ".join(f"[{cp['label']}] {cp['text'][:200]}" for cp in q["cps"][:3])
        lines.append(f"{i}. {texts}")
    return "\n".join(lines)

# ── 4. 비동기 API 호출 ───────────────────────────────────────────
client = AsyncOpenAI()
semaphore = asyncio.Semaphore(SEMAPHORE_N)

async def process_batch(batch_idx, batch):
    async with semaphore:
        prompt = build_user_prompt(batch)
        try:
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0,
                max_tokens=300,
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content.strip()
            parsed = json.loads(raw)
            results = {}
            for i, q in enumerate(batch, 1):
                words = parsed.get(str(i), [])
                # 정제: 소문자, 영문자만, 3자 이상
                clean = [w.lower().strip() for w in words
                         if isinstance(w, str) and w.isalpha() and len(w) >= 3]
                results[q["qid"]] = {
                    "words": clean,
                    "diff": q["diff"],
                    "skill": q["skill"],
                }
            return results
        except Exception as e:
            print(f"  [배치 {batch_idx}] 오류: {e}")
            return {}

async def run_all(batches):
    tasks = [process_batch(i, b) for i, b in enumerate(batches)]
    all_results = {}
    completed = 0
    for coro in asyncio.as_completed(tasks):
        result = await coro
        all_results.update(result)
        completed += 1
        if completed % 10 == 0:
            print(f"  진행: {completed}/{len(tasks)} 배치")
            # 중간 체크포인트 저장
            merged = {**checkpoint, **all_results}
            with open(CHECKPOINT, "w", encoding="utf-8") as f:
                json.dump(merged, f, ensure_ascii=False)
    return all_results

# ── 5. 실행 ──────────────────────────────────────────────────────
if remaining:
    batches = list(make_batches(remaining, BATCH_SIZE))
    print(f"배치 수: {len(batches)}개 (배치당 {BATCH_SIZE}문제)")
    new_results = asyncio.run(run_all(batches))
    checkpoint.update(new_results)
    with open(CHECKPOINT, "w", encoding="utf-8") as f:
        json.dump(checkpoint, f, ensure_ascii=False)
    print(f"처리 완료: {len(new_results):,}개 추가")
else:
    print("모두 처리됨 (체크포인트에서 로드)")

# ── 6. 집계 ──────────────────────────────────────────────────────
word_counter   = Counter()
word_diff_cnt  = defaultdict(Counter)
word_skill_set = defaultdict(set)

for qid, info in checkpoint.items():
    diff  = info.get("diff", "")
    skill = info.get("skill", "")
    for w in info.get("words", []):
        word_counter[w] += 1
        word_diff_cnt[w][diff] += 1
        word_skill_set[w].add(skill)

results = []
for word, total in word_counter.most_common():
    diff_dist = dict(word_diff_cnt[word])
    hard = diff_dist.get("Hard", 0)
    hard_ratio = round(hard / total, 3) if total else 0
    skill_div = len(word_skill_set[word])
    results.append({
        "word": word,
        "total_count": total,
        "hard_count": hard,
        "hard_ratio": hard_ratio,
        "skill_diversity": skill_div,
        "difficulty_dist": diff_dist,
    })

output = {
    "meta": {
        "version": "v4",
        "description": "GPT-4o-mini로 Hard/Medium 문제 핵심어 추출",
        "model": "gpt-4o-mini",
        "total_questions_processed": len(checkpoint),
        "unique_words": len(results),
    },
    "words_by_frequency": results,
}

out_path = base / "vocab_v4_llm.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n추출된 고유 단어: {len(results):,}개")
print(f"저장: {out_path}")
print()
print("── LLM 추출 상위 50개 ──────────────────────────")
for item in results[:50]:
    d = item["difficulty_dist"]
    print(f"  {item['word']:<28} {item['total_count']:4d}회  "
          f"H:{d.get('Hard',0):3d} M:{d.get('Medium',0):3d}  "
          f"skills:{item['skill_diversity']}")
