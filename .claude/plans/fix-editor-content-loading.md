# Plan: 블로그 에디터 포스팅 수정 시 본문(content) 미표시 버그 수정

## 문제 분석

### 증상
- `/admin`에서 포스트 클릭 → `/admin/editor?id=<post-id>`로 이동
- 제목, 썸네일은 정상 표시됨
- **본문(content)이 표시되지 않음** → 수정 불가능

### 근본 원인

**`loading` 상태에 의한 EditorContent 언마운트/리마운트 문제**

1. 컴포넌트 마운트 → `loading=false` → 에디터 UI 렌더링, `useEditor` 에디터 인스턴스 생성 시작
2. `useEffect` → `loadPost()` 호출 → `setLoading(true)`
3. **`loading=true` → 에디터 전체 UI가 "Loading..." 으로 교체됨** (line 498의 early return)
   - `<EditorContent editor={editor} />` 가 DOM에서 완전히 제거됨
4. API 응답 → `setPendingContent(content)` + `setLoading(false)` (React 18+ 배치)
5. `loading=false` → 에디터 UI가 다시 마운트됨
6. `useEffect([editor, pendingContent])` 실행 → `editor.commands.setContent(pendingContent)` 호출

**문제**: Step 3에서 `<EditorContent/>`가 언마운트되면서 Tiptap의 ProseMirror EditorView의 DOM 연결이 끊깁니다. Step 5에서 리마운트될 때 EditorView가 재연결되지만, `setContent` 호출 시점에 view가 완전히 준비되지 않을 수 있습니다. 또한, `tiptap-markdown`의 `setContent` 오버라이드는 `window.DOMParser`를 사용해 마크다운→HTML 변환을 하는데, EditorView 재연결과의 타이밍 문제로 콘텐츠가 적용되지 않습니다.

이전 수정(commit `3c63d4b`)에서 `useRef → useState`로 전환한 것은 클로저 문제는 해결했지만, 근본적인 **EditorContent 언마운트/리마운트 타이밍 이슈**는 해결하지 못했습니다.

## 수정 계획

### 파일 변경: `src/app/admin/editor/page.tsx`

### Step 1: `loading` 상태에서도 EditorContent를 DOM에 유지

현재 코드 (line 498):
```tsx
if (loading) {
    return (
        <div className="...">Loading...</div>
    );
}
```

**변경**: early return 대신 **CSS로 에디터를 숨기고 로딩 오버레이를 표시**하여 `EditorContent`가 항상 DOM에 유지되도록 합니다.

```tsx
// early return 제거, 대신 조건부 오버레이 사용
{loading && (
    <div className="fixed inset-0 z-[300] min-h-screen bg-[#151719] flex items-center justify-center text-gray-400">
        Loading...
    </div>
)}
```

### Step 2: `useEditor`에 `onCreate` 콜백 추가 (안전장치)

에디터가 완전히 생성된 후 `pendingContent`가 있으면 적용하는 안전장치를 추가합니다:

```tsx
const pendingContentRef = useRef<string | null>(null);

const editor = useEditor({
    extensions: [...],
    editorProps: {...},
    immediatelyRender: false,
    onCreate({ editor }) {
        // 에디터 생성 시점에 대기 중인 콘텐츠가 있으면 적용
        if (pendingContentRef.current !== null) {
            editor.commands.setContent(pendingContentRef.current);
            pendingContentRef.current = null;
            setPendingContent(null);
        }
    },
});
```

`pendingContent` (useState)와 `pendingContentRef` (useRef)를 병행 사용:
- `useState`는 useEffect 트리거를 위해
- `useRef`는 `onCreate` 콜백에서 최신 값 접근을 위해 (클로저 문제 방지)

### Step 3: `pendingContent` 설정 시 ref도 동기화

```tsx
const loadPost = async (id: string) => {
    // ... fetch logic ...
    const content = p.content || '';
    pendingContentRef.current = content;
    setPendingContent(content);
};
```

### Step 4: useEffect에 에러 핸들링 추가

```tsx
useEffect(() => {
    if (editor && pendingContent !== null) {
        try {
            editor.commands.setContent(pendingContent);
        } catch (e) {
            console.error('Failed to set editor content:', e);
            // 폴백: HTML로 직접 설정 시도
            try {
                editor.commands.setContent(pendingContent, false, { preserveWhitespace: 'full' });
            } catch {
                console.error('Fallback setContent also failed');
            }
        }
        pendingContentRef.current = null;
        setPendingContent(null);
    }
}, [editor, pendingContent]);
```

## 요약

| 변경 | 이유 |
|------|------|
| `loading` early return → CSS 오버레이 | EditorContent가 항상 DOM에 유지되어 언마운트/리마운트 문제 해결 |
| `onCreate` 콜백 추가 | 에디터 초기화 완료 시점에 콘텐츠를 확실히 적용 (안전장치) |
| `pendingContentRef` 추가 | `onCreate` 클로저 문제 방지 |
| 에러 핸들링 추가 | 마크다운 파싱 실패 시 조용히 실패하는 문제 방지 |

## 리스크

- **Low**: CSS 오버레이 변경은 시각적 차이 최소화 (기존과 동일한 Loading 화면)
- **Low**: `onCreate` 콜백은 기존 로직과 충돌 없음 (안전장치 역할)
- **None**: API/DB 변경 없음
