---
name: practice-page-builder
description: "SAT 문제 풀이 연습 페이지를 만드는 스킬. Bluebook UI 스타일의 gate→leaderboard→test→result 4단계 흐름, SMS Supabase units 테이블 연동, MCQ/Grid-in 정답 처리, 테이블+LaTeX 혼합 렌더링까지 완전한 패턴을 제공한다. /practice/august-math, /practice/november-qb22 패턴으로 새 연습 페이지를 만들 때 이 스킬을 사용한다."
---

# Practice Page Builder

## 개요

SAT 문제 풀이 연습 페이지 생성 스킬. Bluebook(College Board 시험 UI) 스타일의 실전 연습 페이지를 만든다.

**기본 경로 패턴**: `/practice/{test-slug}`
**기존 예시**: `/practice/august-math`, `/practice/september-math`, `/practice/november-qb22`

---

## 1. 아키텍처 — 4단계 흐름

```
gate → leaderboard → test → result
```

| Phase | 설명 |
|-------|------|
| `gate` | access code + @instagramId 입력 |
| `leaderboard` | 제출 현황 랭킹 표시 후 Start 버튼 |
| `test` | Bluebook UI 문제 풀이 |
| `result` | 제출 후 점수 + 리더보드 |

`Phase` 타입: `'gate' | 'leaderboard' | 'test' | 'result'`

---

## 2. 핵심 컴포넌트

```tsx
import { BluebookPageShell } from '@/components/shared/BluebookPageShell';
import { BluebookQuestionUnit } from '@/components/shared/BluebookQuestionUnit';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';
```

### BluebookQuestionUnit props (정확한 이름)

```tsx
// MCQ
<BluebookQuestionUnit
  questionNumber={1}
  question={<MathHTMLContent html={q.question} />}
  skill={q.skill}
  difficulty={q.difficulty}
  difficultyColor={DIFF_COLOR[q.difficulty]}
  options={q.options?.map(opt => ({
    label: opt.label,
    text: <ContentRenderer content={opt.text} />,  // 옵션은 ContentRenderer OK
  }))}
  selectedAnswer={userAnswer}
  onSelect={(val) => { handleAnswer(q.id, val); handleReveal(q.id); }}
  feedback={isRevealed && userAnswer ? { selectedLabel: userAnswer, correctLabel: q.correctOption ?? '' } : null}
/>

// SPR (Grid-in)
<BluebookQuestionUnit
  questionNumber={1}
  question={<MathHTMLContent html={q.question} />}
  skill={q.skill}
  difficulty={q.difficulty}
  difficultyColor={DIFF_COLOR[q.difficulty]}
  shortAnswer={userAnswer}
  onShortAnswer={(val) => handleAnswer(q.id, val)}
  shortAnswerPlaceholder="Enter answer"
  shortAnswerFeedback={isRevealed ? { isCorrect, correctAnswer: isWrong ? q.answers?.[0] : undefined } : null}
>
  {!isRevealed && userAnswer && (
    <button onClick={() => handleReveal(q.id)}>Check</button>
  )}
</BluebookQuestionUnit>
```

**주의**: `mcqOptions`, `mcqSelected`, `onMCQSelect` 등 변형 이름 사용 금지. 정확히 위의 이름을 써야 한다.

---

## 3. MathHTMLContent 컴포넌트 (필수 포함)

테이블 안에 LaTeX가 있는 문항은 `ContentRenderer`로 렌더링 불가 — `\(` `\)` 기준으로 HTML을 쪼개면서 테이블 구조가 깨진다. 모든 `question`과 `passage` 렌더링에 이 컴포넌트를 사용한다.

