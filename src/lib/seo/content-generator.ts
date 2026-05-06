import OpenAI from 'openai';

function getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    return new OpenAI({ apiKey });
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function generateSeoContent(
    title: string,
    content: string,
    focusKeyword?: string,
): Promise<{ excerpt: string; description: string }> {
    const plainText = stripHtml(content).slice(0, 1500);
    const keywordHint = focusKeyword ? ` Focus keyword: "${focusKeyword}".` : '';

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content:
                    'You are an SEO content writer. Given a blog post title and body, generate two things:\n' +
                    '1. excerpt: A 1-2 sentence Korean summary for blog listing pages and Google search results. Max 120 characters.\n' +
                    '2. description: A meta description for SEO. Max 155 characters. Include a soft CTA. Can be Korean or English.\n' +
                    'Return ONLY valid JSON in this exact format: {"excerpt": "...", "description": "..."}',
            },
            {
                role: 'user',
                content: `Title: "${title}"${keywordHint}\n\nContent:\n${plainText}`,
            },
        ],
        temperature: 0.4,
        max_tokens: 200,
        response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content?.trim() || '{}';
    let parsed: Record<string, string> = {};
    try {
        parsed = JSON.parse(raw);
    } catch {
        console.error('[content-generator] Failed to parse LLM response:', raw);
    }

    return {
        excerpt: (parsed.excerpt || '').slice(0, 120),
        description: (parsed.description || '').slice(0, 155),
    };
}
