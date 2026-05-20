"""
master_sat_ontology_v3.jsonl — domain 필드 정규화 스크립트
- QB98 98개: metadata/content 중첩 → flat 표준 스키마 + domain 설정
- unknown_rw 106개: content 중첩 → flat 표준 스키마 + domain 설정
- skill short→long 변환
"""
import json
import shutil
from pathlib import Path

INPUT = Path("/workspace/master_sat_ontology_v3.jsonl")
BACKUP = Path("/workspace/master_sat_ontology_v3.jsonl.bak2")

SKILL_MAP = {
    "Central Ideas and Details": "Information and Ideas Central Ideas and Details",
    "Command of Evidence": "Information and Ideas Command of Evidence",
    "Inferences": "Information and Ideas Inferences",
    "Cross-Text Connections": "Craft and Structure Cross-Text Connections",
    "Text Structure and Purpose": "Craft and Structure Text Structure and Purpose",
    "Words in Context": "Craft and Structure Words in Context",
    "Rhetorical Synthesis": "Expression of Ideas Rhetorical Synthesis",
    "Transitions": "Expression of Ideas Transitions",
    "Boundaries": "Standard English Conventions Boundaries",
    "Form, Structure, and Sense": "Standard English Conventions Form, Structure, and Sense",
}

RW_SKILLS_SHORT = set(SKILL_MAP.keys())


def normalize_skill(skill: str) -> str:
    return SKILL_MAP.get(skill, skill)


def convert_qb98(q: dict) -> dict:
    meta = q["metadata"]
    content = q["content"]
    return {
        "id": meta.get("question_id", ""),
        "test": "SAT",
        "domain": "Reading and Writing",
        "skill": normalize_skill(meta.get("skill", "")),
        "difficulty": meta.get("difficulty", ""),
        "passage": content.get("passage", ""),
        "question": content.get("question_text", ""),
        "choices": content.get("choices", {}),
        "correct_answer": content.get("correct_answer", ""),
        "rationale": content.get("explanation", ""),
        "knowledge_graph": {},
        "analysis": {},
        "source": meta.get("source_file", "260414 QB RW_98.pdf"),
        "topic_category": q.get("topic_category", ""),
        "date_added": "2026-04-14",
    }


def convert_unknown_rw(q: dict) -> dict:
    content = q.get("content", {})
    return {
        "id": q.get("id", ""),
        "test": "SAT",
        "domain": "Reading and Writing",
        "skill": normalize_skill(q.get("skill", "")),
        "difficulty": q.get("difficulty", ""),
        "passage": content.get("passage", ""),
        "question": content.get("question_text", ""),
        "choices": content.get("choices", {}),
        "correct_answer": content.get("correct_answer", ""),
        "rationale": content.get("explanation", ""),
        "knowledge_graph": {},
        "analysis": {},
        "source": q.get("source", ""),
        "topic_category": q.get("topic_category", ""),
        "date_added": q.get("date_added", ""),
    }


def is_qb98(q: dict) -> bool:
    return (
        isinstance(q.get("metadata"), dict)
        and q["metadata"].get("source_file") == "260414 QB RW_98.pdf"
    )


def is_unknown_rw(q: dict) -> bool:
    return (
        not q.get("domain")
        and not isinstance(q.get("metadata"), dict)
        and q.get("skill") in RW_SKILLS_SHORT
    )


SOURCE_SKILL_MAP = {
    "command of evidence": "Information and Ideas Command of Evidence",
    "central ideas and details": "Information and Ideas Central Ideas and Details",
    "inference": "Information and Ideas Inferences",
    "cross-text connections": "Craft and Structure Cross-Text Connections",
    "text structure and purpose": "Craft and Structure Text Structure and Purpose",
    "words in context": "Craft and Structure Words in Context",
    "transitions": "Expression of Ideas Transitions",
    "rhetorical synthesis": "Expression of Ideas Rhetorical Synthesis",
    "boundaries": "Standard English Conventions Boundaries",
    "form, structure, and sense": "Standard English Conventions Form, Structure, and Sense",
}


def infer_skill_from_source(source: str) -> str:
    s = source.lower()
    for key, skill in SOURCE_SKILL_MAP.items():
        if key in s:
            return skill
    return ""


def process():
    shutil.copy2(INPUT, BACKUP)
    print(f"Backup: {BACKUP}")

    results = []
    stats = {"standard": 0, "qb98_converted": 0, "unknown_rw_converted": 0, "other": 0}

    with open(INPUT) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            q = json.loads(line)

            if q.get("domain") == "Reading and Writing":
                # 표준: skill short→long 정규화 + source에서 skill 유추
                skill = normalize_skill(q.get("skill", ""))
                if not skill:
                    skill = infer_skill_from_source(q.get("source", ""))
                q["skill"] = skill
                results.append(q)
                stats["standard"] += 1

            elif is_qb98(q):
                results.append(convert_qb98(q))
                stats["qb98_converted"] += 1

            elif is_unknown_rw(q):
                results.append(convert_unknown_rw(q))
                stats["unknown_rw_converted"] += 1

            else:
                # Math 등 나머지
                results.append(q)
                stats["other"] += 1

    with open(INPUT, "w") as f:
        for q in results:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")

    print(f"Done. Stats: {stats}")
    print(f"Total written: {len(results)}")

    # 검증
    domain_counts = {}
    with open(INPUT) as f:
        for line in f:
            q = json.loads(line)
            d = q.get("domain", "NO_DOMAIN")
            domain_counts[d] = domain_counts.get(d, 0) + 1

    print("\n=== 최종 domain 분포 ===")
    for k, v in sorted(domain_counts.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

    no_domain_rw = 0
    rw_skills_long = set(SKILL_MAP.values())
    with open(INPUT) as f:
        for line in f:
            q = json.loads(line)
            if q.get("domain") != "Reading and Writing" and q.get("skill") in rw_skills_long:
                no_domain_rw += 1
    print(f"\nRW skill인데 domain 누락: {no_domain_rw}개")


if __name__ == "__main__":
    process()
