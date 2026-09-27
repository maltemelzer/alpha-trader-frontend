// Money flows between accounts: pure functions over the market-wide trade log (GET /api/securityorderlogs).
import type { SecurityOrderLogEntryView } from '../api/types';

/** One trade, reduced to what the flows page needs. `volume` is € (bonds: price in % × face value 100). */
export interface Trade {
  id: string;
  date: number;
  asin: string;
  shares: number;
  price: number;
  volume: number;
  buyer: string;
  seller: string;
  /** Name in the log: company name, empty for private accounts. */
  buyerName: string;
  sellerName: string;
}

export function toTrade(e: SecurityOrderLogEntryView): Trade {
  const price = e.price ?? 0;
  const shares = e.numberOfShares ?? 0;
  return {
    id: e.id ?? `${e.securityIdentifier}-${e.date}-${e.buyerSecuritiesAccount}`,
    date: e.date ?? 0,
    asin: e.securityIdentifier ?? '',
    shares,
    price,
    volume: e.volume ?? price * shares,
    buyer: e.buyerSecuritiesAccount ?? '',
    seller: e.sellerSecuritiesAccount ?? '',
    buyerName: e.buyerSecuritiesAccountName ?? '',
    sellerName: e.sellerSecuritiesAccountName ?? '',
  };
}

// ---------- Loading a window ----------

/** The log returns at most this many trades per request, newest first. */
export const PAGE = 1000;

/**
 * Pages back through the log from `to` to `from`: each request asks for the newest 1.000 trades up to
 * the oldest one seen so far (endDate is inclusive, so ids are deduplicated). Stops at a short page or
 * after `maxPages`. Returns the trades newest first and where the covered span really starts.
 */
export async function collectPages(
  fetchPage: (startDate: number, endDate: number) => Promise<SecurityOrderLogEntryView[]>,
  from: number,
  to: number,
  maxPages: number,
  onPage?: (loaded: number, oldest: number) => void,
): Promise<{ trades: Trade[]; from: number; complete: boolean; requests: number }> {
  const seen = new Map<string, Trade>();
  let end = to;
  let requests = 0;
  let complete = false;
  let oldest = to;
  while (requests < maxPages) {
    const page = await fetchPage(from, end);
    requests++;
    for (const e of page) {
      const t = toTrade(e);
      seen.set(t.id, t);
      if (t.date < oldest) oldest = t.date;
    }
    onPage?.(seen.size, oldest);
    if (page.length < PAGE) {
      complete = true;
      break;
    }
    const min = Math.min(...page.map((e) => e.date ?? end));
    if (min >= end) {
      // 1.000 trades in one millisecond: cannot page further without losing some.
      break;
    }
    end = min;
  }
  const trades = [...seen.values()].sort((a, b) => b.date - a.date);
  return { trades, from: complete ? from : oldest, complete, requests };
}

/**
 * Several logs loaded like one window – e.g. the buyer and the seller side of one or more accounts
 * (`buyerSecuritiesAccountId` / `sellerSecuritiesAccountId`, 1.000 each, reaching days back for small
 * accounts). Each stream pages back on its own; the covered span starts where the latest-ending
 * stream stopped, so nothing is missing inside it.
 */
export async function collectStreams(
  streams: ((startDate: number, endDate: number) => Promise<SecurityOrderLogEntryView[]>)[],
  from: number,
  to: number,
  maxPages: number,
  onPage?: (loaded: number, oldest: number) => void,
  concurrency = 4,
): Promise<{ trades: Trade[]; from: number; complete: boolean; requests: number }> {
  const seen = new Map<string, Trade>();
  let start = from;
  let complete = true;
  let requests = 0;
  // A few streams at a time: a person with 16 accounts has 32 logs, the server throttles bursts.
  let next = 0;
  const worker = async () => {
    while (next < streams.length) {
      const fetchPage = streams[next++];
      const r = await collectPages(fetchPage, from, to, maxPages);
      for (const t of r.trades) seen.set(t.id, t);
      requests += r.requests;
      if (!r.complete) {
        complete = false;
        start = Math.max(start, r.from);
      }
      onPage?.(seen.size, start);
    }
  };
  await Promise.all([...Array(Math.min(concurrency, streams.length))].map(worker));
  const trades = [...seen.values()].filter((t) => t.date >= start).sort((a, b) => b.date - a.date);
  return { trades, from: start, complete, requests };
}

/** All accounts of one person from an account search: the private depot and every company they run. */
export function ownerAccounts(found: { id?: string; name?: string; privateAccount?: boolean; clearingAccountId?: string }[], owner: string): AccountInfo[] {
  return found.map(parseAccount).filter((a): a is AccountInfo => !!a && a.owner === owner);
}

/** Known trades plus fresh ones: each id once, newest first, nothing before `from`. */
export function mergeWindow(fresh: Trade[], known: Trade[], from: number): Trade[] {
  const byId = new Map<string, Trade>();
  for (const t of known) if (t.date >= from) byId.set(t.id, t);
  for (const t of fresh) if (t.date >= from) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) => b.date - a.date);
}

// ---------- Kinds and filters ----------

export type AssetKind = 'STOCK' | 'BOND' | 'COIN' | 'BUILDING' | 'OTHER';

export const KIND_LABEL: Record<AssetKind, string> = {
  STOCK: 'Aktien',
  BOND: 'Anleihen',
  COIN: 'Coins',
  BUILDING: 'Immobilien',
  OTHER: 'Sonstige',
};

