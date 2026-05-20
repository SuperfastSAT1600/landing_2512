# SAT 단어장 파이프라인

## Overview

SAT RW 1715개 문제에서 추출한 2,209개 단어를 Group A/B로 분류하고,
각 그룹에 맞는 학습 메타데이터(뜻의 이미지 / 뜻의 뿌리)를 Claude API로 생성하여
단일 단어장 파일 `sat_vocab_book.jsonl`을 제작한다.

## Requirements

### REQ-001: 기본 WordNet 데이터로 베이스 파일 생성
- **Priority**: Must
- **Description**: 모든 단어에 대해 그룹 분류, WordNet 의미 목록, SAT 난이도를 채운 베이스 파일 생성
- **Acceptance Criteria**: `sat_vocab_book.jsonl` 에 2,209개 엔트리, `image`/`root` 필드는 null
- **Verification**: (MANUAL) 파일 라인 수 확인

### REQ-002: Claude API로 `image` 생성 (Group A)
- **Priority**: Must
- **Description**: 번역 분기 단어(1,612개)에 대해 "뜻의 이미지" 생성 — 서로 다른 한국어 번역을 하나로 묶는 시각적/개념적 이미지
- **Acceptance Criteria**: 모든 Group A 단어에 `image` 필드 채워짐
- **Verification**: (MANUAL) 샘플 10개 검수

### REQ-003: Claude API로 `root` 생성 (Group B)
- **Priority**: Must
- **Description**: 다의어 단어(2,209개)에 대해 "뜻의 뿌리" 생성 — 어원 + 의미가 갈라진 과정
- **Acceptance Criteria**: 모든 Group B 단어에 `root` 필드 채워짐
- **Verification**: (MANUAL) 샘플 10개 검수

### REQ-004: SAT 실제 예문 연결
- **Priority**: Should
- **Description**: `master_sat_ontology_v3.jsonl`에서 해당 단어가 등장하는 실제 SAT 문장 연결
- **Verification**: (MANUAL)

## Schema

```json
{
  "word": "accommodate",
  "lemma": "accommodate",
  "group": "AB",
  "is_blank_fill": true,
  "difficulty_dist": {"Hard": 3, "Medium": 2},
  "n_synsets": 5,
  "meanings": [
    {
      "pos": "v",
      "domain": "change",
      "definition_en": "make fit for, or change to suit a new purpose",
      "definition_ko": "적응시키다, 수용하다"
    },
    {
      "pos": "v",
      "domain": "consumption",
      "definition_en": "provide with something desired or needed",
      "definition_ko": "숙박시키다, 제공하다"
    }
  ],
  "image": "공간을 넓혀 누군가를 '받아들이는' 이미지. 방을 내주든(숙박), 의견을 받아들이든(수용), 규칙을 맞춰주든(조정) — 핵심은 상대방에 맞게 나를/공간을 조정하는 것.",
  "root": "라틴어 accommodare = ad-(~에 맞게) + commodus(적합한). '누군가에게 맞게 조정하다'가 원뜻. 여기서 숙박(공간 조정), 수용(태도 조정), 적응(행동 조정) 의미가 파생.",
  "sat_examples": [
    {
      "question_id": "abc123",
      "skill": "Words in Context",
      "difficulty": "Hard",
      "sentence": "...[accommodate]..."
    }
  ]
}
```

## 생성 파이프라인

```
Step 1: build_vocab_base.py
  master_sat_ontology_v3.jsonl + vocab_master.json + WordNet
  → sat_vocab_book.jsonl (image/root = null)

Step 2: generate_image_root.py  (Claude API 배치)
  sat_vocab_book.jsonl
  → sat_vocab_book.jsonl (image/root 채워짐)
  배치 크기: 50개씩, 실패 시 재시도
```

## 파일 위치
- 출력: `/workspace/sat_vocab_book.jsonl`
- 생성 스크립트: `/workspace/blog_database/build_vocab_base.py`

## Out of Scope
- 단어장 UI/앱 (별도)
- 음성 발음 데이터
