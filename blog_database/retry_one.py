"""7a1877be 단독 재시도 (max_tokens=2000)"""
import sys, json, asyncio
sys.stdout.reconfigure(encoding='utf-8')
from openai import AsyncOpenAI
import dotenv
dotenv.load_dotenv()

sys.path.insert(0, ".")
from cp_analyzer import SYSTEM_PROMPT, USER_PROMPT, FEW_SHOT, derive_structure_pattern

client = AsyncOpenAI()

async def main():
    with open("baseline_rw_reclassified.jsonl", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line.strip())
            if r.get("id") == "7a1877be":
                target = r
                break

    passage = target.get("passage", "")
    print(f"passage: {len(passage)}자")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *FEW_SHOT,
        {"role": "user", "content": USER_PROMPT.format(passage=passage)}
    ]
    resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        response_format={"type": "json_object"},
        max_tokens=4000,
        temperature=0,
    )
    result = json.loads(resp.choices[0].message.content)
    cps = result.get("cps", [])
    pt  = result.get("passage_type", "EXP")
    if cps:
        result["sequence_full"]   = f"{pt}_" + "-".join(cp.get("label_full") or cp.get("label","I") for cp in cps)
        result["sequence_simple"] = f"{pt}_" + "-".join(cp.get("label","I") for cp in cps)
    result["passage_structure_pattern"] = derive_structure_pattern(result.get("sequence_full",""))

    out = {**target,
           "passage_type": result.get("passage_type"),
           "cp_count": len(cps),
           "cps": cps,
           "sequence_full": result.get("sequence_full",""),
           "sequence_simple": result.get("sequence_simple",""),
           "passage_structure_pattern": result.get("passage_structure_pattern"),
           "ambiguous_flag": ""}

    print(f"sequence_full: {out['sequence_full']}")
    print(f"pattern: {out['passage_structure_pattern']}")

    with open("baseline_cp_analysis.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(out, ensure_ascii=False) + "\n")
    print("추가 완료")

asyncio.run(main())