/** Fixed order = fixed chart colour (diagram rule 3). */
export const KINDS: AssetKind[] = ['STOCK', 'BOND', 'COIN', 'BUILDING', 'OTHER'];

/** The kind of a security from its ASIN prefix (the log carries no type). Repos count as bonds. */
export function kindOfAsin(asin: string): AssetKind {
  if (asin.startsWith('ST')) return 'STOCK';
  if (/^(BO|SB|RE|SR)/.test(asin)) return 'BOND';
  if (asin.startsWith('AC')) return 'COIN';
  if (asin.startsWith('BD')) return 'BUILDING';
  return 'OTHER';
}

/**
 * Trades at a token price (0 € or 0,01 €) move shares without a market price: gifts, coin payouts,
 * moves between own accounts. They are shown as „Übertragungen“, never as trades.
 */
export const TRANSFER_PRICE = 0.01;
export const isTransfer = (t: Trade) => t.price <= TRANSFER_PRICE;

export function splitTransfers(trades: Trade[]): { trades: Trade[]; transfers: Trade[] } {
  const out: Trade[] = [];
  const transfers: Trade[] = [];
  for (const t of trades) (isTransfer(t) ? transfers : out).push(t);
  return { trades: out, transfers };
}

/**
 * Whether a trade touches an account – or, for `org:<owner>`, any account of that person
 * (`ownerOf` = CEO/owner of a resolved account). Works the same with and without grouping.
 */
export function involves(t: Trade, account: string, ownerOf: (id: string) => string | undefined = () => undefined): boolean {
  if (!account.startsWith('org:')) return t.buyer === account || t.seller === account;
  const owner = account.slice(4);
  return ownerOf(t.buyer) === owner || ownerOf(t.seller) === owner;
}

// ---------- Accounts ----------

/** What the account endpoint says: `Name (ASIN) | CEO` for company accounts, the username for private ones. */
export interface AccountInfo {
  id: string;
  name: string;
  private: boolean;
  /** Company ASIN (company accounts). */
  asin?: string;
  /** CEO (company accounts) or the owner (private accounts) – the organisation the account belongs to. */
  owner?: string;
  /** Securities account of an ETF (the server calls it private, named „ef-sec-acc-<id>“). */
  fund?: boolean;
  /** the bank account that goes with it (`clearingAccountId`) */
  bank?: string;
}

export function parseAccount(d: { id?: string; name?: string; privateAccount?: boolean; clearingAccountId?: string } | undefined): AccountInfo | undefined {
  if (!d?.id) return undefined;
  const info = parseName(d);
  return info && d.clearingAccountId ? { ...info, bank: d.clearingAccountId } : info;
}

function parseName(d: { id?: string; name?: string; privateAccount?: boolean }): AccountInfo | undefined {
  if (!d.id) return undefined;
  const raw = d.name ?? '';
  const fund = raw.match(/^ef-sec-acc-([0-9a-f]{4})/);
  if (fund) return { id: d.id, name: `ETF-Fonds ${fund[1]}`, private: false, fund: true };
  if (d.privateAccount) return { id: d.id, name: raw, private: true, owner: raw || undefined };
  const m = raw.match(/^(.*) \(([A-Z0-9]{10})\)(?: \| (.*))?$/);
  if (!m) return { id: d.id, name: raw, private: false };
  return { id: d.id, name: m[1], private: false, asin: m[2], owner: m[3] || undefined };
}

export type AccountKind = 'player' | 'company' | 'fund' | 'rest';

/** Per account in a set of trades. `bought` = € paid, `sold` = € received. */
export interface AccountStat {
  id: string;
  name: string;
  kind: AccountKind;
  bought: number;
  sold: number;
  trades: number;
  /** Accounts merged into this one (organisation view). */
  members: number;
}

/** Private accounts have an empty name in the log – that is how they are told apart from company accounts. */
export const kindOfName = (name: string): AccountKind => (name ? 'company' : 'player');

/**
 * Maps an account to the node it is shown as: itself, or – with `byOwner` – its organisation
 * (all accounts with the same CEO/owner, as far as they are resolved).
 */
export type Grouping = (id: string, logName: string) => { id: string; name: string; kind: AccountKind };

export function grouping(infos: Record<string, AccountInfo | undefined>, byOwner: boolean): Grouping {
  return (id, logName) => {
    const info = infos[id];
    if (byOwner && info?.owner) return { id: `org:${info.owner}`, name: info.owner, kind: 'player' };
    const name = logName || labelOf(info);
    return { id, name, kind: info ? (info.fund ? 'fund' : info.private ? 'player' : 'company') : kindOfName(logName) };
  };
}

/** Resolved name; a private account is marked as such – the same person also runs companies. */
export const labelOf = (info: AccountInfo | undefined) => (!info?.name ? '' : info.private ? `${info.name} (privat)` : info.name);

const plain: Grouping = (id, name) => ({ id, name, kind: kindOfName(name) });

