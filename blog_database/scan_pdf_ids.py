"""
skill별 PDF에서 question_id만 추출 → baseline과 비교 → 68개 신규 ID 파악
"""
import sys, json, fitz, base64, os, re
from openai import OpenAI
from pathlib import Path
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

OUTPUT = "pdf_scan_ids.jsonl"
BASELINE = "baseline_rw_reclassified.jsonl"

SKIP_PDFS = {
    "260414 QB RW_98.pdf",
    "260414 QB Math_75.pdf",
    "cross-text connections_easy_16.pdf",
    "cross-text connections_medium_19.pdf",
    "cross-text connections_hard_19.pdf",
}
RS_PDFS = {"rhetorical synthesis"}

PROMPT = """SAT Question Bank PDF page.
If this page has an SAT question, return the question_id (alphanumeric ID shown on page).
If no question (cover, blank, instructions, table of contents), return null.
JSON only: {"question_id": "xxxxxxxx"} or {"question_id": null}"""


def page_to_b64(page):
    pix = page.get_pixmap(dpi=120)
    return base64.b64encode(pix.tobytes("png")).decode()


def get_id_from_page(page):
    b64 = page_to_b64(page)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            {"type": "text", "text": PROMPT}
        ]}],
        max_tokens=30,
        temperature=0,
    )
    raw = resp.choices[0].message.content.strip()
    try:
        return json.loads(raw).get("question_id")
    except Exception:
        return None


def main():
    # 기존 baseline ID
    baseline_ids = set()
    with open(BASELINE, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line.strip())
            baseline_ids.add(r.get("id",""))
    print(f"baseline ID: {len(baseline_ids)}개\n")

    # 이미 스캔한 것 복원
    done_pdfs = set()
    pdf_id_map = {}  # pdf_name → [ids]
    if Path(OUTPUT).exists():
        with open(OUTPUT, encoding="utf-8") as f:
            for line in f:
                r = json.loads(line.strip())
                done_pdfs.add(r["pdf"])
                pdf_id_map[r["pdf"]] = r["ids"]
        print(f"이미 스캔된 PDF: {len(done_pdfs)}개 (복원)")

    # PDF 목록
    all_pdfs = sorted(Path(".").glob("*.pdf"))
    target_pdfs = [
        p for p in all_pdfs
        if p.name not in SKIP_PDFS
        and not any(rs in p.name.lower() for rs in RS_PDFS)
        and p.name not in done_pdfs
    ]
    print(f"스캔 대상 PDF: {len(target_pdfs)}개\n")

    for pdf_path in target_pdfs:
        doc = fitz.open(str(pdf_path))
        ids = []
        print(f"{pdf_path.name} ({len(doc)}p) 스캔 중...")
        for i, page in enumerate(doc):
            qid = get_id_from_page(page)
            if qid:
                ids.append(qid)
                new = "★NEW" if qid not in baseline_ids else ""
                print(f"  p{i+1:02d}: {qid} {new}")
            else:
                print(f"  p{i+1:02d}: -")

        pdf_id_map[pdf_path.name] = ids
        with open(OUTPUT, "a", encoding="utf-8") as out:
            out.write(json.dumps({"pdf": pdf_path.name, "ids": ids}, ensure_ascii=False) + "\n")
        print(f"  → {len(ids)}개 추출 (신규: {sum(1 for i in ids if i not in baseline_ids)}개)\n")

    # 최종 집계
    all_pdf_ids = set()
    for ids in pdf_id_map.values():
        all_pdf_ids.update(ids)

    new_ids = all_pdf_ids - baseline_ids
    print(f"\n=== 결과 ===")
    print(f"PDF 전체 고유 ID: {len(all_pdf_ids)}개")
    print(f"baseline 미포함 신규: {len(new_ids)}개")
    for qid in sorted(new_ids):
        print(f"  {qid}")


if __name__ == "__main__":
    main()
