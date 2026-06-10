/**
 * Anthropic API 에러를 사용자용 한국어 메시지로 변환한다.
 *
 * 스트리밍 챗 라우트의 catch에서 사용. 기존에는 실패 원인과 무관하게
 * "웹 검색이 계정에 활성화되어 있는지 확인" 고정 문구를 출력해 오진을 유발했다.
 * (실제 빈발 원인은 크레딧 부족) → 주요 케이스를 구분해 정확히 안내한다.
 */
export function anthropicErrorMessage(err: unknown): string {
  const status =
    typeof (err as { status?: unknown })?.status === 'number'
      ? (err as { status: number }).status
      : undefined;
  const raw = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();

  if (raw.includes('credit balance') || raw.includes('plans & billing') || raw.includes('billing')) {
    return '[오류] AI 크레딧 잔액이 부족합니다. Anthropic 콘솔(Plans & Billing)에서 충전 후 다시 시도해주세요.';
  }
  if (
    status === 401 ||
    raw.includes('authentication') ||
    raw.includes('invalid x-api-key') ||
    raw.includes('invalid api key')
  ) {
    return '[오류] AI 인증에 실패했습니다. API 키 설정을 확인해주세요.';
  }
  if (status === 429 || status === 529 || raw.includes('rate limit') || raw.includes('overloaded')) {
    return '[오류] 요청이 일시적으로 많아 실패했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (raw.includes('web_search') || raw.includes('web search')) {
    return '[오류] 웹 검색 도구 호출에 실패했습니다. 계정에 웹 검색이 활성화되어 있는지 확인해주세요.';
  }
  return '[오류] AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
}
