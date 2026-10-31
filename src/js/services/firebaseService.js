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
  // Guard against massive uncompressed images (> 55KB) to protect Firestore 1MB document limit
  if (av.startsWith('data:image/') && av.length > 55000) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
  }
  return av;
}

// Helper to sanitize articles so payload never exceeds 1MB Firestore limit
function sanitizeArticlesList(articles) {
  if (!Array.isArray(articles)) return [];
  return articles.map((art) => {
    if (!art) return art;
    const gallery = Array.isArray(art.gallery) ? art.gallery : [];
    return {
      ...art,
      // Cap gallery array on the root document to 10 photos to keep doc well under 1MB
      gallery: gallery.slice(0, 10)
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
      avatar: sanitizeAvatarString(a.avatar)
    };
  }) : [];

  return {
    members,
    events: state.events || [],
    attendanceLogs: state.attendanceLogs || [],
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
}

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.unsubscribeSnapshot = null;
    this.unsubscribeApps = null;
    this.unsubscribeArticles = null;
    this.status = 'unconfigured'; // 'unconfigured' | 'connecting' | 'connected' | 'disconnected' | 'error'
    this.statusListeners = new Set();
    this.lastSyncTime = null;
    this.isSyncing = false;
    this.pendingSyncTimer = null;
    this.ignoreNextRemoteSnapshot = false;
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

  init(onRemoteDataCallback, onApplicationsCallback, onArticlesCallback) {
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

      // 1. Start listening to the shared club document: clubs/tnu_hgc
      const docRef = doc(this.db, 'clubs', 'tnu_hgc');

      if (this.unsubscribeSnapshot) {
        this.unsubscribeSnapshot();
      }

      this.unsubscribeSnapshot = onSnapshot(
        docRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.exists()) {
            this.lastSyncTime = new Date();
            this.notifyStatus('connected');

            // If snapshot comes from remote server, notify store
            if (typeof onRemoteDataCallback === 'function') {
              const remoteData = snapshot.data();
              onRemoteDataCallback(remoteData, snapshot.metadata);
            }
          } else {
            // Document doesn't exist yet in Firestore
            this.notifyStatus('connected');
          }
        },
        (error) => {
          console.error('Firestore snapshot listener error:', error);
          this.notifyStatus('error');
        }
      );

      // 2. Start listening to dedicated collection: club_applications (Guarantees zero overflow!)
      if (this.unsubscribeApps) {
        this.unsubscribeApps();
        this.unsubscribeApps = null;
      }

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

          if (typeof onApplicationsCallback === 'function') {
            onApplicationsCallback(appsList);
          }
        },
        (appErr) => {
          console.warn('Firestore club_applications collection listener notice:', appErr);
        }
      );

      // 3. Start listening to dedicated collection: club_articles (Guarantees unlimited articles & photos without doc overflow)
      if (this.unsubscribeArticles) {
        this.unsubscribeArticles();
        this.unsubscribeArticles = null;
      }

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

          if (articlesList.length > 0 && typeof onArticlesCallback === 'function') {
            onArticlesCallback(articlesList);
          }
        },
        (artErr) => {
          console.warn('Firestore club_articles collection listener notice:', artErr);
        }
      );

      return true;
    } catch (e) {
      console.error('Failed to initialize Firebase:', e);
      this.notifyStatus('error');
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
        this.notifyStatus('connected');
        return true;
      } catch (e) {
        console.error('Error syncing to Firestore:', e);
        this.notifyStatus('error');
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
    this.app = null;
    this.db = null;
    this.notifyStatus('disconnected');
  }
}

export const firebaseService = new FirebaseService();
