// sw.js - Service Worker UNIQUE pour PWA + Firebase Messaging
const CACHE_NAME = 'cs-lacolombe-v1';
const APP_VERSION = '1.0.0';

// Fichiers à mettre en cache
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-72x72.png',
  './icon-96x96.png',
  './icon-128x128.png',
  './icon-144x144.png',
  './icon-152x152.png',
  './icon-192x192.png',
  './icon-384x384.png',
  './icon-512x512.png',
  './offline.html'
];

// Configuration Firebase (copie exacte de votre config)
const firebaseConfig = {
  apiKey: "AIzaSyBn7VIddclO7KtrXb5sibCr9SjVLjOy-qI",
  authDomain: "theo1d.firebaseapp.com",
  projectId: "theo1d",
  storageBucket: "theo1d.firebasestorage.app",
  messagingSenderId: "269629842962",
  appId: "1:269629842962:web:a80a12b04448fe1e595acb"
};

// Clé VAPID CORRECTE (sans guillemets)
const VAPID_KEY = 'BM8H6cADaP6tiA4t9Oc9D36jk1UmYoUBV3cATlJ5mvZ_-eQ5xd6HgX5twxWvZ2U2Y98HBkJ8bTph7epPJJYqBpc';

// Initialiser Firebase dans le SW
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js');

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const db = firebase.firestore();

// --- INSTALLATION ---
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// --- ACTIVATION ---
self.addEventListener('activate', (event) => {
  console.log('🚀 SW: Activation...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// --- STRATÉGIE DE CACHE (Network First) ---
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// --- GESTION DES NOTIFICATIONS PUSH FIREBASE ---
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Push reçu en arrière-plan:', payload);
  
  const notificationTitle = payload.notification?.title || 'CS La Colombe';
  const notificationBody = payload.notification?.body || 'Nouvelle notification';
  const notificationData = payload.data || {};
  
  // Options avancées de notification
  const notificationOptions = {
    body: notificationBody,
    icon: './icon-192x192.png',
    badge: './icon-72x72.png',
    vibrate: [200, 100, 200],
    data: notificationData,
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ],
    tag: notificationData.type || 'default',
    renotify: true,
    requireInteraction: true,
    silent: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- GESTION DES ÉVÉNEMENTS SYNCHRONISATION ---
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Sync: Mise à jour des données');
    event.waitUntil(checkForNewData());
  }
});

// --- ÉCOUTEURS FIRESTORE EN TEMPS RÉEL (Dans le SW) ---
let listenersInitialized = false;

async function initializeFirestoreListeners() {
  if (listenersInitialized) return;
  
  try {
    // Récupérer les données parent depuis IndexedDB
    const parentData = await getParentDataFromDB();
    if (!parentData || !parentData.matricule) {
      console.log('⏳ En attente des données parent...');
      setTimeout(initializeFirestoreListeners, 5000);
      return;
    }
    
    console.log('👤 Parent connecté:', parentData.matricule);
    
    // 1. Écouter les INCIDENTS
    if (parentData.children) {
      parentData.children.forEach(child => {
        db.collection('incidents')
          .where('studentMatricule', '==', child.matricule)
          .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                sendPushNotification({
                  title: '⚠️ Nouvel incident',
                  body: `${child.fullName}: ${change.doc.data().type || 'Incident'}`,
                  data: {
                    type: 'incident',
                    page: 'presence-incidents',
                    childId: child.matricule
                  }
                });
              }
            });
          });
        
        // 2. Écouter les NOTES
        if (child.type === 'secondary') {
          db.collection('parent_grades')
            .where('className', '==', child.class)
            .onSnapshot((snapshot) => {
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                  const gradeData = change.doc.data();
                  const studentGrade = gradeData.grades?.find(g => g.studentMatricule === child.matricule);
                  if (studentGrade) {
                    sendPushNotification({
                      title: '📊 Nouvelle note',
                      body: `${child.fullName} - ${gradeData.subject}`,
                      data: {
                        type: 'grade',
                        page: 'grades',
                        childId: child.matricule
                      }
                    });
                  }
                }
              });
            });
        }
        
        // 3. Écouter les DEVOIRS
        if (child.type === 'secondary') {
          db.collection('homework')
            .where('className', '==', child.class)
            .onSnapshot((snapshot) => {
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                  const homework = change.doc.data();
                  sendPushNotification({
                    title: '📚 Nouveau devoir',
                    body: `${child.fullName} - ${homework.subject}`,
                    data: {
                      type: 'homework',
                      page: 'homework',
                      childId: child.matricule
                    }
                  });
                }
              });
            });
        }
        
        // 4. Écouter les PRÉSENCES
        const today = new Date().toISOString().split('T')[0];
        db.collection('student_attendance')
          .where('studentId', '==', child.matricule)
          .where('date', '==', today)
          .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added' || change.type === 'modified') {
                const presence = change.doc.data();
                if (presence.published) {
                  let statusText = '';
                  if (presence.status === 'present') statusText = 'est présent';
                  else if (presence.status === 'absent') statusText = 'est absent';
                  else if (presence.status === 'late') statusText = 'est en retard';
                  
                  sendPushNotification({
                    title: '📅 Présence',
                    body: `${child.fullName} ${statusText}`,
                    data: {
                      type: 'presence',
                      page: 'presence-incidents',
                      childId: child.matricule
                    }
                  });
                }
              }
            });
          });
      });
    }
    
    // 5. Écouter les COMMUNIQUÉS
    db.collection('parent_communique_relations')
      .where('parentId', '==', parentData.matricule)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            sendPushNotification({
              title: '📄 Nouveau communiqué',
              body: 'Communiqué de paiement disponible',
              data: {
                type: 'communique',
                page: 'communiques'
              }
            });
          }
        });
      });
    
    listenersInitialized = true;
    console.log('✅ Écouteurs Firestore activés dans le SW');
    
  } catch (error) {
    console.error('❌ Erreur initialisation écouteurs:', error);
  }
}

