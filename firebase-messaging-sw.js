// ============================================
// FIREBASE MESSAGING SERVICE WORKER
// NOTIFICATIONS EN ARRIÈRE-PLAN - PWA FERMÉE
// ============================================

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBn7VIddclO7KtrXb5sibCr9SjVLjOy-qI",
  authDomain: "theo1d.firebaseapp.com",
  projectId: "theo1d",
  storageBucket: "theo1d.firebasestorage.app",
  messagingSenderId: "269629842962",
  appId: "1:269629842962:web:a80a12b04448fe1e595acb"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ========== NOTIFICATIONS EN ARRIÈRE-PLAN ==========
// S'EXÉCUTE MÊME QUAND LA PWA EST COMPLÈTEMENT FERMÉE
messaging.onBackgroundMessage((payload) => {
  console.log('📨 [SW] Message reçu en arrière-plan (PWA fermée):', payload);
  
  const notificationTitle = payload.notification?.title || 'CS La Colombe';
  const notificationBody = payload.notification?.body || 'Nouvelle notification';
  const notificationData = payload.data || {};
  
  // Déterminer l'icône selon le type
  let icon = '/icon-192x192.png';
  let badge = '/icon-72x72.png';
  
  if (notificationData.type === 'incidents') {
    icon = '/icon-192x192.png';
    badge = '/icon-72x72.png';
  }
  
  const notificationOptions = {
    body: notificationBody,
    icon: icon,
    badge: badge,
    vibrate: [200, 100, 200],
    data: notificationData,
    tag: notificationData.type + '_' + (notificationData.incidentId || Date.now()),
    renotify: true,
    requireInteraction: true, // RESTE À L'ÉCRAN
    silent: false,
    timestamp: Date.now(),
    actions: [
      { action: 'open', title: '🔓 Ouvrir l\'application' },
      { action: 'close', title: '❌ Fermer' }
    ]
  };

  // AFFICHER LA NOTIFICATION
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
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
      // Chercher une fenêtre existante
      const allClients = await clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
      });
      
      // Ouvrir ou focuser l'application
      for (const client of allClients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          await client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data
          });
          return;
        }
      }
      
      // Ouvrir une nouvelle fenêtre
      await clients.openWindow('index.html');
    })()
  );
});

// ========== ACTIVATION IMMÉDIATE ==========
self.addEventListener('install', (event) => {
  console.log('✅ [SW] Installation...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Activation...');
  event.waitUntil(clients.claim());
});

console.log('🔥 [SW] Firebase Messaging Service Worker chargé');