```tsx
function MathHTMLContent({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !html) return;
    const el = ref.current;
    el.innerHTML = html;
    // Tailwind preflight이 border 어트리뷰트를 reset하므로 테이블에 직접 스타일 주입
    el.querySelectorAll<HTMLTableElement>('table').forEach(t => {
      t.style.borderCollapse = 'collapse';
      t.style.width = '100%';
      t.style.fontSize = '14px';
      t.style.marginBottom = '12px';
    });
    el.querySelectorAll<HTMLElement>('td, th').forEach(cell => {
      cell.style.border = '1px solid #cbd5e1';
      cell.style.padding = '7px 12px';
      cell.style.textAlign = cell.tagName === 'TH' ? 'center' : cell.style.textAlign || 'center';
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tryTypeset = () => { const mj = (window as any).MathJax; if (mj?.typesetPromise) { mj.typesetPromise([el]).catch(() => {}); return true; } return false; };
    if (!tryTypeset()) {
      const t = setInterval(() => { if (tryTypeset()) clearInterval(t); }, 100);
      return () => clearInterval(t);
    }
  }, [html]);
  return <div ref={ref} className={className} style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }} />;
}
```

MathJax 선제 로드 (useEffect 최상단에 추가):

```tsx
useEffect(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(window as any).MathJax) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).MathJax = { tex: { inlineMath: [['\\(','\\)']], displayMath: [['\\[','\\]']] }, svg: { fontCache: 'global' }, options: { skipHtmlTags: ['script','noscript','style','textarea','pre'], enableMenu: false } };
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    s.async = true;
    document.head.appendChild(s);
  }
  // ... fetch questions
}, []);
```

---

## 4. SMS Supabase 연동

문항 데이터는 SMS Supabase (`supabase-sfv2.ts`) `units` 테이블에서 가져온다.

```ts
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
```

### units 테이블 실제 컬럼명 (2026-10-14 기준)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (string) | PK |
| `type` | string | `'multiple_choice'` \| `'short_answer'` |
| `section` | string | `'math'` \| `'reading_and_writing'` (소문자) |
| `question` | string | HTML (테이블 포함 가능) |
| `passage` | string \| null | 지문 HTML |
| `options` | JSON \| null | `[{label: 'A', text: '<p>...</p>'}]` |
| `correct_answer` | string | MCQ: `'A'`\|`'B'`\|`'C'`\|`'D'` / SPR: JSON string |
| `skill` | string | 스킬명 |
| `difficulty` | string | `'Easy'`\|`'Medium'`\|`'Hard'` |
| `source` | string | `'collegeboard'` 등 |
| `created_at` | timestamp | 생성일 |

**주의**: `domain`, `question_type`, `figure` 컬럼은 존재하지 않는다.

### DB Row → Question 매핑

```tsx
interface DBRow {
  id: string;
  passage: string | null;
  question: string;
  options: { label: string; text: string }[] | null;
  correct_answer: string;
  section: string | null;
  type: string;
  skill?: string;
  difficulty?: string;
}

function mapRow(row: DBRow): Question {
  const type: QuestionType = row.type === 'short_answer' ? 'spr' : 'mcq';
  const domain = row.section === 'reading_and_writing' ? 'RW' : 'Math';
  let answers: string[] | undefined;
  let correctOption: string | undefined;
  if (type === 'spr') {
    try {
      const parsed = JSON.parse(row.correct_answer);
      answers = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
    } catch {
      answers = [row.correct_answer];
    }
  } else {
    correctOption = row.correct_answer;
  }
  return {
    id: `${TEST_SLUG}-${row.id}`,
    skill: row.skill ?? '',
    difficulty: row.difficulty ?? 'Medium',
    domain,
    passage: row.passage ?? '',
    question: row.question ?? '',
    type,
    options: row.options ?? undefined,
    correctOption,
    answers,
  };
}
```

### SPR 정답 체크

```tsx
function checkSPR(input: string, accepted: string[]): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, '').toLowerCase();
  if (accepted.some(a => norm(a) === norm(input))) return true;
  const n = parseFloat(input.replace(/,/g, ''));
  if (isNaN(n)) return false;
  return accepted.some(a => {
    const m = parseFloat(a.replace(/,/g, ''));
    return !isNaN(m) && Math.abs(n - m) < 0.001;
  });
}
```

---

## 5. 필요한 API 라우트

### 문항 조회 라우트

