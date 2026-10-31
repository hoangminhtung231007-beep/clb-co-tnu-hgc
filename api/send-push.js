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

    let targets = Array.isArray(subscriptions) ? subscriptions.filter((s) => s && s.endpoint) : [];

    // Fallback: Fetch directly from Firestore REST API if no subscriptions passed
    if (targets.length === 0) {
      try {
        const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/tnu-hgc-chess-club/databases/(default)/documents/push_subscribers';
        const fsRes = await fetch(firestoreUrl);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          if (fsData && Array.isArray(fsData.documents)) {
            targets = fsData.documents.map((doc) => {
              const fields = doc.fields || {};
              const rawJson = fields.subscriptionJson?.stringValue;
              if (rawJson) {
                try {
                  return JSON.parse(rawJson);
                } catch (e) {
                  return null;
                }
              }
              const endpoint = fields.endpoint?.stringValue;
              const p256dh = fields.p256dh?.stringValue;
              const auth = fields.auth?.stringValue;
              if (endpoint && p256dh && auth) {
                return { endpoint, keys: { p256dh, auth } };
              }
              return null;
            }).filter(Boolean);
          }
        }
      } catch (err) {
        console.warn('Firestore fallback fetch warning:', err);
      }
    }

    if (targets.length === 0) {
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
      targets.map((sub) => {
        return webpush.sendNotification(sub, payload, pushOptions);
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      sentCount: successful,
      failedCount: failed,
      totalTargets: targets.length
    });
  } catch (error) {
    console.error('send-push handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}
