import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ChannelKey } from '@/lib/channels'

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const channelParam = params.get('channel') ?? 'all'
  const days = Math.min(Math.max(parseInt(params.get('days') ?? '30', 10), 1), 90)

  const since = new Date()
  since.setDate(since.getDate() - days)

  let query = supabaseAdmin.from('channel_clicks').select('channel, post_id, created_at')
  if (channelParam !== 'all') {
    query = query.eq('channel', channelParam as ChannelKey)
  }

  const { data: rows } = await query.gte('created_at', since.toISOString()).order('created_at', { ascending: false })

  // 전체 카운트 (채널 필터 무관)
  const { count: total } = await (channelParam === 'all'
    ? supabaseAdmin.from('channel_clicks').select('id', { count: 'exact', head: true })
    : supabaseAdmin.from('channel_clicks').select('id', { count: 'exact', head: true }).eq('channel', channelParam)
  )

  const allRows = rows ?? []

  // 채널별 집계
  const channelMap: Record<string, { count: number; lastClick: string }> = {}
  for (const r of allRows) {
    if (!channelMap[r.channel]) channelMap[r.channel] = { count: 0, lastClick: r.created_at }
    channelMap[r.channel].count++
  }
  const byChannel = Object.entries(channelMap)
    .map(([channel, { count, lastClick }]) => ({ channel, count, lastClick }))
    .sort((a, b) => b.count - a.count)

  // 포스트별 집계
  const postMap: Record<string, { channel: string; count: number; lastClick: string }> = {}
  for (const r of allRows) {
    const key = `${r.channel}::${r.post_id}`
    if (!postMap[key]) postMap[key] = { channel: r.channel, count: 0, lastClick: r.created_at }
    postMap[key].count++
  }
  const byPost = Object.entries(postMap)
    .map(([key, { channel, count, lastClick }]) => ({
      channel,
      postId: key.split('::')[1],
      count,
      lastClick,
    }))
    .sort((a, b) => b.count - a.count)

  // 날짜별 집계
  const dayMap: Record<string, number> = {}
  for (const r of allRows) {
    const day = r.created_at.slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const byDay = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ total: total ?? 0, byChannel, byPost, byDay })
}
