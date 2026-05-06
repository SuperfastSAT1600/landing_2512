import { NextRequest, NextResponse } from 'next/server'

const KAKAO_URL = 'https://open.kakao.com/o/s858Ajch'
const LEAD_CHANNEL_ID = 'C07FK85V9PD' // m1_26년4월_1억3천_2리드

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source') ?? '알 수 없음'
  const referer = request.headers.get('referer') ?? '직접 접근'
  const token = process.env.SLACK_BOT_TOKEN

  if (token) {
    const now = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const sourceLabel =
      source === 'ghost' ? 'Ghost 블로그' :
      source === 'landing' ? '랜딩 페이지' : source

    fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: LEAD_CHANNEL_ID,
        text: `🖐️ *카카오 상담 버튼 클릭!*\n• *출처*: ${sourceLabel}\n• *페이지*: ${referer}\n• *시간*: ${now} KST`,
      }),
    }).catch(() => {})
  }

  return NextResponse.redirect(KAKAO_URL, { status: 307 })
}
