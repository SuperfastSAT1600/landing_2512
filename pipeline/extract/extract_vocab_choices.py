"""
vocab choices — 모든 보기(A/B/C/D) 단어 추출
빈칸형(단어 1-3개) + 서술형(문장) 모두 포함
출력: vocab_choices.json
"""
import json, re
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

def get_diff(r):
    return r.get("difficulty") or (r.get("metadata") or {}).get("difficulty", "") or ""

def get_skill(r):
    return r.get("skill") or (r.get("metadata") or {}).get("skill", "") or ""

def get_qid(r):
    return r.get("id") or (r.get("metadata") or {}).get("question_id", "") or ""

def is_proper_noun(word, text):
    pattern = r'\b' + word[0].upper() + word[1:] + r'\b'
    return bool(re.search(pattern, text))

def tokenize(text):
    lower = re.sub(r"[^a-z\s\-]", " ", text.lower())
    result = []
    for t in lower.split():
        t = t.strip("-")
        if len(t) >= 3 and t not in STOPWORDS and t not in COMMON_WORDS and t.isalpha():
            result.append(t)
    return result

def classify_choice_type(choices):
    """빈칸형(단어) vs 서술형(문장) 분류"""
    if not choices:
        return "unknown"
    avg_len = sum(len(str(v).split()) for v in choices.values()) / len(choices)
    return "blank_fill" if avg_len <= 4 else "descriptive"

