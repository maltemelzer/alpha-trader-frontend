import { describe, expect, it } from 'vitest';
import type { MessageView, UsernameView } from '../api/types';
import { blockedNames, isBlockedMessage, sortedBlocks, withoutBlocked } from './blocks';

const u = (username: string) => ({ username }) as UsernameView;
const msg = (id: string, sender: string) => ({ id, sender: u(sender), content: 'x', dateSent: 1 }) as MessageView;

describe('blocked players', () => {
  it('collects names', () => {
    expect([...blockedNames([u('troll'), u(''), u('spam')])]).toEqual(['troll', 'spam']);
    expect(blockedNames(undefined).size).toBe(0);
  });

  it('hides messages of blocked players, never my own', () => {
    const blocked = blockedNames([u('troll'), u('me')]);
    expect(isBlockedMessage(msg('1', 'troll'), blocked, 'me')).toBe(true);
    expect(isBlockedMessage(msg('2', 'anna'), blocked, 'me')).toBe(false);
    expect(isBlockedMessage(msg('3', 'me'), blocked, 'me')).toBe(false);
    expect(isBlockedMessage({ sender: undefined }, blocked, 'me')).toBe(false);
  });

  it('filters a list and keeps the array when nothing is hidden', () => {
    const list = [msg('1', 'anna'), msg('2', 'troll'), msg('3', 'bob')];
    expect(withoutBlocked(list, blockedNames([u('troll')])).map((m) => m.id)).toEqual(['1', '3']);
    expect(withoutBlocked(list, blockedNames([u('nobody')]))).toBe(list);
    expect(withoutBlocked(list, new Set())).toBe(list);
  });

  it('sorts by name', () => {
    expect(sortedBlocks([u('Zora'), u('anna'), u('Ömer')]).map((b) => b.username)).toEqual(['anna', 'Ömer', 'Zora']);
  });
});
