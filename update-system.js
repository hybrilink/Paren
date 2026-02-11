// update-system.js - Système de vérification et d'envoi de notifications

class UpdateSystem {
  constructor() {
    this.lastCheck = 0;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.isChecking = false;
  }
  
  // Initialiser le système
  initialize(currentParent, childrenList) {
    if (!currentParent) return;
    
    this.currentParent = currentParent;
    this.childrenList = childrenList;
    
    // Vérifier immédiatement
    this.checkForNewData();
    
    // Vérifier périodiquement
    setInterval(() => this.checkForNewData(), this.checkInterval);
    
    // Vérifier quand on revient en ligne
    window.addEventListener('online', () => {
      setTimeout(() => this.checkForNewData(), 5000);
    });
    
    // Vérifier quand l'application reprend le focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => this.checkForNewData(), 3000);
      }
    });
    
    console.log('✅ Système de mise à jour initialisé');
  }
  
  // Vérifier les nouvelles données
  async checkForNewData() {
    if (this.isChecking || !this.currentParent || !this.childrenList.length) {
      return;
    }
    
    this.isChecking = true;
    
    try {
      console.log('🔍 Vérification des nouvelles données...');
      
      // Vérifier les nouvelles notes
      await this.checkNewGrades();
      
      // Vérifier les nouveaux incidents
      await this.checkNewIncidents();
      
      // Vérifier les nouveaux devoirs
      await this.checkNewHomework();
      
      // Vérifier les nouvelles présences
      await this.checkNewPresences();
      
      // Vérifier les nouveaux communiqués
      await this.checkNewCommuniques();
      
      this.lastCheck = Date.now();
      console.log('✅ Vérification terminée');
      
    } catch (error) {
      console.error('❌ Erreur vérification données:', error);
    } finally {
      this.isChecking = false;
    }
  }
  
  // Vérifier les nouvelles notes
  async checkNewGrades() {
    if (!this.currentParent?.matricule || !this.childrenList) return;
    
    const lastCheckKey = `last_grades_check_${this.currentParent.matricule}`;
    const lastCheck = localStorage.getItem(lastCheckKey) || 0;
    
    for (const child of this.childrenList) {
      if (child.type === 'secondary') {
        try {
          const gradesQuery = window.firebase.firestore()
            .collection('published_grades')
            .where('className', '==', child.class)
            .where('publishedAt', '>', new Date(parseInt(lastCheck)))
            .limit(10);
          
          const snapshot = await gradesQuery.get();
          
          snapshot.forEach(async (doc) => {
            const gradeData = doc.data();
            const hasStudentGrade = gradeData.grades?.some(g => 
              g.studentMatricule === child.matricule
            );
            
            if (hasStudentGrade) {
              await this.sendNotification({
                parentId: this.currentParent.matricule,
                title: '📊 Nouvelle note publiée',
                body: `${child.fullName} a une nouvelle note en ${gradeData.subject}`,
                data: {
                  type: 'grades',
                  page: 'grades',
                  childId: child.matricule,
                  childName: child.fullName,
                  gradeId: doc.id,
                  subject: gradeData.subject,
                  timestamp: new Date().toISOString()
                },
                priority: 'high'
              });
              
              console.log('📤 Notification note envoyée pour', child.fullName);
            }
          });
          
        } catch (error) {
          console.error(`❌ Erreur vérification notes ${child.fullName}:`, error);
        }
      }
    }
    
    localStorage.setItem(lastCheckKey, Date.now().toString());
  }
  
  // Vérifier les nouveaux incidents
  async checkNewIncidents() {
    if (!this.currentParent?.matricule || !this.childrenList) return;
    
    const lastCheckKey = `last_incidents_check_${this.currentParent.matricule}`;
    const lastCheck = localStorage.getItem(lastCheckKey) || 0;
    
    for (const child of this.childrenList) {
      try {
        const incidentsQuery = window.firebase.firestore()
          .collection('incidents')
          .where('studentMatricule', '==', child.matricule)
          .where('createdAt', '>', new Date(parseInt(lastCheck)))
          .limit(10);
        
        const snapshot = await incidentsQuery.get();
        
        snapshot.forEach(async (doc) => {
          const incident = doc.data();
          
          await this.sendNotification({
            parentId: this.currentParent.matricule,
            title: '⚠️ Nouvel incident signalé',
            body: `Incident pour ${child.fullName}: ${incident.type || 'Incident scolaire'}`,
            data: {
              type: 'incidents',
              page: 'presence-incidents',
              childId: child.matricule,
              childName: child.fullName,
              incidentId: doc.id,
              severity: incident.severity || 'moyen',
              timestamp: new Date().toISOString()
            },
            priority: 'high'
          });
          
          console.log('📤 Notification incident envoyée pour', child.fullName);
        });
        
      } catch (error) {
        console.error(`❌ Erreur vérification incidents ${child.fullName}:`, error);
      }
    }
    
    localStorage.setItem(lastCheckKey, Date.now().toString());
  }
  
  // Vérifier les nouveaux devoirs
  async checkNewHomework() {
    if (!this.currentParent?.matricule || !this.childrenList) return;
    
    const lastCheckKey = `last_homework_check_${this.currentParent.matricule}`;
    const lastCheck = localStorage.getItem(lastCheckKey) || 0;
    
    for (const child of this.childrenList) {
      if (child.type === 'secondary') {
        try {
          const homeworkQuery = window.firebase.firestore()
            .collection('homework')
            .where('className', '==', child.class)
            .where('createdAt', '>', new Date(parseInt(lastCheck)))
            .limit(10);
          
          const snapshot = await homeworkQuery.get();
          
          snapshot.forEach(async (doc) => {
            const homework = doc.data();
            
            await this.sendNotification({
              parentId: this.currentParent.matricule,
              title: '📚 Nouveau devoir assigné',
              body: `${child.fullName}: ${homework.subject} - ${homework.title}`,
              data: {
                type: 'homework',
                page: 'homework',
                childId: child.matricule,
                childName: child.fullName,
                homeworkId: doc.id,
                subject: homework.subject,
                dueDate: homework.dueDate?.toDate().toISOString(),
                timestamp: new Date().toISOString()
              },
              priority: 'normal'
            });
            
            console.log('📤 Notification devoir envoyée pour', child.fullName);
          });
          
        } catch (error) {
          console.error(`❌ Erreur vérification devoirs ${child.fullName}:`, error);
        }
      }
    }
    
    localStorage.setItem(lastCheckKey, Date.now().toString());
  }
  
  // Vérifier les nouvelles présences
  async checkNewPresences() {
    if (!this.currentParent?.matricule || !this.childrenList) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastCheckKey = `last_presence_check_${this.currentParent.matricule}_${today}`;
    const lastCheck = localStorage.getItem(lastCheckKey);
    
    if (lastCheck) return; // Déjà vérifié aujourd'hui
    
    for (const child of this.childrenList) {
      try {
        const presenceQuery = window.firebase.firestore()
          .collection('student_attendance')
          .where('studentId', '==', child.matricule)
          .where('date', '==', today)
          .limit(1);
        
        const snapshot = await presenceQuery.get();
        
        if (!snapshot.empty) {
          snapshot.forEach(async (doc) => {
            const presence = doc.data();
            
            if (presence.published === true) {
              let statusText = '';
              if (presence.status === 'present') statusText = 'est présent';
              else if (presence.status === 'absent') statusText = 'est absent';
              else if (presence.status === 'late') statusText = 'est en retard';
              
              if (statusText) {
                await this.sendNotification({
                  parentId: this.currentParent.matricule,
                  title: '📅 Mise à jour présence',
                  body: `${child.fullName} ${statusText} aujourd'hui`,
                  data: {
                    type: 'presence',
                    page: 'presence-incidents',
                    childId: child.matricule,
                    childName: child.fullName,
                    status: presence.status,
                    timestamp: new Date().toISOString()
                  },
                  priority: 'normal'
                });
                
                console.log('📤 Notification présence envoyée pour', child.fullName);
              }
            }
          });
        }
        
      } catch (error) {
        console.error(`❌ Erreur vérification présences ${child.fullName}:`, error);
      }
    }
    
    localStorage.setItem(lastCheckKey, 'checked');
  }
  
  // Vérifier les nouveaux communiqués
  async checkNewCommuniques() {
    if (!this.currentParent?.matricule) return;
    
    const lastCheckKey = `last_communiques_check_${this.currentParent.matricule}`;
    const lastCheck = localStorage.getItem(lastCheckKey) || 0;
    
    try {
      const communiquesQuery = window.firebase.firestore()
        .collection('parent_communique_relations')
        .where('parentId', '==', this.currentParent.matricule)
        .where('createdAt', '>', new Date(parseInt(lastCheck)))
        .limit(10);
      
      const snapshot = await communiquesQuery.get();
      
      snapshot.forEach(async (doc) => {
        const relation = doc.data();
        const communiqueDoc = await window.firebase.firestore()
          .collection('parent_communiques')
          .doc(relation.communiqueId)
          .get();
        
        if (communiqueDoc.exists()) {
          const communique = communiqueDoc.data();
          
          await this.sendNotification({
            parentId: this.currentParent.matricule,
            title: '📄 Nouveau communiqué de paiement',
            body: `Nouveau communiqué: ${communique.feeType} - ${communique.month}`,
            data: {
              type: 'communiques',
              page: 'communiques',
              communiqueId: relation.communiqueId,
              feeType: communique.feeType,
              amount: communique.amount,
              month: communique.month,
              deadline: communique.deadline,
              timestamp: new Date().toISOString()
            },
            priority: 'high'
          });
          
          console.log('📤 Notification communiqué envoyée');
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur vérification communiqués:', error);
    }
    
    localStorage.setItem(lastCheckKey, Date.now().toString());
  }
  
  // Envoyer une notification via Cloud Function
  async sendNotification(notificationData) {
    try {
      // Utiliser Cloud Function pour envoyer la notification
      const response = await fetch('https://us-central1-theo1d.cloudfunctions.net/sendParentNotification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Notification envoyée:', result);
      
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
      
      // Fallback: notification locale
      this.showLocalNotification(notificationData);
    }
  }
  
  // Notification locale (fallback)
  showLocalNotification(notificationData) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(notificationData.title, {
        body: notificationData.body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        data: notificationData.data,
        tag: notificationData.data.type,
        requireInteraction: true,
        silent: false
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        if (notificationData.data.page) {
          const link = document.querySelector(`.nav-menu a[data-page="${notificationData.data.page}"]`);
          if (link) link.click();
        }
      };
    }
  }
}

// Exporter l'instance
window.updateSystem = new UpdateSystem();