// Qwen(DashScope 국제) 클라이언트 — CRM AI 프로바이더 전환용.
// Anthropic 호환 엔드포인트를 쓰므로 기존 CRM 호출부(messages.create, system/content 파싱)를
// 그대로 재사용한다. base URL·모델·키를 전부 env에서 주입해 엔드포인트가 바뀌어도 코드 불변.
//   QWEN_API_KEY             — 필수
//   QWEN_ANTHROPIC_BASE_URL  — Anthropic 호환 엔드포인트 (예: .../apps/anthropic)
//   QWEN_MODEL_STRONG        — 전략/브리핑용 (기본 qwen-max)
//   QWEN_MODEL_FAST          — 단순 JSON 추출용 (기본 qwen-turbo)
import Anthropic from '@anthropic-ai/sdk';

export type QwenTier = 'strong' | 'fast';

const DEFAULT_MODEL: Record<QwenTier, string> = {
  strong: 'qwen-max',
  fast: 'qwen-turbo',
};

export function isQwenConfigured(): boolean {
  return Boolean(process.env.QWEN_API_KEY && process.env.QWEN_ANTHROPIC_BASE_URL);
}

export function qwenModel(tier: QwenTier): string {
  const fromEnv = tier === 'strong' ? process.env.QWEN_MODEL_STRONG : process.env.QWEN_MODEL_FAST;
  return fromEnv?.trim() || DEFAULT_MODEL[tier];
}

// Anthropic SDK를 Qwen의 Anthropic-호환 엔드포인트로 붙인다.
// env 미설정 시 호출부가 명확히 실패하도록 throw (기본 base URL로 조용히 붙지 않게).
export function getQwenAnthropicClient(): Anthropic {
  const apiKey = process.env.QWEN_API_KEY;
  const baseURL = process.env.QWEN_ANTHROPIC_BASE_URL;
  if (!apiKey) throw new Error('QWEN_API_KEY is not set');
  if (!baseURL) throw new Error('QWEN_ANTHROPIC_BASE_URL is not set');
  return new Anthropic({ apiKey, baseURL });
}
