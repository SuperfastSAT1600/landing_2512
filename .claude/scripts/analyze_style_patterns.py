#!/usr/bin/env python3
"""
analyze_style_patterns.py

style_samples.jsonl의 original/edited 쌍을 분석해
반복적인 수정 패턴을 구조적으로 추출합니다.

출력: JSON (patterns list + raw diffs)
"""

import json
import sys
import re
from collections import Counter, defaultdict
from difflib import unified_diff, SequenceMatcher

SAMPLES_PATH = 'blog_database/style_samples.jsonl'


def load_samples():
    samples = []
    try:
        with open(SAMPLES_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    samples.append(json.loads(line))
    except FileNotFoundError:
        print(json.dumps({'error': f'{SAMPLES_PATH} 파일이 없습니다. 먼저 미리보기 서버에서 편집을 저장해 주세요.'}))
        sys.exit(0)
    return samples


def avg_sentence_length(text):
    sentences = re.split(r'[.!?。]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return 0
    return sum(len(s) for s in sentences) / len(sentences)


def count_paragraphs(text):
    return len([p for p in text.split('\n\n') if p.strip()])


def count_line_breaks(text):
    # 의미 있는 줄바꿈 (단락 내 줄바꿈)
    return text.count('\n')


def get_removed_phrases(original, edited):
    """original에는 있고 edited에는 없는 구/절 추출"""
    orig_lines = original.splitlines()
    edit_lines = edited.splitlines()
    removed = []
    for line in orig_lines:
        if line.strip() and line.strip() not in edited:
            removed.append(line.strip())
    return removed


def get_added_phrases(original, edited):
    """edited에는 있고 original에는 없는 구/절 추출"""
    orig_lines = original.splitlines()
    edit_lines = edited.splitlines()
    added = []
    for line in edit_lines:
        if line.strip() and line.strip() not in original:
            added.append(line.strip())
    return added


def analyze_structural_changes(original, edited):
    """구조적 변화 분석"""
    changes = {}

    orig_para = count_paragraphs(original)
    edit_para = count_paragraphs(edited)
    changes['paragraph_count_delta'] = edit_para - orig_para  # 양수 = 단락 늘어남

    orig_lb = count_line_breaks(original)
    edit_lb = count_line_breaks(edited)
    changes['line_break_delta'] = edit_lb - orig_lb  # 양수 = 줄바꿈 늘어남

    orig_chars = len(original)
    edit_chars = len(edited)
    changes['length_delta'] = edit_chars - orig_chars  # 양수 = 글이 길어짐
    changes['length_ratio'] = edit_chars / orig_chars if orig_chars else 1.0

    orig_avg_sent = avg_sentence_length(original)
    edit_avg_sent = avg_sentence_length(edited)
    changes['avg_sentence_len_delta'] = edit_avg_sent - orig_avg_sent  # 음수 = 문장 짧아짐

    return changes


def find_word_substitutions(original, edited):
    """단어/구 대체 패턴 찾기"""
    matcher = SequenceMatcher(None, original, edited)
    substitutions = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            orig_chunk = original[i1:i2].strip()
            edit_chunk = edited[j1:j2].strip()
            # 단어 단위로만 (너무 길면 제외)
            if 1 < len(orig_chunk) < 50 and 1 < len(edit_chunk) < 50:
                substitutions.append({
                    'from': orig_chunk,
                    'to': edit_chunk
                })
    return substitutions[:20]  # 상위 20개


def classify_change_type(structural):
    """변화 유형 분류"""
    types = []

    if structural['line_break_delta'] > 3:
        types.append('줄바꿈_증가')
    elif structural['line_break_delta'] < -3:
        types.append('줄바꿈_감소')

    if structural['paragraph_count_delta'] > 1:
        types.append('단락_세분화')
    elif structural['paragraph_count_delta'] < -1:
        types.append('단락_통합')

    if structural['avg_sentence_len_delta'] < -10:
        types.append('문장_단축')
    elif structural['avg_sentence_len_delta'] > 10:
        types.append('문장_연장')

    if structural['length_ratio'] > 1.15:
        types.append('내용_추가')
    elif structural['length_ratio'] < 0.85:
        types.append('내용_축약')

    return types if types else ['소폭_수정']


def extract_recurring_phrases(all_removed, all_added):
    """여러 샘플에서 반복 삭제/추가된 패턴"""
    removed_counter = Counter()
    added_counter = Counter()

    for phrases in all_removed:
        for p in phrases:
            # 5자 이상 의미 있는 구절만
            if len(p) >= 5:
                # 핵심 키워드 추출 (간단히 앞 20자)
                key = p[:30]
                removed_counter[key] += 1

    for phrases in all_added:
        for p in phrases:
            if len(p) >= 5:
                key = p[:30]
                added_counter[key] += 1

    return {
        'frequently_removed': removed_counter.most_common(10),
        'frequently_added': added_counter.most_common(10)
    }


def main():
    samples = load_samples()

    if len(samples) == 0:
        print(json.dumps({'error': '스타일 샘플이 없습니다.', 'count': 0}))
        return

    all_structural = []
    all_change_types = Counter()
    all_removed = []
    all_added = []
    all_substitutions = []
    sample_details = []

    for s in samples:
        original = s.get('original', '')
        edited = s.get('edited', '')

        if not original or not edited:
            continue

        structural = analyze_structural_changes(original, edited)
        change_types = classify_change_type(structural)
        removed = get_removed_phrases(original, edited)
        added = get_added_phrases(original, edited)
        subs = find_word_substitutions(original, edited)

        all_structural.append(structural)
        for ct in change_types:
            all_change_types[ct] += 1
        all_removed.append(removed)
        all_added.append(added)
        all_substitutions.extend(subs)

        # 통합 diff (처음 50줄만)
        diff_lines = list(unified_diff(
            original.splitlines(),
            edited.splitlines(),
            lineterm='',
            n=1
        ))[:50]

        sample_details.append({
            'date': s.get('date', ''),
            'source_file': s.get('source_file', ''),
            'structural': structural,
            'change_types': change_types,
            'removed_sample': removed[:5],
            'added_sample': added[:5],
            'substitutions': subs[:10],
            'diff_preview': '\n'.join(diff_lines)
        })

    # 구조적 변화 평균
    avg_structural = {}
    if all_structural:
        for key in all_structural[0]:
            vals = [s[key] for s in all_structural]
            avg_structural[key] = round(sum(vals) / len(vals), 2)

    # 반복 패턴
    recurring = extract_recurring_phrases(all_removed, all_added)

    # 치환 패턴 집계
    sub_from_counter = Counter(s['from'] for s in all_substitutions)
    sub_to_counter = Counter(s['to'] for s in all_substitutions)

    report = {
        'total_samples': len(samples),
        'analyzed': len(sample_details),
        'dominant_change_types': all_change_types.most_common(5),
        'avg_structural_changes': avg_structural,
        'recurring_phrases': recurring,
        'top_substitutions_from': sub_from_counter.most_common(10),
        'top_substitutions_to': sub_to_counter.most_common(10),
        'samples': sample_details
    }

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
