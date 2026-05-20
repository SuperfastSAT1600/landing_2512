"""
Cross-Text PDF에서 신규 5개 문제 전체 파싱 후 온톨로지 추가
대상 ID: 96f3accc, 9a94eb77, c19b2f77, c8a2af72, eb89dcc8
"""
import sys, json, fitz, base64, os
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

TARGET_IDS = {"96f3accc", "9a94eb77", "c19b2f77", "c8a2af72", "eb89dcc8"}

PDF_FILES = [
    "cross-text connections_easy_16.pdf",
    "cross-text connections_medium_19.pdf",
    "cross-text connections_hard_19.pdf",
]

OUTPUT_JSONL = "cross_text_new_5.jsonl"
ONTOLOGY    = "../master_sat_ontology_v3.jsonl"

PROMPT = """This is a page from an SAT Question Bank PDF.
If this page contains an SAT question, extract it fully.
If not (cover, blank, instructions), return {"questions": []}.

Extract:
1. question_id — exact alphanumeric ID on the page
2. difficulty — "Easy", "Medium", or "Hard"
3. skill — exact label (e.g. "Cross-Text Connections")
4. passage — full passage text (Text 1 and Text 2 if present)
5. question_text — question stem
6. choices — A, B, C, D
7. correct_answer — letter of correct answer
8. explanation — rationale text

Return JSON:
{
  "questions": [
    {
      "metadata": {"question_id": "", "difficulty": "", "skill": "", "source_file": ""},
      "content": {"passage": "", "question_text": "", "choices": {"A":"","B":"","C":"","D":""}, "correct_answer": "", "explanation": ""}
    }
  ]
}"""


def page_to_b64(page):
    pix = page.get_pixmap(dpi=150)
    return base64.b64encode(pix.tobytes("png")).decode()


def extract_page(page, source_file):
    b64 = page_to_b64(page)
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                {"type": "text", "text": PROMPT}
            ]
        }],
        max_tokens=2000,
        temperature=0,
    )
    raw = resp.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw)
    questions = result.get("questions", [])
    for q in questions:
        q["metadata"]["source_file"] = source_file
    return questions


def main():
    # 이미 파싱된 ID 확인
    done_ids = set()
    if os.path.exists(OUTPUT_JSONL):
        with open(OUTPUT_JSONL, encoding="utf-8") as f:
            for line in f:
                r = json.loads(line.strip())
                done_ids.add(r["metadata"]["question_id"])
    remaining = TARGET_IDS - done_ids
    print(f"대상 5개 중 남은 것: {len(remaining)}개 {remaining}")

    found = dict()
    for pdf_path in PDF_FILES:
        if not remaining:
            break
        if not os.path.exists(pdf_path):
            print(f"파일 없음: {pdf_path}")
            continue
        doc = fitz.open(pdf_path)
        print(f"\n{pdf_path} ({len(doc)}페이지) 스캔 중...")
        for i, page in enumerate(doc):
            if not remaining:
                break
            try:
                questions = extract_page(page, pdf_path)
                for q in questions:
                    qid = q["metadata"]["question_id"]
                    if qid in remaining:
                        found[qid] = q
                        remaining.discard(qid)
                        print(f"  ✅ p{i+1:02d}: {qid} 발견!")
                        with open(OUTPUT_JSONL, "a", encoding="utf-8") as out:
                            out.write(json.dumps(q, ensure_ascii=False) + "\n")
                    else:
                        print(f"  p{i+1:02d}: {qid if questions else '(no question)'} — skip")
            except Exception as e:
                print(f"  p{i+1:02d}: error — {e}")

    print(f"\n파싱 완료: {len(found)}개 → {OUTPUT_JSONL}")
    if remaining:
        print(f"미발견: {remaining}")
        return

    # 온톨로지에 추가
    print(f"\n온톨로지 추가 중...")
    existing_ids = set()
    with open(ONTOLOGY, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line.strip())
            qid = r.get("id") or r.get("metadata", {}).get("question_id", "")
            existing_ids.add(qid)

    added = 0
    with open(OUTPUT_JSONL, encoding="utf-8") as f, \
         open(ONTOLOGY, "a", encoding="utf-8") as out:
        for line in f:
            r = json.loads(line.strip())
            qid = r["metadata"]["question_id"]
            if qid not in existing_ids:
                # 온톨로지 형식으로 변환
                entry = {
                    "id": qid,
                    "skill": r["metadata"]["skill"],
                    "difficulty": r["metadata"]["difficulty"],
                    "topic_category": "Mixed",
                    "date_added": "2026-04-29",
                    "content": r["content"],
                }
                out.write(json.dumps(entry, ensure_ascii=False) + "\n")
                added += 1
                print(f"  추가: {qid}")

    print(f"온톨로지 추가 완료: {added}개")
    print(f"\n다음: python cp_analyzer.py cross_text --headless 실행 필요")


if __name__ == "__main__":
    main()