`src/app/api/practice/{test-slug}/questions/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export async function GET() {
  const { data, error } = await supabaseSFv2
    .from('units')
    .select('id, passage, question, options, correct_answer, section, type, skill, difficulty')
    .eq('source', 'collegeboard')
    .gte('created_at', 'YYYY-MM-DD')   // 날짜 필터 조정
    .lt('created_at', 'YYYY-MM-DD')
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}
```

### 제출 라우트

`src/app/api/practice/{test-slug}/submit/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { instagramId, answers, correctCount, totalCount, questionResults } = await req.json();
  if (!instagramId) return NextResponse.json({ error: 'instagramId is required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('practice_submissions')
    .insert({
      test_id: 'YOUR-TEST-ID',
      instagram_id: instagramId,
      answers,
      correct_count: correctCount,
      total_count: totalCount,
      question_results: questionResults ?? {},
    })
    .select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
```

### 리더보드/통계

기존 공통 라우트 사용:
```
GET /api/practice/stats?testId={test-id}
POST /api/test-codes/validate  (body: { code, instagramId, testId })
```

---

## 6. Access Code 등록

`test_codes` 테이블에 직접 insert:

```sql
INSERT INTO test_codes (code, test_id, mode, max_uses, expires_at)
VALUES ('112026', 'november-qb22', 'untimed', 9999, '2027-01-01');
```

**주의**: `mode` 값은 `'untimed'` (다른 값 불가).

---

## 7. 스펙 파일 템플릿

`.claude/plans/{test-slug}.md`:

```markdown
# {Test Label} Practice Page

## Overview
{설명}. access code `{code}`, test_id `{test-id}`.

## Requirements

### REQ-001: 연습 페이지 생성
- Route: `/practice/{test-slug}`
- Acceptance Criteria: 페이지 접근 가능, N문항 렌더링
- Verification: (BROWSER)

### REQ-002: 문항 데이터
- MCQ M문항 + SPR N문항
- Verification: (MANUAL)

### REQ-003: Submit API
- `/api/practice/{test-slug}/submit` — test_id `{test-id}`
- Verification: (MANUAL)

### REQ-004: 게이트 + 리더보드
- access code `{code}` 검증, 리더보드 표시
- Verification: (BROWSER)
```

---

## 8. 알려진 버그 & 해결책

| 버그 | 원인 | 해결 |
|------|------|------|
| MCQ 옵션에 `\` 그대로 노출 | `BluebookQuestionUnit`이 `text`를 plain string으로 렌더링 | `text: <ContentRenderer content={opt.text} />` |
| Grid-in 입력창 미표시 | `type === 'Grid-in'` 비교 — 실제값은 `'short_answer'` | `row.type === 'short_answer'` |
| 테이블 구조 깨짐 | `ContentRenderer`가 `\(` 기준으로 HTML 분리 | `MathHTMLContent` 사용 |
| 테이블 선 없음 | Tailwind preflight이 `border="1"` 어트리뷰트 reset | DOM에 직접 `border: 1px solid #cbd5e1` 주입 |
| 지문 없음 | `passage` 컬럼을 select에 포함 안 함 | select에 `passage` 추가 |
| 리더보드/결과 화면 검은색 | 다크 테마 적용됨 | `background: '#fff'`, 텍스트 `#1e293b` |
| Access code 400 에러 | `mode: 'practice'` 잘못된 값 | `mode: 'untimed'` |
| git push rejected | 원격에 새 커밋 존재 | `git stash && git pull --rebase origin main && git push` |

---

## 9. 체크리스트

새 연습 페이지 만들 때:

- [ ] 스펙 파일 작성 (`.claude/plans/{test-slug}.md`)
- [ ] DB에서 컬럼명 확인 (`type`, `section`, `passage` 실제 값 검증)
- [ ] `MathHTMLContent` 컴포넌트 포함
- [ ] MathJax 선제 로드 코드 포함
- [ ] `passage` SELECT에 포함
- [ ] Access code `test_codes` 테이블에 `mode: 'untimed'`로 등록
- [ ] Gate/Leaderboard/Result 화면 라이트 테마 (`background: '#fff'`)
- [ ] MCQ 옵션 `text: <ContentRenderer content={opt.text} />`
- [ ] SPR 정답 JSON.parse 처리
