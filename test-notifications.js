// test-notifications.js - Script de test des notifications

class NotificationTester {
  constructor() {
    this.tests = {
      grades: 'Nouvelles notes',
      incidents: 'Nouveaux incidents',
      homework: 'Nouveaux devoirs',
      communiques: 'Nouvelles communications',
      presence: 'Nouvelles présences'
    };
  }
  
  // Tester toutes les notifications
  async testAllNotifications() {
    console.log('🧪 Test complet des notifications');
    
    for (const [type, label] of Object.entries(this.tests)) {
      await this.testNotificationType(type, label);
      await this.delay(2000); // Pause de 2 secondes entre chaque test
    }
    
    console.log('✅ Tests terminés');
  }
  
  // Tester un type spécifique
  async testNotificationType(type, label) {
    console.log(`🧪 Test: ${label}`);
    
    const testData = this.getTestData(type);
    
    // Notification locale
    showLocalNotification(
      `[TEST] ${testData.title}`,
      testData.body,
      testData.data
    );
    
    // Notification Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BACKGROUND_NOTIFICATION',
        data: {
          id: `test_${type}_${Date.now()}`,
          title: `[TEST] ${testData.title}`,
          body: testData.body,
          type: type,
          data: testData.data,
          timestamp: new Date().toISOString(),
          read: false
        }
      });
    }
    
    console.log(`✅ Test ${label} envoyé`);
  }
  
  // Données de test
  getTestData(type) {
    const testChildren = childrenList.length > 0 ? childrenList[0] : {
      matricule: 'TEST001',
      fullName: 'Élève Test',
      class: '6ème'
    };
    
    const dataMap = {
      grades: {
        title: 'Nouvelle note publiée',
        body: `${testChildren.fullName} a une nouvelle note en Mathématiques: Contrôle 1`,
        data: {
          type: 'grades',
          page: 'grades',
          childId: testChildren.matricule,
          childName: testChildren.fullName,
          subject: 'Mathématiques'
        }
      },
      incidents: {
        title: 'Nouvel incident signalé',
        body: `${testChildren.fullName}: Retard important`,
        data: {
          type: 'incidents',
          page: 'presence-incidents',
          childId: testChildren.matricule,
          childName: testChildren.fullName,
          severity: 'moyen'
        }
      },
      homework: {
        title: 'Nouveau devoir assigné',
        body: `${testChildren.fullName}: Français - Rédaction`,
        data: {
          type: 'homework',
          page: 'homework',
          childId: testChildren.matricule,
          childName: testChildren.fullName,
          dueDate: new Date().toLocaleDateString('fr-FR')
        }
      },
      communiques: {
        title: 'Nouveau communiqué',
        body: 'Communiqué de paiement: Frais scolaires - Octobre',
        data: {
          type: 'communiques',
          page: 'communiques',
          feeType: 'Frais scolaires',
          amount: '15000'
        }
      },
      presence: {
        title: 'Mise à jour présence',
        body: `${testChildren.fullName} est présent aujourd'hui`,
        data: {
          type: 'presence',
          page: 'presence-incidents',
          childId: testChildren.matricule,
          childName: testChildren.fullName,
          status: 'present'
        }
      }
    };
    
    return dataMap[type] || dataMap.grades;
  }
  
  // Délai
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Interface utilisateur de test
  createTestUI() {
    const testPanel = document.createElement('div');
    testPanel.id = 'notification-test-panel';
    testPanel.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: white;
      border: 2px solid #3498db;
      border-radius: 10px;
      padding: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 99999;
      max-width: 300px;
    `;
    
    testPanel.innerHTML = `
      <h4 style="margin-top: 0; color: #3498db;">
        <i class="fas fa-vial"></i> Test Notifications
      </h4>
      <div id="test-buttons" style="display: flex; flex-direction: column; gap: 8px;">
        ${Object.entries(this.tests).map(([type, label]) => `
          <button class="btn btn-sm" 
                  onclick="notificationTester.testNotificationType('${type}', '${label}')"
                  style="background: #f8f9fa; border: 1px solid #dee2e6; text-align: left;">
            <i class="fas fa-bell"></i> ${label}
          </button>
        `).join('')}
        <button class="btn btn-primary btn-sm" onclick="notificationTester.testAllNotifications()">
          <i class="fas fa-play"></i> Tester tout
        </button>
        <button class="btn btn-danger btn-sm" onclick="document.getElementById('notification-test-panel').remove()">
          <i class="fas fa-times"></i> Fermer
        </button>
      </div>
      <div id="test-results" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
    `;
    
    document.body.appendChild(testPanel);
  }
}

// Initialiser le testeur
window.notificationTester = new NotificationTester();

// Ajouter un bouton de test dans l'interface
function addTestButtonToUI() {
  const testBtn = document.createElement('button');
  testBtn.id = 'notification-test-btn';
  testBtn.innerHTML = '<i class="fas fa-vial"></i> Test Notif';
  testBtn.className = 'btn btn-warning btn-sm';
  testBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99998;
  `;
  testBtn.onclick = () => window.notificationTester.createTestUI();
  
  document.body.appendChild(testBtn);
}

// Ajouter au chargement
document.addEventListener('DOMContentLoaded', addTestButtonToUI);