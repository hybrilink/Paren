// index.js - Cloud Functions Firebase
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialiser Firebase Admin
admin.initializeApp();

// Collection de tokens FCM
const fcmTokensRef = admin.firestore().collection('fcm_tokens');
const parentsRef = admin.firestore().collection('parents');

// 1. Cloud Function: Envoyer une notification au parent
exports.sendParentNotification = functions.https.onRequest(async (req, res) => {
  try {
    // Vérifier la méthode HTTP
    if (req.method !== 'POST') {
      return res.status(405).send('Méthode non autorisée');
    }

    // Extraire les données de la requête
    const { parentId, title, body, data = {}, priority = 'normal' } = req.body;

    if (!parentId || !title || !body) {
      return res.status(400).send('Données manquantes');
    }

    // Récupérer le parent
    const parentDoc = await parentsRef.doc(parentId).get();
    
    if (!parentDoc.exists) {
      return res.status(404).send('Parent non trouvé');
    }

    const parentData = parentDoc.data();
    
    // Vérifier si le parent a activé les notifications
    if (parentData.notificationEnabled === false) {
      return res.status(200).json({ 
        success: false, 
        message: 'Notifications désactivées' 
      });
    }

    // Récupérer le token FCM du parent
    const fcmToken = parentData.fcmToken;
    
    if (!fcmToken) {
      return res.status(404).send('Token FCM non trouvé');
    }

    // Construire le message de notification
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sound: 'default'
      },
      token: fcmToken,
      webpush: {
        headers: {
          'Urgency': priority === 'high' ? 'high' : 'normal'
        },
        notification: {
          icon: 'https://yourdomain.com/icon-192x192.png',
          badge: 'https://yourdomain.com/icon-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: '👁️ Voir'
            },
            {
              action: 'dismiss',
              title: '❌ Ignorer'
            }
          ]
        },
        fcmOptions: {
          link: `https://yourdomain.com/index.html?page=${data.page || 'dashboard'}`
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      android: {
        priority: priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      }
    };

    // Envoyer la notification
    const response = await admin.messaging().send(message);
    
    // Enregistrer la notification dans Firestore
    await admin.firestore().collection('notifications').add({
      parentId: parentId,
      title: title,
      body: body,
      data: data,
      fcmToken: fcmToken,
      messageId: response,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent',
      priority: priority
    });

    console.log(`✅ Notification envoyée à ${parentId}: ${response}`);

    return res.status(200).json({
      success: true,
      messageId: response,
      parentId: parentId
    });

  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    
    // Enregistrer l'erreur
    if (req.body.parentId) {
      await admin.firestore().collection('notification_errors').add({
        parentId: req.body.parentId,
        error: error.message,
        data: req.body,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 2. Cloud Function: Sauvegarder le token FCM
exports.saveFCMToken = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Méthode non autorisée');
    }

    const { token, parentId } = req.body;

    if (!token || !parentId) {
      return res.status(400).send('Token ou parentId manquant');
    }

    // Vérifier si le parent existe
    const parentDoc = await parentsRef.doc(parentId).get();
    
    if (!parentDoc.exists) {
      return res.status(404).send('Parent non trouvé');
    }

    // Sauvegarder le token
    await fcmTokensRef.doc(token).set({
      token: token,
      parentId: parentId,
      platform: 'web',
      userAgent: req.headers['user-agent'] || 'inconnu',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      active: true
    }, { merge: true });

    // Mettre à jour le parent
    await parentsRef.doc(parentId).update({
      fcmToken: token,
      notificationEnabled: true,
      lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Token FCM sauvegardé pour ${parentId}`);

    return res.status(200).json({
      success: true,
      message: 'Token sauvegardé'
    });

  } catch (error) {
    console.error('❌ Erreur sauvegarde token:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. Cloud Function: Notification de test
exports.sendTestNotification = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Méthode non autorisée');
    }

    const { token, title = 'Test', body = 'Notification de test', data = {} } = req.body;

    if (!token) {
      return res.status(400).send('Token manquant');
    }

    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        type: 'test',
        timestamp: new Date().toISOString()
      },
      token: token,
      webpush: {
        notification: {
          icon: 'https://yourdomain.com/icon-192x192.png',
          badge: 'https://yourdomain.com/icon-72x72.png'
        }
      }
    };

    const response = await admin.messaging().send(message);

    console.log('✅ Notification test envoyée');

    return res.status(200).json({
      success: true,
      messageId: response
    });

  } catch (error) {
    console.error('❌ Erreur notification test:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. Cloud Function: Envoyer une notification quand une nouvelle note est publiée
exports.onNewGradePublished = functions.firestore
  .document('published_grades/{gradeId}')
  .onCreate(async (snap, context) => {
    try {
      const gradeData = snap.data();
      const { className, subject, gradeType, grades = [] } = gradeData;

      console.log(`📊 Nouvelle note publiée: ${subject} - ${className}`);

      // Pour chaque élève dans la note
      for (const studentGrade of grades) {
        const studentMatricule = studentGrade.studentMatricule;
        
        // Trouver le parent de cet élève
        const studentQuery = await admin.firestore()
          .collection('students')
          .doc(studentMatricule)
          .get();

        if (!studentQuery.exists) continue;

        const studentData = studentQuery.data();
        const parentId = studentData.parentId;

        if (!parentId) continue;

        // Récupérer le parent
        const parentDoc = await parentsRef.doc(parentId).get();
        
        if (!parentDoc.exists) continue;

        const parentData = parentDoc.data();
        
        // Vérifier si les notifications sont activées
        if (parentData.notificationEnabled === false) {
          continue;
        }

        const fcmToken = parentData.fcmToken;
        
        if (!fcmToken) {
          console.log(`⚠️ Pas de token FCM pour ${parentId}`);
          continue;
        }

        // Construire la notification
        const message = {
          notification: {
            title: '📊 Nouvelle note publiée',
            body: `${studentData.fullName} a une note en ${subject}: ${gradeType}`
          },
          data: {
            type: 'grades',
            page: 'grades',
            childId: studentMatricule,
            childName: studentData.fullName,
            subject: subject,
            gradeType: gradeType,
            gradeId: context.params.gradeId,
            timestamp: new Date().toISOString()
          },
          token: fcmToken
        };

        // Envoyer la notification
        await admin.messaging().send(message);
        
        console.log(`✅ Notification note envoyée à ${parentId} pour ${studentData.fullName}`);

        // Enregistrer dans Firestore
        await admin.firestore().collection('grade_notifications').add({
          parentId: parentId,
          studentId: studentMatricule,
          studentName: studentData.fullName,
          gradeId: context.params.gradeId,
          subject: subject,
          gradeType: gradeType,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent'
        });
      }

      return null;

    } catch (error) {
      console.error('❌ Erreur notification nouvelle note:', error);
      return null;
    }
  });

// 5. Cloud Function: Envoyer une notification quand un nouvel incident est créé
exports.onNewIncidentCreated = functions.firestore
  .document('incidents/{incidentId}')
  .onCreate(async (snap, context) => {
    try {
      const incidentData = snap.data();
      const { studentMatricule, type, severity, description } = incidentData;

      console.log(`⚠️ Nouvel incident: ${type} - ${studentMatricule}`);

      // Trouver l'élève
      const studentQuery = await admin.firestore()
        .collection('students')
        .doc(studentMatricule)
        .get();

      if (!studentQuery.exists) {
        console.log(`❌ Élève ${studentMatricule} non trouvé`);
        return null;
      }

      const studentData = studentQuery.data();
      const parentId = studentData.parentId;

      if (!parentId) {
        console.log(`⚠️ Pas de parent pour ${studentMatricule}`);
        return null;
      }

      // Récupérer le parent
      const parentDoc = await parentsRef.doc(parentId).get();
      
      if (!parentDoc.exists) {
        console.log(`❌ Parent ${parentId} non trouvé`);
        return null;
      }

      const parentData = parentDoc.data();
      
      // Vérifier les notifications
      if (parentData.notificationEnabled === false) {
        console.log(`🔕 Notifications désactivées pour ${parentId}`);
        return null;
      }

      const fcmToken = parentData.fcmToken;
      
      if (!fcmToken) {
        console.log(`⚠️ Pas de token FCM pour ${parentId}`);
        return null;
      }

      // Construire la notification
      const severityText = {
        'faible': 'faible',
        'moyen': 'moyen',
        'eleve': 'élevée'
      }[severity] || 'inconnue';

      const message = {
        notification: {
          title: '⚠️ Nouvel incident signalé',
          body: `${studentData.fullName}: ${type} (gravité ${severityText})`
        },
        data: {
          type: 'incidents',
          page: 'presence-incidents',
          childId: studentMatricule,
          childName: studentData.fullName,
          incidentType: type,
          severity: severity,
          incidentId: context.params.incidentId,
          timestamp: new Date().toISOString()
        },
        token: fcmToken,
        webpush: {
          headers: {
            'Urgency': 'high'
          }
        }
      };

      // Envoyer la notification
      await admin.messaging().send(message);
      
      console.log(`✅ Notification incident envoyée à ${parentId}`);

      // Enregistrer
      await admin.firestore().collection('incident_notifications').add({
        parentId: parentId,
        studentId: studentMatricule,
        studentName: studentData.fullName,
        incidentId: context.params.incidentId,
        type: type,
        severity: severity,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      return null;

    } catch (error) {
      console.error('❌ Erreur notification incident:', error);
      return null;
    }
  });

// 6. Cloud Function: Nettoyer les tokens obsolètes
exports.cleanupOldTokens = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    console.log('🧹 Nettoyage des tokens obsolètes...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 jours

    const oldTokensQuery = fcmTokensRef
      .where('lastUsed', '<', cutoffDate)
      .where('active', '==', true);

    const snapshot = await oldTokensQuery.get();
    
    let cleanedCount = 0;

    const batch = admin.firestore().batch();
    
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { active: false });
      cleanedCount++;
    });

    if (cleanedCount > 0) {
      await batch.commit();
      console.log(`✅ ${cleanedCount} tokens désactivés`);
    } else {
      console.log('✅ Aucun token à nettoyer');
    }

    return null;

  } catch (error) {
    console.error('❌ Erreur nettoyage tokens:', error);
    return null;
  }
});

// 7. Cloud Function: Statistiques des notifications
exports.getNotificationStats = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).send('Méthode non autorisée');
    }

    const { parentId, days = 7 } = req.query;

    if (!parentId) {
      return res.status(400).send('parentId requis');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Statistiques des notifications envoyées
    const notificationsQuery = admin.firestore()
      .collection('notifications')
      .where('parentId', '==', parentId)
      .where('sentAt', '>', cutoffDate);

    const snapshot = await notificationsQuery.get();
    
    const stats = {
      total: snapshot.size,
      byType: {},
      byStatus: {},
      byDay: {}
    };

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Par type
      const type = data.data?.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      // Par statut
      const status = data.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Par jour
      const day = data.sentAt?.toDate().toISOString().split('T')[0] || 'unknown';
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      stats: stats,
      parentId: parentId,
      period: `${days} jours`
    });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});