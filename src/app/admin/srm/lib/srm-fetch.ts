function getAdminKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_key') || '';
}

export function srmFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'x-admin-key': getAdminKey(),
      ...options.headers,
    },
  });
}
