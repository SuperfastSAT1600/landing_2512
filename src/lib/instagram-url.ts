export function parseInstagramShortcode(input: string): string | null {
    const match = input.trim().match(
        /(?:instagram\.com)\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/
    );
    return match ? match[1] : null;
}

export function isValidInstagramUrl(url: string): boolean {
    return parseInstagramShortcode(url) !== null;
}

export function buildReelEmbedUrl(shortcode: string): string {
    return `https://www.instagram.com/reel/${shortcode}/embed/`;
}