# ── 로드 ────────────────────────────────────────────────────────
rows = []
seen = set()
for fname in CP_FILES:
    p = base / fname
    if not p.exists():
        continue
    with open(p, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            qid = get_qid(r)
            if not qid or qid in seen:
                continue
            seen.add(qid)
            rows.append(r)

print(f"로드: {len(rows):,}개 문제")

# ── 추출 ────────────────────────────────────────────────────────
# 빈칸형: 보기 단어 직접 추출 (필터 없이 — 모두 직접 시험에 나오는 단어)
# 서술형: 보기 문장에서 academic 단어 추출

blank_fill_words  = Counter()      # 빈칸형 보기 단어
descriptive_words = Counter()      # 서술형 보기 단어
word_diff_cnt     = defaultdict(Counter)
word_skill_set    = defaultdict(set)
word_choice_type  = defaultdict(set)  # word → {blank_fill, descriptive}
word_correct      = Counter()         # 정답 위치에 있던 단어
word_wrong        = Counter()         # 오답 위치에 있던 단어
word_examples     = defaultdict(list)
proper_candidates = Counter()

blank_q, desc_q, no_choice_q = 0, 0, 0

def get_choices(r):
    """top-level 또는 content 중첩 구조 모두 처리"""
    ch = r.get("choices", {})
    if ch and isinstance(ch, dict):
        return ch, str(r.get("correct_answer", "")).strip().upper()
    # content 중첩 구조 (qb_rw_98, cross_text_new_5, missing)
    import ast as _ast
    content = r.get("content", {})
    if isinstance(content, str):
        try: content = _ast.literal_eval(content)
        except: content = {}
    if isinstance(content, dict):
        ch = content.get("choices", {})
        correct = str(content.get("correct_answer", "")).strip().upper()
        if ch and isinstance(ch, dict):
            return ch, correct
    return {}, ""

for r in rows:
    choices, correct_ans = get_choices(r)
    if not choices:
        no_choice_q += 1
        continue

    diff    = get_diff(r)
    skill   = get_skill(r)
    qid     = get_qid(r)
    correct = correct_ans
    ctype   = classify_choice_type(choices)

    if ctype == "blank_fill":
        blank_q += 1
    else:
        desc_q += 1

    # 모든 보기에서 단어 추출
    for option_key, option_text in choices.items():
        option_text = str(option_text).strip()
        is_correct_option = (option_key.upper() == correct)

        # 빈칸형/서술형 모두 동일한 필터 적용
        # (전치사구 보기 "for example", "in contrast" 등의 기능어 제거)
        tokens = tokenize(option_text)

        for word in set(tokens):
            if is_proper_noun(word, option_text):
                proper_candidates[word] += 1

        for word in set(tokens):
            if ctype == "blank_fill":
                blank_fill_words[word] += 1
            else:
                descriptive_words[word] += 1

            word_diff_cnt[word][diff or "Unknown"] += 1
            word_skill_set[word].add(skill or "Unknown")
            word_choice_type[word].add(ctype)

            if is_correct_option:
                word_correct[word] += 1
            else:
                word_wrong[word] += 1

            if len(word_examples[word]) < 2:
                word_examples[word].append({
                    "option": option_key,
                    "is_correct": is_correct_option,
                    "choice_type": ctype,
                    "difficulty": diff,
                    "text": option_text[:120],
                })

proper_nouns = {w for w, cnt in proper_candidates.items()
                if cnt / max(blank_fill_words.get(w, 0) + descriptive_words.get(w, 0), 1) >= 0.5}

print(f"빈칸형 문제: {blank_q:,}개 / 서술형: {desc_q:,}개 / 보기 없음: {no_choice_q:,}개")
print(f"빈칸형 고유 단어: {len(blank_fill_words):,}개")
print(f"서술형 고유 단어: {len(descriptive_words):,}개")
print(f"고유명사 제거: {len(proper_nouns)}개")

# ── 결과 구성 ─────────────────────────────────────────────────
all_choice_words = set(blank_fill_words) | set(descriptive_words)
results = []

for word in all_choice_words:
    if word in proper_nouns:
        continue

    in_blank    = word in blank_fill_words
    in_desc     = word in descriptive_words
    blank_cnt   = blank_fill_words.get(word, 0)
    desc_cnt    = descriptive_words.get(word, 0)
    total       = blank_cnt + desc_cnt

    diff_dist   = dict(word_diff_cnt[word])
    hard        = diff_dist.get("Hard", 0)
    hard_ratio  = round(hard / total, 3) if total else 0
    skill_div   = len(word_skill_set[word])
    correct_cnt = word_correct.get(word, 0)
    wrong_cnt   = word_wrong.get(word, 0)

    # 빈칸형 단어는 최소 필터 (모두 포함) — 직접 시험에 나오는 단어
    # 서술형만 있는 단어는 최소 2회 이상
    if not in_blank and total < 2:
        continue

    results.append({
        "word": word,
        "total_count": total,
        "blank_fill_count": blank_cnt,
        "descriptive_count": desc_cnt,
        "correct_answer_count": correct_cnt,
        "wrong_answer_count": wrong_cnt,
        "hard_ratio": hard_ratio,
        "skill_diversity": skill_div,
        "in_blank_fill": in_blank,
        "in_descriptive": in_desc,
        "difficulty_dist": diff_dist,
        "examples": word_examples[word],
    })

# 빈칸형 우선 정렬 (빈칸형 > 서술형, 같으면 총 빈도)
results.sort(key=lambda x: (-x["blank_fill_count"], -x["total_count"]))

output = {
    "meta": {
        "version": "choices",
        "description": "모든 보기(A/B/C/D) 단어 — 빈칸형 + 서술형",
        "blank_fill_questions": blank_q,
        "descriptive_questions": desc_q,
        "unique_words_total": len(results),
        "blank_fill_words": sum(1 for r in results if r["in_blank_fill"]),
        "descriptive_only_words": sum(1 for r in results if not r["in_blank_fill"]),
    },
    "words": results,
}

out_path = base / "vocab_choices.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n필터링 후: {len(results):,}개")
print(f"저장: {out_path}")

print("\n── 빈칸형 보기 단어 Top 50 (직접 시험에 나오는 단어) ──")
blank_only = [r for r in results if r["in_blank_fill"]]
for item in blank_only[:50]:
    d = item["difficulty_dist"]
    correct_pct = round(item["correct_answer_count"] / item["total_count"] * 100) if item["total_count"] else 0
    print(f"  {item['word']:<24} 빈칸:{item['blank_fill_count']:3d}회  "
          f"H:{d.get('Hard',0):3d} M:{d.get('Medium',0):3d} E:{d.get('Easy',0):3d}  "
          f"정답위치:{correct_pct}%  skills:{item['skill_diversity']}")

print("\n── 서술형 전용 상위 30개 ──────────────────────")
desc_only = [r for r in results if not r["in_blank_fill"]]
for item in desc_only[:30]:
    d = item["difficulty_dist"]
    print(f"  {item['word']:<24} 서술:{item['descriptive_count']:3d}회  "
          f"H:{d.get('Hard',0):3d} M:{d.get('Medium',0):3d} E:{d.get('Easy',0):3d}  "
          f"skills:{item['skill_diversity']}")
