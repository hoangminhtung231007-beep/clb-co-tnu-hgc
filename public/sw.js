// Service Worker for CLB Cờ TNU - HGC Progressive Web App & Firebase Web Push
const CACHE_NAME = 'tnu-hgc-pwa-v26';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Import Firebase compat scripts for background messaging
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  const firebaseConfig = {
    apiKey: "AIzaSyAWKPB-yeRbgMTzkvkWDwXtgZh0f9hs04A",
    authDomain: "tnu-hgc-chess-club.firebaseapp.com",
    projectId: "tnu-hgc-chess-club",
    storageBucket: "tnu-hgc-chess-club.firebasestorage.app",
    messagingSenderId: "954597639043",
    appId: "1:954597639043:web:d8f4a52a6d9f7c7b3e2cb6",
    measurementId: "G-WL7L9NZTNG"
  };

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = notif.title || data.title || 'CLB Cờ TNU - HGC';
    const body = notif.body || data.body || 'Bạn có thông báo mới từ Câu lạc bộ Cờ!';
    const targetUrl = data.url || notif.click_action || '/';

    const notificationOptions = {
      body: body,
      icon: notif.icon || data.icon || '/logo.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'tnu_hgc_push',
      renotify: true,
      data: {
        url: targetUrl
      }
    };

    return self.registration.showNotification(title, notificationOptions);
  });
} catch (e) {
  // Offline or unable to load external scripts
}

// Handle incoming Web Push notifications (fallback & raw push)
self.addEventListener('push', (event) => {
  let data = {
    title: 'CLB Cờ TNU - HGC',
    body: 'Bạn có thông báo mới từ Câu lạc bộ Cờ!',
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notif = data.notification || data;
  const title = notif.title || data.title || 'CLB Cờ TNU - HGC';
  const options = {
    body: notif.body || data.body || 'Bạn có thông báo mới từ Câu lạc bộ Cờ!',
    icon: notif.icon || '/logo.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    tag: 'tnu_hgc_push',
    renotify: true,
    data: {
      url: data.data?.url || notif.url || data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicking on a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
