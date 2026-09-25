import { followState, interestParts, myReaction, newsFilter, newsHref, replyTitle, toPost, type NewsFilter } from './derive';

describe('newsFilter / newsHref', () => {
  const f = (q: string) => newsFilter(new URLSearchParams(q));
  it('reads the filter from the URL, author first', () => {
    expect(f('')).toEqual({ kind: 'all' });
    expect(f('autor=Talis&tag=x')).toEqual({ kind: 'author', username: 'Talis' });
    expect(f('tag=%23Börse')).toEqual({ kind: 'hashtag', tag: 'Börse' });
    expect(f('unternehmen=STSN3G03LB')).toEqual({ kind: 'company', asin: 'STSN3G03LB' });
  });
  it('round-trips links', () => {
    const all: NewsFilter[] = [
      { kind: 'author', username: 'A B' },
      { kind: 'hashtag', tag: 'Zins' },
      { kind: 'company', asin: 'X1' },
      { kind: 'all' },
    ];
    for (const x of all) expect(newsFilter(new URL(newsHref(x), 'http://x').searchParams)).toEqual(x);
  });
});

describe('followState', () => {
  it('maps the interest sign', () => {
    expect(followState(undefined)).toBe('none');
    expect(followState(0)).toBe('none');
    expect(followState(10)).toBe('follow');
    expect(followState(-10)).toBe('ignore');
  });
});

describe('interestParts', () => {
  it('keeps non-zero parts, largest first, with the server sum', () => {
    const r = interestParts({
      authorInterest: { interest: 0 },
      commonPopularity: { interest: 1 },
      companyInterest: { interest: -3 },
      hashTagInterests: [],
      interestSum: { interest: -2 },
    });
    expect(r).toEqual({
      parts: [
        { label: 'Unternehmen', value: -3 },
        { label: 'Beliebtheit', value: 1 },
      ],
      sum: -2,
    });
    expect(interestParts(undefined)).toEqual({ parts: [], sum: 0 });
  });
});

describe('toPost', () => {
  it('turns HTML content into text and drops nulls', () => {
    const p = toPost({ id: '1', title: 'T', content: '<p>Hallo<br />Welt</p>', locale: null, listing: null, dateEdited: null });
    expect(p).toMatchObject({ id: '1', title: 'T', content: 'Hallo\nWelt', locale: undefined, listing: undefined });
  });
});

describe('myReaction', () => {
  it('finds the own like', () => {
    expect(myReaction([{ type: 'LIKE', user: {} }, { type: 'DISLIKE', user: { myUser: true } }])).toBe('DISLIKE');
    expect(myReaction(undefined)).toBeNull();
  });
});

describe('replyTitle', () => {
  it('prefixes once', () => {
    expect(replyTitle('Danke')).toBe('Re: Danke');
    expect(replyTitle('Re: Danke')).toBe('Re: Danke');
  });
});
