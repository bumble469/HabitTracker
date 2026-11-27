// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePredictions from './usePredictions';

let container;
let root;
let snapshot;
const habits = [{ id: 'h1', name: 'Walk' }];
const risk = [
  {
    habit_id: 'h1',
    risk: 0.72,
    level: 'high',
    reasons: ['Low completion over the last 7 days'],
  },
  {
    habit_id: 'h2',
    risk: null,
    level: 'not_enough_data',
    reasons: [],
  },
];

function Harness(props) {
  snapshot = usePredictions(props);
  return null;
}

async function render(props) {
  await act(async () => root.render(<Harness {...props} />));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => risk,
    })
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('backend risk hook', () => {
  it('loads risk for account habits from the authenticated backend', async () => {
    await render({
      token: 'test-token',
      habits,
      enabled: true,
      active: true,
      revision: 0,
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/risk',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer test-token' },
      })
    );
    expect(snapshot.results.h1).toMatchObject({
      probability: 0.72,
      level: 'high',
      reason: 'Low completion over the last 7 days',
    });
    expect(snapshot.loading).toBe(false);
  });

  it('does not request risk when AI is off or no account token exists', async () => {
    await render({ token: 'test-token', habits, enabled: false });
    expect(fetch).not.toHaveBeenCalled();
    await render({ token: null, habits, enabled: true });
    expect(fetch).not.toHaveBeenCalled();
  });
});
