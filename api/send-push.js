// Vercel Serverless Function to broadcast Web Push notifications to all members' devices
// Even when the browser is closed or phone screen is locked

import webpush from 'web-push';

export const VAPID_PUBLIC_KEY = 'BOKxuEdNb0ce3qIHKKL3Q6gCZxa8hpn2Pd8SG1t8mEa-3dSYUKvTaPixxVRQqXRLtCv6CX4JkJ8yHYB1uvNV2FU';
export const VAPID_PRIVATE_KEY = '_KHY8ezBSCEJ7GJgA9pawiiRD1oAWP75eb0a6WrtSdQ';

try {
  webpush.setVapidDetails(
    'mailto:tnuhgcchessclub@gmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn('VAPID setup warning:', e);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, body, url = '/', subscriptions = [] } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'Missing title or body' });
    }

    let targetItems = [];

    if (Array.isArray(subscriptions) && subscriptions.length > 0) {
      targetItems = subscriptions.map((s) => ({ sub: s, docName: null }));
    } else {
      // Fetch directly from Firestore REST API
      try {
        const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/tnu-hgc-chess-club/databases/(default)/documents/push_subscribers';
        const fsRes = await fetch(firestoreUrl);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          if (fsData && Array.isArray(fsData.documents)) {
            targetItems = fsData.documents.map((doc) => {
              const fields = doc.fields || {};
              const rawJson = fields.subscriptionJson?.stringValue;
              let sub = null;
              if (rawJson) {
                try {
                  sub = JSON.parse(rawJson);
                } catch (e) {}
              }
              if (!sub) {
                const endpoint = fields.endpoint?.stringValue;
                const p256dh = fields.p256dh?.stringValue;
                const auth = fields.auth?.stringValue;
                if (endpoint && p256dh && auth) {
                  sub = { endpoint, keys: { p256dh, auth } };
                }
              }
              return sub ? { sub, docName: doc.name } : null;
            }).filter(Boolean);
          }
        }
      } catch (err) {
        console.warn('Firestore fallback fetch warning:', err);
      }
    }

    if (targetItems.length === 0) {
      return res.status(200).json({
        success: true,
        sentCount: 0,
        message: 'No subscribers registered yet'
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/logo.png',
      badge: '/favicon.png',
      tag: 'tnu_hgc_push_' + Date.now(),
      renotify: true,
      timestamp: Date.now()
    });

    const pushOptions = {
      TTL: 86400, // 24 hours
      urgency: 'high'
    };

    const results = await Promise.allSettled(
      targetItems.map(async (item) => {
        try {
          return await webpush.sendNotification(item.sub, payload, pushOptions);
        } catch (err) {
          // If expired, rejected, or hash mismatch, delete stale entry
          if (err.statusCode === 400 || err.statusCode === 403 || err.statusCode === 404 || err.statusCode === 410) {
            if (item.docName) {
              fetch('https://firestore.googleapis.com/v1/' + item.docName, { method: 'DELETE' }).catch(() => {});
            }
          }
          throw err;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      sentCount: successful,
      failedCount: failed,
      totalTargets: targetItems.length
    });
  } catch (error) {
    console.error('send-push handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}
