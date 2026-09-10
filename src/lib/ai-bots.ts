// AI training crawlers and LLM data collection bots
// These bots scrape content for model training without user consent.
export const AI_BOT_PATTERNS = [
    // OpenAI
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    // Anthropic
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    // Google (Gemini training)
    'Google-Extended',
    // Perplexity
    'PerplexityBot',
    // Meta
    'FacebookBot',
    'meta-externalagent',
    'meta-externalfetcher',
    // ByteDance / TikTok
    'Bytespider',
    // Common Crawl (primary LLM training data source)
    'CCBot',
    // Others
    'Diffbot',
    'cohere-ai',
    'AI2Bot',
    'Omgili',
    'DataForSeoBot',
    'PetalBot',
    'Applebot-Extended',
    'Scrapy',
    'ImagesiftBot',
    'YouBot',
] as const;

export function isAiBot(userAgent: string | null): boolean {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    return AI_BOT_PATTERNS.some((pattern) => ua.includes(pattern.toLowerCase()));
}
