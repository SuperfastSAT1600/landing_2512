'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface PostStat {
  postId: string
  count: number
  lastClick: string
}

interface DayStat {
  date: string
  count: number
}

interface Stats {
  total: number
  byPost: PostStat[]
  byDay: DayStat[]
}

function naverPostUrl(postId: string) {
  return `https://blog.naver.com/superfastsat/${postId}`
}

export default function NaverStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const adminKey = localStorage.getItem('admin_key') || ''
    fetch('/api/admin/naver-stats', { headers: { 'x-admin-key': adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setStats(data)
      })
      .catch(() => setError('불러오기 실패'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (error) return <div className="p-8 text-red-400">{error}</div>
  if (!stats) return null

  const maxDay = Math.max(...stats.byDay.map(d => d.count), 1)

  return (
    <div className="p-8 space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white">Naver 유입 통계</h2>
        <p className="text-gray-500 text-sm mt-1">네이버 블로그 → tutoring.superfastsat.com 클릭 추적</p>
      </header>

      {/* 총 클릭 수 */}
      <div className="bg-[#1e2023] rounded-xl border border-white/5 p-6">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">전체 클릭</p>
        <p className="text-5xl font-bold text-white">{stats.total.toLocaleString()}</p>
      </div>

      {/* 날짜별 바 차트 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">최근 30일 클릭 추이</h3>
        <div className="bg-[#1e2023] rounded-xl border border-white/5 p-6">
          {stats.byDay.length === 0 ? (
            <p className="text-gray-600 text-sm">데이터 없음</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {stats.byDay.map(({ date, count }) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-blue-500/70 rounded-sm group-hover:bg-blue-400 transition-colors"
                    style={{ height: `${(count / maxDay) * 100}%`, minHeight: '2px' }}
                    title={`${date}: ${count}회`}
                  />
                  <span className="text-[9px] text-gray-600 hidden group-hover:block absolute -mt-5 bg-[#151719] px-1 rounded">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-[10px] text-gray-600 mt-2">
            <span>{stats.byDay[0]?.date ?? ''}</span>
            <span>{stats.byDay[stats.byDay.length - 1]?.date ?? ''}</span>
          </div>
        </div>
      </section>

      {/* 포스팅별 테이블 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">포스팅별 클릭 수</h3>
        <div className="bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
          <div className="grid grid-cols-12 px-6 py-3 border-b border-white/5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-5">포스트 ID</div>
            <div className="col-span-3 text-right">클릭 수</div>
            <div className="col-span-4 text-right">마지막 클릭</div>
          </div>
          <div className="divide-y divide-white/5">
            {stats.byPost.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">데이터 없음</div>
            ) : (
              stats.byPost.map(({ postId, count, lastClick }) => (
                <div key={postId} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                  <div className="col-span-5 flex items-center gap-2">
                    {postId === 'direct' ? (
                      <span className="text-gray-400 text-sm">직접 접근</span>
                    ) : (
                      <a
                        href={naverPostUrl(postId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                      >
                        {postId}
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-white font-bold">{count}</span>
                    <span className="text-gray-500 text-sm ml-1">회</span>
                  </div>
                  <div className="col-span-4 text-right text-xs text-gray-500">
                    {new Date(lastClick).toLocaleString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 사용 안내 */}
      <section className="bg-[#1e2023] rounded-xl border border-white/5 p-6 text-sm text-gray-400 space-y-2">
        <p className="font-semibold text-white">네이버 블로그 링크 설정 방법</p>
        <p>포스팅마다 <code className="text-yellow-400 bg-black/30 px-1 rounded">?post=</code> 뒤에 포스팅 주제를 짧게 적어주세요.</p>
        <code className="block bg-black/30 rounded px-3 py-2 text-blue-300 text-xs mt-2 break-all">
          https://tutoring.superfastsat.com/api/naver-redirect?post=경계선분석
        </code>
        <code className="block bg-black/30 rounded px-3 py-2 text-blue-300 text-xs break-all">
          https://tutoring.superfastsat.com/api/naver-redirect?post=독해패턴
        </code>
      </section>
    </div>
  )
}
