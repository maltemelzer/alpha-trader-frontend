import { describe, expect, it } from 'vitest';
import {
  DAY,
  articleStory,
  bestYields,
  bigTrades,
  breadth,
  breaking,
  briefs,
  capitalStories,
  changeFigure,
  changeOf,
  cut,
  depotDay,
  dirOf,
  edition,
  frontPage,
  keepTrades,
  cleanText,
  firstSentences,
  sentences,
  lastClose,
  moveCandidates,
  rebase,
  sinceClose,
  latestLetter,
  mergerStories,
  moveStory,
  moveTitle,
  mostTraded,
  movers,
  nameList,
  pickLead,
  rank,
  rateDays,
  rateStory,
  shortMoney,
  splitArticle,
  stamp,
  tidy,
  toQuotes,
  tradeStory,
  weather,
  whenShort,
  withLiveTrades,
  type ChangeLookup,
  type Quote,
  type Story,
} from './derive';

const NB = ' ';
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const NOW = at(2026, 9, 30, 14, 32);
const MIN = 60_000;
const HOUR = 60 * MIN;
const lookup = (entries: [string, number][], complete = true): ChangeLookup => ({ map: new Map(entries), complete });
const q = (asin: string, p: Partial<Quote> = {}): Quote => ({ asin, name: asin, type: 'STOCK', price: 10, change: 0, volume: 1e6, ...p });
const story = (id: string, weight: number, p: Partial<Story> = {}): Story => ({
  id,
  kind: 'bewegung',
  kicker: '',
  title: id,
  dek: '',
  lede: '',
  byline: '',
  href: '',
  weight,
  at: NOW,
  ...p,
});

describe('edition', () => {
  it('names date, year and issue number after the game day', () => {
    const e = edition(NOW);
    expect(e.date).toBe('Mittwoch, 30. September 2026');
    expect(e.dateShort).toBe('Mi., 30.09.');
    expect(e.name).toBe('Mittagsausgabe');
    expect(e.time).toBe('14:32');
    // 5.8.2021 = no. 1; 5.8.2026 is 1.826 days later (one leap day)
    expect(edition(at(2021, 8, 5, 9)).number).toBe(1);
    expect(edition(at(2026, 8, 5, 9)).number).toBe(1827);
    expect(e.number).toBe(1827 + 56);
  });

  it('counts the year from the anniversary', () => {
    expect(edition(at(2021, 8, 5)).volume).toBe(1);
    expect(edition(at(2026, 8, 4)).volume).toBe(5);
    expect(edition(at(2026, 8, 5)).volume).toBe(6);
  });

  it('names the edition after the hour', () => {
    expect(edition(at(2026, 9, 30, 7)).name).toBe('Morgenausgabe');
    expect(edition(at(2026, 9, 30, 19)).name).toBe('Abendausgabe');
    expect(edition(at(2026, 9, 30, 23)).name).toBe('Nachtausgabe');
  });
});

describe('time stamps', () => {
  it('stamp: today the time, yesterday with the word, older the weekday', () => {
    expect(stamp(at(2026, 9, 30, 11, 22), NOW)).toBe('11:22');
    expect(stamp(at(2026, 9, 29, 8, 5), NOW)).toBe('gestern 08:05');
    expect(stamp(at(2026, 9, 27, 8, 5), NOW)).toBe('So., 27.09.');
  });

  it('whenShort: past times, later today, tomorrow, weekday', () => {
    expect(whenShort(NOW - HOUR, NOW)).toBe('13:32');
    expect(whenShort(NOW + HOUR, NOW)).toBe('heute');
    expect(whenShort(NOW + DAY, NOW)).toBe('morgen');
    expect(whenShort(NOW + 3 * DAY, NOW)).toBe('Sa.');
    expect(whenShort(NOW - 2 * DAY, NOW)).toBe('Mo.');
  });
});

