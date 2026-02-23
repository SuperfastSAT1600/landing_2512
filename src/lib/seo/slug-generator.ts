import OpenAI from 'openai';

function getOpenAIClient(): OpenAI {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

function sanitizeSlug(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}

function fallbackSlug(title: string): string {
    // Extract English words from title
    const englishWords = title.match(/[a-zA-Z]+/g);
    if (englishWords && englishWords.length >= 2) {
        return sanitizeSlug(englishWords.join(' '));
    }
    return `post-${Date.now().toString(36)}`;
}

export async function generateSlug(title: string, category?: string): Promise<string> {
    try {
        const categoryHint = category ? ` (category: ${category})` : '';
        const openai = getOpenAIClient();
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a URL slug generator. Given a Korean blog post title, generate a concise English URL slug. ' +
                        'Rules: max 6 words, use hyphens between words, no articles (a/an/the), no special characters, ' +
                        'lowercase only. Focus on the main topic keywords. Return ONLY the slug, nothing else.',
                },
                {
                    role: 'user',
                    content: `Title: "${title}"${categoryHint}`,
                },
            ],
            temperature: 0.3,
            max_tokens: 50,
        });

        const raw = response.choices[0]?.message?.content?.trim() || '';
        const slug = sanitizeSlug(raw);

        if (slug.length < 3) {
            return fallbackSlug(title);
        }

        return slug;
    } catch {
        return fallbackSlug(title);
    }
}
