// LLM 응답 텍스트에서 JSON 객체 꺼내기.
// 모델은 "JSON으로만 답하라"고 해도 앞뒤에 설명이나 코드펜스를 붙이므로,
// 첫 '{'부터 마지막 '}'까지를 잘라 파싱한다.

/** 응답에서 가장 바깥 JSON 객체. 없거나 파싱에 실패하면 null. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  // '{'로 시작하는 구간만 파싱하므로 결과는 항상 객체다.
  return tryParse(slice) ?? tryParse(escapeControlCharsInStrings(slice));
}

function tryParse(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const CONTROL_ESCAPES: Record<string, string> = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };

/**
 * 문자열 리터럴 안의 날 줄바꿈·CR·탭만 이스케이프한다.
 * qwen-max는 여러 줄 값을 "\n" 대신 실제 줄바꿈으로 내보내는 경우가 잦다(JSON 문법 위반).
 */
function escapeControlCharsInStrings(json: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inString && ch === '\\') {
      out += ch + (json[i + 1] ?? '');
      i++;
      continue;
    }
    if (ch === '"') inString = !inString;
    out += inString && CONTROL_ESCAPES[ch] ? CONTROL_ESCAPES[ch] : ch;
  }
  return out;
}
