"""
vocab v3 — 오답 패턴 역산 연결
출력: vocab_v3_wrong_anchored.json
"""
import json, re, math
from pathlib import Path
from collections import Counter, defaultdict

base = Path(__file__).parent

CP_FILES = [
    "baseline_cp_analysis.jsonl",
    "qb_rw_98_cp_analysis.jsonl",
    "cross_text_new_5_cp_analysis.jsonl",
    "missing_cp_analysis.jsonl",
    "retry_14_cp_analysis.jsonl",
]

TARGET_LABELS = {"C_au", "C_ct", "CL_au", "C_rb", "CL_ot", "C_ot"}

STOPWORDS = {
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "by","from","as","is","was","are","were","be","been","being","have",
    "has","had","do","does","did","will","would","could","should","may",
    "might","shall","can","that","this","these","those","it","its","they",
    "their","them","he","she","we","you","not","no","nor","so","yet","both",
    "either","neither","than","then","when","where","while","which","who",
    "whom","whose","what","how","if","although","because","since","though",
    "unless","until","after","before","during","about","into","through",
    "over","under","between","among","against","within","without","also",
    "just","only","even","still","already","always","never","often","some",
    "any","all","each","every","other","more","most","much","many","such",
    "same","own","here","there","his","her","our","your","very","too",
    "quite","almost","nearly","however","therefore","thus","hence","moreover",
    "furthermore","nevertheless","nonetheless","meanwhile","indeed",
    "specifically","particularly","especially","rather","instead","whether",
}

COMMON_WORDS = {
    "people","person","man","woman","men","women","child","children","family",
    "friend","group","team","member","student","teacher","author","writer",
    "artist","scientist","researcher","researchers","scholars","scholar",
    "historian","historians","character","human","humans","individual",
    "individuals","community","communities","society","public","colleagues",
    "colleague","expert","experts","citizen","citizens","said","says","say",
    "told","tell","think","thought","know","knew","known","want","wanted",
    "need","needs","needed","make","made","take","took","taken","give","gave",
    "given","come","came","gone","went","go","see","saw","seen","look","looked",
    "find","found","use","used","call","called","get","got","keep","kept",
    "show","showed","shown","put","set","let","run","ran","help","helped",
    "seem","seemed","feel","felt","become","became","leave","left","turn",
    "turned","move","moved","lead","led","ask","asked","try","tried","work",
    "worked","works","live","lived","play","played","follow","followed",
    "create","created","bring","brought","talk","talked","write","wrote",
    "written","read","hold","held","stand","stood","hear","heard","stop",
    "stopped","lose","lost","include","included","develop","developed",
    "focus","focused","change","changed","build","built","consider",
    "considered","learn","learned","start","started","open","opened","allow",
    "allowed","add","added","form","formed","begin","began","grow","grew",
    "grown","describe","described","explain","explained","suggest","suggested",
    "note","noted","provide","provided","support","supported","present",
    "presented","produce","produced","result","resulted","remain","remained",
    "appear","appeared","increase","increased","continue","continued","place",
    "placed","return","returned","face","faced","offer","offered","draw",
    "drew","drawn","believe","believed","reach","reached","cause","caused",
    "report","reported","serve","served","spend","spent","send","sent",
    "expect","expected","meet","met","point","pointed","argue","argued",
    "claim","claimed","reveal","revealed","identify","identified","recognize",
    "recognized","understand","understood","relate","related","compare",
    "compared","test","tested","measure","measured","observe","observed",
    "examine","examined","study","studied","analyze","analyzed","discuss",
    "discussed","conclude","concluded","determine","determined","establish",
    "established","confirm","confirmed","demonstrate","demonstrated",
    "indicate","indicated","highlight","highlighted","address","addressed",
    "challenge","challenged","explore","explored","investigate","investigated",
    "propose","proposed","time","year","years","day","days","week","month",
    "place","world","life","way","fact","case","part","hand","line","example",
    "idea","thing","things","question","end","number","area","word","words",
    "story","water","body","music","color","data","book","books","page","land",
    "home","light","food","form","forms","type","types","kind","kinds","level",
    "levels","order","night","power","town","state","states","field","fields",
    "name","names","value","values","process","processes","issue","issues",
    "system","systems","role","roles","term","terms","effect","effects",
    "difference","differences","sense","culture","cultures","history","nature",
    "information","knowledge","evidence","research","subject","subjects",
    "school","schools","city","cities","country","countries","class","classes",
    "period","periods","model","models","pattern","patterns","series","source",
    "sources","figure","figures","range","structure","structures","method",
    "methods","approach","approaches","practice","practices","action","actions",
    "experience","experiences","condition","conditions","theory","theories",
    "view","views","argument","arguments","answer","answers","response",
    "responses","reason","reasons","purpose","purposes","relationship",
    "relationships","connection","connections","development","developments",
    "event","events","situation","situations","position","positions","movement",
    "movements","interest","interests","attention","ability","abilities",
    "opportunity","opportunities","effort","efforts","language","languages",
    "object","objects","activity","activities","aspect","aspects","element",
    "elements","factor","factors","feature","features","function","functions",
    "impact","problem","problems","good","bad","great","large","small","high",
    "low","important","different","similar","long","short","right","wrong",
    "true","false","old","new","young","early","late","hard","easy","simple",
    "complex","common","specific","general","social","political","natural",
    "physical","local","national","global","major","minor","main","basic",
    "clear","direct","full","real","free","open","close","certain","possible",
    "likely","able","available","various","significant","recent","current",
    "original","traditional","modern","central","cultural","personal","public",
    "private","positive","negative","strong","weak","wide","narrow","deep",
    "white","black","red","blue","green","further","final","total","particular",
    "special","additional","necessary","potential","initial","actual",
    "previous","following","multiple","single","several","whole","entire",
    "complete","standard","normal","regular","typical","known","unknown",
    "related","based","given","used","taken","made","called","seen","shown",
    "written","produced","created","developed","formed","established",
    "increased","described","noted","provided","included","associated",
    "considered","identified","recognized","reported","expected","continued",
    "presented","measured","examined","proposed","argued","determined",
    "confirmed","indicated","novel","letter","poem","narrative","text",
    "passage","statement","sentence","paragraph","chapter","section",
    "american","british","european","western","eastern","african","asian",
    "century","decade","era","contemporary","ancient","mass","space","like",
    "must","next","around","across","along","within","since","using","getting",
    "making","taking","having","doing","going","coming","looking","seeing",
    "saying","knowing","working","living","playing","writing","reading",
    "thinking","trying","artists","critics","poets","novels","paintings",
    "painting","stories","scientists","species","claims","argues","asserts",
    "suggests","others","according","another","diverse","creating","travel",
    "pieces","characters","audiences","images","popular","native","literary",
    "literature","recently","entirely","style","poet","mass",
}

