# 대학 궁합 — 디자인 시스템 문서

> 결과 화면 리디자인 시 이 문서를 기준 삼아 적용한다.
> 기준 파일: `university_destiny_match.html` (메인 대화 화면)

---

## 1. 컨셉 & 톤

**"밤의 점집 상담"**

- 장르: 사주 운세 × 고전 영상미 — 게임 도입부 같은 무게감
- 배경: 흑갈색 심야 (밝은 아이보리 아님)
- 언어: 고어체 ("되시는가", "하시겠소", "괜찮소") — 점쟁이가 묻는 호흡
- 감각: 무겁고 진중하되, 결과에서 설렘과 발견감

**금지**: 밝은 흰 배경, 팝한 컬러, 캐쥬얼 산세리프 폰트

---

## 2. 컬러 토큰

```css
:root {
  --cream:      #0d0b09   /* 페이지 전체 배경 — 거의 검정 */
  --card:       #1a1712   /* 카드/버블 배경 */
  --navy:       #000000   /* 최강조 텍스트, CTA 배경 */
  --navy-light: #1c1914   /* 호버 상태 */
  --gold:       #d6a75a   /* 핵심 포인트 컬러 — 황금 */
  --gold-light: #e8c07a   /* 골드 호버/보조 */
  --coral:      #e8935c   /* SAT 배지 등 보조 강조 */
  --text:       #e8dcc8   /* 본문 텍스트 — 따뜻한 크림 화이트 */
  --text-muted: #7a6e5c   /* 부제목, 힌트, 레이블 */
  --border:     #2e2820   /* 구분선, 카드 테두리 */
  --shadow:     0 4px 24px rgba(0,0,0,0.5)
  --shadow-lg:  0 8px 40px rgba(0,0,0,0.7)
}
```

### 오행 컬러 (칩/바)

| 오행 | 바 색상    | 칩 배경   | 칩 텍스트 |
|------|-----------|----------|----------|
| 木   | `#22c55e` | `#dcfce7`| `#15803d`|
| 火   | `#ef4444` | `#fee2e2`| `#dc2626`|
| 土   | `#f97316` | `#ffedd5`| `#ea580c`|
| 金   | `#8b5cf6` | `#ede9fe`| `#7c3aed`|
| 水   | `#3b82f6` | `#dbeafe`| `#1d4ed8`|

---

## 3. 타이포그래피

### 폰트 패밀리

```css
/* 기본 — 전통 명조 */
font-family: 'Nanum Myeongjo', 'Noto Serif KR', Georgia, serif;

/* 모토/인용구 전용 — 라틴 이탤릭 */
font-family: 'Fraunces', Georgia, serif;
font-style: italic;
```

### 크기 계층

| 역할                  | 크기                        | 굵기 |
|-----------------------|-----------------------------|------|
| 히어로 헤드라인       | `clamp(26px, 6vw, 40px)`   | 800  |
| q-bubble (질문)       | 15px                        | 600  |
| a-bubble (답변)       | 14px                        | 600  |
| 섹션 레이블           | 12px, `letter-spacing:0.12em`, uppercase | 700 |
| 본문 / 풀레이버 텍스트| 15px, `line-height:1.75`   | 400  |
| 힌트 / 뮤트           | 12–13px                     | 400  |
| 모토 (라틴)           | 15px, italic                | 400  |

---

## 4. 대화 화면 컴포넌트 (메인 화면 기준)

### q-bubble (왼쪽 — 점쟁이 말)

```css
background: #1e1c18;
border: 1px solid #3a3328;
color: #e8dcc8;
border-radius: 4px 18px 18px 18px;  /* 왼쪽 위 모서리만 뾰족 */
padding: 14px 18px;
font-size: 15px;
font-weight: 600;
line-height: 1.6;
display: inline-block;
max-width: 88%;
```

- 타이핑 중: `.typing::after { content:'▌'; color:var(--gold); animation:blink }` 커서
- 타이핑 완료 후 `.step-input` 등장 (opacity 0→1 전환)

### a-bubble (오른쪽 — 사용자 답변)

```css
background: rgba(214,167,90,0.12);
border: 1px solid rgba(214,167,90,0.25);
color: var(--text);
border-radius: 18px 4px 18px 18px;  /* 오른쪽 위 모서리만 뾰족 */
padding: 11px 16px;
font-size: 14px;
font-weight: 600;
align-self: flex-end;
max-width: 80%;
margin-top: 8px;
```

### 입력 셀렉터 (.chat-select / .date-selects select)

```css
background: #1a1712;
border: 1.5px solid var(--border);
border-radius: 12px;
padding: 13px 14px;
font-size: 15px;
color: var(--text);
appearance: none;
```
- 포커스: `border-color: var(--navy)`

### 확인 버튼 (.chat-btn)

```css
background: var(--gold);
color: #0d0b09;
border: none;
border-radius: 12px;
padding: 0 20px;
height: 48px;          /* 셀렉터와 높이 통일 */
font-size: 14px;
font-weight: 700;
```
- 현재 아이콘: `↑` (위 화살표 — "전송"을 의미)
- 호버: `background: var(--gold-light)`
- 비활성: `opacity: 0.35`

