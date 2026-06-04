import { Node, mergeAttributes } from '@tiptap/core';
import { buildReelEmbedUrl } from '@/lib/instagram-url';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        instagramReel: {
            setInstagramReel: (shortcode: string) => ReturnType;
        };
    }
}

export const InstagramReelExtension = Node.create({
    name: 'instagramReel',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            shortcode: { default: null },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div.instagram-reel-wrapper',
                getAttrs: (dom) => {
                    const iframe = (dom as HTMLElement).querySelector('iframe');
                    const src = iframe?.getAttribute('src') ?? '';
                    const match = src.match(/\/reel\/([A-Za-z0-9_-]+)\/embed/);
                    return { shortcode: match?.[1] ?? null };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const shortcode = HTMLAttributes.shortcode as string;
        return [
            'div',
            mergeAttributes({ class: 'instagram-reel-wrapper' }),
            [
                'iframe',
                {
                    src: buildReelEmbedUrl(shortcode),
                    class: 'instagram-reel-embed',
                    allow: 'encrypted-media; fullscreen',
                    loading: 'lazy',
                    title: `Instagram reel ${shortcode}`,
                    frameborder: '0',
                },
            ],
        ];
    },

    addNodeView() {
        return ({ node }) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'instagram-reel-wrapper';
            wrapper.style.cssText = 'width:100%;display:flex;justify-content:center;padding:16px 0;';

            const iframe = document.createElement('iframe');
            iframe.src = buildReelEmbedUrl(node.attrs.shortcode);
            iframe.className = 'instagram-reel-embed';
            iframe.style.cssText = 'width:100%;max-width:420px;height:min(85vh,720px);border:0;border-radius:16px;background:#000;';
            iframe.allow = 'encrypted-media; fullscreen';
            iframe.loading = 'lazy';
            iframe.title = `Instagram reel ${node.attrs.shortcode}`;

            wrapper.appendChild(iframe);
            return { dom: wrapper };
        };
    },

    addCommands() {
        return {
            setInstagramReel: (shortcode: string) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: { shortcode },
                });
            },
        };
    },
});
