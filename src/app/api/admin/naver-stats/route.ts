import { NextRequest, NextResponse } from 'next/server'

// Deprecated: use /api/admin/traffic-stats?channel=naver
export async function GET(request: NextRequest) {
  const url = new URL('/api/admin/traffic-stats', request.url)
  url.searchParams.set('channel', 'naver')
  const res = await fetch(url.toString(), { headers: request.headers })
  const data = await res.json()

  const response = NextResponse.json(data, { status: res.status })
  response.headers.set('Deprecation', 'true')
  response.headers.set('Link', '</api/admin/traffic-stats?channel=naver>; rel="successor-version"')
  return response
}
