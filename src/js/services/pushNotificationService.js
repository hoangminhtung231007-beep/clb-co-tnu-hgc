// Firebase Cloud Messaging (FCM) & Web Push Notification Service
// CLB Cờ TNU - HGC

import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, getFirestore, setDoc, arrayUnion } from 'firebase/firestore';
import { DEFAULT_FIREBASE_CONFIG, getFirebaseConfig } from '../config/firebaseConfig.js';

export const FCM_VAPID_KEY = 'BH3NSvV9UTEukXeFDozs_p2Mu0P8L4kdzlJIbaOimL3dIw15-VK1BHCQ5FxBTFSrC2iGc15XqPEjLNEBjGhz7hE';
const FCM_TOKEN_STORAGE_KEY = 'TNU_HGC_FCM_DEVICE_TOKEN';

class PushNotificationService {
  constructor() {
    this.messaging = null;
    this.currentToken = null;
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

      // Check if already granted and has token saved
      if (Notification.permission === 'granted') {
        this.syncDeviceToken();
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

    // Get active Service Worker registration
    let swReg = null;
    try {
      if ('serviceWorker' in navigator) {
        swReg = await navigator.serviceWorker.ready;
      }
    } catch (swErr) {
      console.warn('serviceWorker.ready failed:', swErr);
    }

    if (!swReg && 'serviceWorker' in navigator) {
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
      } catch (swRegErr) {
        console.warn('SW registration fallback failed:', swRegErr);
      }
    }

    if (!this.messaging) {
      await this.init();
    }

    if (!this.messaging) {
      throw new Error('Không thể khởi tạo dịch vụ thông báo Firebase Messaging.');
    }

    // Get FCM registration token using user's VAPID key
    const token = await getToken(this.messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swReg
    });

    if (!token) {
      throw new Error('Không thể lấy mã Token thông báo từ dịch vụ Push.');
    }

    this.currentToken = token;
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);

    // Save token to Firestore to receive future push broadcasts
    await this.saveTokenToFirestore(token, memberInfo);

    // Send a welcome test notification to confirm it works
    this.showNativeNotification(
      '🟢 Kích Hoạt Thông Báo Thành Công!',
      'CLB Cờ TNU - HGC sẽ tự động gửi thông báo đến thiết bị của bạn khi có sự kiện và giải đấu mới ngay cả khi đóng web.',
      '/'
    );

    return token;
  }

  async syncDeviceToken(memberInfo = null) {
    try {
      const savedToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (savedToken && this.messaging) {
        this.currentToken = savedToken;
        await this.saveTokenToFirestore(savedToken, memberInfo);
      }
    } catch (e) {
      console.warn('syncDeviceToken error:', e);
    }
  }

  async saveTokenToFirestore(token, memberInfo = null) {
    try {
      const apps = getApps();
      if (apps.length === 0) return;
      const db = getFirestore(apps[0]);

      const deviceInfo = this.getDeviceInfo();
      const tokenDocRef = doc(db, 'push_subscribers', token.slice(0, 32));

      const payload = {
        token,
        memberId: memberInfo?.id || 'guest',
        memberName: memberInfo?.name || 'Khách / Kỳ thủ',
        role: memberInfo?.role || 'guest',
        device: deviceInfo,
        updatedAt: new Date().toISOString()
      };

      await setDoc(tokenDocRef, payload, { merge: true });

      // Also append to main club document for quick summary
      const clubRef = doc(db, 'clubs', 'tnu_hgc');
      await setDoc(clubRef, {
        pushTokens: arrayUnion(token)
      }, { merge: true });

    } catch (err) {
      console.warn('Could not save FCM token to Firestore:', err);
    }
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
