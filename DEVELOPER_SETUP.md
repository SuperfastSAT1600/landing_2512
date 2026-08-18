# 개발자 세팅 가이드

## 사전 준비

- Node.js 18+
- Git
- GitHub 계정 (레포 Collaborator 초대 필요 → 팀장에게 문의)

## 로컬 세팅

```bash
git clone git@github.com:SuperfastSAT1600/landing_2512.git
cd landing_2512
npm install
```

## 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 값은 팀장에게 직접 받아서 채워넣기.

## 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 접속 확인.

CRM: `http://localhost:3000/admin/crm`

## 개발 워크플로우

```
1. develop 브랜치에서 feature 브랜치 생성
   git checkout develop
   git pull origin develop
   git checkout -b feat/crm-기능명

2. 작업 후 PR 생성 (base: develop)

3. 팀장이 develop에서 확인 후 main 머지
```

## 주요 기술 스택

| 항목 | 버전 |
|------|------|
| Next.js | 16 (App Router) |
| TypeScript | strict |
| DB | Supabase (PostgreSQL) |
| 스타일 | Tailwind CSS |

## CRM 관련 파일 위치

```
src/app/admin/crm/
├── page.tsx                   # CRM 메인 페이지
└── components/
    ├── SalesKanban.tsx        # 세일즈 칸반
    ├── MatchingKanban.tsx     # 매칭 칸반
    ├── RetryKanban.tsx        # 재시도 칸반
    ├── EnrolledLeads.tsx      # 수업 중 리드
    ├── LeadPool.tsx           # 리드풀
    ├── StudentDetailPanel.tsx # 학생 상세 패널
    └── ...
```

## DB 스키마 변경 시

`supabase/migrations/` 에 SQL 파일 추가 후 PR.
직접 Supabase 콘솔에서 수정하지 않기.
