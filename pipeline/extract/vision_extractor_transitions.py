import fitz
import sys
import base64
import json
import os
import time
from openai import OpenAI
import dotenv

dotenv.load_dotenv()
client = OpenAI()

def encode_image_from_pixmap(pix):
    image_bytes = pix.tobytes("png")
    return base64.b64encode(image_bytes).decode('utf-8')

def extract_ontology_from_page(doc, page_num):
    page = doc[page_num]
    pix = page.get_pixmap(dpi=150)
    base64_image = encode_image_from_pixmap(pix)
    
    prompt = """
    You are an expert SAT tutor and ontologist. I am providing you an image of an SAT Question Bank page.
    This page contains a single SAT question from the "Transitions" skill.
    Please extract the structured information and build an ontology for this question in strict JSON format.
    
    Extract the following standard fields from the text visible in the image:
    - question_id
    - difficulty (Easy/Medium/Hard)
    - passage
    - question_text
    - choices (A, B, C, D)
    - correct_answer
    - explanation
    
    For a "Transitions" question, generate these specific ontology relationships based on the text's logic:
    - target_transition_category (e.g., "Contrast", "Cause and effect", "Addition", "Exemplification")
    - sentence_1_summary (Briefly summarize the idea immediately BEFORE the transition blank)
    - sentence_2_summary (Briefly summarize the idea immediately AFTER the transition blank)
    - passage_topic (e.g., "History", "Science", "Literature", "Social Science")
    
    Return ONLY a valid JSON object matching this schema:
    {
      "metadata": {"question_id": "", "difficulty": ""},
      "content": {"passage": "", "question_text": "", "choices": {"A": "", "B": "", "C": "", "D": ""}, "correct_answer": "", "explanation": ""},
      "analysis": {"target_transition_category": "", "sentence_1_summary": "", "sentence_2_summary": "", "passage_topic": ""}
    }
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            }
        ],
        response_format={ "type": "json_object" }
    )
    
    return json.loads(response.choices[0].message.content)

def process_pdf(pdf_path, output_jsonl, limit=None):
    print(f"Processing {pdf_path} into {output_jsonl}...")
    doc = fitz.open(pdf_path)
    num_pages = len(doc) if limit is None else min(limit, len(doc))
    
    with open(output_jsonl, 'a', encoding='utf-8') as f:
        for i in range(num_pages):
            try:
                print(f"Extracting page {i+1}/{num_pages}...")
                data = extract_ontology_from_page(doc, i)
                data['metadata']['source_file'] = os.path.basename(pdf_path)
                f.write(json.dumps(data, ensure_ascii=False) + '\n')
            except Exception as e:
                print(f"Failed on page {i+1}: {e}")
            time.sleep(0.5)

if __name__ == "__main__":
    import glob
    
    pdf_files = glob.glob("transitions_*.pdf")
    for pdf in pdf_files:
        difficulty = "easy" if "easy" in pdf.lower() else "medium" if "medium" in pdf.lower() else "hard" if "hard" in pdf.lower() else "unknown"
        out_file = "transitions_master.jsonl"
        # Process all pages
        process_pdf(pdf, out_file)
        print(f"Finished processing all pages of {pdf}.")
