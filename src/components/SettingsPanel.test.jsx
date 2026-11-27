// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPanel from './SettingsPanel';
import DataExport from './DataExport';

vi.mock('../services/pushApi', () => ({
  getPushStatus: vi.fn().mockResolvedValue({ subscriptions: 0 }),
  enablePush: vi.fn().mockResolvedValue(undefined),
  sendPushTest: vi.fn().mockResolvedValue({ sent: 1 }),
}));

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
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('settings and account data safeguards', () => {
  it('explains AI predictions and lets the user change their preference', async () => {
    const onAiToggle = vi.fn();
    await act(async () =>
      root.render(
        <SettingsPanel
          habits={[habit]}
          completions={{ h1: [] }}
          aiEnabled
          onAiToggle={onAiToggle}
        />
      )
    );
    expect(container.textContent).not.toContain('Demo data');
    expect(container.textContent).toContain('use your saved habits and check-ins');
    expect(container.textContent).toContain('new predictions from being requested');
    const toggle = container.querySelector('#ai-preference');
    await act(async () => {
      toggle.click();
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onAiToggle).toHaveBeenCalled();
  });
  it('keeps account import, export, and clear controls out of settings', async () => {
    const onImport = vi.fn();
    const onClear = vi.fn();
    await act(async () =>
      root.render(
        <SettingsPanel
          token="test-token"
          habits={[habit]}
          completions={{ h1: ['2026-01-02'] }}
          aiEnabled={false}
          onAiToggle={vi.fn()}
          onImport={onImport}
          onClear={onClear}
        />
      )
    );

    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.textContent).not.toMatch(/import|export|clear all data/i);
    expect(container.textContent).toContain('Browser notifications');
    expect(onImport).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });
  it('confirms before clearing account data', async () => {
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
    await click('Import habits');
    expect(onImport).toHaveBeenCalledWith([habit], { h1: ['2026-01-02'] });
  });
});
