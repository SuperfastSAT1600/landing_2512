'use client';

// 재결제 후보 목록에 없는 학생과 그 이유 — 진행 중이라 빠진 학생, SRM 미연결·결제 미등록 학생.
// 재결제를 놓치지 않도록 '재결제 대상 추가' 패널에서 드러낸다.

import { matchHidden, type HiddenCandidate, type HiddenReason } from './renewal-hidden-candidates';

const GROUPS: { reason: HiddenReason; title: string; action: string }[] = [
  { reason: 'no_srm_payment', title: 'SRM 결제 미등록', action: 'CRM은 수강인데 SRM에 결제·수강 상태가 없습니다 — SRM Payment에 결제를 등록해 주세요.' },
  { reason: 'no_srm_link', title: 'SRM 계정 미연결', action: 'CRM은 수강인데 SRM 계정이 연결되지 않았습니다 — 학생 패널에서 SRM 계정을 연결해 주세요.' },
  { reason: 'in_pipeline', title: '이미 재결제 진행 중', action: '아래 보드에 있습니다.' },
];

const REASON_TEXT: Record<HiddenReason, string> = {
  in_pipeline: '이미 재결제 진행 중',
  no_srm_link: 'SRM 계정 미연결',
  no_srm_payment: 'SRM 결제 미등록',
};

interface Props {
  hidden: HiddenCandidate[];
  searchQuery: string;
  onSelectStudent?: (studentId: string) => void;
}

function NameButton({ h, onSelectStudent }: { h: HiddenCandidate; onSelectStudent?: Props['onSelectStudent'] }) {
  return (
    <button type="button" onClick={() => onSelectStudent?.(h.studentId)} className="font-medium text-gray-800 hover:underline">
      {h.name}
    </button>
  );
}

function Group({ title, action, items, open, testId, onSelectStudent }: {
  title: string; action: string; items: HiddenCandidate[]; open: boolean; testId: string;
  onSelectStudent?: Props['onSelectStudent'];
}) {
  return (
    <details data-testid={testId} open={open} className="group">
      <summary className="cursor-pointer select-none text-[11px] font-semibold text-amber-800">
        {title} {items.length}명 <span className="font-normal text-amber-700">— {action}</span>
      </summary>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-3 text-[11px]">
        {items.map((h) => (
          <li key={h.studentId}>
            <NameButton h={h} onSelectStudent={onSelectStudent} />
            {h.detail && <span className="ml-1 text-gray-500">{h.detail}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function RenewalHiddenCandidates({ hidden, searchQuery, onSelectStudent }: Props) {
  const matched = matchHidden(hidden, searchQuery);
  if (matched.length === 0) return null;
  const searching = searchQuery.trim() !== '';
  return (
    <div data-testid="hidden-candidates" className="space-y-1.5 rounded-md border border-amber-100 bg-amber-50 px-3 py-2">
      <p className="text-[11px] text-amber-700">
        목록에 없는 학생 {matched.length}명 — 재결제를 놓치지 않도록 이유를 확인해 주세요.
      </p>
      {GROUPS.map(({ reason, title, action }) => {
        const items = matched.filter((h) => h.reason === reason);
        if (items.length === 0) return null;
        // 진행 중은 보드에 이미 있어 평소엔 접고, 검색으로 찾을 때만 펼친다
        const open = reason !== 'in_pipeline' || searching;
        // 검색 시작·해제 때만 펼침 기본값을 다시 적용하고, 그 사이 사용자가 접고 편 상태는 유지한다
        return (
          <Group key={`${reason}-${searching}`} testId={`hidden-${reason}`} title={title} action={action}
            items={items} open={open} onSelectStudent={onSelectStudent} />
        );
      })}
    </div>
  );
}

/** 검색 결과가 0건일 때 빈 목록 문구 대신 — 찾은 학생이 왜 목록에 없는지 바로 알려 준다. */
export function HiddenSearchMatches({ hidden, searchQuery, onSelectStudent }: Props) {
  if (searchQuery.trim() === '') return null;
  const matched = matchHidden(hidden, searchQuery);
  if (matched.length === 0) return null;
  return (
    <ul data-testid="hidden-search-matches" className="space-y-1 py-8 text-center text-xs text-gray-500">
      {matched.map((h) => (
        <li key={h.studentId}>
          <NameButton h={h} onSelectStudent={onSelectStudent} /> — {REASON_TEXT[h.reason]}
          {h.detail && ` · ${h.detail}`}
        </li>
      ))}
    </ul>
  );
}
