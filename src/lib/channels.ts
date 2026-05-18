export const CHANNELS = [
  {
    key: 'naver' as const,
    label: 'Naver 블로그',
    icon: '📗',
    redirectPath: '/api/naver-redirect',
    postUrlBuilder: (id: string) => `https://blog.naver.com/superfastsat/${id}`,
  },
  {
    key: 'ghost' as const,
    label: 'Ghost 블로그',
    icon: '👻',
    redirectPath: '/api/ghost-redirect',
    postUrlBuilder: null,
  },
  {
    key: 'instagram' as const,
    label: 'Instagram',
    icon: '📷',
    redirectPath: '/api/instagram-redirect',
    postUrlBuilder: null,
  },
]

export type ChannelKey = (typeof CHANNELS)[number]['key']

export function getChannel(key: ChannelKey) {
  return CHANNELS.find(c => c.key === key)!
}
