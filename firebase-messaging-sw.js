// firebase-messaging-sw.js - À la RACINE du projet
// ============================================
// SERVICE WORKER UNIQUE POUR NOTIFICATIONS
// ============================================

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Configuration Firebase (la MÊME que dans index.html)
const firebaseConfig = {
  apiKey: "AIzaSyBn7VIddclO7KtrXb5sibCr9SjVLjOy-qI",
  authDomain: "theo1d.firebaseapp.com",
  projectId: "theo1d",
  storageBucket: "theo1d.firebasestorage.app",
  messagingSenderId: "269629842962",
  appId: "1:269629842962:web:a80a12b04448fe1e595acb"
};

// Clé VAPID UNIQUE (celle qui fonctionne)
const VAPID_KEY = "BM8H6cADaP6tiA4t9Oc9D36jk1UmYoUBV3cATlJ5mvZ_-eQ5xd6HgX5twxWvZ2U2Y98HBkJ8bTph7epPJJYqBpc";

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Version du SW
const SW_VERSION = '2.1.2';

// Installation
self.addEventListener('install', (event) => {
  console.log(`✅ SW v${SW_VERSION}: Installation`);
  self.skipWaiting(); // Activation immédiate
});

// Activation
self.addEventListener('activate', (event) => {
  console.log(`✅ SW v${SW_VERSION}: Activation`);
  event.waitUntil(clients.claim()); // Prendre le contrôle immédiatement
});

// ========== NOTIFICATIONS EN ARRIÈRE-PLAN ==========
// S'exécute quand l'application est fermée
messaging.onBackgroundMessage((payload) => {
  console.log('📨 [BACKGROUND] Message reçu (PWA fermée):', payload);
  
  const notificationTitle = payload.notification?.title || 'CS La Colombe';
  const notificationBody = payload.notification?.body || 'Nouvelle notification';
  const notificationData = payload.data || {};
  
  // Définir les options de notification
  const notificationOptions = {
    body: notificationBody,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: notificationData,
    tag: notificationData.type + '_' + Date.now(),
    renotify: true,
    requireInteraction: true, // RESTE À L'ÉCRAN jusqu'à interaction
    silent: false,
    timestamp: Date.now(),
    actions: [
      { action: 'open', title: '🔓 Ouvrir' },
      { action: 'close', title: '❌ Fermer' }
    ]
  };

  // Afficher la notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ========== GESTION DU CLIC SUR LA NOTIFICATION ==========
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Notification cliquée:', event.notification);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'close') {
    return;
  }
  
  event.waitUntil(
    (async () => {
      // Vérifier si l'application est déjà ouverte
      const allClients = await clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
      });
      
      // Si une fenêtre existe, l'utiliser
      for (const client of allClients) {
        if (client.url.includes('index.html')) {
          await client.focus();
          
          // Envoyer les données pour navigation
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data
          });
          return;
        }
      }
      
      // Sinon, ouvrir une nouvelle fenêtre
      await clients.openWindow('index.html');
    })()
  );
});

// ========== GESTION DES MESSAGES ==========
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  if (type === 'PING') {
    event.source?.postMessage({ type: 'PONG', version: SW_VERSION });
  }
});

console.log('🔥 [SW] Firebase Messaging Service Worker chargé');
