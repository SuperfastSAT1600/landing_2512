import { NextRequest, NextResponse } from 'next/server'
import { logChannelClick } from '@/lib/channel-clicks'

const DESTINATION = 'https://tutoring.superfastsat.com/'

export async function GET(request: NextRequest) {
  const post = request.nextUrl.searchParams.get('post') ?? 'direct'
  await logChannelClick('naver', post, request)
  return NextResponse.redirect(DESTINATION, { status: 302 })
}
