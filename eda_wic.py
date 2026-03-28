import json
from collections import Counter, defaultdict

data = []
with open('blog_database/words_in_context_master.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            data.append(json.loads(line))

def get_analysis(d):
    if 'analysis' in d:
        return d['analysis']
    elif 'analysis' in d.get('content', {}):
        return d['content']['analysis']
    return None

records = []
for d in data:
    a = get_analysis(d)
    if a:
        records.append({
            'difficulty': d['metadata']['difficulty'],
            'logical_flow': a.get('passage_logical_flow',''),
            'pos': a.get('target_word_pos',''),
            'topic': a.get('passage_topic',''),
            'correct': d['content']['correct_answer'],
        })

print(f"Usable records: {len(records)}")
print()

difficulties = Counter(r['difficulty'] for r in records)
print("=== Difficulty ===")
for k, v in sorted(difficulties.items()):
    print(f"  {k}: {v} ({v/len(records)*100:.1f}%)")
print()

flows = Counter(r['logical_flow'] for r in records)
print("=== Logical Flow ===")
for k, v in sorted(flows.items(), key=lambda x:-x[1]):
    print(f"  {k}: {v} ({v/len(records)*100:.1f}%)")
print()

pos_dist = Counter(r['pos'] for r in records)
print("=== Target Word POS ===")
for k, v in sorted(pos_dist.items(), key=lambda x:-x[1]):
    print(f"  {k}: {v} ({v/len(records)*100:.1f}%)")
print()

topics = Counter(r['topic'] for r in records)
print("=== Topics (top 10) ===")
for k, v in sorted(topics.items(), key=lambda x:-x[1])[:10]:
    print(f"  {k}: {v} ({v/len(records)*100:.1f}%)")
print()

# === KEY INSIGHT: Logical flow X Difficulty cross-tab ===
print("=== Logical Flow x Difficulty cross-tab ===")
flow_diff = defaultdict(Counter)
for r in records:
    flow_diff[r['logical_flow']][r['difficulty']] += 1

header = f"{'Flow':<30} {'Easy':>8} {'Medium':>8} {'Hard':>8} {'Total':>8} {'Hard%':>8}"
print(header)
print("-" * len(header))
for flow, diff_counts in sorted(flow_diff.items(), key=lambda x: -x[1].get('Hard',0)/sum(x[1].values())):
    total = sum(diff_counts.values())
    easy = diff_counts.get('Easy', 0)
    med = diff_counts.get('Medium', 0)
    hard = diff_counts.get('Hard', 0)
    hard_pct = hard / total * 100 if total else 0
    print(f"  {flow:<28} {easy:>8} {med:>8} {hard:>8} {total:>8} {hard_pct:>7.1f}%")
print()

# === POS x Difficulty cross-tab ===
print("=== POS x Difficulty cross-tab ===")
pos_diff = defaultdict(Counter)
for r in records:
    pos_diff[r['pos']][r['difficulty']] += 1

header2 = f"{'POS':<20} {'Easy':>8} {'Medium':>8} {'Hard':>8} {'Total':>8} {'Hard%':>8}"
print(header2)
print("-" * len(header2))
for pos, diff_counts in sorted(pos_diff.items(), key=lambda x: -x[1].get('Hard',0)/sum(x[1].values())):
    total = sum(diff_counts.values())
    easy = diff_counts.get('Easy', 0)
    med = diff_counts.get('Medium', 0)
    hard = diff_counts.get('Hard', 0)
    hard_pct = hard / total * 100 if total else 0
    print(f"  {pos:<18} {easy:>8} {med:>8} {hard:>8} {total:>8} {hard_pct:>7.1f}%")
print()

# === Correct answer distribution (A/B/C/D) by difficulty ===
print("=== Correct Answer Distribution by Difficulty ===")
ans_diff = defaultdict(Counter)
for r in records:
    ans_diff[r['difficulty']][r['correct']] += 1

for diff in ['Easy', 'Medium', 'Hard']:
    counts = ans_diff[diff]
    total = sum(counts.values())
    print(f"  {diff} (n={total}):", {k: f"{v} ({v/total*100:.0f}%)" for k,v in sorted(counts.items())})
print()

# === Hard문제에서 dominant logical flows ===
hard_flows = Counter(r['logical_flow'] for r in records if r['difficulty'] == 'Hard')
print("=== Hard문제 Logical Flow (ranked) ===")
for k, v in sorted(hard_flows.items(), key=lambda x:-x[1]):
    print(f"  {k}: {v} ({v/sum(hard_flows.values())*100:.1f}%)")
print()

# === Topic x Difficulty: which topics are hardest? ===
print("=== Topic x Difficulty (Hard% top 10) ===")
topic_diff = defaultdict(Counter)
for r in records:
    topic_diff[r['topic']][r['difficulty']] += 1

topic_hard_pct = []
for topic, diff_counts in topic_diff.items():
    total = sum(diff_counts.values())
    if total >= 3:
        hard_pct = diff_counts.get('Hard', 0) / total * 100
        topic_hard_pct.append((topic, total, diff_counts.get('Easy',0), diff_counts.get('Medium',0), diff_counts.get('Hard',0), hard_pct))

topic_hard_pct.sort(key=lambda x: -x[5])
for row in topic_hard_pct[:10]:
    print(f"  {row[0]:<30} n={row[1]:>4}  Easy={row[2]:>3} Med={row[3]:>3} Hard={row[4]:>3}  Hard%={row[5]:.0f}%")