ACADEMIC_SUFFIXES = (
    "tion","sion","ity","ism","ist","ize","ise","ous","ive","ance","ence",
    "ment","ness","ary","ory","ify","ate","ent","ant","ical","ology",
    "ation","ization","ification",
)

def get_qid(r):
    return r.get("id") or (r.get("metadata") or {}).get("question_id", "") or ""

def get_diff(r):
    return r.get("difficulty") or (r.get("metadata") or {}).get("difficulty", "") or ""

def count_syllables(word):
    word = word.lower()
    vowels = "aeiouy"
    count, prev_vowel = 0, False
    for ch in word:
        is_v = ch in vowels
        if is_v and not prev_vowel:
            count += 1
        prev_vowel = is_v
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)

def is_academic(word):
    if count_syllables(word) >= 3:
        return True
    for suf in ACADEMIC_SUFFIXES:
        if word.endswith(suf) and len(word) > len(suf) + 2:
            return True
    return False

def is_proper_noun(word, text):
    pattern = r'\b' + word[0].upper() + word[1:] + r'\b'
    return bool(re.search(pattern, text))

def tokenize(text):
    lower = re.sub(r"[^a-z\s\-]", " ", text.lower())
    result = []
    for t in lower.split():
        t = t.strip("-")
        if len(t) >= 4 and t not in STOPWORDS and t not in COMMON_WORDS and t.isalpha():
            result.append(t)
    return result

# ── 1. CP 데이터 로드 & word→qid 매핑 ───────────────────────────
rows = []
seen = set()
for fname in CP_FILES:
    p = base / fname
    if not p.exists():
        continue
    with open(p) as f:
        for line in f:
            r = json.loads(line)
            qid = get_qid(r)
            if not qid or qid in seen:
                continue
            seen.add(qid)
            rows.append(r)

print(f"로드: {len(rows):,}개 문제")

word_qid_set    = defaultdict(set)
word_total      = Counter()
word_label      = defaultdict(Counter)
word_diff       = defaultdict(Counter)
word_examples   = defaultdict(list)
proper_cands    = Counter()

