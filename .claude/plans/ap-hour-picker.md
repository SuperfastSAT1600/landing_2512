# AP Hour Picker & Pricing Section

## Overview

enrollment-v2의 AP 흐름에 새로운 연속 시간 선택 + 수업료 계산 섹션을 추가한다.
또한 기존 인기 패키지 섹션 heading을 교체한다.

## Requirements

### REQ-001: AP 연속 시간 선택기 (1–60h)
- **Priority**: Must
- **Description**: 1–60 시간 범위에서 시간을 선택할 수 있는 슬라이더+스테퍼 UI. 4개 구간별 단가 자동 적용.
- **Acceptance Criteria**: 시간 변경 시 총액이 실시간으로 업데이트된다.
- **Verification**: (BROWSER) 슬라이더 조작 시 총액이 올바른 구간 단가로 계산되는지 확인

### REQ-002: 구간별 단가
- **Priority**: Must
- **Description**: 1–16h: 90,000/h | 17–32h: 84,600/h (6% off) | 33–48h: 79,200/h (12% off) | 49–60h: 74,700/h (17% off)
- **Acceptance Criteria**: 각 구간 단가로 정확히 계산된다.
- **Verification**: (BROWSER) 16h=1,440,000 / 32h=2,707,200 / 48h=3,801,600 / 60h=4,482,000 확인

### REQ-003: 섹션 heading 교체
- **Priority**: Must
- **Description**: 새 섹션 heading: "필요한 시간만큼 수업을 신청하세요". 기존 패키지 섹션 heading: "아래 세 가지 시간을\n가장 많이 선택합니다."
- **Acceptance Criteria**: 두 heading이 올바르게 렌더링된다.
- **Verification**: (BROWSER) heading 텍스트 확인

## Technical Design

### Architecture
- `APSectionV2.tsx`: `APHourPicker` 컴포넌트 추가, `APPricingSection` heading 교체
- `APSectionV2` export: `ManagedShowcase` → `APHourPicker` → `APPricingSection` 순서

### Pricing Logic
```
if h <= 16: rate = 90000
elif h <= 32: rate = 84600
elif h <= 48: rate = 79200
else: rate = 74700
total = h * rate
```

## Out of Scope
- 슬라이더 애니메이션 커스터마이징
- CTA 버튼 변경
