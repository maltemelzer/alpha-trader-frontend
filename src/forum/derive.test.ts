import { sortBoards, toCategory, toThread } from './derive';
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
  });
});
