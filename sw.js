// sw.js - Service Worker UNIQUE pour CS La Colombe
const CACHE_NAME = 'cs-lacolombe-v2.1';
const APP_VERSION = '2.1.0';

// Fichiers essentiels à mettre en cache
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './offline.html',
  './css/style.css'
];

// Configuration Firebase pour le Service Worker
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBn7VIddclO7KtrXb5sibCr9SjVLjOy-qI",
  authDomain: "theo1d.firebaseapp.com",
  projectId: "theo1d",
  storageBucket: "theo1d.firebasestorage.app",
  messagingSenderId: "269629842962",
  appId: "1:269629842962:web:a80a12b04448fe1e595acb"
};

// Clé VAPID UNIQUE et CORRECTE
const VAPID_KEY = "BM8H6cADaP6tiA4t9Oc9D36jk1UmYoUBV3cATlJ5mvZ_-eQ5xd6HgX5twxWvZ2U2Y98HBkJ8bTph7epPJJYqBpc";

// État du Service Worker
let firebaseApp = null;
let firebaseMessaging = null;
let firebaseFirestore = null;
let currentUser = null;

// ========== INSTALLATION ==========
self.addEventListener('install', (event) => {
  console.log(`🔧 SW v${APP_VERSION}: Installation...`);
  
  // Forcer l'activation immédiate
  self.skipWaiting();
  
  // Mise en cache des ressources essentielles
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => {
        console.log('✅ SW: Ressources mises en cache');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ SW: Erreur cache:', error);
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
            .map(name => caches.delete(name))
        );
      }),
      
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ]).then(() => {
      console.log('✅ SW: Activé et prêt');
      
      // Initialiser Firebase
      return initializeFirebase();
    })
  );
});

// ========== INITIALISATION FIREBASE ==========
async function initializeFirebase() {
  try {
    // Importer Firebase dans le SW
    importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js');
    
    // Initialiser Firebase
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    firebaseMessaging = firebase.messaging();
    firebaseFirestore = firebase.firestore();
    
    console.log('✅ SW: Firebase initialisé');
    
    // Configurer le gestionnaire de messages Firebase
    firebaseMessaging.onBackgroundMessage((payload) => {
      console.log('📨 SW: Message background reçu:', payload);
      handleBackgroundNotification(payload);
    });
    
    return true;
  } catch (error) {
    console.error('❌ SW: Erreur Firebase:', error);
    return false;
  }
}

// ========== GESTION NOTIFICATIONS BACKGROUND ==========
async function handleBackgroundNotification(payload) {
  const notificationTitle = payload.notification?.title || 'CS La Colombe';
  const notificationBody = payload.notification?.body || 'Nouvelle notification';
  const notificationData = payload.data || {};
  const notificationTag = notificationData.type || 'general';
  
  // Options de notification
  const notificationOptions = {
    body: notificationBody,
    icon: 'icon-192x192.png',
    badge: 'icon-72x72.png',
    tag: notificationTag,
    data: notificationData,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    silent: false,
    actions: [
      {
        action: 'open',
        title: '👀 Voir',
        icon: './icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: '❌ Fermer',
        icon: './icons/icon-72x72.png'
      }
    ]
  };
  
  // Afficher la notification
  try {
    await self.registration.showNotification(notificationTitle, notificationOptions);
    console.log(`✅ SW: Notification affichée: ${notificationTitle}`);
    
    // Mettre à jour le badge
    await updateBadgeCount(1);
  } catch (error) {
    console.error('❌ SW: Erreur affichage notification:', error);
  }
}

// ========== GESTION BADGE ==========
async function updateBadgeCount(increment = 1) {
  try {
    if ('setAppBadge' in navigator) {
      const currentCount = await getBadgeCount();
      const newCount = currentCount + increment;
      await navigator.setAppBadge(newCount);
      console.log(`✅ SW: Badge mis à jour: ${newCount}`);
    }
  } catch (error) {
    console.error('❌ SW: Erreur badge:', error);
  }
}

async function getBadgeCount() {
  try {
    const badge = await self.registration.getNotifications();
    return badge.length;
  } catch {
    return 0;
  }
}