export function accountStats(trades: Trade[], group: Grouping = plain): AccountStat[] {
  const map = new Map<string, AccountStat & { raw: Set<string> }>();
  const get = (raw: string, logName: string) => {
    const g = group(raw, logName);
    let s = map.get(g.id);
    if (!s) {
      s = { id: g.id, name: g.name, kind: g.kind, bought: 0, sold: 0, trades: 0, members: 0, raw: new Set() };
      map.set(g.id, s);
    }
    if (!s.name && g.name) s.name = g.name;
    s.raw.add(raw);
    return s;
  };
  for (const t of trades) {
    const b = get(t.buyer, t.buyerName);
    const s = get(t.seller, t.sellerName);
    b.bought += t.volume;
    s.sold += t.volume;
    b.trades++;
    if (s !== b) s.trades++;
  }
  return [...map.values()]
    .map(({ raw, ...s }) => ({ ...s, members: raw.size }))
    .sort((a, b) => b.bought + b.sold - (a.bought + a.sold));
}

export const volumeOf = (s: { bought: number; sold: number }) => s.bought + s.sold;

// ---------- Key figures ----------

export interface Summary {
  volume: number;
  trades: number;
  accounts: number;
  securities: number;
  /** Share of the 10 largest accounts in all buying and selling (each trade counts for buyer and seller). */
  top10Share: number;
}

export function summary(trades: Trade[], stats: AccountStat[]): Summary {
  const volume = trades.reduce((s, t) => s + t.volume, 0);
  const top10 = stats.slice(0, 10).reduce((s, a) => s + volumeOf(a), 0);
  return {
    volume,
    trades: trades.length,
    accounts: stats.length,
    securities: new Set(trades.map((t) => t.asin)).size,
    top10Share: volume ? top10 / (2 * volume) : 0,
  };
}

/** Volume and trades per kind of security, in the fixed kind order, empty kinds left out. */
export function kindSplit(trades: Trade[]): { kind: AssetKind; volume: number; trades: number }[] {
  const acc = new Map<AssetKind, { volume: number; trades: number }>();
  for (const t of trades) {
    const k = kindOfAsin(t.asin);
    const a = acc.get(k) ?? { volume: 0, trades: 0 };
    a.volume += t.volume;
    a.trades++;
    acc.set(k, a);
  }
  return KINDS.filter((k) => acc.has(k)).map((k) => ({ kind: k, ...acc.get(k)! }));
}

// ---------- Pairs ----------

/** Two accounts that traded with each other; `aToB` = € that went from a's shares to b (a sold). */
export interface Pair {
  a: string;
  b: string;
  aName: string;
  bName: string;
  aKind: AccountKind;
  bKind: AccountKind;
  volume: number;
  aToB: number;
  bToA: number;
  trades: number;
  securities: number;
}

export function pairs(trades: Trade[], group: Grouping = plain): Pair[] {
  const map = new Map<string, Pair & { asins: Set<string> }>();
  for (const t of trades) {
    const s = group(t.seller, t.sellerName);
    const b = group(t.buyer, t.buyerName);
    if (s.id === b.id) continue;
    const [x, y] = s.id < b.id ? [s, b] : [b, s];
    const key = `${x.id}|${y.id}`;
    let p = map.get(key);
    if (!p) {
      p = { a: x.id, b: y.id, aName: x.name, bName: y.name, aKind: x.kind, bKind: y.kind, volume: 0, aToB: 0, bToA: 0, trades: 0, securities: 0, asins: new Set() };
      map.set(key, p);
    }
    p.volume += t.volume;
    p.trades++;
    if (s.id === x.id) p.aToB += t.volume;
    else p.bToA += t.volume;
    p.asins.add(t.asin);
  }
  return [...map.values()].map(({ asins, ...p }) => ({ ...p, securities: asins.size })).sort((a, b) => b.volume - a.volume);
}

// ---------- Network ----------

export interface NetNode {
  id: string;
  name: string;
  kind: AccountKind;
  volume: number;
  net: number;
  trades: number;
  members: number;
  x: number;
  y: number;
}

export interface NetEdge {
  a: number;
  b: number;
  volume: number;
  trades: number;
}

export const REST_ID = '__rest__';

/**
 * The largest accounts and who traded with whom among them; everyone else is one node „Übrige“,
 * so an account that only trades with small ones is not left floating. Positions come from
 * `forceLayout` (deterministic).
 */
export type NetMetric = 'volume' | 'trades';

