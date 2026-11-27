import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../services/api';

const empty = {
  allHabits: [],
  completions: {},
  status: 'loading',
  error: '',
  revision: 0,
};
const segment = encodeURIComponent;

/** One atomic habits/completions snapshot per authenticated account; no local record cache. */
export default function useAccountData(user, today) {
  const owner = user?.id || null;
  const timezone = user?.timezone;
  const [snapshot, setSnapshot] = useState({ ...empty, owner });
  const [pendingKeys, setPendingKeys] = useState(new Set());
  const [mutationError, setMutationError] = useState('');
  const scope = useRef({
    owner: null,
    generation: 0,
    request: 0,
    controller: null,
    locks: new Set(),
  });

  const load = useCallback(async () => {
    if (!owner || scope.current.owner !== owner) return false;
    const current = scope.current;
    const generation = current.generation;
    const request = ++current.request;
    current.controller?.abort();
    const controller = new AbortController();
    current.controller = controller;
    setSnapshot((prior) => ({
      ...prior,
      status: prior.status === 'success' ? 'success' : 'loading',
      error: '',
    }));
    try {
      const [allHabits, completions] = await Promise.all([
        api('/api/habits?include_archived=true', { signal: controller.signal }),
        api('/api/completions', { signal: controller.signal }),
      ]);
      if (
        controller.signal.aborted ||
        current !== scope.current ||
        generation !== current.generation ||
        request !== current.request
      )
        return false;
      if (
        !Array.isArray(allHabits) ||
        !completions ||
        Array.isArray(completions) ||
        typeof completions !== 'object'
      )
        throw new ApiError(
          'The backend returned an unexpected habit/completion response.',
          { kind: 'response' }
        );
      current.needsRefresh = false;
      setMutationError('');
      setSnapshot((prior) => ({
        owner,
        allHabits,
        completions,
        status: 'success',
        error: '',
        revision: prior.revision + 1,
      }));
      return true;
    } catch (error) {
      if (
        error.name === 'AbortError' ||
        current !== scope.current ||
        request !== current.request
      )
        return false;
      controller.abort();
      setSnapshot((prior) => ({
        ...prior,
        status: prior.status === 'success' ? 'success' : 'error',
        error: error.message,
      }));
      return false;
    }
  }, [owner]);

  useEffect(() => {
    const current = {
      owner,
      generation: scope.current.generation + 1,
      request: 0,
      controller: null,
      locks: new Set(),
    };
    scope.current.controller?.abort();
    scope.current = current;
    // Reset before account queries, including StrictMode's simulated remount.
    setSnapshot({ ...empty, owner });
    setMutationError('');
    setPendingKeys(new Set());
    return () => {
      current.generation += 1;
      current.controller?.abort();
    };
  }, [owner, load]);

  useEffect(() => {
    if (owner) void load();
  }, [owner, today, timezone, load]);

  const mutate = useCallback(
    async (key, action) => {
      const current = scope.current;
      if (!owner || current.owner !== owner)
        throw new ApiError('Not authenticated', { status: 401 });
      if (current.locks.has(key)) {
        if (key.startsWith('completion:')) return undefined;
        throw new ApiError(
          'This change is already being saved. Please wait for it to finish.'
        );
      }
      if (current.locks.size)
        throw new ApiError('Please wait for the current change to finish.');
      if (current.needsRefresh)
        throw new ApiError(
          'Reload account data before making another change. The previous change was saved.'
        );
      const generation = current.generation;
      current.locks.add(key);
      setPendingKeys(new Set(current.locks));
      setMutationError('');
      try {
        const result = await action();
        if (current !== scope.current || generation !== current.generation)
          throw new DOMException('Account changed', 'AbortError');
        current.needsRefresh = true;
        const refreshed = await load();
        if (
          !refreshed &&
          current === scope.current &&
          generation === current.generation
        ) {
          setMutationError(
            'The backend saved this change, but refreshed data could not be loaded. Retry loading before making another change.'
          );
          setSnapshot((prior) => ({ ...prior, revision: prior.revision + 1 }));
        }
        return result;
      } catch (error) {
        if (
          error.name !== 'AbortError' &&
          current === scope.current &&
          generation === current.generation
        ) {
          if (error.status === 404 || (key === 'demo' && error.status === 409))
            await load();
          if (current === scope.current && generation === current.generation)
            setMutationError(error.message);
        }
        throw error;
      } finally {
        current.locks.delete(key);
        if (current === scope.current && generation === current.generation)
          setPendingKeys(new Set(current.locks));
      }
    },
    [owner, load]
  );

  const createHabit = useCallback(
    (values) =>
      mutate('create', () =>
        api('/api/habits', { method: 'POST', body: values })
      ),
    [mutate]
  );
  const editHabit = useCallback(
    (id, values) =>
      mutate(`habit:${id}`, () =>
        api(`/api/habits/${segment(id)}`, { method: 'PATCH', body: values })
      ),
    [mutate]
  );
  const archiveHabit = useCallback(
    (id) =>
      mutate(`habit:${id}`, () =>
        api(`/api/habits/${segment(id)}`, { method: 'DELETE' })
      ),
    [mutate]
  );
  const restoreHabit = useCallback(
    (id) =>
      mutate(`habit:${id}`, () =>
        api(`/api/habits/${segment(id)}/restore`, { method: 'POST' })
      ),
    [mutate]
  );
  const deleteHabit = useCallback(
    (id) =>
      mutate(`habit:${id}`, () =>
        api(`/api/habits/${segment(id)}?permanent=true`, { method: 'DELETE' })
      ),
    [mutate]
  );
  const toggleCompletion = useCallback(
    (id, date) => {
      const done = (snapshot.completions[id] || []).includes(date);
      return mutate(`completion:${id}:${date}`, () =>
        api(`/api/habits/${segment(id)}/completions/${segment(date)}`, {
          method: done ? 'DELETE' : 'PUT',
        })
      );
    },
    [mutate, snapshot.completions]
  );
  const importHabits = useCallback(
    (habits) =>
      mutate('import', () =>
        api('/api/import', { method: 'POST', body: { habits } })
      ),
    [mutate]
  );
  const loadDemo = useCallback(
    () => mutate('demo', () => api('/api/demo-data', { method: 'POST' })),
    [mutate]
  );
  const removeDemo = useCallback(
    () => mutate('demo', () => api('/api/demo-data', { method: 'DELETE' })),
    [mutate]
  );
  const clearMutationError = useCallback(() => setMutationError(''), []);
  const visible = snapshot.owner === owner ? snapshot : { ...empty, owner };
  return {
    ...visible,
    habits: visible.allHabits.filter((habit) => habit.archived_at === null),
    pendingKeys,
    mutationError,
    clearMutationError,
    refresh: load,
    createHabit,
    editHabit,
    archiveHabit,
    restoreHabit,
    deleteHabit,
    toggleCompletion,
    importHabits,
    loadDemo,
    removeDemo,
  };
}
