import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from '../config/firebaseConfig.js';

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.unsubscribeSnapshot = null;
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

  init(onRemoteDataCallback) {
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

      // Start listening to the shared document: clubs/tnu_hgc
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

      return true;
    } catch (e) {
      console.error('Failed to initialize Firebase:', e);
      this.notifyStatus('error');
      return false;
    }
  }

  // Push local state to Firestore with debouncing
  syncToFirestore(state) {
    if (!this.db) return Promise.resolve(false);

    return new Promise((resolve) => {
      if (this.pendingSyncTimer) {
        clearTimeout(this.pendingSyncTimer);
      }

      this.pendingSyncTimer = setTimeout(async () => {
        try {
          const docRef = doc(this.db, 'clubs', 'tnu_hgc');
          const payload = {
            members: state.members || [],
            events: state.events || [],
            attendanceLogs: state.attendanceLogs || [],
            articles: state.articles || [],
            pendingApplications: state.pendingApplications || [],
            alumniBoard: state.alumniBoard || [],
            alumniMembers: state.alumniMembers || [],
            clubInfo: state.clubInfo || {},
            eventFeedback: state.eventFeedback || [],
            fundRecords: state.fundRecords || [],
            fundCampaigns: state.fundCampaigns || [],
            fundSettings: state.fundSettings || {},
            updatedAt: new Date().toISOString()
          };

          // Clean undefined values
          const cleanPayload = JSON.parse(JSON.stringify(payload));

          await setDoc(docRef, cleanPayload, { merge: true });

          // Also backup applications to dedicated club_applications/pending_list
          if (Array.isArray(state.pendingApplications)) {
            try {
              const appDocRef = doc(this.db, 'club_applications', 'pending_list');
              await setDoc(appDocRef, {
                applications: JSON.parse(JSON.stringify(state.pendingApplications)),
                updatedAt: new Date().toISOString()
              }, { merge: false });
            } catch (appErr) {
              console.warn('Backup write to club_applications warning:', appErr);
            }
          }

          this.lastSyncTime = new Date();
          this.notifyStatus('connected');
          resolve(true);
        } catch (e) {
          console.error('Error syncing to Firestore:', e);
          this.notifyStatus('error');
          resolve(false);
        }
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
    const payload = {
      members: state.members || [],
      events: state.events || [],
      attendanceLogs: state.attendanceLogs || [],
      articles: state.articles || [],
      pendingApplications: state.pendingApplications || [],
      alumniBoard: state.alumniBoard || [],
      alumniMembers: state.alumniMembers || [],
      clubInfo: state.clubInfo || {},
      eventFeedback: state.eventFeedback || [],
      fundRecords: state.fundRecords || [],
      fundCampaigns: state.fundCampaigns || [],
      fundSettings: state.fundSettings || {},
      updatedAt: new Date().toISOString()
    };
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    await setDoc(docRef, cleanPayload, { merge: true });

    if (Array.isArray(state.pendingApplications)) {
      try {
        const appDocRef = doc(this.db, 'club_applications', 'pending_list');
        await setDoc(appDocRef, {
          applications: JSON.parse(JSON.stringify(state.pendingApplications)),
          updatedAt: new Date().toISOString()
        }, { merge: false });
      } catch (appErr) {
        console.warn('Backup push to club_applications warning:', appErr);
      }
    }

    this.lastSyncTime = new Date();
    this.notifyStatus('connected');
    return true;
  }

  disconnect() {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    this.app = null;
    this.db = null;
    this.notifyStatus('disconnected');
  }
}

export const firebaseService = new FirebaseService();
