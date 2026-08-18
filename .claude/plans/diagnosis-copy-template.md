# Diagnosis Token Copy Message Template Panel

## Overview

After a sales admin generates a diagnosis test token, there is currently no success state — the form simply clears and the list refreshes. This feature adds a copy-message panel that appears immediately after a successful token creation, letting sales staff click once to copy a fully-formatted Korean or English message (pre-filled with code and expiry) to paste into KakaoTalk, SMS, or any messaging channel. The panel is self-contained within `GenerateTokenTab.tsx` and requires no API, schema, or routing changes.

---

## Requirements

### REQ-001: Capture and hold API response in state
- **Priority**: Must
- **Description**: After a successful POST to `/api/admin/diagnosis/tokens`, retain `{ code, studentName, expiresAt }` in a `successResult` state. This drives the copy panel. Cleared on new token generation or manual dismiss.
- **Acceptance Criteria**:
  - `successResult: { code: string; studentName: string; expiresAt: string } | null` state added.
  - Set from `data.code`, `data.studentName`, `data.expiresAt` on success.
  - Re-submitting the form resets `successResult` to `null` before the new request.
  - Dismiss button also sets `successResult` to `null`.
- **Verification**: (TEST)

### REQ-002: Expiry date formatting — KO and EN locale strings
- **Priority**: Must
- **Description**: Format the UTC ISO expiry into two human-readable strings using `Intl.DateTimeFormat`:
  - `EXPIRY_KO`: `Asia/Seoul`, `ko-KR` locale → e.g. `2026년 4월 10일 오후 11:00`
  - `EXPIRY_EN`: `selectedTimezone`, `en-US` locale with `timeZoneName: 'short'` → e.g. `April 10, 2026 at 11:00 PM KST`
- **Acceptance Criteria**:
  - Pure helpers `formatExpiryKo(utcIso: string): string` and `formatExpiryEn(utcIso: string, timezone: string): string` defined at module scope.
  - Input is `new Date(utcIso)` (safe because API returns `Z`-terminated UTC ISO).
- **Verification**: (TEST)

### REQ-003: Copy panel UI — tab switcher, preview, copy button, dismiss
- **Priority**: Must
- **Description**: When `successResult` is non-null, render a success panel between the form and the token list with:
  - Tab switcher: `한국어` | `English`
  - Read-only message preview (full template with substitutions)
  - Copy button (`복사하기 / Copy`)
  - Dismiss (`×`) button
- **Acceptance Criteria**:
  - Panel uses `bg-green-900/20 border border-green-500/40 rounded-xl p-5` or equivalent success styling.
  - Active tab: `bg-green-600 text-white`; inactive: muted.
  - Preview: `<textarea readOnly>` or `<pre>`, all lines visible (min 8 rows).
  - Dismiss sets `successResult` to `null`.
  - Panel not rendered when `successResult` is `null`.
- **Verification**: (BROWSER)

### REQ-004: One-click copy with 2-second confirmation feedback
- **Priority**: Must
- **Description**: Clicking the copy button writes the visible template text to clipboard. Button label shows `복사됨! / Copied!` for 2 s then reverts.
- **Acceptance Criteria**:
  - Uses `navigator.clipboard.writeText(text)`; falls back to `execCommand('copy')` if unavailable.
  - `copied` boolean state drives label: default `복사하기 / Copy`, confirmed `복사됨! / Copied!`.
  - Button style: default `bg-blue-600`, confirmed `bg-green-600`.
  - Timeout ref cleaned up on unmount.
  - Switching tabs resets `copied` to `false`.
- **Verification**: (BROWSER)

### REQ-005: Tab defaults to Korean on each new success
- **Priority**: Should
- **Description**: `activeTab` resets to `'ko'` whenever `successResult` transitions from `null` to non-null. Tab selection persists while the same panel is open.
- **Acceptance Criteria**:
  - `setActiveTab('ko')` called alongside `setSuccessResult(...)` in `handleGenerate`.
  - No sessionStorage or localStorage for tab preference.
- **Verification**: (MANUAL)

---

## Template Strings

