import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const DESTINATION = 'https://tutoring.superfastsat.com/'

export async function GET(request: NextRequest) {
  const post = request.nextUrl.searchParams.get('post') ?? 'unknown'
  const referer = request.headers.get('referer')
  const userAgent = request.headers.get('user-agent')

  await supabaseAdmin.from('naver_clicks').insert({
    referer_url: referer,
    post_id: post,
    user_agent: userAgent,
  })

  return NextResponse.redirect(DESTINATION, { status: 302 })
}
