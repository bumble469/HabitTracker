// Opt-in: run only against a disposable backend/database, never a personal account.
import { env } from 'node:process';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { api, setSessionToken } from './api';
import { accountDateKey, addDays } from '../utils/insights';

const live = env.HABIT_LIVE_API_URL;
const suite = live ? describe : describe.skip;
suite('live FastAPI 0.3.0 integration (disposable database)', () => {
  let session, habit, conversationId, today;
  const password = 'integration-check-password';
  const email = `frontend-${crypto.randomUUID()}@example.test`;
  beforeAll(async () => {
    vi.stubEnv('VITE_API_BASE_URL', live);
    const openapi = await api('/openapi.json', { auth: false });
    expect(openapi.info.version).toBe('0.3.0');
    for (const [path, method] of [
      ['/api/risk', 'get'],
      ['/api/risk', 'post'],
      ['/api/auth/me', 'patch'],
      ['/api/habits/{habit_id}/restore', 'post'],
      ['/api/coach/chat', 'post'],
      ['/api/import', 'post'],
    ])
      expect(openapi.paths[path][method]).toBeTruthy();
    expect(
      Object.keys(openapi.components.schemas.HabitOut.properties).sort()
    ).toEqual(
      [
        'id',
        'name',
        'description',
        'created_on',
        'archived_at',
        'is_demo',
      ].sort()
    );
    expect(
      Object.keys(openapi.components.schemas.RiskOut.properties).sort()
    ).toEqual(['habit_id', 'as_of', 'risk', 'level', 'reasons'].sort());
    session = await api('/api/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        email,
        password,
        display_name: 'Integration Test',
        timezone: 'Asia/Kolkata',
      },
    });
    expect(session.user.id).toEqual(expect.any(String));
    setSessionToken(session.access_token);
    today = accountDateKey('Asia/Kolkata');
  });
  afterAll(() => {
    setSessionToken(null);
    vi.unstubAllEnvs();
  });

  it('verifies auth, profile settings and readable credential/validation errors', async () => {
    expect((await api('/health', { auth: false })).status).toBe('ok');
    expect(await api('/api/auth/me')).toEqual(session.user);
    await expect(
      api('/api/auth/register', {
        auth: false,
        method: 'POST',
        body: { email, password },
      })
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      api('/api/auth/login', {
        auth: false,
        method: 'POST',
        body: { email, password: 'wrong' },
      })
    ).rejects.toMatchObject({
      status: 401,
      message: 'Incorrect email or password',
    });
    await expect(
      api('/api/auth/register', {
        auth: false,
        method: 'POST',
        body: { email: 'invalid', password: 'short' },
      })
    ).rejects.toMatchObject({
      status: 422,
      fields: expect.objectContaining({
        email: expect.any(String),
        password: expect.any(String),
      }),
    });
    const login = await api('/api/auth/login', {
      auth: false,
      method: 'POST',
      body: { email, password },
    });
    expect(login.user.id).toBe(session.user.id);
    expect(
      (
        await api('/api/auth/me', {
          method: 'PATCH',
          body: { display_name: 'Updated', timezone: 'America/Los_Angeles' },
        })
      ).timezone
    ).toBe('America/Los_Angeles');
    await api('/api/auth/me', {
      method: 'PATCH',
      body: { timezone: 'Asia/Kolkata' },
    });
  });

  it('checks real CRUD, separate completion shapes, inclusive history, archive and restore retention', async () => {
    expect(await api('/api/habits')).toEqual([]);
    expect(await api('/api/completions')).toEqual({});
    habit = await api('/api/habits', {
      method: 'POST',
      body: {
        name: 'Read integration',
        description: 'Keep history',
        created_on: addDays(today, -45),
      },
    });
    expect(habit).toMatchObject({ archived_at: null, is_demo: false });
    expect(habit).not.toHaveProperty('completed_dates');
    expect(
      (
        await api(`/api/habits/${habit.id}`, {
          method: 'PATCH',
          body: { description: '' },
        })
      ).description
    ).toBe('');
    for (const method of ['PUT', 'PUT'])
      expect(
        await api(`/api/habits/${habit.id}/completions/${today}`, { method })
      ).toBeUndefined();
    expect(await api(`/api/habits/${habit.id}/completions`)).toEqual([today]);
    expect(await api(`/api/completions?start=${today}&end=${today}`)).toEqual({
      [habit.id]: [today],
    });
    for (const method of ['DELETE', 'DELETE'])
      expect(
        await api(`/api/habits/${habit.id}/completions/${today}`, { method })
      ).toBeUndefined();
    expect(await api(`/api/habits/${habit.id}/completions`)).toEqual([]);
    await api(`/api/habits/${habit.id}/completions/${addDays(today, -1)}`, {
      method: 'PUT',
    });
    await expect(
      api(`/api/habits/${habit.id}/completions/${addDays(today, 2)}`, {
        method: 'PUT',
      })
    ).rejects.toMatchObject({ status: 422 });
    expect(
      await api(`/api/habits/${habit.id}`, { method: 'DELETE' })
    ).toBeUndefined();
    expect(await api('/api/habits')).toEqual([]);
    expect(await api('/api/completions')).toEqual({});
    expect(
      (await api('/api/habits?include_archived=true'))[0].archived_at
    ).not.toBeNull();
    await expect(
      api(`/api/habits/${habit.id}/completions`)
    ).rejects.toMatchObject({ status: 404 });
    await api(`/api/habits/${habit.id}/restore`, { method: 'POST' });
    expect(await api(`/api/habits/${habit.id}/completions`)).toEqual([
      addDays(today, -1),
    ]);
  });

  it('uses server model scores/as_of and saved placeholder conversations, respecting AI-off access', async () => {
    await api('/api/auth/me', { method: 'PATCH', body: { ai_enabled: true } });
    const risks = await api('/api/risk');
    expect(risks).toEqual([
      expect.objectContaining({
        habit_id: habit.id,
        as_of: addDays(today, -1),
        risk: expect.any(Number),
        level: expect.stringMatching(/low|medium|high/),
        reasons: expect.any(Array),
      }),
    ]);
    const history = await api(`/api/habits/${habit.id}/risk/history`);
    expect(history).toHaveLength(1);
    expect(history[0].as_of).toBe(addDays(today, -1));
    await api(`/api/habits/${habit.id}`, { method: 'DELETE' });
    expect(await api(`/api/habits/${habit.id}/risk/history`)).toHaveLength(1);
    await api(`/api/habits/${habit.id}/restore`, { method: 'POST' });
    const first = await api('/api/coach/chat', {
      method: 'POST',
      body: { message: 'How can I keep reading?' },
    });
    expect(first.mode).toBe('placeholder');
    expect(first.message.role).toBe('assistant');
    conversationId = first.conversation_id;
    expect(
      (await api(`/api/coach/conversations/${conversationId}`)).messages.map(
        (m) => m.role
      )
    ).toEqual(['user', 'assistant']);
    await api('/api/coach/chat', {
      method: 'POST',
      body: {
        conversation_id: conversationId,
        message: 'What about tomorrow?',
      },
    });
    expect(
      (await api(`/api/coach/conversations/${conversationId}`)).messages
    ).toHaveLength(4);
    await api('/api/auth/me', { method: 'PATCH', body: { ai_enabled: false } });
    for (const path of ['/api/risk', `/api/habits/${habit.id}/risk/history`])
      await expect(api(path)).rejects.toMatchObject({ status: 403 });
    await expect(
      api('/api/coach/chat', { method: 'POST', body: { message: 'AI off' } })
    ).rejects.toMatchObject({ status: 403 });
    expect(await api('/api/coach/conversations')).toHaveLength(1);
    expect(
      (await api(`/api/coach/conversations/${conversationId}`)).messages
    ).toHaveLength(4);
    expect(
      await api(`/api/coach/conversations/${conversationId}`, {
        method: 'DELETE',
      })
    ).toBeUndefined();
    expect(await api('/api/coach/conversations')).toEqual([]);
  });

  it('loads variable demo data, checks archived duplicate protection and exact export/import exclusions', async () => {
    const result = await api('/api/demo-data', { method: 'POST' });
    expect(result.habits_created).toBe(4);
    expect(result.completions_created).toBeGreaterThan(0);
    const demos = (await api('/api/habits')).filter((h) => h.is_demo);
    expect(demos).toHaveLength(4);
    for (const demo of demos)
      await api(`/api/habits/${demo.id}`, { method: 'DELETE' });
    await expect(
      api('/api/demo-data', { method: 'POST' })
    ).rejects.toMatchObject({ status: 409 });
    const exported = await api('/api/export');
    expect(exported.version).toBe(1);
    expect(exported.habits).toHaveLength(1);
    expect(Object.keys(exported.habits[0]).sort()).toEqual(
      ['name', 'description', 'created_on', 'completed_dates'].sort()
    );
    const dates = [addDays(today, -1), addDays(today, -1), addDays(today, 5)];
    expect(
      await api('/api/import', {
        method: 'POST',
        body: { habits: [{ ...exported.habits[0], completed_dates: dates }] },
      })
    ).toEqual({ habits_created: 1, completions_created: 1 });
    const imported = (await api('/api/habits')).find((h) => h.id !== habit.id);
    expect(imported.name).toBe(habit.name);
    expect(imported.id).not.toBe(habit.id);
    expect(imported.is_demo).toBe(false);
    expect(await api('/api/demo-data', { method: 'DELETE' })).toEqual({
      habits_removed: 4,
    });
    expect(await api('/api/habits')).toHaveLength(2);
    await api(`/api/habits/${imported.id}?permanent=true`, {
      method: 'DELETE',
    });
  });

  it('enforces account isolation and permanent deletion with empty 204 responses', async () => {
    const other = await api('/api/auth/register', {
      auth: false,
      method: 'POST',
      body: { email: `other-${crypto.randomUUID()}@example.test`, password },
    });
    setSessionToken(other.access_token);
    expect(await api('/api/habits')).toEqual([]);
    await expect(api(`/api/habits/${habit.id}`)).rejects.toMatchObject({
      status: 404,
    });
    setSessionToken(session.access_token);
    expect(
      await api(`/api/habits/${habit.id}?permanent=true`, { method: 'DELETE' })
    ).toBeUndefined();
    expect(await api('/api/habits?include_archived=true')).toEqual([]);
    await expect(
      api('/api/auth/me', { token: 'invalid-token' })
    ).rejects.toMatchObject({ status: 401 });
  });
});