describe('numbers', () => {
  it('shortMoney and changeFigure', () => {
    expect(shortMoney(16.7e9)).toBe(`16,7${NB}Mrd.${NB}€`);
    expect(shortMoney(2_486_682_360)).toBe(`2,49${NB}Mrd.${NB}€`);
    expect(shortMoney(12_345)).toBe(`12.345${NB}€`);
    expect(changeFigure(2.345)).toBe('+2,35');
    expect(changeFigure(-65.99)).toBe('−65,99');
    expect(changeFigure(0.001)).toBe('±0,00');
    expect(dirOf(0.001)).toBeNull();
    expect(dirOf(-1)).toBe('down');
  });

  it('tidy: no „..“ after names ending in a full stop, ellipses stay', () => {
    expect(tidy('Es übernimmt EVERY. Inc.. Danach')).toBe('Es übernimmt EVERY. Inc. Danach');
    expect(tidy('Und dann...')).toBe('Und dann...');
  });

  it('nameList', () => {
    expect(nameList(['A'])).toBe('A');
    expect(nameList(['A', 'B'])).toBe('A und B');
    expect(nameList(['A', 'B', 'C', 'D'])).toBe('A, B und 2 weitere');
  });
});

describe('quotes', () => {
  const rows = [
    { listing: { name: ' Alpha ', securityIdentifier: 'STA', type: 'STOCK' }, lastPrice: { value: 12, date: NOW - MIN }, volume: 5e6 },
    { listing: { name: 'Beta', securityIdentifier: 'STB', type: 'STOCK' }, lastPrice: { value: 4, date: NOW - MIN }, volume: 1e9 },
  ];

  it('joins the change; outside complete lists it is 0, a spike (NaN) is unknown', () => {
    expect(changeOf('X', lookup([]))).toBe(0);
    expect(changeOf('X', lookup([], false))).toBeUndefined();
    expect(changeOf('X', lookup([['X', NaN]]))).toBeUndefined();
    const list = toQuotes(rows, lookup([['STA', 20]]));
    expect(list[0]).toMatchObject({ asin: 'STA', name: 'Alpha', price: 12, change: 20, volume: 5e6 });
    expect(list[1].change).toBe(0);
  });

  it('withLiveTrades moves price and change with a newer trade; transfers and jumps stay out', () => {
    const [a] = toQuotes(rows, lookup([['STA', 20]]));
    const [live] = withLiveTrades([a], [{ securityIdentifier: 'STA', price: 15, date: NOW }]);
    expect(live.price).toBe(15);
    expect(live.change).toBeCloseTo(50); // close 10 → 15
    expect(withLiveTrades([a], [{ securityIdentifier: 'STA', price: 0.01, date: NOW }])[0]).toBe(a);
    expect(withLiveTrades([a], [{ securityIdentifier: 'STA', price: 500, date: NOW }])[0]).toBe(a);
    expect(withLiveTrades([a], [{ securityIdentifier: 'STA', price: 15, date: NOW - HOUR }])[0]).toBe(a);
  });

  it('mostTraded: shares by turnover, own papers marked', () => {
    const list = mostTraded([q('A', { volume: 1 }), q('B', { volume: 9 }), q('C', { type: 'COIN', volume: 99 })], new Set(['A']), 5);
    expect(list.map((l) => l.asin)).toEqual(['B', 'A']);
    expect(list[1].mine).toBe(true);
  });

  it('movers: only with turnover, strongest first', () => {
    const list = [q('A', { change: 50, volume: 100 }), q('B', { change: 30 }), q('C', { change: 40 }), q('D', { change: -5 })];
    expect(movers(list, 'up', new Set()).map((l) => l.asin)).toEqual(['C', 'B']);
    expect(movers(list, 'down', new Set()).map((l) => l.asin)).toEqual(['D']);
  });

  it('breadth and weather', () => {
    const b = breadth([q('A', { change: 1 }), q('B', { change: 2 }), q('C', { change: -1 }), q('D', { change: 0 }), q('E', { change: 5, volume: 0 })]);
    expect(b).toEqual({ up: 2, down: 1, flat: 1 });
    expect(weather(b)).toBe('Heiter');
    expect(weather({ up: 0, down: 1, flat: 9 })).toBe('Windstill');
    expect(weather({ up: 1, down: 9, flat: 0 })).toBe('Regen');
  });
});