export function network(
  trades: Trade[],
  group: Grouping = plain,
  maxNodes = 32,
  focus?: string,
  by: NetMetric = 'volume',
): { nodes: NetNode[]; edges: NetEdge[]; shown: number; rest: number } {
  const all = accountStats(trades, group);
  const stats = by === 'trades' ? [...all].sort((a, b) => b.trades - a.trades) : all;
  const top = stats.slice(0, maxNodes);
  if (focus && !top.some((s) => s.id === focus)) {
    const f = stats.find((s) => s.id === focus);
    if (f) top[top.length - 1] = f;
  }
  const index = new Map(top.map((s, i) => [s.id, i]));
  const restCount = stats.length - top.length;
  const nodes: NetNode[] = top.map((s) => ({ id: s.id, name: s.name, kind: s.kind, volume: volumeOf(s), net: s.bought - s.sold, trades: s.trades, members: s.members, x: 0, y: 0 }));
  let restIdx = -1;
  if (restCount > 0) {
    restIdx = nodes.length;
    const rest = stats.slice(top.length).filter((s) => !index.has(s.id));
    nodes.push({
      id: REST_ID,
      name: `Übrige (${rest.length.toLocaleString('de-DE')})`,
      kind: 'rest',
      volume: rest.reduce((s, r) => s + volumeOf(r), 0),
      net: rest.reduce((s, r) => s + r.bought - r.sold, 0),
      trades: rest.reduce((s, r) => s + r.trades, 0),
      members: rest.length,
      x: 0,
      y: 0,
    });
  }
  const edgeMap = new Map<string, NetEdge>();
  for (const t of trades) {
    const s = index.get(group(t.seller, t.sellerName).id) ?? restIdx;
    const b = index.get(group(t.buyer, t.buyerName).id) ?? restIdx;
    if (s < 0 || b < 0 || s === b) continue;
    const [x, y] = s < b ? [s, b] : [b, s];
    const key = `${x}|${y}`;
    const e = edgeMap.get(key) ?? { a: x, b: y, volume: 0, trades: 0 };
    e.volume += t.volume;
    e.trades++;
    edgeMap.set(key, e);
  }
  const edges = [...edgeMap.values()].sort((a, b) => b.volume - a.volume);
  const pos = forceLayout(
    nodes.length,
    edges.map((e) => ({ a: e.a, b: e.b, volume: by === 'trades' ? e.trades : e.volume })),
    nodes.map((n) => (by === 'trades' ? n.trades : n.volume)),
  );
  nodes.forEach((n, i) => {
    n.x = pos[i][0];
    n.y = pos[i][1];
  });
  return { nodes, edges, shown: top.length, rest: Math.max(0, restCount) };
}

/**
 * Fruchterman–Reingold on a unit square, deterministic: start on a sunflower spiral (largest node
 * in the middle), fixed number of steps, cooling. Edge pull grows with log(volume), so big flows
 * draw accounts together without one flow dominating. A weak pull to the centre keeps loose
 * parts on screen. Result scaled to [−1, 1].
 */
export function forceLayout(n: number, edges: { a: number; b: number; volume: number }[], weight: number[] = [], steps = 300): [number, number][] {
  if (!n) return [];
  if (n === 1) return [[0, 0]];
  const order = [...Array(n).keys()].sort((i, j) => (weight[j] ?? 0) - (weight[i] ?? 0) || i - j);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const golden = Math.PI * (3 - Math.sqrt(5));
  order.forEach((node, rank) => {
    const r = Math.sqrt((rank + 0.5) / n);
    x[node] = r * Math.cos(rank * golden);
    y[node] = r * Math.sin(rank * golden);
  });
  const k = Math.sqrt(4 / n);
  // Circles are drawn with area ∝ weight: keep their centres at least this far apart.
  const maxW = Math.max(1e-9, ...weight.map((v) => v ?? 0));
  const radius = [...Array(n).keys()].map((i) => 0.04 + 0.16 * Math.sqrt(Math.max(0, weight[i] ?? 0) / maxW));
  const maxLog = Math.max(1, ...edges.map((e) => Math.log10(1 + e.volume)));
  const w = edges.map((e) => 0.35 + (0.65 * Math.log10(1 + e.volume)) / maxLog);
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  for (let step = 0; step < steps; step++) {
    const temp = 0.12 * (1 - step / steps) + 0.002;
    dx.fill(0);
    dy.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ex = x[i] - x[j];
        let ey = y[i] - y[j];
        let d2 = ex * ex + ey * ey;
        if (d2 < 1e-9) {
          // Same spot: push apart along a fixed direction (keeps it deterministic).
          ex = 1e-3 * (i - j);
          ey = 1e-3;
          d2 = ex * ex + ey * ey;
        }
        const f = (k * k) / d2;
        dx[i] += ex * f;
        dy[i] += ey * f;
        dx[j] -= ex * f;
        dy[j] -= ey * f;
      }
    }
    edges.forEach((e, idx) => {
      const ex = x[e.a] - x[e.b];
      const ey = y[e.a] - y[e.b];
      const d = Math.sqrt(ex * ex + ey * ey) || 1e-6;
      const f = (d / k) * w[idx];
      dx[e.a] -= ex * f;
      dy[e.a] -= ey * f;
      dx[e.b] += ex * f;
      dy[e.b] += ey * f;
    });
    for (let i = 0; i < n; i++) {
      // Pull to the centre, stronger for loose parts (few edges) so they sit close instead of far out.
      dx[i] -= x[i] * 1.2;
      dy[i] -= y[i] * 1.2;
      const len = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      const move = Math.min(len, temp);
      x[i] += (dx[i] / len) * move;
      y[i] += (dy[i] / len) * move;
    }
    // Overlapping circles: push both apart half the overlap each.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ex = x[i] - x[j];
        const ey = y[i] - y[j];
        const d = Math.sqrt(ex * ex + ey * ey) || 1e-6;
        const min = radius[i] + radius[j];
        if (d >= min) continue;
        const push = (min - d) / 2 / d;
        x[i] += ex * push;
        y[i] += ey * push;
        x[j] -= ex * push;
        y[j] -= ey * push;
      }
    }
  }
  // Each axis on its own: the drawing fills a wide panel instead of a square in its middle.
  const norm = (v: Float64Array) => {
    const lo = Math.min(...v);
    const hi = Math.max(...v);
    const half = (hi - lo) / 2 || 1;
    return (i: number) => (v[i] - (hi + lo) / 2) / half;
  };
  const nx = norm(x);
  const ny = norm(y);
  return [...Array(n).keys()].map((i) => [nx(i), ny(i)]);
}

