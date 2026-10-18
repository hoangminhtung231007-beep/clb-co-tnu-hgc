// Firebase Configuration Manager for TNU - HGC Chess Club
// Supports loading from localStorage (set via Admin UI) or fallback defaults / env vars

const FIREBASE_STORAGE_KEY = 'TNU_HGC_FIREBASE_CONFIG_V1';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem(FIREBASE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved firebase config:', e);
  }

  // Fallback to environment variables if provided during Vite build
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
    };
  }

  return null;
}

export function saveFirebaseConfig(config) {
  try {
    if (!config || !config.projectId || !config.apiKey) {
      throw new Error('Cấu hình Firebase phải bao gồm ít nhất apiKey và projectId');
    }
    localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Failed to save Firebase config:', e);
    throw e;
  }
}

export function clearFirebaseConfig() {
  try {
    localStorage.removeItem(FIREBASE_STORAGE_KEY);
  } catch (e) {}
}
