function apiBaseUrl() {
  const configured = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  )
    .trim()
    .replace(/\/+$/, '');
  try {
    const url = new URL(configured);
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
      ? configured
      : '';
  } catch {
    return '';
  }
}

async function request(token, path, { method = 'GET', body, signal } = {}) {
  const baseUrl = apiBaseUrl();
  if (!baseUrl)
    throw new Error('Set VITE_API_BASE_URL to your backend URL and restart Vite.');

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Could not reach the backend. Check that it is running.');
  }

  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The backend returned an invalid response.');
  }
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((issue) => issue.msg).join(', ')
      : data.detail;
    throw new Error(detail || `Request failed (HTTP ${response.status}).`);
  }
  return data;
}

export function toFrontendHabit(habit) {
  return {
    id: habit.id,
    name: habit.name,
    description: habit.description || '',
    createdAt: `${habit.created_on}T00:00:00`,
    scheduledDays:
      Array.isArray(habit.scheduled_days) && habit.scheduled_days.length
        ? habit.scheduled_days
        : [0, 1, 2, 3, 4, 5, 6],
    reminder_time: habit.reminder_time || null,
  };
}

export async function loadAccountData(token) {
  const [habits, completions] = await Promise.all([
    request(token, '/api/habits'),
    request(token, '/api/completions'),
  ]);
  return {
    habits: habits.map(toFrontendHabit),
    completions: Object.fromEntries(
      Object.entries(completions).map(([id, dates]) => [
        id,
        dates.map((day) => (typeof day === 'string' ? day : day.date)),
      ])
    ),
  };
}

export async function createHabit(token, habit) {
  const result = await request(token, '/api/habits', {
    method: 'POST',
    body: {
      name: habit.name,
      description: habit.description || '',
      scheduled_days: habit.scheduledDays,
      reminder_time: habit.reminder_time || null,
    },
  });
  return toFrontendHabit(result);
}

export async function updateHabit(token, id, updates) {
  const result = await request(token, `/api/habits/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: {
      name: updates.name,
      description: updates.description,
      scheduled_days: updates.scheduledDays,
      reminder_time: updates.reminder_time || null,
    },
  });
  return toFrontendHabit(result);
}

export function deleteHabit(token, id) {
  return request(
    token,
    `/api/habits/${encodeURIComponent(id)}?permanent=true`,
    { method: 'DELETE' }
  );
}

export function setCheckIn(token, id, day, completed) {
  return request(
    token,
    `/api/habits/${encodeURIComponent(id)}/completions/${encodeURIComponent(day)}`,
    { method: completed ? 'PUT' : 'DELETE' }
  );
}

export function updateAiPreference(token, enabled) {
  return request(token, '/api/auth/me', {
    method: 'PATCH',
    body: { ai_enabled: enabled },
  });
}

export function importHabits(token, habits, completions) {
  return request(token, '/api/import', {
    method: 'POST',
    body: {
      habits: habits.map((habit) => ({
        name: habit.name,
        description: habit.description || '',
        created_on: (habit.createdAt || habit.created_on).slice(0, 10),
        scheduled_days: habit.scheduledDays || [0, 1, 2, 3, 4, 5, 6],
        completed_dates: completions[habit.id] || [],
      })),
    },
  });
}

export async function clearAccountData(token) {
  const allHabits = await request(token, '/api/habits?include_archived=true');
  await Promise.all(allHabits.map((habit) => deleteHabit(token, habit.id)));
}

export async function getRisk(token, signal) {
  return request(token, '/api/risk', { signal });
}
