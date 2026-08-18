# 통합 가이드

**기존 코드베이스**에 Claude Code를 추가하는 방법.

---

## 개요

기존 프로젝트가 있고 Claude Code 워크플로우 자동화를 추가하고 싶습니다.

**예시 시나리오**: `/home/user/my-app`에 프로젝트가 있고 Claude Code를 추가하고 싶습니다.

**최종 결과**:
```
my-app/                    (기존 프로젝트)
├── .claude/              ← 새로 추가 (워크플로우 시스템)
├── CLAUDE.md             ← 새로 추가 (기술 스택 구성)
├── setup.cjs             ← 새로 추가 (선택적 설정 마법사)
├── lib/                  ← 새로 추가 (마법사 모듈)
├── src/                  (기존 코드 - 변경 없음)
├── package.json          (기존 코드 - 변경 없음)
└── ... (나머지 코드 - 변경 없음)
```

**예상 시간**: 20-40분

---

## 전제 조건

- [x] 코드가 있는 기존 코드베이스
- [x] Git 초기화됨
- [x] Node.js 설치됨 (v18 이상 권장)

---

## 1단계: Claude Code 설정 다운로드

먼저 `claude-code-setup` 파일을 가져옵니다. 두 가지 옵션:

### 옵션 A: 프로젝트 옆에 클론 (권장)

```bash
# 현재 위치: /home/user/my-app (프로젝트)

# 한 단계 위로 이동
cd ..

# 프로젝트 옆에 claude-code-setup 클론
git clone https://github.com/YOUR-ORG/claude-code-setup.git

# 이제 다음과 같이 됨:
# /home/user/my-app/              (프로젝트)
# /home/user/claude-code-setup/   (템플릿)
```

### 옵션 B: 임시 디렉토리에 클론

```bash
# /tmp에 클론 (나중에 삭제됨)
git clone https://github.com/YOUR-ORG/claude-code-setup.git /tmp/claude-code-setup
```

---

## 2단계: 프로젝트에 파일 복사

이제 Claude Code 파일을 프로젝트에 복사합니다:

```bash
# 프로젝트 디렉토리로 이동
cd /home/user/my-app

# 워크플로우 시스템 복사
cp -r ../claude-code-setup/.claude/ .

# 기술 스택 구성 복사 (필수!)
cp ../claude-code-setup/CLAUDE.md .

# 설정 마법사 복사 (선택 사항이지만 권장)
cp ../claude-code-setup/setup.cjs .
cp -r ../claude-code-setup/lib/ .

# MCP 템플릿 복사 (선택 사항 - 위의 .claude/ 복사에 이미 포함되어 있음)
```

**옵션 B를 사용한 경우**, `../claude-code-setup/`를 `/tmp/claude-code-setup/`로 바꾸세요:
```bash
cp -r /tmp/claude-code-setup/.claude/ .
cp /tmp/claude-code-setup/CLAUDE.md .
# 등...
```

**이 단계 후 프로젝트는 다음과 같습니다**:
```
my-app/
├── .claude/       ← 새로 추가 (10개 에이전트, 25개 명령어, 12개 체크리스트)
├── CLAUDE.md      ← 새로 추가 (기술 스택 구성)
├── setup.cjs      ← 새로 추가 (마법사)
├── lib/           ← 새로 추가 (마법사 모듈)
├── src/           (기존 코드)
└── ...
```

---

## 3단계: CLAUDE.md 커스터마이즈

설정 마법사를 실행하여 기술 스택을 자동으로 감지하고 CLAUDE.md를 업데이트하세요:

```bash
# 마법사는:
# - 필요한 경우 Claude Code CLI를 확인하고 설치합니다
# - 프레임워크, 백엔드, 데이터베이스, 테스팅 도구를 자동 감지합니다
# - 실제 스택으로 CLAUDE.md를 업데이트합니다 (수동 편집 불필요!)
# - Slack MCP를 필수로 설정합니다 (commit-업데이트 채널에 PR 알림용)
# - 기타 MCP 서버를 구성합니다
# - 환경 파일을 설정합니다
# - 프로젝트 종속성 설치를 제안합니다 (npm/pnpm/yarn/bun)
node setup.cjs
```

