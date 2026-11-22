// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPanel from './SettingsPanel';
import DataExport from './DataExport';

let container;
let root;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const habit = { id: 'h1', name: 'Read', createdAt: '2026-01-01T09:00:00' };
const button = (name) =>
  [...container.querySelectorAll('button')].find(
    (element) => element.textContent.trim() === name
  );
const click = async (name) => act(async () => button(name).click());

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  window.localStorage.setItem('aiEnabled', 'true');
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('settings replacement safeguards', () => {
  it('requires confirmation before replacing existing data and preserves the persisted AI preference', async () => {
    const onLoadDemo = vi.fn();
    await act(async () =>
      root.render(
        <SettingsPanel
          habits={[habit]}
          completions={{ h1: [] }}
          aiEnabled
          onAiToggle={vi.fn()}
          onLoadDemo={onLoadDemo}
        />
      )
    );
    await click('Load demo data');
    expect(onLoadDemo).not.toHaveBeenCalled();
    expect(container.querySelector('dialog').open).toBe(true);
    await click('Cancel');
    expect(onLoadDemo).not.toHaveBeenCalled();
    await click('Load demo data');
    await click('Replace with demo data');
    expect(onLoadDemo).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem('aiEnabled')).toBe('true');
    expect(container.textContent).toContain('Synthetic demo data loaded');
  });
  it('loads a demo without a destructive prompt when there is no current data', async () => {
    const onLoadDemo = vi.fn();
    await act(async () =>
      root.render(
        <SettingsPanel
          habits={[]}
          completions={{}}
          aiEnabled={false}
          onAiToggle={vi.fn()}
          onLoadDemo={onLoadDemo}
        />
      )
    );
    await click('Load demo data');
    expect(onLoadDemo).toHaveBeenCalledOnce();
  });
  it('confirms before clearing and leaves AI preference intact', async () => {
    const onClear = vi.fn();
    await act(async () =>
      root.render(
        <DataExport
          habits={[habit]}
          completions={{ h1: [] }}
          onImport={vi.fn()}
          onClear={onClear}
        />
      )
    );
    await click('Clear all data');
    expect(onClear).not.toHaveBeenCalled();
    const confirm = [...container.querySelectorAll('dialog button')].find(
      (element) => element.textContent === 'Clear all data'
    );
    await act(async () => confirm.click());
    expect(onClear).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem('aiEnabled')).toBe('true');
  });
  it('validates a file and waits for confirmation before invoking import', async () => {
    const onImport = vi.fn();
    await act(async () =>
      root.render(
        <DataExport
          habits={[habit]}
          completions={{ h1: [] }}
          onImport={onImport}
          onClear={vi.fn()}
        />
      )
    );
    const input = container.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', {
      value: [
        new File(
          [
            JSON.stringify({
              habits: [habit],
              completions: { h1: ['2026-01-02'] },
            }),
          ],
          'backup.json',
          { type: 'application/json' }
        ),
      ],
    });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(onImport).not.toHaveBeenCalled();
    await click('Replace and import');
    expect(onImport).toHaveBeenCalledWith([habit], { h1: ['2026-01-02'] });
    expect(window.localStorage.getItem('aiEnabled')).toBe('true');
  });
});
