// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useLocalStorage from './useLocalStorage';

let root;
let container;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function Harness({ initial = [] }) {
  const [value, update, error] = useLocalStorage('test-habits', initial);
  return (
    <>
      <button
        onClick={() => {
          update((current) => [...current, 'first']);
          update((current) => [...current, 'second']);
        }}
      >
        Queue updates
      </button>
      <output>{JSON.stringify(value)}</output>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('localStorage state and persistence', () => {
  it('preserves both consecutive functional updates within one event', async () => {
    await act(async () => root.render(<Harness />));
    await act(async () => container.querySelector('button').click());
    expect(container.querySelector('output').textContent).toBe(
      '["first","second"]'
    );
    expect(JSON.parse(localStorage.getItem('test-habits'))).toEqual([
      'first',
      'second',
    ]);
  });
  it('keeps the current session usable and exposes a backup warning after quota failure', async () => {
    await act(async () => root.render(<Harness />));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    await act(async () => container.querySelector('button').click());
    expect(container.querySelector('output').textContent).toBe(
      '["first","second"]'
    );
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      'Export a backup before closing this tab'
    );
  });
  it.each(['not json', '{}', 'false'])(
    'falls back safely for invalid persisted habit list %s',
    async (value) => {
      localStorage.setItem('test-habits', value);
      await act(async () => root.render(<Harness />));
      expect(container.querySelector('output').textContent).toBe('[]');
    }
  );
});