// ---------- Sankey ----------

export interface SankeyNode {
  label: string;
  column: 'seller' | 'security' | 'buyer';
  /** Account id or ASIN; undefined for „Übrige“. */
  ref?: string;
  kind: AccountKind | 'security';
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: { source: number; target: number; value: number }[];
}

/**
 * Sellers → securities → buyers in €: the `n` largest of each column, the rest as one „Übrige“ node
 * per column. The same account can stand left (sold) and right (bought).
 */
export function sankey(trades: Trade[], names: Record<string, string>, group: Grouping = plain, n = 7): SankeyData {
  const sold = new Map<string, number>();
  const bought = new Map<string, number>();
  const sec = new Map<string, number>();
  const nameOf = new Map<string, { name: string; kind: AccountKind }>();
  for (const t of trades) {
    const s = group(t.seller, t.sellerName);
    const b = group(t.buyer, t.buyerName);
    nameOf.set(s.id, { name: s.name, kind: s.kind });
    nameOf.set(b.id, { name: b.name, kind: b.kind });
    sold.set(s.id, (sold.get(s.id) ?? 0) + t.volume);
    bought.set(b.id, (bought.get(b.id) ?? 0) + t.volume);
    sec.set(t.asin, (sec.get(t.asin) ?? 0) + t.volume);
  }
  const topOf = (m: Map<string, number>) => {
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    return { top: sorted.slice(0, n), rest: sorted.slice(n) };
  };
  const S = topOf(sold);
  const P = topOf(sec);
  const B = topOf(bought);
  const nodes: SankeyNode[] = [];
  const idx = { seller: new Map<string, number>(), security: new Map<string, number>(), buyer: new Map<string, number>() };
  const addColumn = (column: SankeyNode['column'], part: { top: [string, number][]; rest: [string, number][] }, restLabel: string) => {
    for (const [id, value] of part.top) {
      idx[column].set(id, nodes.length);
      const info = nameOf.get(id);
      nodes.push({
        label: column === 'security' ? names[id] ?? id : info?.name || 'Privatdepot',
        column,
        ref: id,
        kind: column === 'security' ? 'security' : info?.kind ?? 'company',
        value,
      });
    }
    if (part.rest.length) {
      const restIdx = nodes.length;
      nodes.push({ label: `${restLabel} (${part.rest.length.toLocaleString('de-DE')})`, column, kind: 'rest', value: part.rest.reduce((s, r) => s + r[1], 0) });
      for (const [id] of part.rest) idx[column].set(id, restIdx);
    }
  };
  addColumn('seller', S, 'Übrige Verkäufer');
  addColumn('security', P, 'Übrige Wertpapiere');
  addColumn('buyer', B, 'Übrige Käufer');
  const links = new Map<string, { source: number; target: number; value: number }>();
  const add = (source: number, target: number, value: number) => {
    const key = `${source}|${target}`;
    const l = links.get(key) ?? { source, target, value: 0 };
    l.value += value;
    links.set(key, l);
  };
  for (const t of trades) {
    const s = idx.seller.get(group(t.seller, t.sellerName).id)!;
    const p = idx.security.get(t.asin)!;
    const b = idx.buyer.get(group(t.buyer, t.buyerName).id)!;
    add(s, p, t.volume);
    add(p, b, t.volume);
  }
  return { nodes, links: [...links.values()] };
}

// ---------- Over time ----------

export interface TimeSeries {
  key: string;
  label: string;
  values: number[];
}

/** Bucket width that gives 12–30 bars for a window. */
export function bucketMs(spanMs: number): number {
  const min = 60_000;
  for (const b of [1, 2, 5, 10, 15, 30, 60]) if (spanMs / (b * min) <= 30) return b * min;
  return 120 * min;
}

/**
 * € volume per time bucket, stacked by kind of security or – when only one kind is shown – by the
 * `top` largest securities plus „Übrige“. Buckets start at `from`, aligned to the bucket width.
 */
