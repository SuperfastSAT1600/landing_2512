# university_destiny_match.html — 작업 결과 정리

작성일: 2026-08-16

---

## 1. 프로젝트 개요

생년월일·태어난 시간을 입력하면 사주 오행 기반으로 QS 세계 랭킹 1-100위 103개 대학 중 "궁합" 대학을 매칭해 주는 바이럴 콘텐츠 웹앱.

- 운영 주체: Argonaut AI (SuperfastSAT)
- 단일 파일 구성: `university_destiny_match.html` (CSS + JS 인라인)
- 데이터: `data/universities_top100.json` (fetch, 103개교)

---

## 2. 파일 목록

```
university_chem/
  university_destiny_match.html   # 메인 앱 (2,115줄)
  build_top100.py                 # 대학 JSON 생성 스크립트
  data/
    universities_top100.json      # 103개교 오행 데이터 (1,857줄)
    universities_tier1.json       # 손큐레이션 Tier1 28개교
    description_templates.json    # 설명 템플릿 (미완성)
```

---

## 3. 이번 작업에서 구현한 내용

### 3-1. 오행 트레이트 어휘 확장 (8 → 18개)

```
목(木): 자유로운사고, 표현력, 예술적감성, 다양성포용
화(火): 도전정신, 사회적감각, 기업가정신, 글로벌영향력
토(土): 전통과격식, 실용주의, 지역사회기여
금(金): 논리력, 집중력, 공학혁신, 수리과학
수(水): 전략적사고, 철학적깊이, 국제정치감각
```

### 3-2. 대학 오행 프로필 집계 방식 변경

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| 집계 방식 | MAX (dominant trait만 반영) | SUM (모든 trait 누적) |
| 기본값 | 각 오행 48 | 0 |
| 트레이트 수/교 | 1-3개 (불균등) | 5개 (고정) |

효과: 이전에는 103개교 중 52개교가 한 번도 매칭되지 않았던 문제 해소.

### 3-3. build_top100.py — TRAIT_OVERRIDES 추가

103개 대학 전체에 5개 트레이트를 직접 지정하는 `TRAIT_OVERRIDES` 딕셔너리 추가.
각 대학의 성격(공학/예술/사회과학/전통 등)에 맞게 3-4개 오행에 분산 배치.

```bash
# 재생성
cd university_chem
python3 build_top100.py
```

### 3-4. 입력 폼 개편

**추가된 필드:**

| 필드 | 타입 | 비고 |
|------|------|------|
| 이름 | text (선택) | 결과 카드 헤드라인·공유 텍스트에 반영 |
| 양력/음력 토글 | toggle button | solarlunar CDN으로 음력→양력 변환 |
| 생년월일 | 연/월/일 select ×3 | 양력·음력 모두 동일한 드롭다운 UI |
| 윤달 체크박스 | checkbox | 음력 선택 시만 표시 |
| 태어난 시간 | select (12지) | 자~해 12지 선택, 모를 경우 "-1" |

**제거된 필드:**
- SAT 점수 (입력 폼에서 완전 삭제)

**태어난 시간 가중치:**
```
시간 있을 때:  천간 30% + 지지 22% + 계절 22% + 일진 13% + 시주 13%
시간 모를 때:  천간 35% + 지지 25% + 계절 25% + 일진 15%
```

**사용 CDN:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/solarlunar@2.1.2/dist/solarlunar.min.js"></script>
```

### 3-5. 동의 체크박스 (doryeong.app 스타일)

dark 카드 바깥에 크림색(#f5efe3) 라운드 박스 2개로 분리 배치:

```
┌─────────────────────────────────┐  ← .consent-box
│ ☐  입력한 이름·생년월일을 귀인지도   │
│    관계 계산·관리에 이용하는 데     │
│    동의해요.                      │
└─────────────────────────────────┘
┌─────────────────────────────────┐  ← .consent-box
│ ☐  나는 만 14세 이상이며, 대학     │
│    궁합을 직접 알아보고 있어요. (필수)│
└─────────────────────────────────┘
         [ ✨ 궁합 보기 ]            ← 두 체크박스 모두 체크 시 활성화
