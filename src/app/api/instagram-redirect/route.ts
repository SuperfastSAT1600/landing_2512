import { NextRequest, NextResponse } from 'next/server'
import { logChannelClick } from '@/lib/channel-clicks'

const DESTINATION = process.env.INSTAGRAM_REDIRECT_DESTINATION ?? 'https://tutoring.superfastsat.com/'

export async function GET(request: NextRequest) {
  const post = request.nextUrl.searchParams.get('post') ?? 'direct'
  await logChannelClick('instagram', post, request)
  return NextResponse.redirect(DESTINATION, { status: 302 })
}
