'use client';
import { srmFetch } from '../lib/srm-fetch';
import { useEffect, useState } from 'react';
import type { ScheduleResponse, ScheduleEvent } from '@/app/api/admin/srm/schedule/route';
import type { CopyLogEntry } from '@/app/api/admin/srm/copy-log/route';
import type { DayStats } from '@/app/api/admin/srm/attendance-stats/route';

function toTimeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function getKstDateStr(offsetDays = 0): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

interface UncaredEvent {
  id: string; time: string; students: string[]; coaches: string[];
  type: 'coachRoom' | 'studyHall'; day: 'today' | 'tomorrow';
}

interface Props { date: string; }

function RateBar({ rate, colorClass }: { rate: number; colorClass: string }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${rate}%` }} />
    </div>
  );
}

function StatCard({ label, rate, numerator, denominator, sub, color }: {
  label: string; rate: number | null; numerator: number; denominator: number;
  sub: string; color: 'emerald' | 'orange';
}) {
  const colorClass = color === 'emerald' ? 'bg-emerald-500' : 'bg-orange-400';
  const textColor = color === 'emerald' ? 'text-emerald-600' : 'text-orange-600';
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs font-semibold text-gray-500 mb-2">{label}</div>
      {rate === null ? (
        <p className="text-xs text-gray-400">데이터 없음</p>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold ${textColor}`}>{rate}%</span>
            <span className="text-[10px] text-gray-400 pb-0.5">{sub}</span>
          </div>
          <RateBar rate={rate} colorClass={colorClass} />
          <div className="text-[10px] text-gray-400 mt-1">{numerator} / {denominator}명</div>
        </>
      )}
    </div>
  );
}

