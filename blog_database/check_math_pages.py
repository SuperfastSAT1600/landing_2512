import fitz, sys
sys.stdout.reconfigure(encoding='utf-8')
doc = fitz.open("260414 QB Math_75.pdf")
print(f"총 페이지: {len(doc)}")
for i in range(len(doc)):
    text = doc[i].get_text()
    has_qid = "Question ID" in text
    has_answer = "Correct Answer" in text
    has_rationale = "Rationale" in text
    first_line = text.split('\n')[0] if text else ''
    print(f"p{i+1:02d}: {len(text):5d}자 | QID={has_qid} | Ans={has_answer} | Rat={has_rationale} | [{first_line[:60]}]")
