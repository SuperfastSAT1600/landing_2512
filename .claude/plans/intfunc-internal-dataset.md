# IntelligentFunctions 내부 dataset 전환

## Overview

세일즈 콜 코퍼스를 external dataset(Parquet 업로드 + training 잡)이 아니라
**internal dataset**(`client.dataset(key).import(rows)`)으로 보낸다. CRM의 `전환 예측 학습`
버튼은 `IF로 전송` 버튼이 된다.

**무엇이 바뀌는가.** external dataset은 `training.create()`가 곧 pack 빌드였다 — 우리가
파일을 올리면 잡이 돌고 업로드는 파기됐다. internal dataset에는 잡이 없다. 행을 보내면
intfunc이 **보관**하고, DISCOVER/FIT(=pack 학습)은 콘솔에서 그 데이터셋을 대상으로 돈다.
그래서 애플리케이션이 하는 일은 코퍼스를 만들어 밀어 넣는 것 하나로 줄어든다.

**대가는 보관이다.** external 경로가 준 것은 "제3자가 원문을 갖지 않는다"는 보장과
`deletionReceipt`라는 증거였다. internal dataset은 그 보장을 주지 않는다 — 행은 intfunc의
프로젝트 안에 남고, 지우는 것은 `rollback(importId)`뿐이다. 원래 spec
(`intfunc-sales-call-dataset.md`)이 external을 고른 이유가 이것이므로, 전환은 그 판단을
뒤집는 결정이고 여기 기록해 둔다. 비식별(REQ-005)은 그대로 남으며 이제 더 중요해진다 —
전송 전 마스킹이 유일한 방어선이다.

**slug가 바뀌는 이유.** `sales-calls`는 external dataset이 이미 물고 있다. 같은 프로젝트에서
그 slug로 internal dataset을 만들면 400이다. 새 slug는 `sales-call-corpus`이고
`INTFUNC_DATASET_SLUG`로 덮어쓸 수 있다.

**사라지는 것.** Parquet 쓰기(`parquet.ts`, `hyparquet-writer`), 잡 조작(`training.ts`),
잡 폴링 라우트(`training/[jobId]`), 파기 재시도 UI, `INTFUNC_PACK_SLUG`.
pack slug는 코드가 더 이상 pack을 만들지 않으므로 쓰이지 않는다.

## Requirements

### REQ-201: 코퍼스는 internal dataset으로 들어간다
- **Priority**: Must
- **Description**: `intfuncClient().dataset(datasetKey()).import(examples, options)`로 행을
  보낸다. `externalDataset()` 경로는 제거한다. 기본 slug는 `sales-call-corpus`이며
  `INTFUNC_DATASET_SLUG`가 있으면 그것을 쓴다.
- **Acceptance Criteria**: import 호출 인자가 코퍼스 행 수와 같고, 어떤 코드도
  `externalDataset`/`uploadFile`을 부르지 않는다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/import-corpus.test.ts`

### REQ-202: 데이터셋이 없으면 만들고, 있으면 그대로 쓴다
- **Priority**: Must
- **Description**: `listDatasets()`에 해당 slug가 없으면 `createDataset({ slug, name })`으로
  만든다. 이미 있으면 아무것도 하지 않는다 — 같은 slug로 다시 만들면 400이고, 데이터셋은
  버전이 아니라 행이 쌓이는 곳이라 조용히 다른 풀에 쓰는 일이 있어선 안 된다.
- **Acceptance Criteria**: 목록에 slug가 있으면 `createDataset`이 호출되지 않는다.
  없으면 정확히 한 번 호출된다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/import-corpus.test.ts`

### REQ-203: 코퍼스 행은 그대로 한 행이 된다
- **Priority**: Must
- **Description**: `CorpusRow`의 평면 컬럼을 그대로 `DatasetExample`로 보낸다. 중첩도
  봉투도 없고, `_split`/`_note`/`_included` 같은 메타 키는 붙이지 않는다 — 어느 컬럼이
  질문이고 어느 것이 답인지는 pack이 콘솔에서 선언한다(`transcript` / `outcome`).
  split은 서버가 무작위로 배정하게 둔다.
- **Acceptance Criteria**: 보낸 example의 키 집합이 `CorpusRow`의 키 집합과 같고,
  언더스코어로 시작하는 키가 없다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/import-corpus.test.ts`

### REQ-204: 같은 코퍼스를 두 번 눌러도 두 번 쌓이지 않는다
- **Priority**: Must
- **Description**: internal dataset은 행이 누적된다. 그래서 `idempotencyKey`를 코퍼스
  **내용의 다이제스트**로 만든다(`sha256(정렬된 행 JSON)`의 앞 16자). 같은 내용이면
  재전송이 원래 import로 replay되고, 통화가 새로 쌓여 내용이 달라지면 새 import가 된다.
  `onDuplicate: 'skip'`으로 이미 들어간 행은 서버에서도 걸러진다.
- **Acceptance Criteria**: 같은 행 배열로 두 번 부르면 `idempotencyKey`가 같고, 행 하나가
  달라지면 키가 달라진다. 행 순서만 다르면 키는 같다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/import-corpus.test.ts`