**중요**: 마법사는 Slack MCP 자격 증명을 요청합니다 (필수):
- Slack Bot Token (https://api.slack.com/apps 에서 발급)
- Slack Team ID (T로 시작)

이는 `/commit-push-pr` 명령어 사용 시 commit-업데이트 채널에 자동으로 PR 알림을 보내는 데 필요합니다.

**감지되는 항목**:
- 프론트엔드: Next.js, React, Vue, Svelte, Angular 등
- 백엔드: Node.js (Express, Fastify, NestJS), Supabase, Python (FastAPI, Django), Go 등
- 데이터베이스: PostgreSQL, MySQL, MongoDB, SQLite, Supabase, Prisma
- 테스팅: Vitest, Jest, Playwright, Cypress 등

마법사는 CLAUDE.md를 업데이트하기 전에 감지된 값을 확인하거나 조정하도록 안내합니다.

**수동 편집** (원하는 경우):
```bash
# CLAUDE.md를 열고 플레이스홀더를 수동으로 바꾸기
code CLAUDE.md
# 바꾸기: {{FRONTEND_STACK}}, {{BACKEND_STACK}}, {{TESTING_STACK}} 등
```

---

## 4단계: 프레임워크별 템플릿 추가 (필요한 경우)

Claude Code는 기본적으로 작동하는 일반 템플릿(test, migration, PR description)을 포함합니다.

React/Next.js 템플릿은 이제 해당 스킬과 함께 있습니다:
- React: `.claude/skills/react-patterns/templates/`
- Next.js: `.claude/skills/nextjs-patterns/templates/`

`Skill("react-patterns")` 또는 `Skill("nextjs-patterns")`로 로드하세요 — 수동 복사 불필요.

---

## 5단계: 작동 확인

```bash
# Claude Code 시작
claude
```

Claude에게 물어보세요:
```
우리 기술 스택은 무엇인가요?
```

Claude가 템플릿 기본값이 아닌 귀하의 스택(`CLAUDE.md`에서)을 설명해야 합니다.

---

## 완전한 예제 연습

`/Users/john/projects/my-saas-app`에 Next.js + Supabase 프로젝트가 있다고 가정해 봅시다:

```bash
# 1. claude-code-setup 다운로드
cd /Users/john/projects
git clone https://github.com/YOUR-ORG/claude-code-setup.git

# 2. 프로젝트로 이동
cd my-saas-app

# 3. 파일 복사
cp -r ../claude-code-setup/.claude/ .
cp ../claude-code-setup/CLAUDE.md .
cp ../claude-code-setup/setup.cjs .
cp -r ../claude-code-setup/lib/ .

# 4. 설정 마법사 실행 (스택을 자동 감지하고 CLAUDE.md 업데이트)
node setup.cjs

# 마법사는:
# - 아직 설치되지 않은 경우 Claude Code CLI 설치
# - 자동 감지: Next.js 14, Supabase, Vitest
# - 실제 스택으로 CLAUDE.md 업데이트 (수동 편집 불필요!)
# - MCP 서버 및 환경 파일 구성
# - 프로젝트 종속성을 자동으로 설치
# - 감지된 값을 확인하면 완료!

# 5. 템플릿은 이제 스킬과 함께 있습니다 — 복사 불필요
# React: .claude/skills/react-patterns/templates/
# Next.js: .claude/skills/nextjs-patterns/templates/

# 6. git에 추가
git add .claude/ CLAUDE.md setup.cjs lib/
git commit -m "Add Claude Code workflow automation"

# 7. 사용 시작
claude
```

이제 프로젝트에 Claude Code가 있습니다!

---

## setup.cjs를 원하지 않는다면?

**권장하지 않음** - 자동 기술 스택 감지 및 CLAUDE.md 업데이트를 놓치게 됩니다.

하지만 수동 설정을 선호한다면:

```bash
# 최소 통합 (이 2개만 복사)
cp -r ../claude-code-setup/.claude/ .
cp ../claude-code-setup/CLAUDE.md .

# CLAUDE.md를 수동으로 편집하고 모든 {{...}} 플레이스홀더 바꾸기
code CLAUDE.md
# 바꾸기: {{FRONTEND_STACK}}, {{BACKEND_STACK}}, {{TESTING_STACK}} 등

# 완료!
claude
```

**참고**: 스택이 변경될 때마다 CLAUDE.md를 수동으로 업데이트해야 합니다.

---

## 정리 (선택 사항)

모든 것을 복사한 후 클론된 템플릿을 삭제할 수 있습니다:

```bash
# 프로젝트 옆에 클론한 경우:
rm -rf ../claude-code-setup

# /tmp에 클론한 경우:
rm -rf /tmp/claude-code-setup
```

---

## 문제 해결

### "복사 후 .claude/ 폴더가 보이지 않습니다"

**원인**: 잘못된 디렉토리에 있을 수 있음

**해결책**: 현재 위치 확인:
```bash
pwd  # /home/user/my-app (프로젝트)를 표시해야 함
ls -la  # .claude/ 폴더를 표시해야 함
```

### "Claude가 내 기술 스택을 모릅니다"

**원인**: `CLAUDE.md`에 여전히 `{{...}}` 플레이스홀더가 있음

**해결책**: `node setup.cjs`를 실행하여 스택을 자동 감지하고 업데이트하거나, `CLAUDE.md`를 수동으로 편집하고 모든 플레이스홀더 바꾸기

### "setup.cjs를 찾을 수 없습니다"

**원인**: `setup.cjs`와 `lib/`를 복사하지 않음

**해결책**: 복사하거나 마법사를 건너뛰고 `CLAUDE.md`를 수동으로 편집

### "설정 중 Claude Code CLI 설치 실패"

**원인**: 권한 문제 또는 npm이 PATH에 없음

**해결책**: 수동으로 설치하고 설정을 다시 실행:
```bash
# macOS/Linux
sudo npm install -g @anthropic-ai/claude-code

# Windows (관리자 권한으로 실행)
npm install -g @anthropic-ai/claude-code

# 그런 다음 설정을 다시 실행
node setup.cjs
```

---

## 다음 단계

1. [../guides/WORKFLOW.md](../guides/WORKFLOW.md) 읽기 - 완전한 워크플로우 가이드
2. `/full-feature` 시도 - Claude로 첫 번째 기능 빌드
3. 변경 사항 커밋: `git add .claude/ CLAUDE.md && git commit -m "Add Claude Code"`

---

**도움이 필요하신가요?**
- 템플릿 설정: [../README.md](../README.md)
- 메인 README: [README.md](README.md)
- 이슈: https://github.com/YOUR-ORG/claude-code-setup/issues