### CTA 버튼 (.cta-btn)

```css
background: linear-gradient(135deg, var(--gold), var(--gold-light));
color: var(--navy);
border-radius: 14px;
padding: 16px;
font-size: 16px;
font-weight: 800;
box-shadow: 0 4px 16px rgba(214,167,90,0.4);
```
- 호버: `translateY(-1px)`, 그림자 강화

### 선택지 버튼 (.choice-btn)

```css
background: #1a1712;
border: 2px solid var(--border);
border-radius: 14px;
padding: 15px 0;
font-size: 16px;
font-weight: 700;
color: var(--text);
```
- 호버: `border-color: var(--gold)`, `color: #fff`, `background: rgba(214,167,90,0.12)`

### 동의 체크박스 (.consent-box)

```css
background: #1a1712;
border: 1px solid var(--border);
border-radius: 14px;
padding: 14px 16px;
```
- 체크박스: `accent-color: var(--navy)`

---

## 5. 레이아웃

- 최대 너비: `max-width: 480–520px`, 좌우 중앙 정렬
- 컨테이너 패딩: `padding: 28px 0 0`
- 채팅 흐름 컨테이너 (`#chatFlow`): `display:flex; flex-direction:column; gap:24px; padding:0 20px 40px`
- 모바일 최우선 — 반응형 `clamp()` 폰트 사용

---

## 6. 모션 & 인터랙션

### 스텝 등장 애니메이션

```css
@keyframes stepEnter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: none; }
}
/* duration: ~0.4s, easing: cubic-bezier(0.16, 1, 0.3, 1) */
```

### 인풋 등장 (.step-input → .revealed)

```css
.step-input {
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.step-input.revealed {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
```
- **원칙**: 질문 타이핑이 끝난 후에만 인풋 등장. 동시에 보이지 않는다.

### 타이핑 효과

- 속도: 42ms/글자
- 커서: `▌` (골드색), 타이핑 완료 후 제거
- 적용 대상: 모든 q-bubble, 동의 질문 버블, 입학 연도 질문 버블

### 결과 카드 등장

```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: none; }
}
/* duration: 0.5s, easing: cubic-bezier(0.16, 1, 0.3, 1) */
```

### 궁합% 바

```css
transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
```

---

## 7. 결과 화면 리디자인 시 적용 원칙

### 현재 결과 화면과의 불일치 (수정 필요)

| 항목 | 현재 결과 화면 | 메인 화면 기준 |
|------|--------------|--------------|
| result-header 배경 | `linear-gradient(#fff → var(--cream))` → 밝음 | 다크 배경으로 통일 필요 |
| university-name-kr 색상 | `color: var(--navy)` = 검정 (흰 배경용) | 어두운 배경엔 `var(--text)` 또는 `var(--gold)` |
| result-body 배경 | `var(--card)` = `#1a1712` | 유지 가능 |
| 오행 칩 배경 | 밝은 파스텔 (light mode용) | 다크 배경에 맞게 조정 or 유지 (의도적 대비) |
| 공유 버튼 | `background: var(--navy)` = 검정 | 다크 배경에선 구분 필요 — 테두리 추가 or 골드 사용 |

### 리디자인 방향

1. **배경 통일**: 결과 카드 전체를 `var(--card)` `#1a1712` 기조로
2. **헤더 강조**: 대학 accent 컬러를 탑 스트라이프 + 크레스트 배경에 활용 (현재 구조 유지)
3. **궁합% 섹션**: 현재 `.compat-reveal` (다크 네이비 + 골드 숫자) 톤이 메인 화면과 일치 — 유지
4. **텍스트 컬러**: 제목/숫자는 `var(--gold)` 또는 `var(--text)`, 레이블은 `var(--text-muted)`
5. **버튼**: 공유 버튼은 `border: 1.5px solid var(--border)` + `var(--card)` 배경으로 구분
6. **폰트**: 명조 유지. 궁합% 숫자는 굵게 (`font-weight: 900`)
7. **간격**: 섹션 간 `margin-bottom: 24–28px` 유지

### 톤 앤 매너 체크리스트

- [ ] 결과 카드 배경이 `#0d0b09` 계열인가
- [ ] 강조 텍스트가 `var(--gold)` 또는 `var(--text)`인가 (흰색이 아님)
- [ ] 섹션 레이블이 `var(--text-muted)`, 12px, uppercase, letter-spacing인가
- [ ] 버튼에 hover 시 `translateY(-1px)` 미세 상승 효과가 있는가
- [ ] 등장 시 `slideUp` 또는 `fadeIn` 애니메이션이 있는가
- [ ] 폰트가 Nanum Myeongjo인가

---

## 8. 로컬 실행

```bash
cd university_chem
python3 -m http.server 8765
# http://localhost:8765/university_destiny_match.html
```
