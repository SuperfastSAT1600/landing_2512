'use client'

import { useEffect, useState, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'
import { CHANNELS } from '@/lib/channels'
import type { ChannelKey } from '@/lib/channels'

type ChannelFilter = 'all' | ChannelKey

interface ChannelStat { channel: string; count: number; lastClick: string }
interface PostStat { channel: string; postId: string; count: number; lastClick: string }
interface DayStat { date: string; count: number }
interface Stats { total: number; byChannel: ChannelStat[]; byPost: PostStat[]; byDay: DayStat[] }

function buildPostUrl(channel: string, postId: string): string | null {
  const ch = CHANNELS.find(c => c.key === channel)
  return ch?.postUrlBuilder ? ch.postUrlBuilder(postId) : null
}

function ChangeRate({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-gray-500 text-xs">–</span>
  const rate = Math.round(((current - previous) / previous) * 100)
  const positive = rate >= 0
  return (
    <span className={`text-xs font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {positive ? '+' : ''}{rate}%
    </span>
  )
}

export default function TrafficPage() {
  const [activeChannel, setActiveChannel] = useState<ChannelFilter>('all')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback((channel: ChannelFilter) => {
    setLoading(true)
    const adminKey = localStorage.getItem('admin_key') || ''
    const url = `/api/admin/traffic-stats?channel=${channel}&days=30`
    fetch(url, { headers: { 'x-admin-key': adminKey } })
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setStats(data) })
      .catch(() => setError('불러오기 실패'))
      .finally(() => setLoading(false))
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(activeChannel) }, [activeChannel])

  const handleTab = (ch: ChannelFilter) => { setActiveChannel(ch); setStats(null) }

  const getChannelCount = (key: string) =>
    stats?.byChannel.find(c => c.channel === key)?.count ?? 0

  const maxDay = Math.max(...(stats?.byDay.map(d => d.count) ?? [1]), 1)

  return (
    <div className="p-8 space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white">채널 유입 통계</h2>
        <p className="text-gray-500 text-sm mt-1">마케팅 채널별 tutoring.superfastsat.com 클릭 추적</p>
      </header>

      {/* 채널별 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {CHANNELS.map(ch => (
          <button
            key={ch.key}
            onClick={() => handleTab(ch.key)}
            className={`bg-[#1e2023] rounded-xl border p-5 text-left transition-all ${
              activeChannel === ch.key ? 'border-blue-500/50' : 'border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span>{ch.icon}</span>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{ch.label}</span>
            </div>
            <p className="text-3xl font-bold text-white">{getChannelCount(ch.key).toLocaleString()}</p>
            <p className="text-gray-600 text-xs mt-1">최근 30일</p>
          </button>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-[#1e2023] rounded-lg p-1 w-fit">
        {(['all', ...CHANNELS.map(c => c.key)] as ChannelFilter[]).map(key => (
          <button
            key={key}
            onClick={() => handleTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeChannel === key
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {key === 'all' ? '전체' : CHANNELS.find(c => c.key === key)?.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : stats && (
        <>
          {/* 총 클릭 */}
          <div className="bg-[#1e2023] rounded-xl border border-white/5 p-6">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">전체 클릭 (해당 기간)</p>
            <p className="text-5xl font-bold text-white">{stats.total.toLocaleString()}</p>
          </div>

          {/* 바 차트 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">최근 30일 추이</h3>
            <div className="bg-[#1e2023] rounded-xl border border-white/5 p-6">
              {stats.byDay.length === 0 ? (
                <p className="text-gray-600 text-sm">데이터 없음</p>
              ) : (
                <div className="flex items-end gap-1 h-24">
                  {stats.byDay.map(({ date, count }) => (
                    <div key={date} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                      <div
                        className="w-full bg-blue-500/70 rounded-sm group-hover:bg-blue-400 transition-colors"
                        style={{ height: `${(count / maxDay) * 100}%`, minHeight: '2px' }}
                      />
                      <span className="absolute -top-5 hidden group-hover:block text-[10px] bg-[#151719] px-1 rounded text-white whitespace-nowrap">
                        {date.slice(5)} · {count}회
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

          {/* 포스트별 테이블 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">포스팅별 클릭 수</h3>
            <div className="bg-[#1e2023] rounded-xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-12 px-6 py-3 border-b border-white/5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-2">채널</div>
                <div className="col-span-5">포스트</div>
                <div className="col-span-2 text-right">클릭 수</div>
                <div className="col-span-3 text-right">마지막 클릭</div>
              </div>
              <div className="divide-y divide-white/5">
                {stats.byPost.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm">데이터 없음</div>
                ) : (
                  stats.byPost.map(({ channel, postId, count, lastClick }) => {
                    const ch = CHANNELS.find(c => c.key === channel)
                    const url = buildPostUrl(channel, postId)
                    return (
                      <div key={`${channel}::${postId}`} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-2 flex items-center gap-1.5">
                          <span className="text-sm">{ch?.icon}</span>
                          <span className="text-xs text-gray-500">{ch?.label ?? channel}</span>
                        </div>
                        <div className="col-span-5">
                          {postId === 'direct' ? (
                            <span className="text-gray-400 text-sm">직접 접근</span>
                          ) : url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 truncate">
                              {postId} <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-gray-300 text-sm">{postId}</span>
                          )}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-white font-bold">{count}</span>
                          <span className="text-gray-500 text-xs ml-1">회</span>
                        </div>
                        <div className="col-span-3 text-right text-xs text-gray-500">
                          {new Date(lastClick).toLocaleString('ko-KR', {
                            timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          {/* 사용 안내 */}
          <section className="bg-[#1e2023] rounded-xl border border-white/5 p-6 space-y-4">
            <p className="font-semibold text-white text-sm">채널별 추적 링크</p>
            {CHANNELS.map(ch => (
              <div key={ch.key}>
                <p className="text-xs text-gray-500 mb-1">{ch.icon} {ch.label}</p>
                <code className="block bg-black/30 rounded px-3 py-2 text-blue-300 text-xs break-all">
                  https://tutoring.superfastsat.com{ch.redirectPath}?post=포스팅이름
                </code>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
