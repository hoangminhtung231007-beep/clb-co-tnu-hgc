import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection,
  onSnapshot 
} from 'firebase/firestore';
import { getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from '../config/firebaseConfig.js';

// Helper to sanitize avatar payloads so Firestore document clubs/tnu_hgc never exceeds 1MB limit
function sanitizeAvatarString(av) {
  if (typeof av !== 'string') return av;
  // If avatar is excessively long (> 4KB), keep it lean in root doc because full avatar lives in club_members collection
  if (av.startsWith('data:image') && av.length > 4096) {
    return '';
  }
  return av;
}

// Helper to sanitize articles so payload never exceeds 1MB Firestore limit
function sanitizeArticlesList(articles) {
  if (!Array.isArray(articles)) return [];
  return articles.map((art) => {
    if (!art) return art;
    return {
      ...art,
      // Full gallery is stored in dedicated club_articles collection to keep root doc lean
      gallery: []
    };
  });
}

function sanitizeStateForClubDoc(state) {
  const members = Array.isArray(state.members) ? state.members.map(m => {
    if (!m) return m;
    return {
      ...m,
      avatar: sanitizeAvatarString(m.avatar)
    };
  }) : [];

  const pendingApplications = Array.isArray(state.pendingApplications) ? state.pendingApplications.map(a => {
    if (!a) return a;
    return {
      ...a,
      // Applications full avatar lives in club_applications collection
      avatar: (typeof a.avatar === 'string' && a.avatar.length > 2048) ? '' : a.avatar
    };
  }) : [];

  // Protect against log overflow in the root doc (keep latest 500 logs in root doc)
  let logs = state.attendanceLogs || [];
  if (logs.length > 500) {
    logs = logs.slice(0, 500);
  }

  const payload = {
    members,
    events: state.events || [],
    attendanceLogs: logs,
    articles: sanitizeArticlesList(state.articles),
    pendingApplications,
    alumniBoard: state.alumniBoard || [],
    alumniMembers: state.alumniMembers || [],
    clubInfo: state.clubInfo || {},
    eventFeedback: state.eventFeedback || [],
    fundRecords: state.fundRecords || [],
    fundCampaigns: state.fundCampaigns || [],
    fundSettings: state.fundSettings || {},
    updatedAt: new Date().toISOString()
  };

  // Pre-serialization size check: If approaching 700KB, prune non-critical fields
  try {
    const rawLen = JSON.stringify(payload).length;
    if (rawLen > 700000) {
      console.warn(`[FirebaseService] Root doc size is ${rawLen} bytes. Applying space optimization.`);
      payload.attendanceLogs = payload.attendanceLogs.slice(0, 250);
      payload.eventFeedback = (payload.eventFeedback || []).slice(0, 100);
    }
  } catch (err) {
    console.warn('[FirebaseService] Size check notice:', err);
  }

  return payload;
}

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.unsubscribeSnapshot = null;
    this.unsubscribeApps = null;
    this.unsubscribeArticles = null;
    this.unsubscribeMembers = null;
    this.status = 'unconfigured'; // 'unconfigured' | 'connecting' | 'connected' | 'disconnected' | 'error'
    this.lastError = null;
    this.statusListeners = new Set();
    this.lastSyncTime = null;
    this.isSyncing = false;
    this.pendingSyncTimer = null;
    this.ignoreNextRemoteSnapshot = false;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;

    this.callbacks = {
      onRemoteData: null,
      onApplications: null,
      onArticles: null,
      onMembers: null
    };

    this.setupNetworkWatchers();
  }

  setupNetworkWatchers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('🌐 [Firebase] Trình duyệt đã kết nối mạng trở lại. Khôi phục đồng bộ...');
      this.reconnectAttempts = 0;
      if (this.isConfigured() && this.status !== 'connected') {
        this.reconnect();
      }
    });

    window.addEventListener('offline', () => {
      console.warn('🌐 [Firebase] Trình duyệt đã mất kết nối mạng.');
      this.notifyStatus('disconnected');
    });

    // Heartbeat check every 40s: Ensures active Firestore connection
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine && this.isConfigured()) {
          if (this.status === 'error' || this.status === 'disconnected') {
            console.log('💓 [Firebase Heartbeat] Đang tự động kết nối lại cơ sở dữ liệu...');
            this.reconnect();
          }
        }
      }, 40000);
    }
  }

  scheduleAutoReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    // Exponential backoff: 3s, 6s, 12s, max 30s
    const delay = Math.min(3000 * Math.pow(1.8, this.reconnectAttempts - 1), 30000);
    console.log(`🔄 [Firebase] Sẽ tự động thử kết nối lại sau ${Math.round(delay / 1000)}s (Lần thử ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      this.reconnect();
    }, delay);
  }

  reconnect() {
    if (!this.isConfigured()) return;
    this.init(
      this.callbacks.onRemoteData,
      this.callbacks.onApplications,
      this.callbacks.onArticles,
      this.callbacks.onMembers
    );
  }

  onStatusChange(listener) {
    this.statusListeners.add(listener);
    listener(this.status, this.lastSyncTime);
    return () => this.statusListeners.delete(listener);
  }

  notifyStatus(status) {
    this.status = status;
    this.statusListeners.forEach((fn) => {
      try {
        fn(this.status, this.lastSyncTime);
      } catch (e) {
        console.error('Error in Firebase status listener:', e);
      }
    });
  }

  isConfigured() {
    return !!getFirebaseConfig();
  }

  init(onRemoteDataCallback, onApplicationsCallback, onArticlesCallback, onMembersCallback) {
    if (onRemoteDataCallback) this.callbacks.onRemoteData = onRemoteDataCallback;
    if (onApplicationsCallback) this.callbacks.onApplications = onApplicationsCallback;
    if (onArticlesCallback) this.callbacks.onArticles = onArticlesCallback;
    if (onMembersCallback) this.callbacks.onMembers = onMembersCallback;

    const config = getFirebaseConfig();
    if (!config) {
      this.notifyStatus('unconfigured');
      return false;
    }

    try {
      this.notifyStatus('connecting');
      if (getApps().length === 0) {
        this.app = initializeApp(config);
      } else {
        this.app = getApp();
      }
      this.db = getFirestore(this.app);

      // Clean existing listeners before rebinding
      if (this.unsubscribeSnapshot) {
        this.unsubscribeSnapshot();
        this.unsubscribeSnapshot = null;
      }
      if (this.unsubscribeApps) {
        this.unsubscribeApps();
        this.unsubscribeApps = null;
      }
      if (this.unsubscribeArticles) {
        this.unsubscribeArticles();
        this.unsubscribeArticles = null;
      }
      if (this.unsubscribeMembers) {
        this.unsubscribeMembers();
        this.unsubscribeMembers = null;
      }

      // 1. Start listening to shared club document: clubs/tnu_hgc
      const docRef = doc(this.db, 'clubs', 'tnu_hgc');
      this.unsubscribeSnapshot = onSnapshot(
        docRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          this.reconnectAttempts = 0; // Reset backoff counter on success
          if (snapshot.exists()) {
            this.lastSyncTime = new Date();
            this.lastError = null;
            this.notifyStatus('connected');

            if (typeof this.callbacks.onRemoteData === 'function') {
              const remoteData = snapshot.data();
              this.callbacks.onRemoteData(remoteData, snapshot.metadata);
            }
          } else {
            this.lastError = null;
            this.notifyStatus('connected');
          }
        },
        (error) => {
          console.error('Firestore snapshot listener error:', error);
          this.lastError = error;
          this.notifyStatus('error');
          this.scheduleAutoReconnect();
        }
      );

      // 2. Start listening to dedicated collection: club_applications (Guarantees zero overflow!)
      const appsColRef = collection(this.db, 'club_applications');
      this.unsubscribeApps = onSnapshot(
        appsColRef,
        (snap) => {
          const appsList = [];
          snap.forEach((d) => {
            if (d.id === 'pending_list') return; // ignore legacy aggregator doc
            const data = d.data();
            if (data && data.id && (!data.status || data.status === 'pending')) {
              appsList.push(data);
            }
          });

          // Sort descending by creation date
          appsList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          if (typeof this.callbacks.onApplications === 'function') {
            this.callbacks.onApplications(appsList);
          }
        },
        (appErr) => {
          console.warn('Firestore club_applications collection listener notice:', appErr);
        }
      );

      // 3. Start listening to dedicated collection: club_articles (Guarantees unlimited articles & photos without doc overflow)
      const articlesColRef = collection(this.db, 'club_articles');
      this.unsubscribeArticles = onSnapshot(
        articlesColRef,
        (snap) => {
          const articlesList = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data && data.id) {
              articlesList.push(data);
            }
          });

          if (articlesList.length > 0 && typeof this.callbacks.onArticles === 'function') {
            this.callbacks.onArticles(articlesList);
          }
        },
        (artErr) => {
          console.warn('Firestore club_articles collection listener notice:', artErr);
        }
      );

      // 4. Start listening to dedicated collection: club_members (Guarantees unlimited members & full avatars without 1MB limit)
      const membersColRef = collection(this.db, 'club_members');
      this.unsubscribeMembers = onSnapshot(
        membersColRef,
        (snap) => {
          const membersList = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data && data.id) {
              membersList.push(data);
            }
          });

          if (membersList.length > 0 && typeof this.callbacks.onMembers === 'function') {
            this.callbacks.onMembers(membersList);
          }
        },
        (memErr) => {
          console.warn('Firestore club_members collection listener notice:', memErr);
        }
      );

      return true;
    } catch (e) {
      console.error('Failed to initialize Firebase:', e);
      this.notifyStatus('error');
      this.scheduleAutoReconnect();
      return false;
    }
  }

  // Save an individual member directly into club_members/{id}
  async saveMemberDoc(member) {
    if (!this.db || !member || !member.id) return false;
    try {
      const cleanMember = JSON.parse(JSON.stringify(member));
      const memberDocRef = doc(this.db, 'club_members', member.id);
      await setDoc(memberDocRef, cleanMember, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving member to club_members collection:', err);
      return false;
    }
  }

  // Delete an individual member from club_members/{id}
  async deleteMemberDoc(memberId) {
    if (!this.db || !memberId) return false;
    try {
      const memberDocRef = doc(this.db, 'club_members', memberId);
      await deleteDoc(memberDocRef);
      return true;
    } catch (err) {
      console.warn('Error deleting member doc from club_members:', err);
      return false;
    }
  }

  // Save an individual application directly into club_applications/{id}
  async saveApplication(app) {
    if (!this.db || !app || !app.id) return false;
    try {
      const cleanApp = JSON.parse(JSON.stringify(app));
      const appDocRef = doc(this.db, 'club_applications', app.id);
      await setDoc(appDocRef, cleanApp, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving application to club_applications collection:', err);
      return false;
    }
  }

  // Delete an individual application from club_applications/{id} when approved or rejected
  async deleteApplication(appId) {
    if (!this.db || !appId) return false;
    try {
      const appDocRef = doc(this.db, 'club_applications', appId);
      await deleteDoc(appDocRef);
      return true;
    } catch (err) {
      console.warn('Error deleting application doc from club_applications:', err);
      return false;
    }
  }

  // Save an individual article directly into club_articles/{id}
  async saveArticleDoc(article) {
    if (!this.db || !article || !article.id) return false;
    try {
      const cleanArt = JSON.parse(JSON.stringify(article));
      const artDocRef = doc(this.db, 'club_articles', article.id);
      await setDoc(artDocRef, cleanArt, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving article to club_articles collection:', err);
      return false;
    }
  }

  // Delete an individual article from club_articles/{id}
  async deleteArticleDoc(articleId) {
    if (!this.db || !articleId) return false;
    try {
      const artDocRef = doc(this.db, 'club_articles', articleId);
      await deleteDoc(artDocRef);
      return true;
    } catch (err) {
      console.warn('Error deleting article doc from club_articles:', err);
      return false;
    }
  }

  // Push local state to Firestore (supports immediate or debounced sync)
  syncToFirestore(state, immediate = false) {
    if (!this.db) return Promise.resolve(false);

    const performSync = async () => {
      try {
        const docRef = doc(this.db, 'clubs', 'tnu_hgc');
        const payload = sanitizeStateForClubDoc(state);

        // Clean undefined values
        const cleanPayload = JSON.parse(JSON.stringify(payload));

        await setDoc(docRef, cleanPayload, { merge: true });

        this.lastSyncTime = new Date();
        this.lastError = null;
        this.notifyStatus('connected');
        return true;
      } catch (e) {
        console.error('Error syncing to Firestore:', e);
        this.lastError = e;
        this.notifyStatus('error');
        this.scheduleAutoReconnect();
        return false;
      }
    };

    if (immediate) {
      if (this.pendingSyncTimer) {
        clearTimeout(this.pendingSyncTimer);
        this.pendingSyncTimer = null;
      }
      return performSync();
    }

    return new Promise((resolve) => {
      if (this.pendingSyncTimer) {
        clearTimeout(this.pendingSyncTimer);
      }

      this.pendingSyncTimer = setTimeout(async () => {
        const res = await performSync();
        resolve(res);
      }, 350); // 350ms debounce
    });
  }

  // Force immediate pull from Firestore
  async pullFromFirestore() {
    if (!this.db) {
      throw new Error('Firebase chưa được cấu hình hoặc chưa khởi tạo.');
    }
    const docRef = doc(this.db, 'clubs', 'tnu_hgc');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      this.lastSyncTime = new Date();
      this.notifyStatus('connected');
      return snap.data();
    }
    return null;
  }

  // Force immediate push to Firestore
  async pushToFirestore(state) {
    if (!this.db) {
      throw new Error('Firebase chưa được cấu hình hoặc chưa khởi tạo.');
    }
    const docRef = doc(this.db, 'clubs', 'tnu_hgc');
    const payload = sanitizeStateForClubDoc(state);
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    await setDoc(docRef, cleanPayload, { merge: true });

    this.lastSyncTime = new Date();
    this.lastError = null;
    this.notifyStatus('connected');
    return true;
  }

  disconnect() {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    if (this.unsubscribeApps) {
      this.unsubscribeApps();
      this.unsubscribeApps = null;
    }
    if (this.unsubscribeArticles) {
      this.unsubscribeArticles();
      this.unsubscribeArticles = null;
    }
    if (this.unsubscribeMembers) {
      this.unsubscribeMembers();
      this.unsubscribeMembers = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.app = null;
    this.db = null;
    this.notifyStatus('disconnected');
  }
}

export const firebaseService = new FirebaseService();
