import json
import os
import time
from typing import List, Dict
from openai import OpenAI
import dotenv

dotenv.load_dotenv()
client = OpenAI()

def check_semantic_meaning(items: List[Dict]):
    results = []
    
    prompt = """
You are an expert SAT tutor and linguist. I will provide you with a list of SAT 'Words in Context' questions. 
For each item, I will give you the ID, the CORRECT WORD, and the CONTEXT passage.
Your job is to determine if the correct word is being used in its PRIMARY (most common, everyday 1st dictionary definition) or SECONDARY (nuanced, alternate, figurative, or rare dictionary definition).

Usually, "Secondary" means the student would get it wrong if they only memorized the word's most basic meaning.

Respond strictly in JSON format matching this schema:
{
  "evaluations": [
    {
      "id": "question id",
      "classification": "Primary" or "Secondary",
      "reason": "1-sentence explanation"
    }
  ]
}
    """
    
    batch_size = 20
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{(len(items)//batch_size)+1}...")
        
        user_content = ""
        for item in batch:
            correct_letter = item['content'].get('correct_answer', '')
            choices = item['content'].get('choices', {})
            word = choices.get(correct_letter, "UNKNOWN")
            passage = item['content'].get('passage', "")
            
            user_content += f"ID: {item['metadata']['question_id']}\nWord: {word}\nContext: {passage}\n---\n"
            
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": user_content}
                ],
                response_format={ "type": "json_object" }
            )
            data = json.loads(response.choices[0].message.content)
            if "evaluations" in data:
                results.extend(data["evaluations"])
        except Exception as e:
            print(f"Error on batch {i}: {e}")
            
    return results

if __name__ == "__main__":
    with open('words_in_context_master.jsonl', 'r', encoding='utf-8') as f:
        items = [json.loads(line) for line in f if line.strip()]
        
    print(f"Loaded {len(items)} questions. Starting semantic evaluation...")
    
    evaluations = check_semantic_meaning(items)
    
    with open('semantic_evaluation_results.json', 'w', encoding='utf-8') as f:
        json.dump(evaluations, f, indent=2, ensure_ascii=False)
        
    primary_count = sum(1 for e in evaluations if e.get('classification') == 'Primary')
    secondary_count = sum(1 for e in evaluations if e.get('classification') == 'Secondary')
    total = len(evaluations)
    
    if total > 0:
        print("\n--- Semantic Evaluation Results ---")
        print(f"Total Evaluations: {total}")
        print(f"Primary Meaning: {primary_count} ({(primary_count/total)*100:.1f}%)")
        print(f"Secondary Meaning: {secondary_count} ({(secondary_count/total)*100:.1f}%)")
    else:
        print("No evaluations succeeded.")