export function timeline(trades: Trade[], from: number, to: number, by: 'kind' | 'security', names: Record<string, string> = {}, top = 5): { x: number[]; series: TimeSeries[]; counts: number[]; width: number } {
  const width = bucketMs(to - from);
  const start = Math.floor(from / width) * width;
  const nb = Math.max(1, Math.ceil((to - start) / width));
  const x = [...Array(nb).keys()].map((i) => start + i * width);
  const counts = new Array(nb).fill(0);
  const keyOf = (t: Trade): string => (by === 'kind' ? kindOfAsin(t.asin) : t.asin);
  let keys: string[];
  if (by === 'kind') keys = KINDS;
  else {
    const vol = new Map<string, number>();
    for (const t of trades) vol.set(t.asin, (vol.get(t.asin) ?? 0) + t.volume);
    keys = [...vol.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map(([k]) => k);
  }
  const keySet = new Set(keys);
  const vals = new Map<string, number[]>([...keys, 'rest'].map((k) => [k, new Array(nb).fill(0)]));
  for (const t of trades) {
    const i = Math.floor((t.date - start) / width);
    if (i < 0 || i >= nb) continue;
    const k = keyOf(t);
    vals.get(keySet.has(k) ? k : 'rest')![i] += t.volume;
    counts[i]++;
  }
  const series: TimeSeries[] = keys.map((k) => ({
    key: k,
    label: by === 'kind' ? KIND_LABEL[k as AssetKind] : names[k] ?? k,
    values: vals.get(k)!,
  }));
  if (by === 'security') series.push({ key: 'rest', label: 'Übrige', values: vals.get('rest')! });
  return { x, series: series.filter((s) => s.values.some((v) => v > 0)), counts, width };
}

// ---------- Net buyers and sellers ----------

/** The `n` largest net buyers (positive: paid more than received) and net sellers (negative). */
export function netFlows(stats: AccountStat[], n = 6): AccountStat[] {
  const net = (s: AccountStat) => s.bought - s.sold;
  const buyers = stats.filter((s) => net(s) > 0).sort((a, b) => net(b) - net(a)).slice(0, n);
  const sellers = stats.filter((s) => net(s) < 0).sort((a, b) => net(a) - net(b)).slice(0, n);
  return [...buyers, ...sellers.reverse()];
}

// ---------- Unusual activity ----------

/** Two accounts that traded one security in both directions within the window. */
export interface RoundTrip {
  a: string;
  b: string;
  aName: string;
  bName: string;
  asin: string;
  aToB: number;
  bToA: number;
  /** Shares that went a → b and b → a. */
  sharesAB: number;
  sharesBA: number;
  volume: number;
}

export function roundTrips(trades: Trade[]): RoundTrip[] {
  const map = new Map<string, RoundTrip>();
  for (const t of trades) {
    if (t.buyer === t.seller) continue;
    const [a, b] = t.seller < t.buyer ? [t.seller, t.buyer] : [t.buyer, t.seller];
    const key = `${a}|${b}|${t.asin}`;
    let r = map.get(key);
    if (!r) {
      r = {
        a,
        b,
        aName: a === t.seller ? t.sellerName : t.buyerName,
        bName: b === t.seller ? t.sellerName : t.buyerName,
        asin: t.asin,
        aToB: 0,
        bToA: 0,
        sharesAB: 0,
        sharesBA: 0,
        volume: 0,
      };
      map.set(key, r);
    }
    if (t.seller === a) {
      r.aToB++;
      r.sharesAB += t.shares;
    } else {
      r.bToA++;
      r.sharesBA += t.shares;
    }
    r.volume += t.volume;
  }
  return [...map.values()].filter((r) => r.aToB > 0 && r.bToA > 0).sort((x, y) => Math.min(y.aToB, y.bToA) - Math.min(x.aToB, x.bToA) || y.volume - x.volume);
}

/** A trade far away from the other trades of the same security in the window. */
export interface OffMarket {
  trade: Trade;
  median: number;
  /** price / median − 1, e.g. 1.5 = 150 % above. */
  deviation: number;
}

/**
 * Trades whose price is more than `factor` away (both ways) from the median price of the other trades
 * of that security – with at least `minOthers` others. A way to move money between accounts; also
 * simple mistakes. Transfers (token price) are not trades and are left out before.
 */
export function offMarket(trades: Trade[], factor = 2, minOthers = 3): OffMarket[] {
  const byAsin = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = byAsin.get(t.asin);
    if (list) list.push(t);
    else byAsin.set(t.asin, [t]);
  }
  const out: OffMarket[] = [];
  for (const list of byAsin.values()) {
    if (list.length < minOthers + 1) continue;
    const prices = list.map((t) => t.price).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    if (!median) continue;
    for (const t of list) {
      const r = t.price / median;
      if (r > factor || r < 1 / factor) out.push({ trade: t, median, deviation: r - 1 });
    }
  }
  return out.sort((a, b) => b.trade.volume - a.trade.volume);
}

/** One sender (or, for self-transfers, one account) within a transfer group. */
export interface TransferPart {
  id: string;
  name: string;
  count: number;
  shares: number;
}

/**
 * Transfers of one security to one receiver, from any number of senders – many small accounts
 * („Multis“) sending coins to one player make one group, not one row each. Transfers an account
 * sends to itself (coin payouts, moves inside one depot) form one group per security (`self`),
 * with the accounts as `parts`.
 */
export interface TransferGroup {
  /** receiver; empty for the self group */
  to: string;
  toName: string;
  asin: string;
  self: boolean;
  /** senders (self: the accounts), most transfers first */
  parts: TransferPart[];
  count: number;
  shares: number;
  last: number;
}

export function transferGroups(transfers: Trade[]): TransferGroup[] {
  const map = new Map<string, TransferGroup & { byId: Map<string, TransferPart> }>();
  for (const t of transfers) {
    const self = t.seller === t.buyer;
    const key = self ? `self|${t.asin}` : `${t.buyer}|${t.asin}`;
    let g = map.get(key);
    if (!g) {
      g = { to: self ? '' : t.buyer, toName: self ? '' : t.buyerName, asin: t.asin, self, parts: [], count: 0, shares: 0, last: 0, byId: new Map() };
      map.set(key, g);
    }
    let p = g.byId.get(t.seller);
    if (!p) {
      p = { id: t.seller, name: t.sellerName, count: 0, shares: 0 };
      g.byId.set(t.seller, p);
    }
    p.count++;
    p.shares += t.shares;
    g.count++;
    g.shares += t.shares;
    g.last = Math.max(g.last, t.date);
  }
  return [...map.values()]
    .map(({ byId, ...g }) => ({ ...g, parts: [...byId.values()].sort((a, b) => b.count - a.count || b.shares - a.shares) }))
    .sort((a, b) => Number(a.self) - Number(b.self) || b.count - a.count || b.shares - a.shares);
}

