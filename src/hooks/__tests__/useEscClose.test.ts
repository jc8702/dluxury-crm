import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEscClose } from '../useEscClose';

describe('useEscClose', () => {
  it('não faz nada se enabled for false', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useEscClose(callback, false));

    // Dispara evento
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(callback).not.toHaveBeenCalled();
    unmount();
  });

  it('chama callback quando ESC é pressionado e enabled é true', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useEscClose(callback, true));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(callback).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('não chama callback para outras teclas', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useEscClose(callback, true));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(callback).not.toHaveBeenCalled();
    unmount();
  });
});