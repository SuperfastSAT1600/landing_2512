"""
Cross-Text PDF 파일에서 question_id만 추출해서
온톨로지 기존 51개와 비교
"""
import sys, json, fitz, base64, os
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

PDF_FILES = [
    "cross-text connections_easy_16.pdf",
    "cross-text connections_medium_19.pdf",
    "cross-text connections_hard_19.pdf",
]

PROMPT = """This is a page from an SAT Question Bank PDF.
If this page contains an SAT question, extract ONLY the question_id (the alphanumeric ID shown on the page, e.g. "714e4c10").
If this page has no question (cover, blank, instructions), return {"question_id": null}.
Return JSON: {"question_id": "xxxxxxxx" or null}"""


def page_to_b64(page):
    pix = page.get_pixmap(dpi=150)
    return base64.b64encode(pix.tobytes("png")).decode()


def extract_ids_from_pdf(pdf_path):
    ids = []
    doc = fitz.open(pdf_path)
    print(f"\n{pdf_path} ({len(doc)}페이지)")
    for i, page in enumerate(doc):
        b64 = page_to_b64(page)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    {"type": "text", "text": PROMPT}
                ]
            }],
            max_tokens=50,
            temperature=0,
        )
        raw = resp.choices[0].message.content.strip()
        try:
            result = json.loads(raw)
            qid = result.get("question_id")
            if qid:
                ids.append(qid)
                print(f"  p{i+1:02d}: {qid}")
            else:
                print(f"  p{i+1:02d}: (no question)")
        except Exception:
            print(f"  p{i+1:02d}: parse error — {raw[:50]}")
    return ids


def main():
    # 온톨로지 Cross-Text ID 수집
    ontology_ids = set()
    with open("../master_sat_ontology_v3.jsonl", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line.strip())
            skill = r.get("skill") or r.get("metadata", {}).get("skill", "")
            if "Cross-Text" in skill:
                qid = r.get("id") or r.get("metadata", {}).get("question_id", "")
                if qid:
                    ontology_ids.add(qid)
    print(f"온톨로지 Cross-Text ID: {len(ontology_ids)}개")

    # PDF에서 ID 추출
    pdf_ids = []
    for pdf in PDF_FILES:
        if not os.path.exists(pdf):
            print(f"파일 없음: {pdf}")
            continue
        pdf_ids.extend(extract_ids_from_pdf(pdf))

    pdf_id_set = set(pdf_ids)
    print(f"\n=== 비교 결과 ===")
    print(f"PDF 추출 ID: {len(pdf_ids)}개 (고유 {len(pdf_id_set)}개)")
    print(f"온톨로지 ID: {len(ontology_ids)}개")

    overlap = pdf_id_set & ontology_ids
    only_pdf = pdf_id_set - ontology_ids
    only_ont = ontology_ids - pdf_id_set

    print(f"\n겹치는 문제 (PDF∩온톨로지): {len(overlap)}개")
    print(f"PDF에만 있는 문제 (신규): {len(only_pdf)}개")
    if only_pdf:
        for qid in sorted(only_pdf):
            print(f"  → {qid}")
    print(f"온톨로지에만 있는 문제: {len(only_ont)}개")
    if only_ont:
        for qid in sorted(only_ont):
            print(f"  → {qid}")


if __name__ == "__main__":
    main()
