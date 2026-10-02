// LLM 응답 텍스트에서 JSON 객체 꺼내기.
// 모델은 "JSON으로만 답하라"고 해도 앞뒤에 설명이나 코드펜스를 붙이므로,
// 첫 '{'부터 마지막 '}'까지를 잘라 파싱한다.

/** 응답에서 가장 바깥 JSON 객체. 없거나 파싱에 실패하면 null. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