describe('bestYields', () => {
  const bond = (asin: string, ask: number, left: number, rate = 2) => ({
    interestRate: rate,
    maturityDate: NOW + left,
    listing: { name: `Emittent ${asin} 2.0000% 01/10/2026`, securityIdentifier: asin },
    priceSpread: { askPrice: ask },
  });

  it('yield per day at the ask, cohorts as one line, due within the hour left out', () => {
    const list = bestYields([bond('B1', 100, DAY), bond('B2', 100, DAY), bond('B3', 99, 2 * DAY), bond('B4', 90, 30 * MIN)], NOW, new Set(['B2']));
    expect(list).toHaveLength(2);
    // 102/99 − 1 = 3,03 % in 2 days → 1,52 %/day; 2 % in 1 day
    expect(list[0].asin).toBe('B1');
    expect(list[0].price).toBeCloseTo(2);
    expect(list[0].note).toBe('×2');
    expect(list[0].left).toBe(`1${NB}T.`);
    expect(list[0].mine).toBe(true);
    expect(list[0].name).toBe('Emittent B1');
    expect(list[1].price).toBeCloseTo(1.5152, 3);
  });
});

describe('depotDay', () => {
  it('values the depot against yesterday from the known changes', () => {
    const d = depotDay(100, [{ securityIdentifier: 'A', volume: 110 }, { securityIdentifier: 'B', volume: 90 }], lookup([['A', 10]]))!;
    expect(d.value).toBe(300);
    expect(d.abs).toBeCloseTo(10);
    expect(d.pct).toBeCloseTo((300 / 290 - 1) * 100);
    expect(depotDay(1, [], null)).toBeUndefined();
  });
});

