"""
Step 1: SAT 단어장 베이스 파일 생성
- 소스: master_sat_ontology_v3.jsonl + vocab_master.json + WordNet
- 출력: sat_vocab_book.jsonl (image/root는 null, Step 2에서 채움)
"""
import json, ast, re
from pathlib import Path
from collections import defaultdict
from nltk.corpus import wordnet as wn
from nltk.stem import WordNetLemmatizer

ONTOLOGY  = Path("/workspace/schema/questions/master_sat_ontology_v3.jsonl")
VOCAB_MASTER = Path("/workspace/schema/vocab/vocab_master.json")
OUTPUT    = Path("/workspace/schema/vocab/sat_vocab_book.jsonl")

POS_LABEL = {'n': 'noun', 'v': 'verb', 'a': 'adjective', 's': 'adjective', 'r': 'adverb'}

lemmatizer = WordNetLemmatizer()


def best_lemma(word: str) -> str:
    best, best_count = word, len(wn.synsets(word))
    for pos in ['n', 'v', 'a', 'r']:
        l = lemmatizer.lemmatize(word, pos=pos)
        c = len(wn.synsets(l))
        if c > best_count:
            best, best_count = l, c
    return best


def classify(lemma: str) -> tuple[bool, bool]:
    """(is_case_a, is_case_b)"""
    synsets = wn.synsets(lemma)
    if not synsets:
        return False, False
    pos_groups = defaultdict(list)
    for s in synsets:
        pos_groups[s.pos()].append(s)
    max_same_pos = max(len(v) for v in pos_groups.values())
    pos_lexnames = defaultdict(set)
    for s in synsets:
        pos_lexnames[s.pos()].add(s.lexname())
    is_b = max_same_pos >= 2
    is_a = any(len(v) >= 2 for v in pos_lexnames.values())
    return is_a, is_b


def extract_meanings(lemma: str) -> list[dict]:
    """WordNet에서 의미 목록 추출 — 같은 POS별로 중복 lexname 제거"""
    synsets = wn.synsets(lemma)
    seen = set()
    meanings = []
    for s in synsets:
        key = (s.pos(), s.lexname())
        if key in seen:
            continue
        seen.add(key)
        meanings.append({
            "pos": POS_LABEL.get(s.pos(), s.pos()),
            "domain": s.lexname().split(".")[-1] if "." in s.lexname() else s.lexname(),
            "definition_en": s.definition(),
            "definition_ko": None,   # Step 2에서 채움
        })
    return meanings


def find_sat_examples(word: str, questions: list[dict], max_examples: int = 2) -> list[dict]:
    """단어가 등장하는 SAT passage/question 예문 추출"""
    examples = []
    pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
    for q in questions:
        if q.get('domain') != 'Reading and Writing':
            continue
        passage = q.get('passage', '')
        question_text = q.get('question', '')
        sentence = None
        for text in [passage, question_text]:
            if pattern.search(text):
                # 해당 단어가 포함된 문장 추출
                sentences = re.split(r'(?<=[.!?])\s+', text)
                for sent in sentences:
                    if pattern.search(sent):
                        sentence = sent[:200]
                        break
                if sentence:
                    break
        if sentence:
            examples.append({
                "question_id": q.get('id', ''),
                "skill": q.get('skill', ''),
                "difficulty": q.get('difficulty', ''),
                "sentence": sentence,
            })
        if len(examples) >= max_examples:
            break
    return examples


def build():
    # 1. vocab_master 로드
    with open(VOCAB_MASTER) as f:
        vm = json.load(f)
    word_meta = {w['word'].lower(): w for w in vm['all_words']}

    # 2. 대상 단어 수집
    raw_words = set()
    for w in vm['all_words']:
        if w.get('is_blank_fill') or w.get('confidence', 0) >= 3:
            raw_words.add(w['word'].lower().strip())

    with open(ONTOLOGY) as f:
        all_questions = [json.loads(l) for l in f if l.strip()]

    wic_qs = [q for q in all_questions if 'Words in Context' in q.get('skill', '')]
    for q in wic_qs:
        ch = q.get('choices', {})
        if isinstance(ch, str):
            try: ch = ast.literal_eval(ch)
            except: ch = {}
        if isinstance(ch, dict):
            for v in ch.values():
                w2 = v.strip().split()[0].lower().rstrip('.,;:')
                if len(w2) > 2:
                    raw_words.add(w2)

    # 3. 중복 lemma 제거 후 분류
    lemma_to_words = defaultdict(set)
    for w in raw_words:
        lemma_to_words[best_lemma(w)].add(w)

    print(f"원본 단어: {len(raw_words)}개 → lemma: {len(lemma_to_words)}개")

    # 4. 엔트리 생성
    entries = []
    skipped = 0
    for lemma, originals in sorted(lemma_to_words.items()):
        synsets = wn.synsets(lemma)
        if not synsets:
            skipped += 1
            continue

        is_a, is_b = classify(lemma)
        if not is_a and not is_b:
            continue  # 단일 의미어 제외

        group = "AB" if is_a else "B"

        # 대표 단어 = blank_fill인 것 우선, 아니면 lemma
        rep_word = lemma
        for w in originals:
            if word_meta.get(w, {}).get('is_blank_fill'):
                rep_word = w
                break

        meta = word_meta.get(rep_word, word_meta.get(lemma, {}))
        diff_dist = meta.get('difficulty_dist', {})
        top_difficulty = max(diff_dist, key=diff_dist.get) if diff_dist else None

        entry = {
            "word": rep_word,
            "lemma": lemma,
            "group": group,
            "is_blank_fill": meta.get('is_blank_fill', False),
            "difficulty": top_difficulty,
            "difficulty_dist": diff_dist,
            "n_synsets": len(synsets),
            "meanings": extract_meanings(lemma),
            "image": None,   # Step 2 (Group A)
            "root": None,    # Step 2 (Group B)
            "sat_examples": find_sat_examples(rep_word, all_questions),
        }
        entries.append(entry)

    # 5. 저장
    with open(OUTPUT, 'w') as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + '\n')

    group_ab = sum(1 for e in entries if e['group'] == 'AB')
    group_b  = sum(1 for e in entries if e['group'] == 'B')
    bf_count = sum(1 for e in entries if e['is_blank_fill'])

    print(f"\n=== 생성 완료: {OUTPUT} ===")
    print(f"Group AB (이미지+뿌리): {group_ab}개")
    print(f"Group B  (뿌리만):      {group_b}개")
    print(f"합계:                   {len(entries)}개")
    print(f"blank_fill 단어:        {bf_count}개")
    print(f"WordNet 미등록 제외:    {skipped}개")


if __name__ == "__main__":
    build()
