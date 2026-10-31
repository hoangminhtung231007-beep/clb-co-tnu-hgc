// Firebase Cloud Messaging (FCM) & Web Push Notification Service
// CLB Cờ TNU - HGC

import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, deleteToken } from 'firebase/messaging';
import { doc, getFirestore, setDoc, arrayUnion, collection, getDocs } from 'firebase/firestore';
import { DEFAULT_FIREBASE_CONFIG, getFirebaseConfig } from '../config/firebaseConfig.js';

export const FCM_VAPID_KEY = 'BOKxuEdNb0ce3qIHKKL3Q6gCZxa8hpn2Pd8SG1t8mEa-3dSYUKvTaPixxVRQqXRLtCv6CX4JkJ8yHYB1uvNV2FU';
export const FCM_VAPID_PRIVATE_KEY = '_KHY8ezBSCEJ7GJgA9pawiiRD1oAWP75eb0a6WrtSdQ';
export const VAPID_STAMP = 'v24_BOKxuEdNb0ce3q';

const FCM_TOKEN_STORAGE_KEY = 'TNU_HGC_FCM_DEVICE_TOKEN';
const VAPID_KEY_VERSION_STORAGE = 'TNU_HGC_VAPID_KEY_VERSION';

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class PushNotificationService {
  constructor() {
    this.messaging = null;
    this.currentToken = null;
    this.currentSubscription = null;
    this.isSupported = false;
    this.isInitialized = false;
  }

  async init(appInstance = null) {
    if (this.isInitialized) return true;
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const supported = await isSupported();
      this.isSupported = supported;
      if (!supported) {
        console.warn('Firebase Messaging is not supported on this browser/platform.');
        return false;
      }

      let app = appInstance;
      if (!app) {
        const apps = getApps();
        const config = getFirebaseConfig() || DEFAULT_FIREBASE_CONFIG;
        app = apps.length > 0 ? apps[0] : initializeApp(config);
      }

      this.messaging = getMessaging(app);

      // Listen for foreground FCM messages while user is on the site
      onMessage(this.messaging, (payload) => {
        this.handleForegroundMessage(payload);
      });

      this.isInitialized = true;

      // Check if permission already granted: sync or auto-renew if VAPID changed
      if (Notification.permission === 'granted') {
        const savedStamp = localStorage.getItem(VAPID_KEY_VERSION_STORAGE);
        if (savedStamp !== VAPID_STAMP) {
          console.log('Detected new VAPID key stamp, auto renewing subscription silently...');
          this.renewSubscriptionWithNewKey();
        } else {
          this.syncDeviceToken();
        }
      }

      return true;
    } catch (e) {
      console.warn('PushNotificationService init error:', e);
      return false;
    }
  }

  handleForegroundMessage(payload) {
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = notif.title || data.title || 'CLB Cờ TNU - HGC';
    const body = notif.body || data.body || 'Bạn có thông báo mới từ Câu lạc bộ.';
    const url = data.url || notif.click_action || '/';

    // Show native device notification
    this.showNativeNotification(title, body, url);

    // Also trigger in-app toast notification if app instance is available
    if (window.app && typeof window.app.showToastNotification === 'function') {
      window.app.showToastNotification({
        id: `fcm_${Date.now()}`,
        icon: notif.icon || '🔔',
        title,
        desc: body,
        badge: 'FCM Push',
        targetView: url
      });
    }
  }

  async renewSubscriptionWithNewKey(memberInfo = null) {
    try {
      if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
        return null;
      }

      let swReg = null;
      try {
        if ('serviceWorker' in navigator) {
          swReg = await navigator.serviceWorker.ready;
        }
      } catch (e) {}

      if (!swReg && 'serviceWorker' in navigator) {
        try {
          swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          await navigator.serviceWorker.ready;
        } catch (e) {}
      }

      if (!swReg || !swReg.pushManager) return null;

      // Unsubscribe any stale subscription to eliminate Apple APNs VapidPkHashMismatch & FCM 403
      try {
        const oldSub = await swReg.pushManager.getSubscription();
        if (oldSub) {
          await oldSub.unsubscribe();
          console.log('Old push subscription unsubscribed successfully.');
        }
      } catch (unsubErr) {
        console.warn('Unsubscribe old sub warning:', unsubErr);
      }

      // Purge cached FCM token in IndexedDB
      if (this.messaging) {
        try {
          await deleteToken(this.messaging);
        } catch (delErr) {
          console.warn('deleteToken warning:', delErr);
        }
      }

      localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);

      // Subscribe freshly with active VAPID key
      const newSub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(FCM_VAPID_KEY)
      });

      this.currentSubscription = newSub;

      let token = null;
      if (this.messaging) {
        try {
          token = await getToken(this.messaging, {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: swReg
          });
        } catch (tokErr) {
          token = newSub.endpoint;
        }
      } else {
        token = newSub.endpoint;
      }

      this.currentToken = token;
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(VAPID_KEY_VERSION_STORAGE, VAPID_STAMP);

      // Save valid subscription to Firestore
      await this.saveTokenToFirestore(token, memberInfo, newSub);
      console.log('Renewed subscription successfully with active VAPID key!');
      return token;
    } catch (err) {
      console.warn('renewSubscriptionWithNewKey error:', err);
      return null;
    }
  }

  async requestPermissionAndGetToken(memberInfo = null) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      throw new Error('Trình duyệt của bạn chưa hỗ trợ thông báo đẩy trực tiếp.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (permission === 'denied') {
        throw new Error('Quyền thông báo đã bị chặn trên trình duyệt. Vui lòng bấm vào biểu tượng Ổ khóa trên thanh địa chỉ, chọn Cho phép thông báo rồi thử lại.');
      }
      return null;
    }

    if (!this.messaging) {
      await this.init();
    }

    // Force renew subscription cleanly with new VAPID key
    const token = await this.renewSubscriptionWithNewKey(memberInfo);

    if (!token) {
      throw new Error('Không thể tạo mã đăng ký thông báo với máy chủ Push.');
    }

    // Send a welcome test notification
    this.showNativeNotification(
      '🟢 Kích Hoạt Thông Báo Thành Công!',
      'CLB Cờ TNU - HGC sẽ tự động gửi thông báo đến thiết bị của bạn khi có sự kiện và giải đấu mới ngay cả khi đóng web.',
      '/'
    );

    return token;
  }

  async syncDeviceToken(memberInfo = null) {
    try {
      const savedStamp = localStorage.getItem(VAPID_KEY_VERSION_STORAGE);
      if (savedStamp !== VAPID_STAMP) {
        await this.renewSubscriptionWithNewKey(memberInfo);
        return;
      }

      const savedToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (savedToken) {
        this.currentToken = savedToken;
        let sub = null;
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg.pushManager) {
            sub = await reg.pushManager.getSubscription();
          }
        }
        await this.saveTokenToFirestore(savedToken, memberInfo, sub);
      }
    } catch (e) {
      console.warn('syncDeviceToken error:', e);
    }
  }

  async saveTokenToFirestore(token, memberInfo = null, subscription = null) {
    try {
      const apps = getApps();
      if (apps.length === 0) return;
      const db = getFirestore(apps[0]);

      const deviceInfo = this.getDeviceInfo();
      const docId = token.slice(-32).replace(/[^a-zA-Z0-9_-]/g, '_');
      const tokenDocRef = doc(db, 'push_subscribers', docId);

      const subJson = subscription ? JSON.stringify(subscription.toJSON()) : null;
      const subObj = subscription ? subscription.toJSON() : null;

      const payload = {
        token,
        subscriptionJson: subJson,
        endpoint: subObj?.endpoint || subscription?.endpoint || null,
        p256dh: subObj?.keys?.p256dh || null,
        auth: subObj?.keys?.auth || null,
        vapidStamp: VAPID_STAMP,
        memberId: memberInfo?.id || 'guest',
        memberName: memberInfo?.name || 'Khách / Kỳ thủ',
        role: memberInfo?.role || 'guest',
        device: deviceInfo,
        updatedAt: new Date().toISOString()
      };

      await setDoc(tokenDocRef, payload, { merge: true });

      const clubRef = doc(db, 'clubs', 'tnu_hgc');
      await setDoc(clubRef, {
        pushTokens: arrayUnion(token)
      }, { merge: true });

    } catch (err) {
      console.warn('Could not save FCM token to Firestore:', err);
    }
  }

  // Broadcast Web Push to all registered members (Even when website is closed!)
  async broadcastPushNotification(title, body, url = '/') {
    try {
      let subscribers = [];
      try {
        const apps = getApps();
        if (apps.length > 0) {
          const db = getFirestore(apps[0]);
          const snap = await getDocs(collection(db, 'push_subscribers'));
          snap.forEach((d) => {
            const data = d.data();
            if (data.subscriptionJson) {
              try {
                subscribers.push(JSON.parse(data.subscriptionJson));
              } catch (e) {}
            } else if (data.endpoint && data.p256dh && data.auth) {
              subscribers.push({
                endpoint: data.endpoint,
                keys: { p256dh: data.p256dh, auth: data.auth }
              });
            }
          });
        }
      } catch (err) {
        console.warn('Fetch subscribers directly warning:', err);
      }

      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          url,
          subscriptions: subscribers
        })
      });

      if (res.ok) {
        const result = await res.json();
        console.log('Web Push broadcast sent:', result);
        return result;
      }
    } catch (broadcastErr) {
      console.warn('broadcastPushNotification error:', broadcastErr);
    }
    return null;
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    if (/android/i.test(ua)) os = 'Android';
    else if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS';
    else if (/Win/.test(ua)) os = 'Windows';
    else if (/Mac/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    let browser = 'Browser';
    if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
    else if (/edg/i.test(ua)) browser = 'Edge';

    return `${os} (${browser})`;
  }

  showNativeNotification(title, body, url = '/') {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/logo.png',
            badge: '/favicon.png',
            vibrate: [200, 100, 200],
            tag: 'tnu_hgc_push_' + Date.now(),
            renotify: true,
            data: { url }
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/logo.png' });
        });
      } else {
        new Notification(title, { body, icon: '/logo.png' });
      }
    } catch (e) {
      console.warn('showNativeNotification error:', e);
    }
  }

  getSavedToken() {
    return this.currentToken || localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || null;
  }

  hasPermission() {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  }
}

export const pushNotificationService = new PushNotificationService();
