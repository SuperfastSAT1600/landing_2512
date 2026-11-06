export interface GroupedSubjects {
    sat: string[];
    ap: string[];
    other: string[];
}

const SAT_ORDER = ['Math', 'RW'];

export function groupSubjectDetails(details: readonly string[] | null | undefined): GroupedSubjects {
    const grouped: GroupedSubjects = { sat: [], ap: [], other: [] };
    for (const raw of new Set(details ?? [])) {
        if (raw.startsWith('SAT ')) grouped.sat.push(raw.slice(4));
        else if (raw.startsWith('AP ')) grouped.ap.push(raw.slice(3));
        else grouped.other.push(raw);
    }
    const rank = (s: string) => (SAT_ORDER.includes(s) ? SAT_ORDER.indexOf(s) : SAT_ORDER.length);
    grouped.sat.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    grouped.ap.sort((a, b) => a.localeCompare(b));
    return grouped;
}

function splitAp(text: string): string[] {
    return text
        .split(/[,]|\bAP\b(?=\s)/)
        .map(p => p.replace(/^AP\s+/, '').trim())
        .filter(Boolean)
        .map(n => `AP ${n}`);
}

/** 온보딩 폼에서 받은 수업 가능 과목을 상세 과목 표기로 정규화한다. 분류할 수 없는 값(예: 'Economics')은 버린다. */
export function deriveSubjectDetails(src: { onboardingSubjects?: readonly string[] }): string[] {
    const out = (src.onboardingSubjects ?? []).flatMap(raw => {
        const s = raw.trim();
        if (s === 'SAT Reading & Writing') return ['SAT RW'];
        if (s === 'SAT Math') return ['SAT Math'];
        return s.startsWith('AP ') ? splitAp(s) : [];
    });
    return [...new Set(out)];
}
