// sw.js - Service Worker Robuste et Stable pour CS La Colombe
const CACHE_NAME = 'cs-lacolombe-static-v2';
const APP_VERSION = '2.1.2';

// Cache UNIQUEMENT les ressources statiques, PAS les API
const STATIC_ASSETS = [
  './',
  'index.html',
  'offline.html',
  'manifest.json',
  'icon-72x72.png',
  'icon-96x96.png',
  'icon-128x128.png',
  'icon-144x144.png',
  'icon-152x152.png',
  'icon-192x192.png',
  'icon-384x384.png',
  'icon-512x512.png'
];

// Configuration Firebase - UNIQUEMENT pour le SW
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBn7VIddclO7KtrXb5sibCr9SjVLjOy-qI",
  authDomain: "theo1d.firebaseapp.com",
  projectId: "theo1d",
  storageBucket: "theo1d.firebasestorage.app",
  messagingSenderId: "269629842962",
  appId: "1:269629842962:web:a80a12b04448fe1e595acb"
};

// Clé VAPID UNIQUE
const VAPID_KEY = "BM8H6cADaP6tiA4t9Oc9D36jk1UmYoUBV3cATlJ5mvZ_-eQ5xd6HgX5twxWvZ2U2Y98HBkJ8bTph7epPJJYqBpc";

let firebaseApp = null;
let firebaseMessaging = null;
let isFirebaseInitialized = false;

// ========== INSTALLATION ==========
self.addEventListener('install', (event) => {
  console.log(`📦 SW v${APP_VERSION}: Installation...`);
  
  // NE PAS skipWaiting() immédiatement - éviter les rechargements intempestifs
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 SW: Mise en cache des ressources statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => {
        console.error('❌ SW: Erreur cache:', error);
        // Continuer même si le cache échoue
      })
  );
});

// ========== ACTIVATION ==========
self.addEventListener('activate', (event) => {
  console.log(`🚀 SW v${APP_VERSION}: Activation...`);
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log(`🗑️ SW: Suppression ancien cache: ${name}`);
              return caches.delete(name);
            })
        );
      }),
      
      // Initialiser Firebase SANS prendre le contrôle immédiat
      initializeFirebase().catch(err => console.warn('⚠️ SW: Firebase non disponible:', err))
    ]).then(() => {
      console.log('✅ SW: Activé avec succès');
      // NE PAS claim() immédiatement - éviter les rechargements
    })
  );
});

// ========== INITIALISATION FIREBASE ==========
async function initializeFirebase() {
  if (isFirebaseInitialized) return true;
  
  try {
    // Importer Firebase dynamiquement
    importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');
    
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    firebaseMessaging = firebase.messaging();
    
    console.log('✅ SW: Firebase Messaging initialisé');
    isFirebaseInitialized = true;
    
    // Configurer le gestionnaire de messages background
    firebaseMessaging.onBackgroundMessage((payload) => {
      console.log('📨 SW: Message background reçu:', payload);
      displayNotification(payload);
    });
    
    return true;
  } catch (error) {
    console.error('❌ SW: Erreur Firebase:', error);
    return false;
  }
}

// ========== AFFICHAGE NOTIFICATION ==========
function displayNotification(payload) {
  const notificationTitle = payload.notification?.title || 'CS La Colombe';
  const notificationBody = payload.notification?.body || 'Nouvelle notification';
  const notificationData = payload.data || {};
  
  const options = {
    body: notificationBody,
    icon: '.icon-192x192.png',
    badge: '.icon-72x72.png',
    vibrate: [200, 100, 200],
    data: notificationData,
    tag: notificationData.type || 'notification',
    renotify: true,
    requireInteraction: false,
    silent: false,
    actions: [
      { action: 'open', title: '👀 Voir' },
      { action: 'close', title: '❌ Fermer' }
    ]
  };
  
  return self.registration.showNotification(notificationTitle, options);
}

// ========== STRATÉGIE DE CACHE INTELLIGENTE ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 🟢 IGNORER TOUTES LES REQUÊTES FIREBASE/FIRESTORE
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com') ||
      url.pathname.includes('firestore')) {
    return; // NE PAS INTERCEPTER
  }
  
  // 🟢 IGNORER LES REQUÊTES API
  if (url.pathname.includes('/api/') || 
      url.pathname.includes('_ah/') ||
      request.method !== 'GET') {
    return; // NE PAS INTERCEPTER
  }

  // 🟢 IGNORER LES FICHIERS DYNAMIQUES
  if (url.pathname.endsWith('.php') || 
      url.pathname.includes('?')) {
    return; // NE PAS INTERCEPTER
  }

  // 🟢 STRATÉGIE: Network First pour HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Mettre en cache les pages HTML
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback vers la page offline
          return caches.match('offline.html');
        })
    );
    return;
  }

  // 🟢 STRATÉGIE: Cache First pour les assets statiques
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          // Mettre en cache la réponse
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 🟢 STRATÉGIE: Network Only pour tout le reste
  // NE PAS INTERCEPTER par défaut
  return;
});

// ========== GESTION DES NOTIFICATIONS ==========
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  if (action === 'close') {
    return;
  }
  
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
      });
      
      // Trouver un client existant
      for (const client of allClients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          await client.focus();
          // Envoyer les données de navigation
          client.postMessage({
            type: 'NAVIGATE_FROM_NOTIFICATION',
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

// ========== GESTION DES MESSAGES ==========
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME);
      break;
      
    case 'PING':
      event.source?.postMessage({ type: 'PONG', version: APP_VERSION });
      break;
      
    default:
      // Ignorer
      break;
  }
});

// ========== GESTION DES ERREURS ==========
self.addEventListener('error', (event) => {
  console.error('❌ SW Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ SW Unhandled Rejection:', event.reason);
});

console.log(`📱 SW v${APP_VERSION} chargé avec succès`);