/** Transfers one account (or a set of own accounts) received and sent, per counterparty and security. */
export interface TransferLine {
  id: string;
  name: string;
  asin: string;
  count: number;
  shares: number;
  /** € actually paid (0 € / 0,01 € per share) */
  paid: number;
  last: number;
}

export function transferSides(transfers: Trade[], isSelf: (id: string) => boolean): { received: TransferLine[]; sent: TransferLine[]; own: number } {
  const received = new Map<string, TransferLine>();
  const sent = new Map<string, TransferLine>();
  let own = 0;
  const add = (map: Map<string, TransferLine>, id: string, name: string, t: Trade) => {
    const key = `${id}|${t.asin}`;
    const l = map.get(key) ?? { id, name, asin: t.asin, count: 0, shares: 0, paid: 0, last: 0 };
    l.count++;
    l.shares += t.shares;
    l.paid += t.volume;
    l.last = Math.max(l.last, t.date);
    map.set(key, l);
  };
  for (const t of transfers) {
    const inS = isSelf(t.seller);
    const inB = isSelf(t.buyer);
    if (inS && inB) own++;
    else if (inB) add(received, t.seller, t.sellerName, t);
    else if (inS) add(sent, t.buyer, t.buyerName, t);
  }
  const sort = (m: Map<string, TransferLine>) => [...m.values()].sort((a, b) => b.count - a.count || b.shares - a.shares);
  return { received: sort(received), sent: sort(sent), own };
}

// ---------- One account: where assets and money come from ----------

export interface OriginNode extends Omit<SankeyNode, 'column'> {
  column: 'seller' | 'bought' | 'self' | 'sold' | 'buyer';
}

export interface OriginData {
  nodes: OriginNode[];
  links: { source: number; target: number; value: number }[];
  /** counterparties it bought from / sold to */
  sellers: number;
  buyers: number;
  bought: number;
  sold: number;
  /** trades between its own accounts (a person's companies and depot), left out of the flow */
  internal: number;
  /** trades left out because `valueOf` knew no value (transfers of a security without a price) */
  unvalued: number;
}

/**
 * Money flow around one account (or all accounts of one person): who sold to it → what it bought →
 * the account → what it sold → who bought from it. Shares flow left to right, the money the other
 * way. The `n` largest per column, the rest as „Übrige“.
 */
export function originSankey(
  trades: Trade[],
  isSelf: (id: string) => boolean,
  selfLabel: string,
  names: Record<string, string>,
  group: Grouping = plain,
  n = 8,
  /** € per trade: the trade volume, or for transfers shares × today's price (`undefined` = no price known) */
  valueOf: (t: Trade) => number | undefined = (t) => t.volume,
): OriginData {
  const cols = { seller: new Map<string, number>(), bought: new Map<string, number>(), sold: new Map<string, number>(), buyer: new Map<string, number>() };
  const info = new Map<string, { name: string; kind: AccountKind }>();
  const inc = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  let internal = 0;
  let unvalued = 0;
  const legs: { col: 'in' | 'out'; party: string; asin: string; volume: number }[] = [];
  for (const t of trades) {
    const inB = isSelf(t.buyer);
    const inS = isSelf(t.seller);
    if (inB && inS) {
      internal++;
      continue;
    }
    if (!inB && !inS) continue;
    const volume = valueOf(t);
    if (!volume || !(volume > 0)) {
      unvalued++;
      continue;
    }
    const other = inB ? group(t.seller, t.sellerName) : group(t.buyer, t.buyerName);
    info.set(other.id, { name: other.name, kind: other.kind });
    if (inB) {
      inc(cols.seller, other.id, volume);
      inc(cols.bought, t.asin, volume);
      legs.push({ col: 'in', party: other.id, asin: t.asin, volume });
    } else {
      inc(cols.sold, t.asin, volume);
      inc(cols.buyer, other.id, volume);
      legs.push({ col: 'out', party: other.id, asin: t.asin, volume });
    }
  }
  const nodes: OriginNode[] = [];
  const idx: Record<OriginNode['column'], Map<string, number>> = { seller: new Map(), bought: new Map(), self: new Map(), sold: new Map(), buyer: new Map() };
  const column = (col: 'seller' | 'bought' | 'sold' | 'buyer', restLabel: string) => {
    const sorted = [...cols[col].entries()].sort((a, b) => b[1] - a[1]);
    const security = col === 'bought' || col === 'sold';
    // Below 1 % of the column a node is a hairline without a label – it goes into „Übrige“ (779 multis à 0,1 %)
    const total = sorted.reduce((s, x) => s + x[1], 0);
    const keep = sorted.slice(0, n).filter(([, v], i) => i === 0 || v >= total / 100).length;
    for (const [id, value] of sorted.slice(0, keep)) {
      idx[col].set(id, nodes.length);
      const i = info.get(id);
      nodes.push({ label: security ? (names[id] ?? id) : i?.name || 'Privatdepot', column: col, ref: id, kind: security ? 'security' : (i?.kind ?? 'company'), value });
    }
    const rest = sorted.slice(keep);
    if (rest.length) {
      const r = nodes.length;
      nodes.push({ label: `${restLabel} (${rest.length.toLocaleString('de-DE')})`, column: col, kind: 'rest', value: rest.reduce((s, x) => s + x[1], 0) });
      for (const [id] of rest) idx[col].set(id, r);
    }
  };
  // short: five columns leave little room, the column head says what they are
  column('seller', 'Übrige');
  column('bought', 'Übrige');
  const bought = [...cols.bought.values()].reduce((s, v) => s + v, 0);
  const sold = [...cols.sold.values()].reduce((s, v) => s + v, 0);
  const self = nodes.length;
  if (bought || sold) nodes.push({ label: selfLabel, column: 'self', kind: 'company', value: Math.max(bought, sold) });
  column('sold', 'Übrige');
  column('buyer', 'Übrige');
  const links = new Map<string, { source: number; target: number; value: number }>();
  const add = (source: number, target: number, value: number) => {
    const key = `${source}|${target}`;
    const l = links.get(key) ?? { source, target, value: 0 };
    l.value += value;
    links.set(key, l);
  };
  for (const l of legs) {
    if (l.col === 'in') {
      const b = idx.bought.get(l.asin)!;
      add(idx.seller.get(l.party)!, b, l.volume);
      add(b, self, l.volume);
    } else {
      const s = idx.sold.get(l.asin)!;
      add(self, s, l.volume);
      add(s, idx.buyer.get(l.party)!, l.volume);
    }
  }
  return { nodes, links: [...links.values()], sellers: cols.seller.size, buyers: cols.buyer.size, bought, sold, internal, unvalued };
}

