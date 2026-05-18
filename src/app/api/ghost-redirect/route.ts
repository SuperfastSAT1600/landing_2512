import { NextRequest, NextResponse } from 'next/server'
import { logChannelClick } from '@/lib/channel-clicks'

const DESTINATION = process.env.GHOST_REDIRECT_DESTINATION ?? 'https://tutoring.superfastsat.com/'

export async function GET(request: NextRequest) {
  const post = request.nextUrl.searchParams.get('post') ?? 'direct'
  await logChannelClick('ghost', post, request)
  return NextResponse.redirect(DESTINATION, { status: 302 })
}
