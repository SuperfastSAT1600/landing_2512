# CRM AI 프로바이더 Qwen 전환

## 배경
CRM에는 Claude(Anthropic) 호출이 8곳 있고, 공유 클라이언트 없이 각 파일에서 인라인으로
SDK를 생성한다. 이를 Qwen(OpenAI 호환 API)으로 전환한다.

**8개 호출처**
- 단순 JSON/브리핑 5곳: `ai-pool-search`, `srm-brief`, `next-action`, `insight-brief`, `strategy-memos`(lib)
- Claude 고유기능 3곳: `sales-strategy`(스트리밍+캐싱), `insight-brief/deep`(웹서치+캐싱),
  `strategy-agent`(스트리밍+확장사고+웹서치)

## 확정 (2026-07-29 사용자 승인)
- 엔드포인트: DashScope 국제. Anthropic 호환 `https://dashscope-intl.aliyuncs.com/apps/anthropic`
  (콘솔 Pay-As-You-Go에서 확인). OpenAI 호환도 있으나 **Anthropic 호환 채택** — 기존 8곳이 전부
  Anthropic SDK라 baseURL+모델명만 교체하면 되어 리스크 최소.
- 모델 티어: opus자리→`qwen-max`(strong), haiku자리→`qwen-turbo`(fast). env로 주입.
- 고급기능 3곳(sales-strategy, insight-deep, strategy-agent): **Claude 유지**. 웹서치·확장사고가
  Qwen엔 없어 품질 급락 → 단순 5곳만 전환.

## 이번 작업 범위 (위험 없는 준비만)

### REQ-001 (MANUAL) API 키 보안 저장
공유된 Qwen 키를 `.env.local`(gitignore 확인됨)에 `QWEN_API_KEY`로 저장. 코드 하드코딩 금지.
관련 env 플레이스홀더 추가: `QWEN_BASE_URL`, `QWEN_MODEL_STRONG`, `QWEN_MODEL_FAST`.

### REQ-002 (TEST) 설정 기반 Qwen 클라이언트 모듈
`src/lib/qwen.ts` 신규. `openai` SDK(기설치)로 Qwen OpenAI-호환 엔드포인트에 붙는
팩토리 + JSON 응답 헬퍼. base URL·모델·키 전부 env에서 주입. 기존 코드 미변경.
- `getQwenClient()` — env 미설정 시 명확한 에러
- `qwenJson<T>({ system, user, model, maxTokens })` — JSON 추출(Anthropic content[0].text
  → OpenAI choices[0].message.content 차이 흡수)

## 다음 단계 (확인 후)
- 5개 단순 사이트 Qwen 전환 (Anthropic→openai SDK, system 분리→message, 응답 파싱 변경)
- 고급 3곳 방침 반영
- 각 사이트 실제 엔드포인트로 런타임 검증

## 비범위
- 고급 3곳 즉시 전환 (엔드포인트/방침 확정 전)
- OpenAI(gpt-4o-mini)·Gemini 사용처 (SRM 리포트/STT 등) — 이번 전환 대상 아님
