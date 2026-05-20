"""미완료 Math 페이지 11개 재시도"""
import sys, json, base64, re
import fitz
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

MISSING_PAGES = [10, 49, 72, 83]  # 4개 재시도 (LaTeX escape fix 적용)
PDF_PATH = "260414 QB Math_75.pdf"
OUTPUT = "math_qb_retry.jsonl"

MATH_PROMPT = """You are extracting an SAT Math question from a PDF page.
Use LaTeX notation for ALL math expressions:
- Inline: $expression$  e.g. $x^2 + 3$, $\\frac{a}{b}$, $\\sqrt{n}$
- Block: $$expression$$

Extract:
{
  "question_id": "8-char hex",
  "domain": "Algebra/Advanced Math/Problem-Solving and Data Analysis/Geometry and Trigonometry",
  "skill": "specific skill label",
  "difficulty": "Easy/Medium/Hard",
  "question_text": "FULL stem with LaTeX",
  "choices": {"A": "", "B": "", "C": "", "D": ""},
  "correct_answer": "A/B/C/D or numeric",
  "explanation": "rationale with LaTeX",
  "has_figure": false,
  "figure_description": null,
  "question_type": "multiple_choice or free_response"
}

If no SAT question: {"question_id": null}"""


def page_to_b64(page, dpi=150):
    pix = page.get_pixmap(dpi=dpi)
    return base64.b64encode(pix.tobytes("png")).decode()


def extract_page(page, page_num):
    b64 = page_to_b64(page)
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            {"type": "text", "text": MATH_PROMPT}
        ]}],
        max_tokens=2000,
        temperature=0,
    )
    raw = resp.choices[0].message.content.strip()
    raw = re.sub(r'^```json?\n?', '', raw)
    raw = re.sub(r'\n?```$', '', raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # LaTeX backslash escape fix: replace unescaped \letter with \\letter
        fixed = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', raw)
        return json.loads(fixed)


def main():
    doc = fitz.open(PDF_PATH)
    found = 0
    errors = 0

    print(f"재시도: {len(MISSING_PAGES)}개 페이지\n")

    for page_num in MISSING_PAGES:
        page = doc[page_num - 1]  # 0-indexed
        print(f"p{page_num:02d}: 처리 중...", end=" ", flush=True)
        try:
            result = extract_page(page, page_num)
            qid = result.get("question_id")
            if not qid:
                print("no question")
                continue

            record = {
                "question_id": qid,
                "source_file": PDF_PATH,
                "domain": result.get("domain", ""),
                "skill": result.get("skill", ""),
                "difficulty": result.get("difficulty", ""),
                "question_text": result.get("question_text", ""),
                "choices": result.get("choices"),
                "correct_answer": result.get("correct_answer", ""),
                "explanation": result.get("explanation", ""),
                "has_figure": result.get("has_figure", False),
                "figure_description": result.get("figure_description"),
                "question_type": result.get("question_type", "multiple_choice"),
                "subject": "Math",
            }

            with open(OUTPUT, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")

            has_latex = "$" in result.get("question_text", "")
            print(f"✅ {qid} [{result.get('difficulty')}] LaTeX={has_latex}")
            found += 1

        except Exception as e:
            print(f"❌ {str(e)[:80]}")
            errors += 1

    print(f"\n완료: {found}개 저장, {errors}개 에러 → {OUTPUT}")


if __name__ == "__main__":
    main()
