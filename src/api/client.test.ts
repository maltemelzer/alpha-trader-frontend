import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToken, LOGOUT_EVENT, REMEMBER_MS, requestTokenFromOtherTabs, setToken } from './client';

afterEach(() => {
  setToken(null);
  vi.useRealTimers();
});

describe('token storage', () => {
  it('keeps the token only for this tab by default', () => {
    setToken('abc');
    expect(sessionStorage.getItem('at.token')).toBe('abc');
    expect(localStorage.getItem('at.remember')).toBeNull();
    expect(getToken()).toBe('abc');
  });

  it('remembers the token across browser restarts when asked', () => {
    setToken('abc', true);
    sessionStorage.clear(); // new session
    expect(getToken()).toBe('abc');
  });

  it('forgets a remembered token after 30 days', () => {
    vi.useFakeTimers();
    setToken('abc', true);
    sessionStorage.clear();
    vi.advanceTimersByTime(REMEMBER_MS + 1);
    expect(getToken()).toBeNull();
    expect(localStorage.getItem('at.remember')).toBeNull();
  });

  it('logging out clears both stores', () => {
    setToken('abc', true);
    setToken(null);
    expect(sessionStorage.getItem('at.token')).toBeNull();
    expect(localStorage.getItem('at.remember')).toBeNull();
    expect(getToken()).toBeNull();
  });
});

describe('sharing the login between tabs', () => {
  it('takes the token from another open tab', async () => {
    const other = new BroadcastChannel('at.auth');
    other.onmessage = (e) => {
      if (e.data.type === 'ask') other.postMessage({ type: 'token', token: 'from-other-tab' });
    };
    await expect(requestTokenFromOtherTabs()).resolves.toBe('from-other-tab');
    expect(getToken()).toBe('from-other-tab');
    other.close();
  });

  it('gives up when no other tab answers', async () => {
    await expect(requestTokenFromOtherTabs(20)).resolves.toBeNull();
  });

  it('answers another tab and logs out when it does', async () => {
    setToken('mine');
    const other = new BroadcastChannel('at.auth');
    const answer = new Promise((resolve) => (other.onmessage = (e) => resolve(e.data)));
    other.postMessage({ type: 'ask' });
    await expect(answer).resolves.toEqual({ type: 'token', token: 'mine' });

    const loggedOut = new Promise((resolve) => window.addEventListener(LOGOUT_EVENT, resolve, { once: true }));
    other.postMessage({ type: 'logout' });
    await loggedOut;
    expect(getToken()).toBeNull();
    other.close();
  });
});
