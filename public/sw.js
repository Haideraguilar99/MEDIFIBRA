self.addEventListener('push', e => {
  const d = e.data?.json() ?? {}
  e.waitUntil(self.registration.showNotification(d.title ?? 'Medifibra', { body: d.body ?? '', icon: '/logo.png' }))
})
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow('/dashboard')) })
