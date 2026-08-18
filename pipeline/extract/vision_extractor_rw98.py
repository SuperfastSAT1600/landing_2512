import sys
import fitz
import base64
import json
import os
import time
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

PDF_PATH = "260414 QB RW_98.pdf"
OUTPUT_JSONL = "qb_rw_98_parsed.jsonl"

PROMPT = """You are analyzing a single SAT Question Bank page.

If this page contains an SAT Reading and Writing question, extract it exactly as shown.
If this page is a cover, table of contents, instructions, blank, or does not contain a question, return {"questions": []}.

Extract these fields exactly as displayed:
1. question_id — the alphanumeric ID shown on the page (e.g. "714e4c10"). This MUST be copied exactly from the page.
2. difficulty — exactly "Easy", "Medium", or "Hard" as shown
3. skill — exactly as labeled (e.g. "Words in Context", "Command of Evidence - Textual", "Command of Evidence - Quantitative", "Central Ideas and Details", "Inferences", "Cross-Text Connections", "Text Structure and Purpose", "Rhetorical Synthesis", "Transitions", "Boundaries", "Form, Structure, and Sense")
4. passage — the full passage text (including any table/graph description if present)
5. question_text — the question stem
6. choices — all four answer choices (A, B, C, D)
7. correct_answer — the letter of the correct answer (A/B/C/D)
8. explanation — the rationale/explanation text shown

Then generate analysis:
9. passage_topic — the subject domain (Science, Literature, History, Social Science, Art, Music, Economics, Biology, Geography, Technology, Philosophy, etc.)
10. correct_answer_concept — in 1-2 sentences, the core concept or reasoning that makes the correct answer right
11. incorrect_answer_analysis — for each wrong answer, explain in 1 sentence WHY it is wrong

CRITICAL RULES:
- If no question is visible on this page, return {"questions": []}
- NEVER invent or guess a question_id. Copy it exactly from the page.
- Extract at most ONE question per call. If somehow two questions appear, extract both.

Return JSON:
{
  "questions": [
    {
      "metadata": {
        "question_id": "",
        "difficulty": "",
        "skill": "",
        "source_file": "260414 QB RW_98.pdf"
      },
      "content": {
        "passage": "",
        "question_text": "",
        "choices": {"A": "", "B": "", "C": "", "D": ""},
        "correct_answer": "",
        "explanation": ""
      },
      "analysis": {
        "passage_topic": "",
        "correct_answer_concept": "",
        "incorrect_answer_analysis": {"A": "", "B": "", "C": "", "D": ""}
      }
    }
  ]
}"""


def encode_page(doc, page_num):
    page = doc[page_num]
    pix = page.get_pixmap(dpi=200)
    return base64.b64encode(pix.tobytes("png")).decode("utf-8")


def extract_from_page(doc, page_num):
    b64 = encode_page(doc, page_num)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "high"}}
                ]
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=4096
    )
    result = json.loads(response.choices[0].message.content)
    return result.get("questions", [])


def is_valid(q):
    qid = q.get("metadata", {}).get("question_id", "").strip()
    passage = q.get("content", {}).get("passage", "").strip()
    question = q.get("content", {}).get("question_text", "").strip()
    return bool(qid) and bool(question)


def process_pdf():
    doc = fitz.open(PDF_PATH)
    num_pages = len(doc)
    print(f"Processing {PDF_PATH} - {num_pages} pages")

    seen_ids = {}
    all_questions = []

    for i in range(num_pages):
        print(f"  Page {i+1}/{num_pages}...", end=" ", flush=True)
        try:
            questions = extract_from_page(doc, i)
            added = 0
            for q in questions:
                if not is_valid(q):
                    print(f"(skip: invalid)", end=" ")
                    continue
                qid = q["metadata"]["question_id"].strip()
                if qid in seen_ids:
                    print(f"(skip: dup {qid[:8]})", end=" ")
                    continue
                seen_ids[qid] = True
                all_questions.append(q)
                added += 1
            print(f"{added} added (total {len(all_questions)})")
        except Exception as e:
            print(f"ERROR: {e}")
        time.sleep(0.5)

    with open(OUTPUT_JSONL, "w", encoding="utf-8") as f:
        for q in all_questions:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")

    print(f"\nDone. {len(all_questions)} questions saved to {OUTPUT_JSONL}")
    return all_questions


if __name__ == "__main__":
    process_pdf()
