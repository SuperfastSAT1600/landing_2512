"""
vocab v1 — 구조적 위치 기반 단어 추출
출력: vocab_v1_structural.json
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

TARGET_LABELS = {"C_au", "C_ct", "CL_au", "C_rb", "CL_ot", "C_ot"}

# 기본 불용어 (문법/기능어)
STOPWORDS = {
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "by","from","as","is","was","are","were","be","been","being","have",
    "has","had","do","does","did","will","would","could","should","may",
    "might","shall","can","that","this","these","those","it","its","they",
    "their","them","he","she","we","you","not","nor","so","yet","both",
    "either","neither","than","then","when","where","while","which","who",
    "whom","whose","what","how","if","although","because","since","though",
    "unless","until","after","before","during","about","into","through",
    "over","under","between","among","against","within","without","also",
    "just","only","even","still","already","always","never","often","some",
    "any","all","each","every","other","more","most","much","many","such",
    "same","own","first","last","long","little","one","two","three","here",
    "there","his","her","our","your","very","too","quite","almost","nearly",
    "however","therefore","thus","hence","moreover","furthermore",
    "nevertheless","nonetheless","meanwhile","indeed","specifically",
    "particularly","especially","rather","instead","whether","whose",
}

# 일상 영어 2,000단어 — 이미 알고 있는 단어 필터
# (학생들이 반드시 알고 있을 고빈도 일반 어휘)
COMMON_WORDS = {
    # 사람·관계
    "people","person","man","woman","men","women","child","children","family",
    "friend","group","team","member","student","teacher","author","writer",
    "artist","scientist","researcher","researchers","scholars","scholar",
    "historian","historians","character","speaker","reader","human","humans",
    "individual","individuals","community","communities","society","public",
    "colleagues","colleague","expert","experts","citizen","citizens",
    # 동사 — 기본
    "said","says","say","told","tell","think","thought","know","knew","known",
    "want","wanted","need","needs","needed","make","made","take","took","taken",
    "give","gave","given","come","came","gone","went","go","see","saw","seen",
    "look","looked","find","found","use","used","call","called","get","got",
    "keep","kept","show","showed","shown","put","set","let","run","ran","run",
    "help","helped","seem","seemed","feel","felt","become","became","leave",
    "left","turn","turned","move","moved","lead","led","ask","asked","try",
    "tried","work","worked","works","live","lived","play","played","follow",
    "followed","create","created","bring","brought","talk","talked","write",
    "wrote","written","read","hold","held","stand","stood","hear","heard",
    "stop","stopped","lose","lost","include","included","develop","developed",
    "focus","focused","change","changed","build","built","consider","considered",
    "learn","learned","start","started","open","opened","allow","allowed",
    "add","added","form","formed","begin","began","began","grow","grew","grown",
    "describe","described","explain","explained","suggest","suggested","note",
    "noted","provide","provided","support","supported","present","presented",
    "produce","produced","result","resulted","remain","remained","appear",
    "appeared","increase","increased","continue","continued","place","placed",
    "return","returned","face","faced","offer","offered","draw","drew","drawn",
    "believe","believed","reach","reached","cause","caused","report","reported",
    "serve","served","spend","spent","send","sent","expect","expected","meet",
    "met","point","pointed","argue","argued","claim","claimed","suggest",
    "reveal","revealed","identify","identified","recognize","recognized",
    "understand","understood","relate","related","compare","compared",
    "test","tested","measure","measured","observe","observed","examine",
    "examined","study","studied","analyze","analyzed","discuss","discussed",
    "conclude","concluded","determine","determined","establish","established",
    "confirm","confirmed","demonstrate","demonstrated","indicate","indicated",
    "highlight","highlighted","address","addressed","challenge","challenged",
    "explore","explored","investigate","investigated","propose","proposed",
    # 명사 — 기본
    "time","year","years","day","days","week","month","place","world","life",
    "way","people","fact","case","part","hand","line","work","example","idea",
    "thing","things","point","right","problem","side","question","end","number",
    "area","word","words","story","water","body","music","color","data","book",
    "books","page","land","home","water","light","light","food","form","forms",
    "type","types","kind","kinds","level","levels","line","lines","order",
    "orders","night","power","town","state","states","field","fields","name",
    "names","value","values","result","results","process","processes","issue",
    "issues","system","systems","role","roles","term","terms","effect","effects",
    "difference","differences","sense","culture","cultures","history","nature",
    "information","knowledge","evidence","research","study","studies","subject",
    "subjects","school","schools","city","cities","country","countries","class",
    "classes","period","periods","model","models","pattern","patterns","series",
    "source","sources","figure","figures","range","structure","structures",
    "method","methods","approach","approaches","practice","practices","action",
    "actions","experience","experiences","condition","conditions","cause",
    "causes","theory","theories","view","views","argument","arguments",
    "question","questions","answer","answers","response","responses","reason",
    "reasons","purpose","purposes","relationship","relationships","connection",
    "connections","change","changes","development","developments","event",
    "events","situation","situations","position","positions","process",
    "movement","movements","interest","interests","attention","ability",
    "abilities","opportunity","opportunities","effort","efforts","effect",
    "language","languages","nature","object","objects","activity","activities",
    "aspect","aspects","element","elements","factor","factors","feature",
    "features","function","functions","impact","idea","problem","problems",
    # 형용사 — 기본
    "good","bad","great","large","small","high","low","important","different",
    "similar","long","short","right","wrong","true","false","old","new","young",
    "early","late","hard","easy","simple","complex","common","specific","general",
    "social","political","economic","natural","physical","human","local","national",
    "global","major","minor","main","basic","clear","direct","full","real","free",
    "open","close","certain","possible","likely","able","available","various",
    "significant","recent","current","original","traditional","modern","central",
    "cultural","personal","public","private","positive","negative","strong",
    "weak","wide","narrow","deep","light","dark","white","black","red","blue",
    "green","further","final","total","particular","special","additional",
    "necessary","potential","initial","original","actual","previous","following",
    "multiple","single","several","various","both","own","other","such","same",
    "whole","entire","complete","standard","normal","regular","typical","known",
    "unknown","related","based","given","used","found","taken","made","called",
    "said","seen","shown","written","produced","created","developed","formed",
    "established","increased","described","noted","provided","included","started",
    "associated","focused","considered","identified","recognized","suggested",
    "reported","expected","required","continued","resulted","presented",
    "measured","tested","examined","explored","proposed","revealed","argued",
    "claimed","determined","confirmed","demonstrated","indicated","examined",
    # 부사·전치사
    "also","just","only","even","still","already","always","never","often",
    "usually","sometimes","generally","typically","often","again","back","down",
    "first","well","then","now","here","there","away","together","both","least",
    "most","much","more","less","best","better","worse","worst","enough","once",
    # 연구/학문 기본어 (SAT 학생이면 알고 있는 것)
    "found","study","research","theory","evidence","data","result","analysis",
    "paper","journal","review","methods","sample","population","control","group",
    "test","tests","effect","effects","compare","comparison","significant","rate",
    "percent","average","increase","decrease","improve","improvement",
    # 기타 빈출
    "novel","work","writing","letter","poem","story","narrative","text","passage",
    "statement","sentence","paragraph","chapter","section","title","term","word",
    "american","british","european","western","eastern","african","asian",
    "century","decade","period","era","modern","ancient","contemporary",
    "Morrison","morrison","james","james","william","williams","smith",
}

def get_skill(r):
    return r.get("skill") or (r.get("metadata") or {}).get("skill", "") or ""

def get_diff(r):
    return r.get("difficulty") or (r.get("metadata") or {}).get("difficulty", "") or ""

def get_qid(r):
    return r.get("id") or (r.get("metadata") or {}).get("question_id", "") or ""

def is_proper_noun(word, original_text):
    """원문에서 대문자로 시작하면 고유명사로 처리"""
    pattern = r'\b' + word[0].upper() + word[1:] + r'\b'
    return bool(re.search(pattern, original_text))

def count_syllables(word):
    """모음 그룹 개수로 음절 추정 (간단한 근사)"""
    word = word.lower()
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    # 묵음 e 처리
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)

def tokenize(text):
    lower = text.lower()
    lower = re.sub(r"[^a-z\s\-]", " ", lower)
    tokens = lower.split()
    result = []
    for t in tokens:
        t = t.strip("-")
        if (len(t) >= 4
                and t not in STOPWORDS
                and t not in COMMON_WORDS
                and t.isalpha()):
            result.append(t)
    return result

# ── 로드 ────────────────────────────────────────────────────────
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

# ── 추출 ────────────────────────────────────────────────────────
word_label_counter = defaultdict(Counter)
word_diff_counter  = defaultdict(Counter)
word_examples      = defaultdict(list)
word_total         = Counter()
# 고유명사 후보 추적
proper_candidates  = Counter()

total_cps = 0
target_cps = 0

for r in rows:
    diff = get_diff(r)
    skill = get_skill(r)
    for cp in r.get("cps", []):
        total_cps += 1
        label = cp.get("label_full", cp.get("label", ""))
        if label not in TARGET_LABELS:
            continue
        target_cps += 1
        text = cp.get("text", "").strip()
        if not text:
            continue

        tokens = tokenize(text)
        # 고유명사 감지: 원문에서 대문자 시작인지 확인
        for word in set(tokens):
            if is_proper_noun(word, text):
                proper_candidates[word] += 1

        for word in set(tokens):
            word_label_counter[word][label] += 1
            word_diff_counter[word][diff or "Unknown"] += 1
            word_total[word] += 1
            if len(word_examples[word]) < 2:
                word_examples[word].append({
                    "label": label,
                    "difficulty": diff,
                    "text": text[:150]
                })

# 고유명사 비율이 높은 단어 제거 (50% 이상 대문자 시작이면 고유명사)
proper_nouns = {
    w for w, cnt in proper_candidates.items()
    if cnt / word_total.get(w, 1) >= 0.5
}

print(f"대상 CP: {target_cps:,}개 / 전체 {total_cps:,}개")
print(f"추출 전 고유 단어: {len(word_total):,}개")
print(f"고유명사 제거: {len(proper_nouns)}개")

# ── 집계 ────────────────────────────────────────────────────────
results = []
for word, total in word_total.most_common():
    if word in proper_nouns:
        continue

    diff_dist = dict(word_diff_counter[word])
    hard = diff_dist.get("Hard", 0)
    easy = diff_dist.get("Easy", 0)
    medium = diff_dist.get("Medium", 0)
    hard_ratio = round(hard / total, 3) if total else 0
    syllables = count_syllables(word)

    label_dist = dict(word_label_counter[word])
    top_label = max(label_dist, key=label_dist.get)

    results.append({
        "word": word,
        "total_count": total,
        "hard_ratio": hard_ratio,
        "syllables": syllables,
        "top_label": top_label,
        "label_dist": label_dist,
        "difficulty_dist": diff_dist,
        "examples": word_examples[word],
    })

results_by_hard = sorted(
    [r for r in results if r["total_count"] >= 3],
    key=lambda x: (-x["hard_ratio"], -x["total_count"])
)

# ── 출력 ────────────────────────────────────────────────────────
output = {
    "meta": {
        "version": "v1",
        "description": "구조적 위치 기반 (C_au/C_ct/CL_au/C_rb/CL_ot/C_ot), 일반 영어 필터링 적용",
        "target_labels": sorted(TARGET_LABELS),
        "total_questions": len(rows),
        "target_cps": target_cps,
        "unique_words_raw": len(word_total),
        "unique_words_filtered": len(results),
        "proper_nouns_removed": len(proper_nouns),
    },
    "words_by_frequency": results,
    "words_by_hard_ratio": results_by_hard,
}

out_path = base / "vocab_v1_structural.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"필터링 후 단어: {len(results):,}개")
print(f"\n저장: {out_path}")

# ── 콘솔 요약 ───────────────────────────────────────────────────
print("\n── 빈도 상위 40개 (필터링 후) ─────────────────")
for item in results[:40]:
    d = item["difficulty_dist"]
    syl = item["syllables"]
    print(f"  {item['word']:<26} {item['total_count']:4d}회  "
          f"H:{d.get('Hard',0):3d} M:{d.get('Medium',0):3d} E:{d.get('Easy',0):3d}  "
          f"{syl}음절  [{item['top_label']}]")

print("\n── Hard 집중 상위 40개 (3회 이상) ─────────────")
for item in results_by_hard[:40]:
    d = item["difficulty_dist"]
    print(f"  {item['word']:<26} Hard:{d.get('Hard',0):3d}/{item['total_count']:3d} "
          f"({item['hard_ratio']*100:.0f}%)  {item['syllables']}음절  [{item['top_label']}]")
