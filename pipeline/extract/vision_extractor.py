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
    This page contains a single SAT question (Reading and Writing).
    Please extract the structured information and build an ontology for this question in strict JSON format.
    
    Extract the following standard fields from the text visible in the image:
    - question_id (e.g. "84b5125b")
    - difficulty (Easy/Medium/Hard)
    - passage (The main reading text)
    - question_text (e.g. "Which choice completes...")
    - choices (A, B, C, D text values)
    - correct_answer (The capital letter A/B/C/D)
    - explanation (The rationale provided)
    
    Also, generate ontology relationships based on the text:
    - target_word_pos (e.g., "Verb", "Noun", "Adjective", "Adverb")
    - passage_logical_flow (e.g., "Contrast", "Cause and effect", "Exemplification")
    - passage_topic (e.g., "Science", "Literature", "History")
    - synonyms_for_correct_answer (a list of 2-3 synonyms)
    
    Return ONLY a valid JSON object matching this schema:
    {
      "metadata": {"question_id": "", "difficulty": ""},
      "content": {"passage": "", "question_text": "", "choices": {"A": "", "B": "", "C": "", "D": ""}, "correct_answer": "", "explanation": ""},
      "analysis": {"target_word_pos": "", "passage_logical_flow": "", "passage_topic": "", "synonyms_for_correct_answer": []}
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
            time.sleep(0.5) # Slight delay to avoid rate limits

if __name__ == "__main__":
    import glob
    
    # Process all Words in Context PDFs
    pdf_files = glob.glob("Words in Context*.pdf")
    for pdf in pdf_files:
        difficulty = "easy" if "easy" in pdf.lower() else "medium" if "medium" in pdf.lower() else "hard" if "hard" in pdf.lower() else "unknown"
        # Output all results to a single master file
        out_file = "words_in_context_master.jsonl"
        # Process all pages
        process_pdf(pdf, out_file)
        print(f"Finished processing all pages of {pdf}.")