for r in rows:
    qid  = get_qid(r)
    diff = get_diff(r)
    for cp in r.get("cps", []):
        label = cp.get("label_full", cp.get("label", ""))
        if label not in TARGET_LABELS:
            continue
        text = cp.get("text", "").strip()
        if not text:
            continue
        tokens = tokenize(text)
        for w in set(tokens):
            if is_proper_noun(w, text):
                proper_cands[w] += 1
        for w in set(tokens):
            word_qid_set[w].add(qid)
            word_total[w] += 1
            word_label[w][label] += 1
            word_diff[w][diff or "Unknown"] += 1
            if len(word_examples[w]) < 2:
                word_examples[w].append({"label": label, "difficulty": diff, "text": text[:150]})

proper_nouns = {w for w, cnt in proper_cands.items()
                if cnt / word_total.get(w, 1) >= 0.5}

# ── 2. 오답 데이터 로드 ──────────────────────────────────────────
qid_to_wrongs = defaultdict(list)
wrong_path = base / "wrong_answer_patterns.jsonl"
if wrong_path.exists():
    with open(wrong_path) as f:
        for line in f:
            w = json.loads(line)
            cat = (w.get("category") or "").strip().title()
            if cat:
                qid_to_wrongs[w.get("question_id","")].append(cat)

print(f"오답 데이터: {len(qid_to_wrongs):,}개 문제에 매핑")

# ── 3. word → wrong_category 연결 ───────────────────────────────
WRONG_CATS = [
    "Partial Match","Out Of Scope","Contradiction","Distortion",
    "Misattribution","Pre-Pivot Reading","Overgeneralization","Degree Error",
]

results = []
for word, total in word_total.most_common():
    if word in proper_nouns:
        continue
    if not is_academic(word):
        continue

    # 이 단어가 나오는 문제들의 오답 카테고리 집계
    wrong_counter = Counter()
    matched_qids  = 0
    for qid in word_qid_set[word]:
        cats = qid_to_wrongs.get(qid, [])
        if cats:
            matched_qids += 1
            for cat in cats:
                wrong_counter[cat] += 1

    wrong_total_n = sum(wrong_counter.values())
    top_wrong = []
    for cat, cnt in wrong_counter.most_common(3):
        top_wrong.append({
            "category": cat,
            "count": cnt,
            "pct": round(cnt / wrong_total_n * 100, 1) if wrong_total_n else 0,
        })

    diff_dist  = dict(word_diff[word])
    hard       = diff_dist.get("Hard", 0)
    hard_ratio = round(hard / total, 3) if total else 0
    top_label  = max(word_label[word], key=word_label[word].get)

    # wrong anchor score: 오답 데이터가 많고 특정 패턴에 집중될수록 높음
    top_wrong_pct = top_wrong[0]["pct"] if top_wrong else 0
    wrong_anchor  = round(hard_ratio * (matched_qids / max(total, 1)) * (top_wrong_pct / 100), 4)

    results.append({
        "word": word,
        "total_count": total,
        "hard_ratio": hard_ratio,
        "wrong_matched_questions": matched_qids,
        "top_label": top_label,
        "label_dist": dict(word_label[word]),
        "difficulty_dist": diff_dist,
        "top_wrong_categories": top_wrong,
        "wrong_anchor_score": wrong_anchor,
        "examples": word_examples[word],
    })

results_by_anchor = sorted(results, key=lambda x: -x["wrong_anchor_score"])
results_by_freq   = sorted(results, key=lambda x: -x["total_count"])

output = {
    "meta": {
        "version": "v3",
        "description": "오답 패턴 역산 연결 — 단어별 연관 오답 카테고리",
        "total_questions": len(rows),
        "unique_words": len(results),
        "wrong_anchor_formula": "hard_ratio × (matched_qids/total) × (top_wrong_pct/100)",
    },
    "words_by_wrong_anchor": results_by_anchor,
    "words_by_frequency": results_by_freq,
}

out_path = base / "vocab_v3_wrong_anchored.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"추출: {len(results):,}개")
print(f"저장: {out_path}")
print()
print("── Wrong Anchor 상위 40개 ──────────────────────")
for item in results_by_anchor[:40]:
    top_w = item["top_wrong_categories"]
    w1 = f"{top_w[0]['category']}({top_w[0]['pct']}%)" if top_w else "-"
    w2 = f"{top_w[1]['category']}({top_w[1]['pct']}%)" if len(top_w) > 1 else ""
    d = item["difficulty_dist"]
    print(f"  {item['word']:<28} anchor:{item['wrong_anchor_score']:.4f}  "
          f"H:{d.get('Hard',0)}/{item['total_count']}  "
          f"{w1}  {w2}  [{item['top_label']}]")
