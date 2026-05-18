import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [byPostResult, byDayResult, totalResult] = await Promise.all([
    supabaseAdmin
      .from('naver_clicks')
      .select('post_id, created_at')
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('naver_clicks')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString()),

    supabaseAdmin
      .from('naver_clicks')
      .select('id', { count: 'exact', head: true }),
  ])

  // 포스팅별 집계
  const postMap: Record<string, { count: number; lastClick: string }> = {}
  for (const row of byPostResult.data ?? []) {
    if (!postMap[row.post_id]) {
      postMap[row.post_id] = { count: 0, lastClick: row.created_at }
    }
    postMap[row.post_id].count++
  }
  const byPost = Object.entries(postMap)
    .map(([postId, { count, lastClick }]) => ({ postId, count, lastClick }))
    .sort((a, b) => b.count - a.count)

  // 날짜별 집계 (최근 30일)
  const dayMap: Record<string, number> = {}
  for (const row of byDayResult.data ?? []) {
    const day = row.created_at.slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const byDay = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    total: totalResult.count ?? 0,
    byPost,
    byDay,
  })
}