/** Accounts whose name is worth resolving: the largest by volume and the busiest by trades (bots). */
export function accountsToResolve(trades: Trade[], n = 30): string[] {
  const stats = accountStats(trades);
  const byVolume = stats.slice(0, n).map((s) => s.id);
  const byTrades = [...stats].sort((a, b) => b.trades - a.trades).slice(0, n).map((s) => s.id);
  return [...new Set([...byVolume, ...byTrades])];
}

/**
 * Private accounts (empty name in the log) that the views actually show: money-flow columns, top pairs,
 * net buyers/sellers and the unusual-activity lists. They get resolved too, so a busy private account
 * appears with its player name instead of „Privatdepot“ (company names come with the log).
 */
export function shownPrivateAccounts(trades: Trade[], transfers: Trade[]): string[] {
  const ids: [string, string][] = [];
  const flow = sankey(trades, {});
  for (const node of flow.nodes) if (node.column !== 'security' && node.ref && node.ref !== REST_ID) ids.push([node.ref, node.label === 'Privatdepot' ? '' : node.label]);
  for (const p of pairs(trades).slice(0, 20)) ids.push([p.a, p.aName], [p.b, p.bName]);
  for (const s of netFlows(accountStats(trades))) ids.push([s.id, s.name]);
  for (const r of roundTrips(trades).slice(0, 8)) ids.push([r.a, r.aName], [r.b, r.bName]);
  for (const o of offMarket(trades).slice(0, 8)) ids.push([o.trade.seller, o.trade.sellerName], [o.trade.buyer, o.trade.buyerName]);
  for (const g of transferGroups(transfers).slice(0, 10)) {
    if (!g.self) ids.push([g.to, g.toName]);
    for (const p of g.parts.slice(0, 3)) ids.push([p.id, p.name]);
  }
  return [...new Set(ids.filter(([id, name]) => id && !name).map(([id]) => id))];
}

/** Display name: company name from the log, else the resolved one, else a neutral placeholder. */
export function displayName(id: string, logName: string, infos: Record<string, AccountInfo | undefined>): string {
  if (id.startsWith('org:')) return id.slice(4);
  return logName || labelOf(infos[id]) || (id === REST_ID ? 'Übrige' : 'Privatdepot');
}

/** Link of an account: the player page for private accounts and organisations, the company page for companies. */
export function accountHref(id: string, infos: Record<string, AccountInfo | undefined>): string | undefined {
  if (id.startsWith('org:')) return `/spieler/${encodeURIComponent(id.slice(4))}`;
  const info = infos[id];
  if (!info || info.fund) return undefined;
  if (info.private) return info.name ? `/spieler/${encodeURIComponent(info.name)}` : undefined;
  return info.asin ? `/unternehmen/${info.asin}` : undefined;
}

/** What one account (or a person's accounts) bought and sold from others, and with how many counterparties. */
export function selfTotals(trades: Trade[], isSelf: (id: string) => boolean): { bought: number; sold: number; counterparties: number; securities: number } {
  let bought = 0;
  let sold = 0;
  const others = new Set<string>();
  const asins = new Set<string>();
  for (const t of trades) {
    const inB = isSelf(t.buyer);
    const inS = isSelf(t.seller);
    if (inB === inS) continue;
    if (inB) {
      bought += t.volume;
      others.add(t.seller);
    } else {
      sold += t.volume;
      others.add(t.buyer);
    }
    asins.add(t.asin);
  }
  return { bought, sold, counterparties: others.size, securities: asins.size };
}

/**
 * Today's price of a security for valuing transfers: the last trade, else the bid. Bonds are quoted in
 * % of 100 € face value, so shares × price is € for every kind (like the trade log's `volume`).
 */
export function priceNow(spread: { lastPrice?: { value?: number } | null; bidPrice?: number | null } | undefined): number | undefined {
  const p = spread?.lastPrice?.value || spread?.bidPrice || undefined;
  return p && p > 0 ? p : undefined;
}
