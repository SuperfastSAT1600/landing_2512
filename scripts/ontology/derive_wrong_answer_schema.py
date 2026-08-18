#!/usr/bin/env python3
"""
rationale 텍스트에서 역산한 오답 패턴 taxonomy.
각 스킬별로 실제 데이터를 기반으로 도출된 error_type 분류.
"""

# ===== 스킬별 오답 유형 taxonomy =====

WRONG_ANSWER_TAXONOMY = {

    "Expression of Ideas Transitions": {
        "error_types": [
            "addition_trap",          # 'moreover', 'furthermore' — 단순 추가를 암시 (실제는 다른 관계)
            "contrast_trap",          # 'however', 'nevertheless', 'instead' — 대조를 암시 (실제는 아님)
            "causal_trap",            # 'therefore', 'consequently', 'hence' — 인과를 암시 (실제는 아님)
            "sequence_trap",          # 'next', 'then', 'first' — 시간순서를 암시 (실제는 아님)
            "example_trap",           # 'for example' — 예시를 암시 (실제는 아님)
            "paraphrase_trap",        # 'in other words' — 재진술을 암시 (실제는 아님)
        ],
        "analysis_schema": {
            "target_transition_category": "str  # 정답 전환어 카테고리",
            "sentence_1_summary": "str  # blank 앞 내용",
            "sentence_2_summary": "str  # blank 뒤 내용",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "addition_trap | contrast_trap | causal_trap | ...",
                    "trap": "str  # 왜 학생이 이걸 고를 수 있는지"
                }
            },
            "student_trap": "str  # 이 문항에서 가장 흔한 실수 패턴"
        }
    },

    "Craft and Structure Words in Context": {
        "error_types": [
            "wrong_denotation",       # 사전적 의미 자체가 문맥에 안 맞음
            "near_synonym_trap",      # 비슷한 의미지만 이 문맥엔 부적합
            "wrong_connotation",      # 뜻은 비슷하지만 톤/뉘앙스가 다름
            "out_of_scope",           # 문맥에 전혀 근거 없음
        ],
        "analysis_schema": {
            "target_word_pos": "str",
            "passage_logical_flow": "str",
            "passage_topic": "str",
            "synonyms_for_correct_answer": ["str"],
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "wrong_denotation | near_synonym_trap | ...",
                    "trap": "str  # 이 단어를 고를 수 있는 이유"
                }
            },
            "student_trap": "str"
        }
    },

    "Craft and Structure Cross-Text Connections": {
        "error_types": [
            "unsupported_inference",  # 텍스트에서 추론 불가
            "not_in_text",            # 두 텍스트 모두 언급 없음
            "wrong_text_source",      # 잘못된 텍스트(1 vs 2)에 귀속
            "too_extreme",            # 텍스트보다 강한 주장
            "recycles_language",      # 텍스트 단어 재활용하지만 틀린 추론
        ],
        "analysis_schema": {
            "relationship_type": "str  # Agree / Disagree / Extend / Qualify",
            "text_focus": "str  # Text1 주장 vs Text2 반응 요약",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "unsupported_inference | not_in_text | ...",
                    "trap": "str"
                }
            },
            "student_trap": "str"
        }
    },

    "Craft and Structure Text Structure and Purpose": {
        "error_types": [
            "introduces_absent_element",  # 텍스트에 없는 요소를 구조에 포함
            "too_narrow",                 # 세부사항에 집중, 전체 구조 미반영
            "too_broad",                  # 텍스트가 실제로 주장하는 것보다 과장
            "misidentifies_structure",    # 잘못된 텍스트 구조 패턴 선택
            "wrong_author_purpose",       # 저자 의도 오판
        ],
        "analysis_schema": {
            "structure_pattern": "str",
            "author_purpose": "str",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "introduces_absent_element | too_narrow | ...",
                    "trap": "str"
                }
            },
            "student_trap": "str"
        }
    },

    "Expression of Ideas Rhetorical Synthesis": {
        "error_types": [
            "wrong_emphasis",         # 소재는 맞지만 강조점이 틀림
            "incomplete_task",        # 과제의 일부만 수행
            "wrong_task",             # 다른 목적의 문장 작성
            "missing_required_info",  # 필요한 정보 누락
            "factually_wrong_order",  # 정보 순서/사실 오류
        ],
        "analysis_schema": {
            "synthesis_task": "str",
            "rhetorical_purpose": "str",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "wrong_emphasis | incomplete_task | ...",
                    "trap": "str"
                }
            },
            "student_trap": "str"
        }
    },

    "Information and Ideas Central Ideas and Details": {
        "error_types": [
            "contradicts_text",       # 텍스트와 반대 내용
            "out_of_scope",           # 텍스트에 언급 없음
            "too_narrow",             # 세부사항이지 중심 내용 아님
            "misattributes_claim",    # 다른 대상/주체에 귀속
            "wrong_focus",            # 텍스트의 부분을 전체로 일반화
        ],
        "analysis_schema": {
            "main_idea_location": "str  # Opening / Concluding / Distributed",
            "detail_function": "str  # Supporting evidence / Counterexample / Elaboration",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "contradicts_text | out_of_scope | ...",
                    "trap": "str"
                }
            },
            "student_trap": "str"
        }
    },

    "Information and Ideas Command of Evidence": {
        "error_types": [
            "misreads_data",          # 그래프/수치 잘못 읽음
            "wrong_direction",        # 반대 결론을 지지
            "irrelevant_evidence",    # 연구 질문과 무관
            "partial_support",        # 관련은 있지만 직접 지지 못함
            "wrong_variable",         # 다른 변수/측면을 다룸
        ],
        "analysis_schema": {
            "evidence_type": "str  # Textual / Quantitative",
            "reasoning_pattern": "str  # Strengthen / Weaken / Illustrate / Identify data",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "misreads_data | wrong_direction | ...",
                    "trap": "str"
                }
            },
            "student_trap": "str"
        }
    },

    "Information and Ideas Inferences": {
        "error_types": [
            "overreach",              # 텍스트가 지지하는 것 이상을 주장
            "not_in_text",            # 텍스트가 전혀 다루지 않음
            "confuses_elements",      # 유사하지만 다른 요소 혼동
            "reversal",               # 텍스트가 암시하는 것의 반대
            "too_specific",           # 텍스트가 지지하지 않는 구체적 세부사항
        ],
        "analysis_schema": {
            "inference_basis": "str  # Explicit / Implicit contrast / Author tone / Logical consequence",
            "reasoning_type": "str  # Deductive / Inductive / Analogical",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "overreach | not_in_text | confuses_elements | ...",
                    "trap": "str"
                }
            },
            "student_trap": "str"
        }
    },

    "Standard English Conventions Boundaries": {
        "error_types": [
            "comma_splice",           # 쉼표로 두 독립절 연결
            "run_on",                 # 구두점/접속사 없이 문장 결합
            "fragment",               # 불완전 문장(fragment) 생성
            "unnecessary_punctuation", # 불필요한 구두점 추가
            "wrong_junction_type",    # 절 유형에 맞지 않는 구두점
        ],
        "analysis_schema": {
            "boundary_rule": "str",
            "clause_type": "str",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "comma_splice | run_on | fragment | ...",
                    "trap": "str"
                }
            },
            "student_trap": "str"
        }
    },

    "Standard English Conventions Form, Structure, and Sense": {
        "error_types": [
            "dangling_modifier",      # 수식어 위치 오류
            "tense_inconsistency",    # 시제 불일치
            "number_agreement",       # 단수/복수 불일치
            "wrong_verb_form",        # 부정사/분사 등 잘못된 형태
            "possessive_error",       # 소유격 오류
            "pronoun_case_error",     # 대명사 격 오류
        ],
        "analysis_schema": {
            "grammar_concept": "str",
            "error_type": "str",
            "passage_topic": "str",
            "wrong_answer_analysis": {
                "A|B|C|D (오답만)": {
                    "error_type": "dangling_modifier | tense_inconsistency | ...",
                    "trap": "str"
                }
            },
            "student_trap": "str"
        }
    },
}

if __name__ == "__main__":
    import json
    for skill, data in WRONG_ANSWER_TAXONOMY.items():
        print(f"\n{'='*60}")
        print(f"SKILL: {skill}")
        print(f"Error types ({len(data['error_types'])}): {data['error_types']}")
    print(f"\n총 {len(WRONG_ANSWER_TAXONOMY)}개 스킬 taxonomy 정의 완료")