export function DailyStatsPanel({ date }: Props) {
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [caredCount, setCaredCount] = useState(0);
  const [uncaredEvents, setUncaredEvents] = useState<UncaredEvent[]>([]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<DayStats | null>(null);
  const [trendStats, setTrendStats] = useState<DayStats[]>([]);

  // 업무 달성률 (기존)
  useEffect(() => {
    setLoading(true);
    Promise.all([
      srmFetch(`/api/admin/srm/schedule?date=${date}`).then((r) => r.json())
        .catch((): ScheduleResponse => ({ today: { coachRoom: [], studyHall: [], vocab: [] }, tomorrow: { coachRoom: [], studyHall: [], vocab: [] } })),
      srmFetch(`/api/admin/srm/copy-log?date=${date}`).then((r) => r.json())
        .then((res) => (Array.isArray(res.data) ? res.data : []) as CopyLogEntry[])
        .catch((): CopyLogEntry[] => []),
    ]).then(([scheduleData, copyLogs]: [ScheduleResponse, CopyLogEntry[]]) => {
      const caredIds = new Set(copyLogs.map((l) => l.event_id));
      const allEvents = [
        ...(scheduleData.today?.coachRoom ?? []).map((ev: ScheduleEvent) => ({ id: ev.id, time: toTimeStr(ev.startsAt), students: ev.students, coaches: ev.coaches, type: 'coachRoom' as const, day: 'today' as const })),
        ...(scheduleData.today?.studyHall ?? []).map((ev: ScheduleEvent) => ({ id: ev.id, time: toTimeStr(ev.startsAt), students: ev.students, coaches: ev.coaches, type: 'studyHall' as const, day: 'today' as const })),
        ...(scheduleData.tomorrow?.coachRoom ?? []).map((ev: ScheduleEvent) => ({ id: ev.id, time: toTimeStr(ev.startsAt), students: ev.students, coaches: ev.coaches, type: 'coachRoom' as const, day: 'tomorrow' as const })),
        ...(scheduleData.tomorrow?.studyHall ?? []).map((ev: ScheduleEvent) => ({ id: ev.id, time: toTimeStr(ev.startsAt), students: ev.students, coaches: ev.coaches, type: 'studyHall' as const, day: 'tomorrow' as const })),
      ];
      setTotalCount(allEvents.length);
      setCaredCount(allEvents.filter((ev) => caredIds.has(ev.id)).length);
      setUncaredEvents(allEvents.filter((ev) => !caredIds.has(ev.id)));
    }).finally(() => setLoading(false));
  }, [date]);

  // 출석률·이탈률 통계
  useEffect(() => {
    setStatsLoading(true);
    const endDate = date;
    const startDate = getKstDateStr(-13); // 오늘 포함 14일
    srmFetch(`/api/admin/srm/attendance-stats?startDate=${startDate}&endDate=${endDate}`)
      .then((r) => r.json())
      .then((res) => {
        const stats: DayStats[] = Array.isArray(res.data) ? res.data : [];
        setTrendStats(stats);
        setTodayStats(stats.find((s) => s.date === date) ?? null);
      })
      .catch(() => { setTrendStats([]); setTodayStats(null); })
      .finally(() => setStatsLoading(false));
  }, [date]);

  const pct = totalCount > 0 ? Math.round((caredCount / totalCount) * 100) : 0;
  const typeLabel = (type: 'coachRoom' | 'studyHall') => type === 'coachRoom' ? '수업' : '스터디홀';

  const today = getKstDateStr(0);

  return (
    <div className="space-y-5">

      {/* 출석률 · 이탈률 오늘 카드 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">오늘 현황</h3>
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="출석률"
              rate={todayStats?.attendanceRate ?? null}
              numerator={todayStats?.attended ?? 0}
              denominator={(todayStats?.attended ?? 0) + (todayStats?.absent ?? 0)}
              sub="확정 기준"
              color="emerald"
            />
            <StatCard
              label="이탈률"
              rate={todayStats?.disconnectionRate ?? null}
              numerator={todayStats?.disconnected ?? 0}
              denominator={todayStats?.totalLearning ?? 0}
              sub="학습 진입 기준"
              color="orange"
            />
          </div>
        )}
      </div>

      {/* 14일 추이 테이블 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-700">최근 14일 추이</h3>
        </div>
        {statsLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : trendStats.length === 0 ? (
          <p className="px-4 py-6 text-xs text-gray-400 text-center">데이터 없음</p>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="px-4 py-2 text-left font-medium">날짜</th>
                <th className="px-3 py-2 text-right font-medium">출석률</th>
                <th className="px-3 py-2 text-right font-medium text-gray-300">(출/확)</th>
                <th className="px-3 py-2 text-right font-medium">이탈률</th>
                <th className="px-3 py-2 text-right font-medium text-gray-300">(이/학)</th>
              </tr>
            </thead>
            <tbody>
              {[...trendStats].reverse().map((s) => {
                const isToday = s.date === today;
                return (
                  <tr
                    key={s.date}
                    className={`border-b border-gray-50 ${isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`px-4 py-2 font-mono ${isToday ? 'font-bold text-blue-700' : 'text-gray-600'}`}>
                      {s.date.slice(5)}{isToday && ' ←'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {s.attendanceRate === null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className={s.attendanceRate >= 80 ? 'text-emerald-600 font-semibold' : s.attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-500 font-semibold'}>
                          {s.attendanceRate}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">
                      {s.attendanceRate !== null ? `${s.attended}/${s.attended + s.absent}` : ''}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {s.disconnectionRate === null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className={s.disconnectionRate === 0 ? 'text-emerald-600' : s.disconnectionRate <= 20 ? 'text-yellow-600' : 'text-red-500 font-semibold'}>
                          {s.disconnectionRate}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">
                      {s.disconnectionRate !== null ? `${s.disconnected}/${s.totalLearning}` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 업무 달성률 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">업무 달성률</h3>
        {loading ? (
          <div className="h-6 bg-gray-100 rounded animate-pulse" />
        ) : totalCount === 0 ? (
          <p className="text-xs text-gray-400">스케줄 없음</p>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">{pct}%</span>
              <span className="text-[10px] text-gray-400 pb-0.5">전체 {totalCount}건 중 {caredCount}건</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>

      {/* 미케어 수업 목록 */}
      {!loading && uncaredEvents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-semibold text-gray-700">케어 안 된 수업</h3>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{uncaredEvents.length}</span>
          </div>
          <div className="space-y-1.5">
            {uncaredEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-[11px]">
                <span className="font-medium px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 shrink-0">{ev.day === 'today' ? '오늘' : '내일'}</span>
                <span className={`font-medium px-1.5 py-0.5 rounded shrink-0 ${ev.type === 'coachRoom' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{typeLabel(ev.type)}</span>
                <span className="font-mono text-gray-500 shrink-0">{ev.time}</span>
                <span className="text-gray-800 flex-1 truncate">{ev.students.join(', ')}</span>
                {ev.coaches.length > 0 && <span className="text-gray-400 shrink-0">↔ {ev.coaches.join(', ')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
