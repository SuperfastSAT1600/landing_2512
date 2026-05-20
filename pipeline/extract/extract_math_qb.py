"""
QB Math_75.pdf 전체 파싱 (LaTeX 포함)
사용법:
  python extract_math_qb.py            # 전체 (1-83페이지)
  python extract_math_qb.py 1 42       # 1~42페이지 (에이전트 1)
  python extract_math_qb.py 43 83      # 43~83페이지 (에이전트 2)
"""
import sys, json, base64, os, re
import fitz
from openai import OpenAI
import dotenv
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
dotenv.load_dotenv()
client = OpenAI()

PDF_PATH  = "260414 QB Math_75.pdf"
# 페이지 범위에 따라 출력 파일 분기 (병렬 실행 지원)
_start_arg = int(sys.argv[1]) if len(sys.argv) > 1 else 1
_end_arg   = int(sys.argv[2]) if len(sys.argv) > 2 else 83
OUTPUT     = f"math_qb_p{_start_arg}_{_end_arg}.jsonl"
CHECKPOINT = f"math_qb_checkpoint_p{_start_arg}_{_end_arg}.json"

MATH_PROMPT = """You are extracting an SAT Math question from a PDF page.
The page image shows the FULL question with math formulas (some may be invisible in text but visible in image).

CRITICAL: Use LaTeX notation for ALL math expressions:
- Inline: $expression$  e.g. $x^2 + 3$, $\\frac{a}{b}$, $\\sqrt{n}$
- Block: $$expression$$  (for standalone equations)
- Always wrap: variables $x$, fractions $\\frac{p}{q}$, exponents $x^{n}$, roots $\\sqrt{x}$
- Special: $\\pm$, $\\leq$, $\\geq$, $\\neq$, $\\infty$, $\\pi$, $\\theta$
- Functions: $f(x)$, $g(x)$, $\\sin x$, $\\cos x$, $\\log x$

Extract:
1. question_id — 8-char hex (e.g. "187f74bc")
2. domain — "Algebra" / "Advanced Math" / "Problem-Solving and Data Analysis" / "Geometry and Trigonometry"
3. skill — specific skill label from page
4. difficulty — "Easy" / "Medium" / "Hard"
5. question_text — FULL stem with LaTeX math preserved
6. choices — A/B/C/D with LaTeX (null if free-response/grid-in)
7. correct_answer — letter (A/B/C/D) or numeric string for grid-in
8. explanation — rationale text with LaTeX
9. has_figure — true if graph/table/diagram shown
10. figure_description — brief description of the figure if present (null otherwise)
11. question_type — "multiple_choice" or "free_response"

Return JSON only:
{
  "question_id": "",
  "domain": "",
  "skill": "",
  "difficulty": "",
  "question_text": "",
  "choices": {"A": "", "B": "", "C": "", "D": ""},
  "correct_answer": "",
  "explanation": "",
  "has_figure": false,
  "figure_description": null,
  "question_type": "multiple_choice"
}

If no SAT question on this page, return: {"question_id": null}"""


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
    # Remove markdown code blocks if present
    raw = re.sub(r'^```json?\n?', '', raw)
    raw = re.sub(r'\n?```$', '', raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  [p{page_num}] JSON error: {e} | raw: {raw[:200]}")
        return {"question_id": None, "error": str(e)}


def load_checkpoint():
    if Path(CHECKPOINT).exists():
        with open(CHECKPOINT, encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_checkpoint(data):
    with open(CHECKPOINT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)


def load_done_ids():
    done = set()
    if Path(OUTPUT).exists():
        with open(OUTPUT, encoding='utf-8') as f:
            for line in f:
                try:
                    r = json.loads(line.strip())
                    if r.get('question_id'):
                        done.add(r['question_id'])
                except:
                    pass
    return done


def main():
    # 페이지 범위 파라미터 (1-indexed, 이미 글로벌 변수로 파싱됨)
    start_page = _start_arg
    end_page   = _end_arg

    doc = fitz.open(PDF_PATH)
    total_pages = len(doc)

    print(f"Math QB 파싱: p{start_page}~p{end_page} / {total_pages}페이지 전체")
    print(f"출력: {OUTPUT}\n")

    done_ids = load_done_ids()
    checkpoint = load_checkpoint()
    done_pages = set(checkpoint.get('done_pages', []))

    print(f"기존 완료: {len(done_ids)}개 문제, {len(done_pages)}개 페이지\n")

    found = 0
    skipped = 0
    errors = 0

    for page_idx in range(start_page - 1, end_page):  # 0-indexed
        page_num = page_idx + 1

        if page_num in done_pages:
            skipped += 1
            continue

        page = doc[page_idx]
        text = page.get_text()

        # 빠른 필터: QID 없는 페이지는 스킵 (텍스트로 확인 가능)
        if "Question ID" not in text and len(text) < 200:
            done_pages.add(page_num)
            save_checkpoint({"done_pages": list(done_pages)})
            print(f"p{page_num:02d}: skip (non-question page, {len(text)}자)")
            continue

        try:
            result = extract_page(page, page_num)

            qid = result.get("question_id")
            if not qid:
                print(f"p{page_num:02d}: no question")
                done_pages.add(page_num)
                save_checkpoint({"done_pages": list(done_pages)})
                continue

            if qid in done_ids:
                print(f"p{page_num:02d}: {qid} (이미 완료)")
                done_pages.add(page_num)
                save_checkpoint({"done_pages": list(done_pages)})
                continue

            # 저장
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

            done_ids.add(qid)
            done_pages.add(page_num)
            save_checkpoint({"done_pages": list(done_pages)})
            found += 1

            has_latex = "$" in result.get("question_text", "")
            has_fig = result.get("has_figure", False)
            diff = result.get("difficulty", "?")
            print(f"p{page_num:02d}: ✅ {qid} [{diff}] LaTeX={has_latex} Fig={has_fig}")

        except Exception as e:
            errors += 1
            print(f"p{page_num:02d}: ❌ error — {str(e)[:80]}")

    print(f"\n=== 완료 ===")
    print(f"신규 저장: {found}개 | 스킵: {skipped}개 | 에러: {errors}개")
    print(f"출력 파일: {OUTPUT}")

    # 최종 통계
    total_saved = sum(1 for _ in open(OUTPUT, encoding='utf-8'))
    print(f"전체 저장 수: {total_saved}개")


if __name__ == "__main__":
    main()
