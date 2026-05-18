import { supabaseAdmin } from '@/lib/supabase'
import type { ChannelKey } from '@/lib/channels'
import type { NextRequest } from 'next/server'

export async function logChannelClick(
  channel: ChannelKey,
  postId: string,
  request: NextRequest
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from('channel_clicks').insert({
      channel,
      post_id: postId,
      referer_url: request.headers.get('referer'),
      user_agent: request.headers.get('user-agent'),
    })
    if (error) {
      console.error('[channel-clicks] insert error:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.error('[channel-clicks] unexpected error:', e)
    return false
  }
}
