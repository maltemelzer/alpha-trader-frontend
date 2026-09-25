import { isChatShortcut, sidebarDocks } from './sidebarState';
import { shiftQuery } from '../lib/useMediaQuery';

describe('shiftQuery', () => {
  it('moves width thresholds by the docked panel, leaves the rest', () => {
    expect(shiftQuery('(min-width: 1100px)', 340)).toBe('(min-width: 1440px)');
    expect(shiftQuery('(max-width: 719.98px)', 340)).toBe('(max-width: 1059.98px)');
    expect(shiftQuery('(min-width:720px) and (max-width: 1099px)', 340)).toBe('(min-width: 1060px) and (max-width: 1439px)');
    expect(shiftQuery('(prefers-reduced-motion: reduce)', 340)).toBe('(prefers-reduced-motion: reduce)');
    expect(shiftQuery('(min-width: 1100px)', 0)).toBe('(min-width: 1100px)');
  });
});

describe('sidebarDocks', () => {
  it('docks on wide screens, never on the chat page', () => {
    expect(sidebarDocks('/markt', true)).toBe(true);
    expect(sidebarDocks('/markt', false)).toBe(false);
    expect(sidebarDocks('/nachrichten', true)).toBe(false);
    expect(sidebarDocks('/nachrichten/abc', true)).toBe(false);
    expect(sidebarDocks('/nachrichtenarchiv', true)).toBe(true);
  });
});

describe('isChatShortcut', () => {
  const key = (k: string, target: Element | null = document.body, mods: Partial<KeyboardEvent> = {}) =>
    isChatShortcut({ key: k, altKey: false, ctrlKey: false, metaKey: false, target, ...mods } as KeyboardEvent);

  it('is „C“ without modifiers, outside of fields and dialogs', () => {
    expect(key('c')).toBe(true);
    expect(key('C')).toBe(true);
    expect(key('x')).toBe(false);
    expect(key('c', document.body, { metaKey: true })).toBe(false);
    expect(key('c', document.createElement('input'))).toBe(false);
    expect(key('c', document.createElement('textarea'))).toBe(false);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    expect(key('c', button)).toBe(false);
  });
});
