import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const DESTINATION = 'https://tutoring.superfastsat.com/'

function extractNaverPostId(referer: string | null): string {
  if (!referer) return 'direct'
  const match = referer.match(/blog\.naver\.com\/[^/]+\/(\d+)/)
  return match ? match[1] : 'direct'
}

export async function GET(request: NextRequest) {
  const referer = request.headers.get('referer')
  const userAgent = request.headers.get('user-agent')
  const postId = extractNaverPostId(referer)

  await supabaseAdmin.from('naver_clicks').insert({
    referer_url: referer,
    post_id: postId,
    user_agent: userAgent,
  })

  return NextResponse.redirect(DESTINATION, { status: 302 })
}
