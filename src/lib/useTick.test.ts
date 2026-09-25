import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTick } from './useTick';

describe('useTick', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the direction of a change for a moment', () => {
    const { result, rerender } = renderHook(({ v }) => useTick(v, 1000), { initialProps: { v: 10 as number | undefined } });
    expect(result.current).toBeNull();
    rerender({ v: 12 });
    expect(result.current).toBe('up');
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current).toBeNull();
    rerender({ v: 11 });
    expect(result.current).toBe('down');
  });

  it('ignores unknown values', () => {
    const { result, rerender } = renderHook(({ v }) => useTick(v), { initialProps: { v: undefined as number | undefined } });
    rerender({ v: 5 });
    expect(result.current).toBeNull();
  });
});
