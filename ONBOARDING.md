# CRM 개발 온보딩

## 1단계 — GitHub 초대 수락

이메일에서 GitHub 초대 링크 확인 후 수락.

## 2단계 — 레포 클론

```bash
git clone git@github.com:SuperfastSAT1600/landing_2512.git
cd landing_2512
```

SSH 키가 없으면 HTTPS로 클론:
```bash
git clone https://github.com/SuperfastSAT1600/landing_2512.git
```

## 3단계 — 패키지 설치

```bash
npm install
```

## 4단계 — 환경변수 설정

팀장에게 받은 `.env.local` 파일을 프로젝트 루트에 붙여넣기.

```
landing_2512/
├── .env.local   ← 여기
├── src/
└── ...
```

## 5단계 — 개발 서버 실행

```bash
npm run dev
```

브라우저에서 확인:
- 메인: `http://localhost:3000`
- CRM: `http://localhost:3000/admin/crm`

---

## 개발할 때 매번 하는 것

```bash
# 1. develop 브랜치 최신화
git checkout develop
git pull origin develop

# 2. 내 작업 브랜치 생성
git checkout -b feat/crm-작업내용

# 3. 작업 후 push
git push origin feat/crm-작업내용

# 4. GitHub에서 PR 생성
# base: develop ← compare: feat/crm-작업내용
```

PR 생성 후 팀장에게 알리기.
