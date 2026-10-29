/**
 * Service Worker SIGAPEI - Notifications Push & Mise en Cache Hors-Ligne
 */

const SW_VERSION = 'sigapei-sw-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Réception d'un message Push réseau
self.addEventListener('push', (event) => {
  let data = {
    titre: 'Notification SIGAPEI',
    message: 'Une nouvelle mise à jour est disponible.',
    lien: '/',
    tag: 'sigapei-push',
  }

  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data.message = event.data.text()
    }
  }

  const options = {
    body: data.message || data.body || '',
    icon: '/sigapei.png',
    badge: '/sigapei.png',
    tag: data.tag || 'sigapei-notification',
    renotify: true,
    data: {
      lien: data.lien || data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Consulter' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.titre || data.title || 'SIGAPEI', options)
  )
})

// Clic sur une notification push
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const targetUrl = event.notification.data?.lien || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si une fenêtre est déjà ouverte, lui donner le focus et naviguer
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
