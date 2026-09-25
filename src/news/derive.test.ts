import { myReaction, replyTitle, toPost } from './derive';

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
