---
description: Plaud 녹음 오디오를 전사·요약해 CRM 학생 상담메모에 기록한다
allowed-tools: Bash(curl:*), Bash(grep:*), Bash(node:*)
---

# Plaud → CRM 상담메모

Plaud로 녹음한 학부모 상담을 4섹션 요약 초안으로 CRM 학생의 상담메모에 기록한다.
오디오 조회는 **Plaud MCP**, 전사(OpenAI)·요약(Qwen)·저장은 **CRM 엔드포인트**
(`POST /api/crm/students/[id]/plaud-memo`)가 담당한다.
생성된 메모는 항상 **미공개(published:false) 초안** — 매니저가 CRM UI에서 검토 후 공개한다.

## 사전 준비 (최초 1회)
1. `npx -y @plaud-ai/mcp@latest install` 로 Plaud MCP를 Claude Code에 설치.
2. Claude Code에서 "Log me into Plaud" (브라우저 OAuth). 토큰은 `~/.plaud/tokens-mcp.json`에 저장·재사용.
3. `list_files`가 동작하면 준비 완료.

## 설정값
- **CRM_BASE_URL**: CRM API 베이스. 프로덕션 도메인으로 교체(예: `https://<crm-domain>`).
  로컬 검증 시 `http://localhost:3000` (dev 서버가 떠 있어야 함).
- **ADMIN_SECRET_KEY**: `.env.local`에서 읽는다 — `grep '^ADMIN_SECRET_KEY=' .env.local | cut -d= -f2-`.
  이 값을 모든 CRM 요청의 `x-admin-key` 헤더로 사용한다.

## 절차

1. **녹음 선택** — Plaud MCP `list_files`로 최근 녹음 ~10개(이름/날짜/길이)를 나열하고 사용자에게
   어떤 녹음인지 확인한다(기본값: 가장 최근 녹음).

2. **오디오 URL 조회** — 선택한 녹음의 `get_file`로 presigned 오디오 다운로드 URL(24h)과
   녹음 이름·생성 일시(`recording_name`, `recorded_at`)를 확보한다.

3. **학생 확정** — 사용자에게 학생/학부모 이름을 물어보고 CRM에서 검색한다:
   ```bash
   curl -s "$CRM_BASE_URL/api/crm/students?search=<이름>" -H "x-admin-key: $ADMIN_SECRET_KEY"
   ```
   결과 후보(id·이름·단계)를 보여주고 사용자가 정확한 학생을 확정하게 한다(동명이인 대비).
   후보가 없거나 애매하면 다시 이름을 확인한다 — **임의로 배정하지 말 것.**

4. **전송** — 확정된 학생 id로 오디오 URL을 보낸다(서버가 전사·요약 후 상담메모에 초안 저장):
   ```bash
   curl -s -X POST "$CRM_BASE_URL/api/crm/students/<id>/plaud-memo" \
     -H "x-admin-key: $ADMIN_SECRET_KEY" \
     -H "content-type: application/json" \
     -d '{"audio_url": "<presigned URL>", "recording_name": "<이름>", "recorded_at": "<일시>"}'
   ```

5. **보고** — 응답의 `data.summary`(4섹션 요약)를 사용자에게 보여주고,
   "미공개 초안으로 저장됨 → CRM 상담메모에서 검토 후 공개(publish)하세요"라고 안내한다.
   - **502**(전사 실패·타임아웃)면: 응답의 `error` 문구를 그대로 전달한다(재시도 가능 여부가 담겨 있다).
   - **402**(AI 크레딧 소진)면: "크레딧 충전 전에는 처리할 수 없습니다"라고 안내한다.
   - 401/404/500이면 원인(키/학생/전사·요약 실패)을 그대로 전달한다.
