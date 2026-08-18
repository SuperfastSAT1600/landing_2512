"""
Math QB PDF 파싱 테스트
목적: LaTeX 표현식이 웹 표시에 적합한지 확인
방법: GPT-4o vision + 직접 텍스트 추출 비교
"""
import sys, json, base64, os, re
import fitz
from openai import OpenAI
import dotenv

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

PDF_PATH = "260414 QB Math_75.pdf"
TEST_PAGES = [2, 3, 4]  # 0-indexed (p3, p4, p5 실제)

MATH_PROMPT = """You are extracting an SAT Math question from a PDF page image.
Extract ALL mathematical content, preserving math symbols.

For math expressions, use LaTeX notation:
- Inline math: $expression$
- Block math: $$expression$$
- Fractions: $\\frac{a}{b}$
- Exponents: $x^2$
- Square roots: $\\sqrt{x}$
- Variables: $x$, $y$, $n$

Return JSON:
{
  "question_id": "8-char hex id shown on page",
  "has_question": true/false,
  "question_text": "full question stem with LaTeX math",
  "choices": {
    "A": "choice text with LaTeX if needed",
    "B": "...",
    "C": "...",
    "D": "..."
  },
  "has_figure": true/false,
  "figure_description": "describe any graph/table/figure",
  "correct_answer": "letter or null if not shown",
  "difficulty": "Easy/Medium/Hard or null",
  "skill": "skill label or null",
  "raw_text_sample": "first 100 chars of visible text"
}

If no question on page, return {"has_question": false}"""


def page_to_b64(page, dpi=150):
    pix = page.get_pixmap(dpi=dpi)
    return base64.b64encode(pix.tobytes("png")).decode()


def extract_text_direct(page):
    """pymupdf 직접 텍스트 추출 (LaTeX 없이 원본 문자)"""
    return page.get_text("text")


def extract_with_gpt4o(page, page_num):
    b64 = page_to_b64(page)
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            {"type": "text", "text": MATH_PROMPT}
        ]}],
        max_tokens=1500,
        temperature=0,
    )
    raw = resp.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = re.sub(r'^```json?\n?', '', raw)
        raw = re.sub(r'\n?```$', '', raw)
    try:
        return json.loads(raw)
    except Exception as e:
        print(f"  JSON parse error p{page_num}: {e}")
        print(f"  raw: {raw[:200]}")
        return {"has_question": False, "error": str(e)}


def main():
    doc = fitz.open(PDF_PATH)
    print(f"PDF: {PDF_PATH} ({len(doc)} pages)\n")
    print("=" * 60)

    results = []
    for i in TEST_PAGES:
        if i >= len(doc):
            continue
        page = doc[i]
        print(f"\n[Page {i+1}]")

        # 1. 직접 텍스트 추출
        direct_text = extract_text_direct(page)
        print(f"직접 추출 ({len(direct_text)}자):")
        print(direct_text[:300])
        print("---")

        # 2. GPT-4o vision 추출
        print(f"GPT-4o 추출 중...")
        result = extract_with_gpt4o(page, i+1)
        print(f"결과: {json.dumps(result, ensure_ascii=False, indent=2)[:600]}")
        results.append({"page": i+1, "direct_text": direct_text[:500], "gpt4o": result})

    # 결과 저장
    with open("test_math_parse_result.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print("결과 저장: test_math_parse_result.json")
    print("\n=== LaTeX 포함 여부 요약 ===")
    for r in results:
        gpt = r["gpt4o"]
        if gpt.get("has_question"):
            qt = gpt.get("question_text", "")
            has_latex = "$" in qt
            has_fig = gpt.get("has_figure", False)
            qid = gpt.get("question_id", "?")
            print(f"p{r['page']}: {qid} | LaTeX={has_latex} | Figure={has_fig}")
            if has_latex:
                # LaTeX 표현식 추출
                latex_parts = re.findall(r'\$[^$]+\$', qt)
                print(f"  LaTeX 예시: {latex_parts[:3]}")
        else:
            print(f"p{r['page']}: 문제 없음")


if __name__ == "__main__":
    main()
