// 테스트용 가짜 Supabase 클라이언트 — 이 route가 쓰는 필터만 흉내 낸다.
type Row = Record<string, unknown>;

export interface FakeDb {
  tables: Record<string, Row[]>;
  /** 이 테이블 조회는 error를 돌려준다. */
  failTables?: Set<string>;
  requests: Array<{ table: string; ordered: boolean; ranged: boolean }>;
}

export function fakeClient(db: FakeDb) {
  return {
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      let withCount = false;
      const orderCols: string[] = [];
      let range: [number, number] | null = null;
      let single = false;
      const builder = {
        select(_cols: string, opts?: { count?: string }) { withCount = opts?.count === 'exact'; return builder; },
        not(col: string, op: string, val: unknown) { if (op === 'is' && val === null) filters.push((r) => r[col] != null); return builder; },
        gt(col: string, v: number) { filters.push((r) => (r[col] as number) > v); return builder; },
        in(col: string, vals: unknown[]) { const s = new Set(vals); filters.push((r) => s.has(r[col])); return builder; },
        eq(col: string, v: unknown) { filters.push((r) => r[col] === v); return builder; },
        is(col: string, v: unknown) { filters.push((r) => (r[col] ?? null) === v); return builder; },
        lte(col: string, v: string) { filters.push((r) => String(r[col]) <= v); return builder; },
        or() { return builder; },
        order(col: string) { orderCols.push(col); return builder; },
        range(from: number, to: number) { range = [from, to]; return builder; },
        maybeSingle() { single = true; return builder; },
        then(resolve: (v: unknown) => unknown) {
          db.requests.push({ table, ordered: orderCols.length > 0, ranged: range !== null });
          if (db.failTables?.has(table)) return Promise.resolve({ data: null, error: { message: `${table} down` }, count: null }).then(resolve);
          let rows = (db.tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          if (orderCols.length) {
            rows = [...rows].sort((a, b) => {
              for (const c of orderCols) { const d = String(a[c]).localeCompare(String(b[c])); if (d) return d; }
              return 0;
            });
          }
          const count = rows.length;
          // PostgREST 기본 최대 1000행
          const [from, to] = range ?? [0, 999];
          rows = rows.slice(from, Math.min(to, from + 999) + 1);
          const data = single ? rows[0] ?? null : rows;
          return Promise.resolve({ data, error: null, count: withCount ? count : null }).then(resolve);
        },
      };
      return builder;
    },
  };
}