### REQ-205: CRM 라우트는 전송 결과를 돌려준다
- **Priority**: Must
- **Description**: `POST /api/crm/intfunc/import`가 코퍼스를 만들고 데이터셋을 확인한 뒤
  import한다. `dry_run: true`면 통계만 돌려주고 전송하지 않는다. 응답은
  `{ data: { importIds, received, imported, skipped, errors, stats } }`.
  디스크에 파일을 쓰지 않으므로 `/tmp` 정리 경로도 없다.
- **Acceptance Criteria**: 인증 없으면 401이고 코퍼스 조회조차 하지 않는다. 대상 행이 0이면
  400이고 import하지 않는다. 응답 어디에도 전사 본문이 실리지 않는다.
- **Verification**: (TEST) `src/app/api/crm/intfunc/import/__tests__/route.test.ts`

### REQ-206: 모달은 보관 사실을 먼저 알린다
- **Priority**: Must
- **Description**: `IntfuncImportModal`은 열자마자 아무것도 보내지 않는다. 전송된 행이
  intfunc에 **보관된다**는 것과(파기 영수증이 없다) 비식별 사실을 먼저 고지하고,
  `미리보기`(dry-run) 다음에 `IF로 전송`을 누를 수 있다. 전송이 끝나면 받은/저장된/건너뛴
  행 수와 `importIds`를 보여준다 — 되돌리려면 그 id가 필요하다. 잡이 없으므로 폴링도,
  파기 재시도 버튼도 없다. `cutoffUnavailable > 0` 경고는 유지한다.
- **Acceptance Criteria**: 렌더만으로 fetch가 일어나지 않는다. 전송 후 `imported`/`skipped`와
  importId가 화면에 나온다. 실패 행이 있으면 그 수가 보인다.
- **Verification**: (TEST) `src/app/admin/crm/components/__tests__/IntfuncImportModal.test.tsx`

### REQ-207: 스크립트도 같은 경로를 쓴다
- **Priority**: Should
- **Description**: `scripts/export-sales-call-dataset.ts`와 `scripts/train-sales-call-pack.ts`를
  `scripts/import-sales-call-corpus.ts` 하나로 합친다. `--dry-run`은 통계만, `--limit N`은
  학생 수 제한, `--out file.jsonl`은 전송 대신 로컬 검사용 덤프(기본값 없음 — 원문이 담긴
  파일은 요청해야만 생긴다). Parquet 관련 의존성(`hyparquet-writer`, `hyparquet`)은 제거한다.
- **Acceptance Criteria**: `--dry-run`이 아무것도 전송하지 않고 통계를 출력한다.
  저장소에 Parquet을 import하는 코드가 남아 있지 않다.
- **Verification**: (MANUAL) `npx tsx scripts/import-sales-call-corpus.ts --dry-run`

### REQ-208: 전송이 실패하면 무엇이 잘못됐는지 화면에 뜬다
- **Priority**: Must
- **Description**: 라우트는 실패를 `{ error, code, rows? }`로 돌려준다.
  `describeSendFailure`가 SDK 오류를 관리자가 읽을 문장으로 바꾼다 — 401은 키,
  404는 slug, 413은 묶음 크기, `MissingEnvError`는 비어 있는 env를 지목한다.
  **서버 문구는 옮기지 않는다**: `ApiError.message`는 거절당한 값(=상담 원문)을 인용할 수
  있으므로 안정 식별자인 `code`만 함께 내보내고 전문은 서버 로그에 남긴다.
  IF 쪽 실패는 502, 연결 실패는 504, 보내기 전 행 거절은 400, 그 외는 500이다.
  모달은 사유·`code`·거절된 행 번호를 빨간 블록으로 보여주고, 실패 후에는 아무것도
  들어가지 않았으므로 버튼을 다시 열어 둔다.
- **Acceptance Criteria**: 401이면 `INTFUNC_API_KEY`를 확인하라는 문장과 `intfunc.auth`가
  화면에 뜬다. 응답 어디에도 IF가 준 원문 문구가 실리지 않는다. 실패 뒤 재시도가 성공하면
  실패 표시가 사라진다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/send-failure.test.ts`,
  `src/app/api/crm/intfunc/import/__tests__/route.test.ts`,
  `src/app/admin/crm/components/__tests__/IntfuncImportModal.test.tsx`

## Non-Goals

- pack 학습 트리거. internal dataset에는 training API가 없다 — DISCOVER/FIT은 콘솔에서 돈다.
- pack의 `ask()` / `recourse()` 호출 경로.
- rollback UI. `importIds`를 보여주는 데까지가 이번 범위이고, 되돌리기는
  `client.rollbackImport(id)`로 수동 처리한다.

## Open Questions

- 콘솔에서 pack을 `sales-call-corpus` 위에 다시 선언해야 한다(기존 pack은 external dataset에
  묶여 있다). 코드 변경은 아니다.
- 이미 만들어진 external dataset과 그 잡들의 정리는 콘솔 작업으로 남는다.