### Korean
```
진단테스트 안내 드리도록 하겠습니다.

[진단테스트 안내]
- 응시 페이지: tutoring.superfastsat.com/diagnosis
- 코드 번호: {CODE}

[응시 방법]
1. 응시 페이지 링크 접속하여 코드 6자리입력
2. {EXPIRY_KO}까지 진행 가능
3. 응시 시간은 총 30분, 25문항입니다. (RW+Math 포함)
4. 각 문항별로 '내가 얼마나 정답을 확신하는지' Confidence Level도 함께 체크하며 최종 제출해주세요!
5. Math 시험의 경우 계산이 필요하기 때문에 Desmos를 사용해도 되며 아직 어렵다면 노트와 필기구를 준비해주세요!
```

### English
```
Here is your SAT Diagnostic Test information.

[Diagnostic Test Info]
- Test page: tutoring.superfastsat.com/diagnosis
- Access code: {CODE}

[How to Take the Test]
1. Go to the test page and enter your 6-digit code
2. You have until {EXPIRY_EN} to complete the test
3. Total time: 30 minutes, 25 questions (RW + Math)
4. For each question, please also check your Confidence Level — how sure you are about your answer — before submitting!
5. For Math questions, you may use Desmos if needed. If you're not comfortable with it yet, have a notebook and pencil ready!
```

---

## Technical Design

**Modified file**: `src/app/admin/diagnosis/components/GenerateTokenTab.tsx` (only file changed)

### New state
```ts
const [successResult, setSuccessResult] = useState<{
  code: string;
  studentName: string;
  expiresAt: string; // UTC ISO
} | null>(null);
const [activeTab, setActiveTab] = useState<'ko' | 'en'>('ko');
const [copied, setCopied] = useState(false);
const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

### handleGenerate changes
```ts
// At top of handler:
setSuccessResult(null);
setActiveTab('ko');

// On success (after response.ok check):
const data = await response.json();
setSuccessResult({ code: data.code, studentName: data.studentName, expiresAt: data.expiresAt });
setActiveTab('ko');
setWarning(data.warning ?? null);
// existing: clear form, regenerate code, reset expiry, fetchCodes
```

### Helper functions (module scope)
```ts
function formatExpiryKo(utcIso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(utcIso));
}

function formatExpiryEn(utcIso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(utcIso));
}

function buildKoTemplate(code: string, expiryKo: string): string { ... }
function buildEnTemplate(code: string, expiryEn: string): string { ... }
```

### Copy logic
```ts
const handleCopy = async () => {
  const text = activeTab === 'ko' ? koMessage : enMessage;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // execCommand fallback
  }
  setCopied(true);
  if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
};
```

### JSX insertion point
Between the closing `</div>` of the form section and the "발급된 코드 목록" div:
```tsx
{successResult && <CopyMessagePanel ... />}
```

---

## Traceability Matrix

| REQ ID  | Description                          | Verification | Test / Check Location                               |
|---------|--------------------------------------|--------------|-----------------------------------------------------|
| REQ-001 | Capture API response in state        | (TEST)       | `src/__tests__/GenerateTokenTab.test.tsx`           |
| REQ-002 | Expiry formatting KO and EN          | (TEST)       | `src/__tests__/diagnosis-copy-template.test.ts`     |
| REQ-003 | Copy panel UI rendering              | (BROWSER)    | Admin panel: generate token → verify panel          |
| REQ-004 | One-click copy with 2 s confirmation | (BROWSER)    | Click copy → verify label change + clipboard text   |
| REQ-005 | Tab defaults to KO on new success    | (MANUAL)     | Generate → switch EN → generate again → KO active   |

---

## Implementation Order

1. **REQ-002** — `formatExpiryKo` / `formatExpiryEn` pure helpers + unit tests
2. **REQ-001** — Add state vars; update `handleGenerate` to set/clear `successResult`
3. **REQ-003** — Build panel JSX (tab switcher + textarea + buttons)
4. **REQ-004** — Wire `handleCopy` with clipboard API and timeout
5. **REQ-005** — Verify tab reset (already achieved in step 2's `handleGenerate` change)

---

## Out of Scope

- Sending messages directly from the admin (copy only)
- Persisting tab preference across page reloads
- Showing student name in the message body
- Any API, DB, or token list changes
- Panel mount/unmount animation
