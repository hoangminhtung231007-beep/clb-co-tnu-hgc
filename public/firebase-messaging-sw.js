// Firebase Messaging Service Worker for CLB Cờ TNU - HGC
// Handles background push notifications when the website is closed

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

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Listen for background push messages from FCM
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
  console.warn('Firebase Messaging SW init error:', e);
}

// Fallback listener for standard raw Web Push events
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const notif = data.notification || data;
  const title = notif.title || 'CLB Cờ TNU - HGC';
  const options = {
    body: notif.body || 'Bạn có thông báo mới từ Câu lạc bộ Cờ!',
    icon: notif.icon || '/logo.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.data?.url || notif.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click to bring app into focus or open target page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          if (client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
