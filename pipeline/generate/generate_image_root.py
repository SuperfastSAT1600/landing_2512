"""
Step 2: Claude API로 image(뜻의 이미지) + root(뜻의 뿌리) 생성
- 입력: sat_vocab_book.jsonl
- 출력: sat_vocab_book.jsonl (in-place 업데이트)

사용법:
  python3 generate_image_root.py              # 전체 실행
  python3 generate_image_root.py --limit 10   # 테스트 (10개만)
  python3 generate_image_root.py --resume     # 이미 채워진 것 건너뜀
"""
import json, os, time, argparse
from pathlib import Path
import anthropic

INPUT  = Path("/workspace/schema/vocab/sat_vocab_book.jsonl")
OUTPUT = Path("/workspace/schema/vocab/sat_vocab_book.jsonl")
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── 프롬프트 ──────────────────────────────────────────────────────────

IMAGE_PROMPT = """\
영어 단어 "{word}"는 한국어로 번역할 때 문맥에 따라 전혀 다른 단어가 됩니다.

주요 의미:
{meanings}

아래 조건으로 "뜻의 이미지" 2-3문장을 한국어로 작성하세요.
- 제목/헤더 없이 바로 본문만 작성
- 여러 한국어 번역이 하나의 영어 단어에서 나온 이유를 하나의 이미지/은유로 설명
- 고등학생이 읽어도 바로 이해되는 언어
- 첫 문장에 핵심 이미지 제시, 이후 문장에서 구체 예시"""

ROOT_PROMPT = """\
영어 단어 "{word}"는 여러 의미를 가진 다의어입니다.

의미 목록:
{meanings}

아래 조건으로 "뜻의 뿌리" 2-3문장을 한국어로 작성하세요.
- 제목/헤더 없이 바로 본문만 작성
- 라틴어/그리스어 어원(있으면) → 원래 의미 → 현재 의미들이 갈라진 과정
- 간결하고 기억하기 쉽게
- 고등학생 대상"""

KO_PROMPT = """\
영어 뜻을 한국어 3단어 이내로 번역하세요. 단어와 괄호 설명 없이 번역만 출력하세요.

영어: {definition_en}
단어: {word} ({pos})
한국어:"""


def format_meanings(meanings: list[dict]) -> str:
    lines = []
    for i, m in enumerate(meanings, 1):
        ko = f" / {m['definition_ko']}" if m.get('definition_ko') else ""
        lines.append(f"{i}. [{m['pos']}] {m['definition_en']}{ko}")
    return "\n".join(lines)


def call_claude(prompt: str, max_tokens: int = 300) -> str:
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    # 마크다운 헤더 제거 (# word 형태)
    lines = [l for l in text.splitlines() if not l.strip().startswith('#')]
    return "\n".join(lines).strip()


def fill_korean(entry: dict) -> dict:
    """definition_ko 채우기"""
    for m in entry.get("meanings", []):
        if not m.get("definition_ko"):
            prompt = KO_PROMPT.format(
                definition_en=m["definition_en"],
                word=entry["word"],
                pos=m["pos"],
            )
            m["definition_ko"] = call_claude(prompt, max_tokens=30)
    return entry


def fill_image(entry: dict) -> dict:
    """뜻의 이미지 채우기 (Group A)"""
    if entry.get("image"):
        return entry
    prompt = IMAGE_PROMPT.format(
        word=entry["word"],
        meanings=format_meanings(entry["meanings"]),
    )
    entry["image"] = call_claude(prompt, max_tokens=200)
    return entry


def fill_root(entry: dict) -> dict:
    """뜻의 뿌리 채우기 (Group B)"""
    if entry.get("root"):
        return entry
    prompt = ROOT_PROMPT.format(
        word=entry["word"],
        meanings=format_meanings(entry["meanings"]),
    )
    entry["root"] = call_claude(prompt, max_tokens=200)
    return entry


def process(limit: int = None, resume: bool = True):
    with open(INPUT) as f:
        entries = [json.loads(l) for l in f if l.strip()]

    total = len(entries)
    to_process = entries[:limit] if limit else entries

    done = 0
    for i, entry in enumerate(to_process):
        already_done = (
            (entry["group"] == "B" and entry.get("root") and all(m.get("definition_ko") for m in entry["meanings"]))
            or (entry["group"] == "AB" and entry.get("image") and entry.get("root") and all(m.get("definition_ko") for m in entry["meanings"]))
        )
        if resume and already_done:
            continue

        try:
            entry = fill_korean(entry)

            if entry["group"] in ("A", "AB"):
                entry = fill_image(entry)
            entry = fill_root(entry)

            entries[i] = entry
            done += 1

            if done % 10 == 0:
                # 중간 저장
                with open(OUTPUT, 'w') as f:
                    for e in entries:
                        f.write(json.dumps(e, ensure_ascii=False) + '\n')
                print(f"  [{done}/{min(limit or total, total)}] 저장 완료")

            time.sleep(0.3)  # rate limit 방지

        except Exception as e:
            print(f"  ERROR [{entry['word']}]: {e}")
            time.sleep(2)

    # 최종 저장
    with open(OUTPUT, 'w') as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + '\n')

    print(f"\n완료: {done}개 업데이트 / 전체 {total}개")


def preview(n: int = 3):
    """생성 결과 미리보기"""
    with open(OUTPUT) as f:
        entries = [json.loads(l) for l in f if l.strip()]

    filled = [e for e in entries if e.get("root")]
    print(f"완료된 단어: {len(filled)} / {len(entries)}\n")

    for e in filled[:n]:
        print(f"━━━ {e['word']} [{e['group']}] ━━━")
        for m in e['meanings'][:2]:
            print(f"  [{m['pos']}] {m['definition_en']}")
            print(f"       → {m.get('definition_ko', '?')}")
        if e.get('image'):
            print(f"\n  🖼 이미지: {e['image'][:120]}")
        if e.get('root'):
            print(f"  🌱 뿌리:   {e['root'][:120]}")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--resume", action="store_true", default=True)
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()

    if args.preview:
        preview()
    else:
        process(limit=args.limit, resume=args.resume)
