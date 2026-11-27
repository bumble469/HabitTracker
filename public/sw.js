self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    // Use the default notification if the payload isn't JSON.
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Habit Tracker', {
      body: data.body || '',
      icon: new URL('habit-mark.svg', self.registration.scope).href,
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const scope = new URL(self.registration.scope);
    const target = new URL(event.notification.data?.url || '.', scope);
    if (target.pathname === '/') target.pathname = scope.pathname;
    await self.clients.openWindow(target.href);
  })());
});