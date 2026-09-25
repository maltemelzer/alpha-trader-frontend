import { boardFacets, boardNewsThread, membershipBoard, sortBoards, toCategory, toSearchRow, toThread } from './derive';
import { termPattern } from '../lib/highlight';
import type { BoardView } from '../api/queries';

const now = new Date(2026, 8, 24, 18, 0).getTime();

describe('toThread', () => {
  it('links the thread and picks tickers from title and text', () => {
    const t = toThread(
      { id: 'p', title: 'Was ist mit $STHANSEREE?', content: '<p>und $BOHANSE27X, $STHANSEREE</p>', numberOfComments: 4, author: { username: 'km' }, dateCreated: now - 60_000 },
      'b',
      now,
    );
    expect(t).toMatchObject({ href: '/forum/b/p', replies: 4, author: { name: 'km' }, tickers: ['STHANSEREE', 'BOHANSE27X'] });
  });
});

describe('toCategory', () => {
  it('turns the description into text and shows the latest post', () => {
    const c = toCategory({ id: 'b', name: 'Forum', description: '<p>Alles</p>', numberOfPosts: 3, latestPost: { id: 'x', title: 'Hallo', author: { username: 'km' }, dateCreated: now } }, now);
    expect(c).toMatchObject({ href: '/forum/b', description: 'Alles', posts: 3, last: { title: 'Hallo', author: 'km', time: '18:00' } });
  });
});

describe('sortBoards', () => {
  it('puts official boards first, drops sub-boards', () => {
    const b = (name: string, date: number, parent?: string): BoardView => ({
      id: name,
      name,
      parent: parent ? { id: parent, name: parent } : null,
      latestPost: { id: name, title: '', dateCreated: date },
    });
    expect(sortBoards([b('A', 5), b('Offizielles Forum', 1), b('Sub', 9, 'A'), b('B', 7)]).map((x) => x.name)).toEqual([
      'Offizielles Forum',
      'B',
      'A',
    ]);
    expect(sortBoards([b('A', 5), b('Sub', 9, 'A')], false).map((x) => x.name)).toEqual(['Sub', 'A']);
  });
});

describe('membershipBoard', () => {
  it('uses the root of a sub-board', () => {
    expect(membershipBoard({ id: 's', name: 'Sub', root: { id: 'r', name: 'Root' } }).id).toBe('r');
    expect(membershipBoard({ id: 'r', name: 'Root', root: null }).id).toBe('r');
  });
});

describe('boardNewsThread', () => {
  it('links into the post’s own board and names it', () => {
    const t = boardNewsThread(
      { id: 'p', title: 'Idee', author: { username: 'km' }, messageBoard: { id: 'b2', name: 'Vorschläge' }, dateCreated: now },
      now,
    );
    expect(t).toMatchObject({ href: '/forum/b2/p', author: { name: 'Vorschläge · km' } });
    expect(boardNewsThread({ id: 'p', title: 'x' }, now)).toMatchObject({ href: undefined, author: { name: '?' } });
  });
});

describe('toSearchRow', () => {
  const pattern = termPattern(['leitzins'], true);
  const board = { id: 'b1', name: 'Wissenswertes' };
  it('links a thread into its board with an excerpt', () => {
    const r = toSearchRow(
      { id: 'p', title: 'Zinstender', content: '<p>Täglich wird der <b>Leitzins</b> bestimmt.</p>', author: { username: 'km' }, messageBoard: board, numberOfComments: 3, dateCreated: now },
      pattern,
      now,
    );
    expect(r).toMatchObject({ href: '/forum/b1/p', answer: false, replies: 3, author: 'km', board, excerpt: 'Täglich wird der Leitzins bestimmt.' });
  });
  it('an answer opens its thread and loses the „Re:“', () => {
    const r = toSearchRow({ id: 'c', title: 'Re: Re: Zinstender', comment: true, root: 'p', parent: 'p', messageBoard: board }, pattern, now);
    expect(r).toMatchObject({ href: '/forum/b1/p', answer: true, title: 'Zinstender', replies: undefined, author: '?' });
  });
  it('no board → no link', () => {
    expect(toSearchRow({ id: 'x', title: 'x' }, null, now).href).toBeUndefined();
  });
});

describe('boardFacets', () => {
  it('counts hits per board, most first', () => {
    const a = { id: 'a', name: 'A' };
    const b = { id: 'b', name: 'B' };
    expect(boardFacets([{ board: b }, { board: a }, { board: b }, { board: undefined }])).toEqual([
      { id: 'b', name: 'B', count: 2 },
      { id: 'a', name: 'A', count: 1 },
    ]);
  });
});
