import json
import logging
from collections import defaultdict
from openai import OpenAI
import dotenv

dotenv.load_dotenv()
client = OpenAI()

def load_data(files):
    data = []
    for f in files:
        with open(f, 'r', encoding='utf-8') as file:
            data.extend([json.loads(line) for line in file if line.strip()])
    return data

def generate_stats_string(data):
    # This function brute-forces some key cross-tabulations
    # 1. Difficulty vs Correct Answer (A/B/C/D)
    # 2. Difficulty vs Logical Flow
    # 3. Logical Flow vs POS
    # 4. Correct Answer vs POS
    
    stats = []
    
    # helper
    def build_cross_tab(label, feature1_fn, feature2_fn):
        cross = defaultdict(lambda: defaultdict(int))
        for item in data:
            f1 = feature1_fn(item)
            f2 = feature2_fn(item)
            if f1 and f2:
                cross[f1][f2] += 1
                
        lines = [f"--- {label} ---"]
        for k1, v1 in cross.items():
            total = sum(v1.values())
            for k2, count in v1.items():
                if count > 2: # filter out noise
                    lines.append(f"{k1} + {k2} = {count} occurrences ({count/total*100:.1f}% of {k1})")
        stats.append("\n".join(lines))
        
    build_cross_tab("Difficulty vs Correct Answer", 
                    lambda x: x.get('metadata', {}).get('difficulty'), 
                    lambda x: x.get('content', {}).get('correct_answer'))
                    
    build_cross_tab("Difficulty vs Logical Flow", 
                    lambda x: x.get('metadata', {}).get('difficulty'), 
                    lambda x: x.get('analysis', {}).get('passage_logical_flow') or x.get('analysis', {}).get('target_transition_category'))
                    
    build_cross_tab("Logical Flow vs Part of Speech", 
                    lambda x: x.get('analysis', {}).get('passage_logical_flow') or x.get('analysis', {}).get('target_transition_category'), 
                    lambda x: x.get('analysis', {}).get('target_word_pos'))
                    
    build_cross_tab("Topic vs Correct Answer", 
                    lambda x: x.get('analysis', {}).get('passage_topic'), 
                    lambda x: x.get('content', {}).get('correct_answer'))

    return "\n\n".join(stats)

def discover_insights(stats_string):
    prompt = f"""
You are an elite Data Scientist and SAT pedagogy expert. 
I have brute-forced statistical correlations across a database of hundreds of SAT Reading & Writing questions.
Below is the raw cross-tabulation data showing combinations of Difficulty, Correct Answer frequency, Logical Flow, Part of Speech, and Topic.

YOUR TASK:
Analyze this raw data and identify the TOP 3 most COUNTER-INTUITIVE, "BEYOND HUMAN IMAGINATION" statistical insights.
I don't want boring insights like "Easy questions are easy". 
I want insights that shock a typical SAT tutor or student. Look for massive deviations in normal distribution, strange correlation clusters, or heavily biased combinations.

Format your response as a Markdown report for a blog, highlighting each insight and explaining WHY it is surprising and how a student could use it as a "hack".

RAW DATA:
{stats_string}
    """
    
    print("Sending massive correlation data to GPT-4o for insight generation...\n")
    response = client.chat.completions.create(
        model="gpt-4o",  # Using the smarter model for analysis
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    
    return response.choices[0].message.content

if __name__ == "__main__":
    files = ["words_in_context_master.jsonl", "transitions_master.jsonl"]
    print("Loading databases...")
    data = load_data(files)
    print(f"Loaded {len(data)} questions.")
    
    print("Crunching cross-tabulations...")
    stats_string = generate_stats_string(data)
    
    insight_report = discover_insights(stats_string)
    
    with open("automated_insight_report.md", "w", encoding="utf-8") as f:
        f.write(insight_report)
        
    print("\n\n" + insight_report)
    print("\n\n[Success] Report saved to automated_insight_report.md")