// ========== ÉCOUTEURS FIRESTORE EN TEMPS RÉEL ==========
async function setupFirestoreListeners(parentMatricule) {
  if (!firebaseFirestore || !parentMatricule) return;
  
  console.log(`👂 SW: Configuration écouteurs pour parent ${parentMatricule}`);
  
  // 1. ÉCOUTER LES INCIDENTS
  const incidentsQuery = firebaseFirestore
    .collection('incidents')
    .where('parentId', '==', parentMatricule)
    .orderBy('createdAt', 'desc')
    .limit(50);
  
  firebaseFirestore.collection('incidents')
    .onSnapshot(incidentsQuery, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const incident = change.doc.data();
          sendNotificationToClient({
            type: 'incident',
            title: '⚠️ Nouvel incident signalé',
            body: `${incident.studentName}: ${incident.type}`,
            data: {
              page: 'presence-incidents',
              childId: incident.studentId,
              childName: incident.studentName,
              incidentId: change.doc.id
            }
          });
        }
      });
    });
  
  // 2. ÉCOUTER LES PRÉSENCES
  const today = new Date().toISOString().split('T')[0];
  const presenceQuery = firebaseFirestore
    .collection('student_attendance')
    .where('parentId', '==', parentMatricule)
    .where('date', '==', today);
  
  firebaseFirestore.collection('student_attendance')
    .onSnapshot(presenceQuery, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const presence = change.doc.data();
          if (presence.published) {
            sendNotificationToClient({
              type: 'presence',
              title: '📅 Présence mise à jour',
              body: `${presence.studentName}: ${getStatusText(presence.status)}`,
              data: {
                page: 'presence-incidents',
                childId: presence.studentId,
                childName: presence.studentName,
                status: presence.status
              }
            });
          }
        }
      });
    });
  
  // 3. ÉCOUTER LES NOTES
  firebaseFirestore.collection('parent_grades')
    .where('parentId', '==', parentMatricule)
    .orderBy('publishedAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const grade = change.doc.data();
          sendNotificationToClient({
            type: 'grade',
            title: '📊 Nouvelle note',
            body: `${grade.studentName}: ${grade.subject} - ${grade.grade}/${grade.maxPoints}`,
            data: {
              page: 'grades',
              childId: grade.studentId,
              childName: grade.studentName,
              gradeId: change.doc.id
            }
          });
        }
      });
    });
  
  // 4. ÉCOUTER LES DEVOIRS
  firebaseFirestore.collection('homework')
    .where('parentId', '==', parentMatricule)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const homework = change.doc.data();
          sendNotificationToClient({
            type: 'homework',
            title: '📚 Nouveau devoir',
            body: `${homework.studentName}: ${homework.subject} - ${homework.title}`,
            data: {
              page: 'homework',
              childId: homework.studentId,
              childName: homework.studentName,
              homeworkId: change.doc.id
            }
          });
        }
      });
    });
  
  // 5. ÉCOUTER LES COMMUNIQUÉS
  firebaseFirestore.collection('parent_communiques')
    .where('parentId', '==', parentMatricule)
    .orderBy('publishedAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const communique = change.doc.data();
          sendNotificationToClient({
            type: 'communique',
            title: '📄 Nouveau communiqué',
            body: `${communique.title} - ${communique.feeType}`,
            data: {
              page: 'communiques',
              communiqueId: change.doc.id
            }
          });
        }
      });
    });
}

// ========== ENVOYER NOTIFICATION AU CLIENT ==========
async function sendNotificationToClient(notification) {
  // 1. Afficher notification système
  await self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: 'icon-192x192.png',
    badge: 'icon-72x72.png',
    tag: notification.type,
    data: notification.data,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: '👀 Ouvrir',
        icon: 'icon-72x72.png'
      }
    ]
  });
  
  // 2. Envoyer aux clients actifs
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  
  clients.forEach(client => {
    client.postMessage({
      type: 'NEW_NOTIFICATION',
      notification: notification
    });
  });
  
  // 3. Mettre à jour le badge
  await updateBadgeCount(1);
}

// ========== GESTION DES CLICS SUR NOTIFICATIONS ==========
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '.index.html';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focus
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          // Envoyer les données de navigation
          client.postMessage({
            type: 'NAVIGATE_TO_NOTIFICATION',
            data: notificationData
          });
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      return clients.openWindow(urlToOpen);
    })
  );
});

// ========== GESTION DES MESSAGES ==========
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'INITIALIZE_PARENT':
      currentUser = data.parentMatricule;
      setupFirestoreListeners(data.parentMatricule);
      console.log('✅ SW: Parent initialisé:', data.parentMatricule);
      break;
      
    case 'CHECK_NOW':
      console.log('🔍 SW: Vérification manuelle demandée');
      // Implémenter une vérification manuelle si nécessaire
      break;
      
    case 'CLEAR_BADGE':
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge();
      }
      break;
      
    case 'GET_STATUS':
      const client = event.source;
      client.postMessage({
        type: 'STATUS',
        data: {
          version: APP_VERSION,
          initialized: !!firebaseApp,
          user: currentUser,
          badgeSupported: 'setAppBadge' in navigator
        }
      });
      break;
  }
});

// ========== STRATÉGIE DE CACHE ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignorer les requêtes non-GET et Firebase
  if (request.method !== 'GET' || 
      request.url.includes('firestore.googleapis.com') ||
      request.url.includes('googleapis.com')) {
    return;
  }

  // Stratégie Network First, puis Cache, puis Offline
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        // Mettre en cache la réponse
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Chercher dans le cache
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Page hors ligne pour les navigations
          if (request.mode === 'navigate') {
            return caches.match('offline.html');
          }
          return new Response('', {
            status: 404,
            statusText: 'Not Found'
          });
        });
      })
  );
});

// ========== FONCTIONS UTILITAIRES ==========
function getStatusText(status) {
  const statusMap = {
    'present': '✅ Présent',
    'absent': '🚫 Absent',
    'late': '🟠 Retard'
  };
  return statusMap[status] || status;
}

console.log(`🚀 SW v${APP_VERSION} chargé`);
