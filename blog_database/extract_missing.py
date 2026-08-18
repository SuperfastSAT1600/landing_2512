"""
신규 ID 111개 + passage없는 12개 → PDF에서 전체 파싱
scan_pdf_ids.jsonl의 pdf_map 기반으로 타겟 PDF만 스캔
"""
import sys, json, fitz, base64, os, re
from openai import OpenAI
from pathlib import Path
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

OUTPUT        = "missing_questions_parsed.jsonl"
ONTOLOGY      = "../master_sat_ontology_v3.jsonl"
SCAN_RESULT   = "pdf_scan_ids.jsonl"
BASELINE      = "baseline_rw_reclassified.jsonl"

# passage 없는 12개 ID
NO_PASSAGE_IDS = {
    "4fa7e50e","c977cfcf","0770b53d","eb03096e","e6f2dba6",
    "0aebdf5f","ac9a3a26","34d7bb25","c83e0b43","6d883838","403d7bb5","59209b6d"
}

PROMPT = """SAT Question Bank PDF page.
If this page has an SAT question, extract fully.
If not (cover, blank, instructions), return {"questions": []}.

Extract:
1. question_id — exact alphanumeric ID shown on page (8 hex chars)
2. difficulty — "Easy", "Medium", or "Hard"
3. skill — exact skill label
4. passage — full passage text
5. question_text — question stem
6. choices — A, B, C, D
7. correct_answer — letter
8. explanation — rationale text

Return JSON:
{
  "questions": [{
    "metadata": {"question_id": "", "difficulty": "", "skill": "", "source_file": ""},
    "content": {"passage": "", "question_text": "", "choices": {"A":"","B":"","C":"","D":""}, "correct_answer": "", "explanation": ""}
  }]
}"""


def page_to_b64(page):
    pix = page.get_pixmap(dpi=150)
    return base64.b64encode(pix.tobytes("png")).decode()


def extract_page(page, source_file):
    b64 = page_to_b64(page)
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            {"type": "text", "text": PROMPT}
        ]}],
        max_tokens=2500,
        temperature=0,
    )
    raw = resp.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw)
    for q in result.get("questions", []):
        q["metadata"]["source_file"] = source_file
    return result.get("questions", [])


def main():
    # 이미 파싱 완료된 ID
    done_ids = set()
    if Path(OUTPUT).exists():
        with open(OUTPUT, encoding="utf-8") as f:
            for line in f:
                r = json.loads(line.strip())
                done_ids.add(r["metadata"]["question_id"])
    print(f"이미 완료: {len(done_ids)}개")

    # baseline에서 passage 없는 12개의 skill/difficulty 정보
    no_passage_meta = {}
    with open(BASELINE, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line.strip())
            if r.get("id","") in NO_PASSAGE_IDS:
                no_passage_meta[r["id"]] = {"skill": r.get("skill",""), "difficulty": r.get("difficulty","")}

    # PDF별 타겟 ID 구성
    pdf_targets = {}  # pdf_name → set of target IDs

    # 1) scan 결과에서 신규 ID
    baseline_ids = set()
    with open(BASELINE, encoding="utf-8") as f:
        for line in f:
            baseline_ids.add(json.loads(line.strip()).get("id",""))

    with open(SCAN_RESULT, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line.strip())
            pdf = r["pdf"]
            for qid in r["ids"]:
                if re.match(r'^[0-9a-f]{8}$', qid) and qid not in baseline_ids and qid not in done_ids:
                    pdf_targets.setdefault(pdf, set()).add(qid)

    # 2) passage 없는 12개 → 해당 skill PDF에서 찾기
    skill_to_pdfs = {}
    from pathlib import Path as P
    for p in sorted(P(".").glob("*.pdf")):
        if "QB" in p.name or "rhetorical" in p.name.lower():
            continue
        skill_key = p.name.split("_")[0].lower().replace(" ","").replace(",","")
        skill_to_pdfs.setdefault(skill_key, []).append(p.name)

    for qid, meta in no_passage_meta.items():
        if qid in done_ids:
            continue
        skill = meta.get("skill","").lower().replace(" ","").replace(",","")
        skill_key = None
        for k in skill_to_pdfs:
            if k in skill or skill in k:
                skill_key = k
                break
        if skill_key:
            for pdf in skill_to_pdfs[skill_key]:
                pdf_targets.setdefault(pdf, set()).add(qid)
        else:
            # 전체 PDF 대상
            for pdfs in skill_to_pdfs.values():
                for pdf in pdfs:
                    pdf_targets.setdefault(pdf, set()).add(qid)

    total_targets = set()
    for ids in pdf_targets.values():
        total_targets.update(ids)
    print(f"파싱 대상: {len(total_targets)}개 / 관련 PDF: {len(pdf_targets)}개\n")

    found_total = 0
    for pdf_name, target_ids in sorted(pdf_targets.items()):
        remaining = target_ids - done_ids
        if not remaining:
            continue
        if not Path(pdf_name).exists():
            print(f"파일 없음: {pdf_name}")
            continue

        doc = fitz.open(pdf_name)
        print(f"{pdf_name} — {len(remaining)}개 탐색 중 ({len(doc)}p)...")

        for i, page in enumerate(doc):
            if not remaining:
                break
            try:
                questions = extract_page(page, pdf_name)
                for q in questions:
                    qid = q["metadata"]["question_id"]
                    if qid in remaining:
                        remaining.discard(qid)
                        done_ids.add(qid)
                        found_total += 1
                        with open(OUTPUT, "a", encoding="utf-8") as out:
                            out.write(json.dumps(q, ensure_ascii=False) + "\n")
                        print(f"  ✅ p{i+1:02d}: {qid} ({q['metadata']['difficulty']})")
                    elif qid in target_ids:
                        pass  # 이미 완료
            except Exception as e:
                print(f"  p{i+1:02d}: error — {str(e)[:60]}")

        if remaining:
            print(f"  미발견: {remaining}")

    print(f"\n총 파싱 완료: {found_total}개 → {OUTPUT}")

    # 온톨로지 추가
    existing_ids = set()
    with open(ONTOLOGY, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line.strip())
            existing_ids.add(r.get("id","") or r.get("metadata",{}).get("question_id",""))

    added = 0
    with open(OUTPUT, encoding="utf-8") as f, \
         open(ONTOLOGY, "a", encoding="utf-8") as ont:
        for line in f:
            r = json.loads(line.strip())
            qid = r["metadata"]["question_id"]
            if qid not in existing_ids:
                entry = {
                    "id": qid,
                    "skill": r["metadata"]["skill"],
                    "difficulty": r["metadata"]["difficulty"],
                    "topic_category": "Mixed",
                    "date_added": "2026-04-29",
                    "content": r["content"],
                }
                ont.write(json.dumps(entry, ensure_ascii=False) + "\n")
                added += 1

    print(f"온톨로지 추가: {added}개")


if __name__ == "__main__":
    main()