// Fonction pour récupérer les données parent d'IndexedDB
async function getParentDataFromDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('ParentAppDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['parent'], 'readonly');
      const store = transaction.objectStore('parent');
      const getRequest = store.get('currentParent');
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => resolve(null);
    };
    
    request.onerror = () => resolve(null);
  });
}

// Fonction pour vérifier les nouvelles données (pour sync)
async function checkForNewData() {
  // Implémentez votre logique de vérification périodique ici
  console.log('🔍 Vérification périodique des données...');
}

// Fonction pour envoyer une notification push
function sendPushNotification(notification) {
  self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: './icon-192x192.png',
    badge: './icon-72x72.png',
    vibrate: [200, 100, 200],
    data: notification.data,
    requireInteraction: true,
    tag: notification.data.type || 'default'
  });
  
  // Mettre à jour le badge
  updateAppBadge();
}

// Mise à jour du badge
async function updateAppBadge() {
  try {
    const cache = await caches.open('badge-cache');
    const response = await cache.match('badge-count');
    let count = 1;
    
    if (response) {
      count = parseInt(await response.text()) + 1;
    }
    
    await cache.put('badge-count', new Response(count.toString()));
    
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(count);
    }
    
    // Notifier les clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_BADGE',
          count: count
        });
      });
    });
    
  } catch (error) {
    console.error('Erreur badge:', error);
  }
}

// --- GESTION DES CLICS SUR NOTIFICATIONS ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Si une fenêtre est déjà ouverte, la focus
        for (const client of clientList) {
          if (client.url.includes('index.html') && 'focus' in client) {
            client.postMessage({
              type: 'NAVIGATE',
              data: data
            });
            return client.focus();
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        return clients.openWindow('./index.html');
      })
  );
});

// --- GESTION DES MESSAGES DE LA PAGE ---
self.addEventListener('message', (event) => {
  if (event.data.type === 'SAVE_PARENT_DATA') {
    const dbRequest = indexedDB.open('ParentAppDB', 1);
    
    dbRequest.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('parent')) {
        db.createObjectStore('parent', { keyPath: 'id' });
      }
    };
    
    dbRequest.onsuccess = (e) => {
      const db = e.target.result;
      const transaction = db.transaction(['parent'], 'readwrite');
      const store = transaction.objectStore('parent');
      
      store.put({
        id: 'currentParent',
        ...event.data.data,
        savedAt: new Date().toISOString()
      });
      
      transaction.oncomplete = () => {
        console.log('✅ Données parent sauvegardées');
        // Initialiser les écouteurs Firestore
        initializeFirestoreListeners();
      };
    };
  }
  
  if (event.data.type === 'CHECK_NOW') {
    checkForNewData();
  }
});

// Initialiser les écouteurs au démarrage
setTimeout(initializeFirestoreListeners, 3000);

console.log('✅ Service Worker UNIQUE chargé');