describe('stories', () => {
  it('moveStory: a big move with big turnover beats a bigger one in a sleeper', () => {
    const s = moveStory(
      [q('STPMM', { name: 'Prime Market Making', change: -66, volume: 16e9, price: 6.41, bid: 6.4, ask: 6.42 }), q('STASL', { change: 252, volume: 12e6 })],
      { up: 489, down: 79, flat: 0 },
      new Map([['STPMM', 4]]),
    )!;
    expect(s.title).toBe(`Prime Market Making bricht um 66${NB}% ein`);
    expect(s.dek).toContain(`auf 6,41${NB}€`);
    expect(s.lede).toContain(`Geld 6,40${NB}€, Brief 6,42${NB}€`);
    expect(s.lede).toContain('steigen 489 Werte, fallen 79');
    expect(s.lede).toContain(`Mit 16${NB}Mrd.${NB}€ Umsatz in 24 Stunden ist die Aktie die Nummer 4 im Handel.`);
    expect(s.chart).toMatchObject({ kind: 'price', asin: 'STPMM' });
    expect((s.chart as { ref: number }).ref).toBeCloseTo(6.41 / 0.34);
  });

  it('moveStory needs 3 % and 1 Mio. € turnover', () => {
    expect(moveStory([q('A', { change: 2, volume: 1e9 }), q('B', { change: 30, volume: 1e5 })], undefined)).toBeUndefined();
  });

  it('moveTitle verbs', () => {
    expect(moveTitle('X', 4.2)).toBe(`X steigt um 4,2${NB}%`);
    expect(moveTitle('X', 35)).toBe(`X springt um 35${NB}%`);
    expect(moveTitle('X', -9)).toBe(`X rutscht um 9${NB}%`);
  });

  it('splitArticle: a short first paragraph is the subhead', () => {
    const r = splitArticle('Titel', 'Die Unterzeile\n\nErster Satz. Zweiter Satz.');
    expect(r).toEqual({ dek: 'Die Unterzeile', lede: 'Erster Satz. Zweiter Satz.' });
    expect(splitArticle('Titel', 'Nur ein Absatz.').dek).toBe('');
    expect(splitArticle('Titel', 'Titel\n\nText.').dek).toBe('');
    expect(splitArticle('Titel', 'Liebe Börsengemeinde,\n\nText.').dek).toBe('');
  });

  it('cut: at a sentence end, else at a word with an ellipsis', () => {
    expect(cut('Eins zwei. Drei vier fünf sechs.', 16)).toBe('Eins zwei.');
    expect(cut('Ein langer Satz ohne Ende hier', 16)).toBe(`Ein langer Satz${NB}…`);
  });

  it('articleStory: fresh articles weigh most, the company gives the graphic', () => {
    const a = {
      id: 'p1',
      title: 'SamaBook investiert',
      text: 'Kurz vorweg\nDer Text.',
      author: 'Zombiemind',
      date: NOW - 30 * MIN,
      comments: 2,
      company: { name: 'SamaBook Records AG', securityIdentifier: 'STSAMA' },
    };
    const s = articleStory(a, NOW);
    expect(s.weight).toBeCloseTo(95 - 12.5 + 4);
    expect(s.kicker).toBe('SamaBook Records AG');
    expect(s.byline).toBe('Von Zombiemind · 14:02 · 2 Kommentare');
    expect(s.chart).toMatchObject({ kind: 'price', asin: 'STSAMA' });
    expect(articleStory({ ...a, date: NOW - 5 * HOUR }, NOW).weight).toBe(4);
    const e = articleStory({ ...a, title: 'Updates on Alpha-Trader.com (20260929)', engine: true, company: null }, NOW);
    expect(e.title).toBe('Neu im Spiel: die Updates vom 29.09.');
    expect(e.kicker).toBe('In eigener Sache');
  });

  it('mergerStories: groups by the acquirer and day; traded shares weigh more', () => {
    const acq = { name: 'uriSTAY', securityIdentifier: 'STURI' };
    const list = [
      { id: 'm1', startDate: NOW + HOUR, company: { name: 'A' }, acquiringCompany: acq },
      { id: 'm2', startDate: NOW + 2 * HOUR, company: { name: 'B' }, acquiringCompany: acq },
      { id: 'm3', startDate: NOW + 2 * DAY, company: { name: 'C', securityIdentifier: 'STC' }, acquiringCompany: { name: 'D' } },
      { id: 'm4', startDate: NOW + 5 * DAY, company: { name: 'E' }, acquiringCompany: { name: 'F' } },
    ];
    const s = mergerStories(list, NOW, new Map([['STURI', 1e9]]));
    expect(s).toHaveLength(2);
    expect(s[0].title).toBe('uriSTAY übernimmt 2 Firmen');
    expect(s[0].dek).toBe(`Vollzug ab heute 15:32${NB}Uhr`);
    expect(s[0].lede).toBe('uriSTAY verschmilzt A und B mit sich. Die Aktionäre haben zugestimmt.');
    expect(s[0].weight).toBeCloseTo(12 + 10 + 30 * 0.75);
    expect(s[1].title).toBe('C geht in D auf');
    expect(s[1].weight).toBe(12);
  });

  it('capitalStories: running or starting within a day', () => {
    const c = { id: 'c1', type: 'WITH_SUBSCRIPTION_RIGHTS', numberOfShares: 441207, price: 5636.09, cashVolume: 2.49e9, company: { name: 'Capitol', securityIdentifier: 'STCAP' } };
    const s = capitalStories(
      [
        { ...c, startDate: NOW - HOUR, endDate: NOW + DAY },
        { ...c, id: 'c2', startDate: NOW + 3 * DAY, endDate: NOW + 5 * DAY },
      ],
      NOW,
    );
    expect(s).toHaveLength(1);
    expect(s[0].title).toBe(`Capitol holt sich 2,49${NB}Mrd.${NB}€`);
    expect(s[0].dek).toBe(`Zeichnung läuft bis morgen 14:32${NB}Uhr`);
    expect(s[0].lede).toContain('Bezugsrecht');
  });

  it('rateStory: tender close, unchanged, moved', () => {
    const days = rateDays([
      { date: at(2026, 9, 28, 13, 36), mainInterestRate: 0.5 },
      { date: at(2026, 9, 29, 13, 34), mainInterestRate: 0.7 },
      { date: at(2026, 9, 29, 13, 37), mainInterestRate: 0.82, reserveInterestRate: 0.41 },
    ]);
    expect(days).toHaveLength(2);
    const moved = rateStory(days, NOW + 20 * HOUR, NOW)!;
    expect(moved.title).toBe(`Leitzins steigt auf 0,82${NB}%`);
    expect(moved.dek).toContain(`+0,32${NB}Prozentpunkte`);
    expect(rateStory(days, NOW + 10 * MIN, NOW)!.kind).toBe('tender');
    expect(rateStory([days[1], days[1]], undefined, NOW)!.title).toBe(`Leitzins bleibt bei 0,82${NB}%`);
    expect(rateStory([], undefined, NOW)).toBeUndefined();
  });
});

