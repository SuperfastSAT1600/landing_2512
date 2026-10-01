'use client';

import { useState, useEffect, useCallback } from 'react';

interface IgAccount {
  slug: string;
  username: string;
  name: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  error?: string;
}

interface ContentSpendRow {
  post_shortcode: string | null;
  post_url: string | null;
  ig_account: string;
  total_spend: number;
  total_impressions: number;
  total_reach: number;
  ad_count: number;
}

function thisYearRange() {
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  return { from: `${year}-01-01`, to: today };
}

const ACCOUNT_LABEL: Record<string, string> = {
  official: 'Official',
  global: 'Global',
  brandon: 'Brandon',
  unknown: '미분류',
};

const ACCOUNT_COLOR: Record<string, string> = {
  official: '#6085FF',
  global: '#22c55e',
  brandon: '#f59e0b',
  unknown: '#9ca3af',
};

function fmt(n: number) {
  return n.toLocaleString('ko-KR');
}

export default function IgAnalyticsPage() {
  const [accounts, setAccounts] = useState<IgAccount[]>([]);
  const [spendRows, setSpendRows] = useState<ContentSpendRow[]>([]);
  const [range, setRange] = useState(thisYearRange);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [spendLoading, setSpendLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/ig-accounts')
      .then((r) => r.json())
      .then((d) => setAccounts(d.data ?? []))
      .finally(() => setAccountsLoading(false));
  }, []);

  const fetchSpend = useCallback(() => {
    setSpendLoading(true);
    fetch(`/api/admin/ig-content-spend?from=${range.from}&to=${range.to}`)
      .then((r) => r.json())
      .then((d) => setSpendRows(d.data ?? []))
      .finally(() => setSpendLoading(false));
  }, [range]);

  useEffect(() => { fetchSpend(); }, [fetchSpend]);

  const totalSpend = spendRows.reduce((s, r) => s + r.total_spend, 0);

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 28, color: '#111' }}>
        Instagram 계정 현황 · 콘텐츠 광고비
      </h1>

      {/* 계정 카드 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 14 }}>계정 현황</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {accountsLoading
            ? ['official', 'global', 'brandon'].map((s) => (
                <div key={s} style={cardStyle}>
                  <div style={{ color: '#9ca3af', fontSize: 13 }}>로딩 중…</div>
                </div>
              ))
            : accounts.map((acct) => (
                <div key={acct.slug} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: ACCOUNT_COLOR[acct.slug] ?? '#9ca3af',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>
                      {ACCOUNT_LABEL[acct.slug] ?? acct.slug}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>@{acct.username}</span>
                  </div>
                  {acct.error
                    ? <div style={{ fontSize: 13, color: '#ef4444' }}>{acct.error}</div>
                    : (
                      <div style={{ display: 'flex', gap: 20 }}>
                        <Stat label="팔로워" value={fmt(acct.followers_count)} />
                        <Stat label="미디어" value={fmt(acct.media_count)} />
                        <Stat label="팔로잉" value={fmt(acct.follows_count)} />
                      </div>
                    )}
                </div>
              ))}
        </div>
      </section>

      {/* 기간 선택 + 광고비 테이블 */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: 0 }}>
            콘텐츠별 광고비
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date" value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              style={inputStyle}
            />
            <span style={{ color: '#9ca3af' }}>~</span>
            <input
              type="date" value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              style={inputStyle}
            />
          </div>
          {!spendLoading && (
            <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>
              {spendRows.length}개 콘텐츠 · 총 {fmt(totalSpend)}원
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['계정', '포스트', '광고비 (원)', '노출', '리치', '광고 수'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spendLoading
                ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                      로딩 중…
                    </td>
                  </tr>
                )
                : spendRows.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                        데이터 없음 — cron이 실행된 뒤 표시됩니다
                      </td>
                    </tr>
                  )
                  : spendRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11,
                          background: `${ACCOUNT_COLOR[row.ig_account] ?? '#9ca3af'}22`,
                          color: ACCOUNT_COLOR[row.ig_account] ?? '#9ca3af',
                          fontWeight: 600,
                        }}>
                          {ACCOUNT_LABEL[row.ig_account] ?? row.ig_account}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {row.post_url
                          ? (
                            <a href={row.post_url} target="_blank" rel="noopener noreferrer"
                              style={{ color: '#6085FF', textDecoration: 'none', fontFamily: 'monospace' }}>
                              /p/{row.post_shortcode ?? '…'}
                            </a>
                          )
                          : <span style={{ color: '#9ca3af' }}>-</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {fmt(row.total_spend)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(row.total_impressions)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(row.total_reach)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{row.ad_count}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{label}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '18px 22px',
  minWidth: 220,
  flex: '1 1 220px',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 13,
  color: '#374151',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontWeight: 600,
  color: '#6b7280',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#374151',
  verticalAlign: 'middle',
};