```

- `consentCheck1`, `consentCheck2` 둘 다 체크돼야 CTA 버튼 활성화
- `runMatch()` 진입 시에도 재검증

### 3-6. 결과 카드 개편

**오행 유형 타이틀 추가:**
```
홍길동님은 금(金)의 인재입니다
유형: 목=성장형 / 화=추진형 / 토=안정형 / 금=정밀형 / 수=전략형
```

**친구 초대 흐름 재설계:**

| 변경 전 | 변경 후 |
|--------|--------|
| 닉네임 입력 → URL 생성 | 이름 입력 필드가 폼으로 이동 |
| 닉네임 입력 섹션 (결과 카드 내) | 제거 |
| "친구 초대하기" 버튼 | "이 링크를 복사해 친구에게 전달하세요" 버튼 |
| 친구 비교 모드 (2인 오행 비교) | 제거 |
| — | URL 공개 + 복사 버튼 |
| — | 기존 그룹 멤버 미리보기 (mini card) |

**그룹 멤버 미리보기:**
URL 해시(`#g=`) 에 이미 참여한 친구들의 대학·궁합%를 결과 카드 하단에 mini card로 표시.

### 3-7. 로딩 내러티브 4단계

```
甲午年生 확인 중…  →  목(木) 기운 감지…  →  103개교 오행 대조 중…  →  궁합 발견!
```

실제 연도에서 60갑자 계산해 동적으로 연도명 생성 (예: 2003년 → 癸未年生).

### 3-8. 그룹 보드 UX 개선

- 빈 카드 기본 숨김 + "전체 보기 (N개 비어 있음)" 토글 버튼
- 대학 카드 클릭 → 상세 모달 (모토·설명·오행 프로필 바)
- 그룹 내 오행 분포: 참여자 우세 오행 집계 표시

### 3-9. 인스타 스토리 이미지 저장

- `html2canvas` CDN 추가
- "📸 저장하기" 버튼 → 결과 카드 PNG 저장
- 실패 시 안내 메시지 표시

---

## 4. 핵심 함수 목록

| 함수 | 역할 |
|------|------|
| `buildUserProfile(year, month, day, hourBranch)` | 사용자 5D 오행 벡터 계산 |
| `buildUniversityProfile(uni)` | 대학 5D 오행 벡터 계산 (SUM) |
| `computeMatch(birthdate, satScore, hourBranch)` | 103개교 코사인 유사도 매칭 |
| `getDominantElement(profile)` | 우세 오행 반환 |
| `getTypeName(el)` | 오행 → 유형명 (성장형/추진형 등) |
| `renderResult(...)` | 결과 카드 HTML 렌더링 |
| `inviteFriends(uniIdx, pct, nick)` | URL 생성 + 공개 |
| `copyInviteUrl()` | URL 클립보드 복사 |
| `renderGroupPreview()` | 기존 멤버 mini card 렌더링 |
| `renderBoard(members)` | 그룹 보드 103개교 그리드 렌더링 |
| `showUniModal(uniIdx)` | 대학 상세 모달 표시 |
| `exportStoryImage()` | html2canvas PNG 저장 |
| `initDateSelects()` | 양력·음력 연/월/일 드롭다운 초기화 |
| `getLunarBirthdate()` | 음력 → 양력 변환 (solarlunar CDN) |
| `updateMatchBtn()` | 동의 체크박스 상태에 따라 CTA 활성화 |
| `toggleEmptyCards()` | 빈 카드 숨김/전체 보기 토글 |

---

## 5. 로컬 실행

```bash
# university_chem 디렉토리에서 실행
cd university_chem
python3 -m http.server 8765

# 브라우저
http://localhost:8765/university_destiny_match.html

# 그룹 보드 테스트
http://localhost:8765/university_destiny_match.html#g=%EC%A7%80%EC%88%98:0:91,%EB%AF%BC%EC%A4%80:4:87
```

> `file://` 프로토콜은 fetch CORS 오류로 JSON 로드 불가 — 반드시 HTTP 서버 필요

---

## 6. 데이터 재생성

```bash
cd university_chem
python3 build_top100.py
# → data/universities_top100.json 갱신 (103개교)
```

---

## 7. 미완성 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| `description_templates.json` | 미완성 | Tier2 75개교 설명 문장 미적용 |
| 배포 환경 | 미결정 | Vercel 정적 or Next.js public/ 통합 |
| 모바일 실기기 검증 | 미실시 | iOS/Android 실기기 테스트 필요 |
| QS 2027 순위 재검증 | 미실시 | 배포 전 필요 |