describe('big trades', () => {
  const t = (id: string, volume: number, date = NOW, asin = 'STX', price = 10) => ({ id, securityIdentifier: asin, price, numberOfShares: volume / price, volume, date });

  it('only share trades above the minimum and after `since`, biggest first', () => {
    const list = bigTrades([t('a', 5e8), t('b', 2e9), t('c', 5e7), t('d', 9e9, NOW, 'BOX'), t('e', 9e9, NOW - HOUR), t('f', 9e9, NOW, 'STX', 0.01)], NOW - MIN);
    expect(list.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('keepTrades: joins, drops the old ones', () => {
    const old = bigTrades([t('a', 5e8, NOW - 40 * MIN)], 0);
    const fresh = bigTrades([t('b', 2e9)], 0);
    expect(keepTrades([...old, ...fresh], fresh, NOW).map((x) => x.id)).toEqual(['b']);
  });

  it('tradeStory names the buyer; old trades weigh less', () => {
    const [big] = bigTrades([{ ...t('b', 2e10), buyerSecuritiesAccountName: 'Stockbrot' }], 0);
    const s = tradeStory(big, 'Prime Reserve Bank', NOW);
    expect(s.title).toBe(`Stockbrot kauft Prime Reserve Bank für 20${NB}Mrd.${NB}€`);
    expect(s.weight).toBeGreaterThan(tradeStory({ ...big, date: NOW - 10 * MIN }, 'X', NOW).weight);
  });
});

describe('front page', () => {
  it('rank: heaviest first, one story per security', () => {
    const r = rank([
      story('a', 10, { chart: { kind: 'price', asin: 'X', name: 'X' } }),
      story('b', 30, { chart: { kind: 'price', asin: 'X', name: 'X' } }),
      story('c', 20),
    ]);
    expect(r.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('pickLead keeps the lead unless a new one weighs clearly more', () => {
    const r = [story('new', 50), story('old', 45)];
    expect(pickLead(r, undefined)!.id).toBe('new');
    expect(pickLead(r, 'old')!.id).toBe('old');
    expect(pickLead([story('new', 60), story('old', 45)], 'old')!.id).toBe('new');
    expect(pickLead(r, 'gone')!.id).toBe('new');
  });

  it('frontPage: articles and set stories take turns in the columns', () => {
    const r = [story('lead', 90), story('m', 40), story('a1', 30, { kind: 'artikel', at: NOW - HOUR }), story('a2', 5, { kind: 'artikel', at: NOW }), story('low', 5)];
    const p = frontPage(r, 'lead');
    expect(p.lead!.id).toBe('lead');
    expect(p.columns.map((s) => s.id)).toEqual(['a2', 'm']);
    expect(frontPage(r, 'lead', 3).columns.map((s) => s.id)).toEqual(['a2', 'm', 'a1']);
  });

  it('briefs: trades first, then the rate and the calendar; stories on the page left out', () => {
    const [trade] = bigTrades([{ id: 't', securityIdentifier: 'STX', price: 2, numberOfShares: 5e8, volume: 1e9, date: NOW - MIN }], 0);
    const list = briefs({
      trades: [{ trade, name: 'Prime' }],
      events: [story('merger-2', 20, { kind: 'fusion', title: 'B geht in C auf', at: NOW + 2 * DAY }), story('merger-1', 20, { kind: 'fusion', title: 'A geht in C auf', at: NOW + HOUR })],
      rate: story('rate-1', 5, { kind: 'leitzins', title: `Leitzins bleibt bei 0,82${NB}%`, at: NOW - HOUR }),
      skip: new Set(['merger-2']),
      now: NOW,
    });
    expect(list.map((b) => b.id)).toEqual(['trade-t', 'rate-1', 'merger-1']);
    expect(list[1].stamp).toBe('heute');
    expect(list[0].text).toBe(`1${NB}Mrd.${NB}€ in einem Zug: 500.000.000 Prime zu 2,00${NB}€.`);
    expect(list[2]).toMatchObject({ stamp: 'heute', text: `A geht in C auf – 15:32${NB}Uhr.` });
  });

  it('breaking: new, recent and weighty', () => {
    const seen = new Set(['old']);
    expect(breaking([story('old', 90)], seen, NOW)).toBeUndefined();
    expect(breaking([story('late', 90, { at: NOW - HOUR })], seen, NOW)).toBeUndefined();
    expect(breaking([story('light', 10)], seen, NOW)).toBeUndefined();
    expect(breaking([story('light', 10, { kind: 'artikel' })], seen, NOW)!.id).toBe('light');
    expect(breaking([story('big', 30)], seen, NOW)!.id).toBe('big');
  });
});

describe('latestLetter', () => {
  it('the newest unread direct or group message, lobbies never', () => {
    const l = latestLetter([
      { id: 'lobby', publicChat: true, numOfUnreadMessages: 9, lastMessage: { dateSent: NOW, content: 'x', sender: { username: 'Z' } } },
      { id: 'd', numOfUnreadMessages: 1, lastMessage: { dateSent: NOW - HOUR, content: 'Hallo  du', sender: { username: 'Malte' } } },
      { id: 'g', groupChat: true, chatName: 'Bank', numOfUnreadMessages: 2, lastMessage: { dateSent: NOW - MIN, content: 'Tender!', sender: { username: 'Ana' } } },
      { id: 'read', numOfUnreadMessages: 0, lastMessage: { dateSent: NOW } },
    ])!;
    expect(l).toEqual({ chatId: 'g', from: 'Ana in Bank', text: 'Tender!', unread: 2 });
    expect(latestLetter([])).toBeUndefined();
  });
});

describe('real close', () => {
  const days = [
    { date: '2026-09-27T23:36:48Z', closePrice: 24.16 },
    { date: '2026-09-28T23:37:14Z', closePrice: 35.14 },
    { date: '2026-09-29T23:37:25Z', closePrice: 11.95 },
  ];

  it('lastClose: the newest close up to now', () => {
    expect(lastClose(days, NOW)).toEqual({ date: Date.parse('2026-09-29T23:37:25Z'), value: 11.95 });
    expect(lastClose(days, Date.parse('2026-09-29T12:00:00Z'))!.value).toBe(35.14);
    expect(lastClose([], NOW)).toBeUndefined();
  });

  it('rebase: the change against the real close, headline and figure agree', () => {
    const close = lastClose(days, NOW)!;
    const quotes = [q('STPMM', { name: 'Prime Market Making', price: 6.35, change: -65.99, volume: 16e9 }), q('STX', { change: 5 })];
    const r = rebase(quotes, new Map([['STPMM', close]]));
    expect(r[0].change).toBeCloseTo(-46.86, 1);
    expect(r[0].close).toBe(close);
    expect(r[1]).toBe(quotes[1]);
    const s = moveStory(r, undefined)!;
    expect(s.title).toBe(`Prime Market Making bricht um 47${NB}% ein`);
    expect(s.dek).toBe(`Kurs fällt vom letzten Schluss bei 11,95${NB}€ auf 6,35${NB}€ – kein umsatzstarker Wert bewegt sich stärker`);
    expect(s.chart).toMatchObject({ ref: 11.95, close });
    // without a close the server figure, named as such
    expect(moveStory(quotes, undefined)!.dek).toContain('zum Vortag');
  });

  it('moveCandidates: the strongest by the server figure', () => {
    expect(moveCandidates([q('A', { change: 50, volume: 1e9 }), q('B', { change: 1, volume: 1e9 }), q('C', { change: 10, volume: 1e9 })], 5)).toEqual(['A', 'C']);
  });

  it('sinceClose: the close, then each trade since once, oldest first', () => {
    const close = { date: NOW - HOUR, value: 11.95 };
    const line = sinceClose(
      close,
      [
        { id: '2', securityIdentifier: 'X', price: 7, date: NOW - 10 * MIN },
        { id: '1', securityIdentifier: 'X', price: 9, date: NOW - 30 * MIN },
        { id: '0', securityIdentifier: 'X', price: 12, date: NOW - 2 * HOUR },
      ],
      [
        { id: '2', securityIdentifier: 'X', price: 7, date: NOW - 10 * MIN },
        { id: '3', securityIdentifier: 'X', price: 6.35, date: NOW },
        { id: '4', securityIdentifier: 'Y', price: 1, date: NOW },
        { id: '5', securityIdentifier: 'X', price: 0.01, date: NOW },
        { id: '6', securityIdentifier: 'X', price: 0.5, date: NOW },
      ],
      'X',
    );
    expect(line.map((p) => p.value)).toEqual([11.95, 9, 7, 6.35]);
  });
});

describe('print text', () => {
  it('cleanText: markdown remains, security links, other URLs to their host', () => {
    expect(
      cleanText('Beispiel: **Optionsscheine** unter https://alpha-trader.nordquint.de/wertpapier/WARAUQ7ODE und https://alpha-trader.com/security/asin/STSN3G03LB. Mehr: https://www.example.org/a/b?c=1.'),
    ).toBe('Beispiel: Optionsscheine unter #WARAUQ7ODE und #STSN3G03LB. Mehr: example.org.');
    expect(cleanText('[hier](https://x.de/y) klicken')).toBe('hier klicken');
  });

  it('sentences and firstSentences', () => {
    const list = sentences('Eins. Zwei? Drei! Vier');
    expect(list).toEqual(['Eins.', 'Zwei?', 'Drei!', 'Vier']);
    expect(firstSentences(list, 2)).toBe(`Eins. Zwei?${NB}…`);
    expect(firstSentences(list, 4)).toBe('Eins. Zwei? Drei! Vier');
    expect(sentences('Unter alpha-trader.nordquint.de zu sehen. Ja')).toEqual(['Unter alpha-trader.nordquint.de zu sehen.', 'Ja']);
  });

  it('rebase: beyond +900 % / −90 % against the close is unknown', () => {
    const r = rebase([q('A', { price: 100 }), q('B', { price: 5 })], new Map([['A', { date: 0, value: 9 }], ['B', { date: 0, value: 60 }]]));
    expect(r[0].change).toBeUndefined();
    expect(r[1].change).toBeUndefined();
    expect(movers(r, 'up', new Set())).toEqual([]);
    expect(moveStory(r, undefined)).toBeUndefined();
  });

  it('moveStory leaves out an implausible bid', () => {
    const s = moveStory([q('A', { change: -40, volume: 1e9, price: 6.35, bid: 0.02, ask: 6.4 })], undefined)!;
    expect(s.lede).not.toContain('Geld');
  });
});
