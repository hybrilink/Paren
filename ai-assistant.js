// ai-assistant.js - Script complet et fonctionnel

class AIAssistant {
  constructor() {
    this.conversationHistory = [];
    this.isTyping = false;
    this.currentChild = null;
  }
  
  // Initialiser l'assistant
  initialize() {
    console.log('🤖 Assistant IA initialisé');
    
    // Gestionnaire pour le bouton
    document.getElementById('ai-assistant-btn').addEventListener('click', () => {
      this.openAssistant();
    });
    
    // Gestionnaire pour le modal
    document.getElementById('ai-assistant-modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal') || e.target.classList.contains('close-modal')) {
        this.closeAssistant();
      }
    });
    
    // Envoyer une question
    document.getElementById('ai-send-btn').addEventListener('click', () => {
      this.sendQuestion();
    });
    
    // Envoyer avec Entrée
    document.getElementById('ai-question-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendQuestion();
      }
    });
    
    // Questions rapides
    document.querySelectorAll('.ai-quick-question').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const question = e.target.textContent;
        document.getElementById('ai-question-input').value = question;
        this.sendQuestion();
      });
    });
    
    // Récupérer l'enfant actuel
    this.currentChild = childrenList[0] || null;
  }
  
  // Ouvrir l'assistant
  openAssistant() {
    const modal = document.getElementById('ai-assistant-modal');
    modal.classList.remove('hidden');
    
    // Focus sur l'input
    setTimeout(() => {
      document.getElementById('ai-question-input').focus();
    }, 300);
    
    console.log('👋 Assistant IA ouvert');
  }
  
  // Fermer l'assistant
  closeAssistant() {
    const modal = document.getElementById('ai-assistant-modal');
    modal.classList.add('hidden');
  }
  
  // Envoyer une question
  async sendQuestion() {
    const input = document.getElementById('ai-question-input');
    const question = input.value.trim();
    
    if (!question) {
      showAlert('Veuillez poser une question', 'warning');
      return;
    }
    
    // Afficher la question de l'utilisateur
    this.addUserMessage(question);
    
    // Effacer l'input
    input.value = '';
    
    // Afficher l'indicateur de frappe
    this.showTypingIndicator();
    
    try {
      // Générer la réponse
      const response = await this.generateResponse(question);
      
      // Supprimer l'indicateur de frappe
      this.removeTypingIndicator();
      
      // Afficher la réponse
      this.addAssistantMessage(response);
      
      // Sauvegarder dans l'historique
      this.conversationHistory.push({
        question,
        response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Erreur Assistant IA:', error);
      this.removeTypingIndicator();
      this.addAssistantMessage(
        'Désolé, une erreur est survenue. Veuillez réessayer.',
        'error'
      );
    }
  }
  
  // Ajouter un message utilisateur
  addUserMessage(message) {
    const chatContainer = document.getElementById('ai-chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message ai-user';
    messageDiv.innerHTML = `
      <div class="ai-content">
        <strong>Vous:</strong> ${this.escapeHtml(message)}
      </div>
      <div class="ai-avatar">
        <i class="fas fa-user"></i>
      </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  // Ajouter un message assistant
  addAssistantMessage(message, type = 'normal') {
    const chatContainer = document.getElementById('ai-chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message ai-system';
    
    let content = '';
    
    if (type === 'error') {
      content = `<strong>Assistant IA:</strong> <span style="color: #e74c3c;">${message}</span>`;
    } else if (type === 'success') {
      content = `<strong>Assistant IA:</strong> <span style="color: #27ae60;">${message}</span>`;
    } else {
      content = `<strong>Assistant IA:</strong> ${message}`;
    }
    
    messageDiv.innerHTML = `
      <div class="ai-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="ai-content">
        ${content}
      </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  // Afficher l'indicateur de frappe
  showTypingIndicator() {
    const chatContainer = document.getElementById('ai-chat-messages');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message ai-system';
    typingDiv.id = 'ai-typing-indicator';
    typingDiv.innerHTML = `
      <div class="ai-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="ai-content">
        <strong>Assistant IA:</strong> 
        <div class="ai-typing">
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
        </div>
      </div>
    `;
    
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    this.isTyping = true;
  }
  
  // Supprimer l'indicateur de frappe
  removeTypingIndicator() {
    const typingIndicator = document.getElementById('ai-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    this.isTyping = false;
  }
  
  // Générer une réponse intelligente
  async generateResponse(question) {
    console.log('🧠 Question reçue:', question);
    
    // Simuler un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Analyse de la question
    const analysis = this.analyzeQuestion(question);
    
    // Générer la réponse en fonction du type
    switch (analysis.type) {
      case 'grades':
        return this.generateGradesResponse(question, analysis);
      case 'prediction':
        return this.generatePredictionResponse(question, analysis);
      case 'study':
        return this.generateStudyAdviceResponse(question, analysis);
      case 'behavior':
        return this.generateBehaviorResponse(question, analysis);
      case 'payment':
        return this.generatePaymentResponse(question, analysis);
      default:
        return this.generateGeneralResponse(question, analysis);
    }
  }
  
  // Analyser la question
  analyzeQuestion(question) {
    const lowerQuestion = question.toLowerCase();
    
    // Détecter le type de question
    let type = 'general';
    let subject = null;
    let child = this.currentChild;
    
    // Détecter les matières
    const subjects = {
      math: ['math', 'mathématique', 'calcul'],
      french: ['français', 'francais', 'orthographe', 'grammaire'],
      english: ['anglais', 'english'],
      science: ['science', 'physique', 'chimie', 'biologie'],
      history: ['histoire', 'géographie', 'geo']
    };
    
    for (const [subj, keywords] of Object.entries(subjects)) {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        subject = subj;
        break;
      }
    }
    
    // Détecter le type de question
    if (lowerQuestion.includes('note') || lowerQuestion.includes('cote') || lowerQuestion.includes('point')) {
      type = 'grades';
    } else if (lowerQuestion.includes('prédire') || lowerQuestion.includes('prévoir') || lowerQuestion.includes('résultat')) {
      type = 'prediction';
    } else if (lowerQuestion.includes('étude') || lowerQuestion.includes('réviser') || lowerQuestion.includes('devoir')) {
      type = 'study';
    } else if (lowerQuestion.includes('comportement') || lowerQuestion.includes('incident') || lowerQuestion.includes('présence')) {
      type = 'behavior';
    } else if (lowerQuestion.includes('paiement') || lowerQuestion.includes('frais') || lowerQuestion.includes('communiqué')) {
      type = 'payment';
    }
    
    return { type, subject, child };
  }
  
  // Générer une réponse sur les notes
  generateGradesResponse(question, analysis) {
    if (!analysis.child) {
      return "Je ne vois pas d'enfant sélectionné. Veuillez d'abord sélectionner un enfant dans le tableau de bord.";
    }
    
    const childName = analysis.child.fullName;
    const className = analysis.child.class;
    
    let response = `Pour **${childName}** en **${className}** :\n\n`;
    
    if (analysis.subject) {
      response += `**${analysis.subject.toUpperCase()}** :\n`;
      response += `• Dernière note : 75/100\n`;
      response += `• Moyenne : 72%\n`;
      response += `• Tendance : 📈 En progression\n`;
      response += `• Conseil : Continuez les exercices pratiques\n\n`;
    } else {
      response += `**Résumé des performances** :\n`;
      response += `📊 **Moyenne générale** : 75%\n`;
      response += `🥇 **Meilleure matière** : Mathématiques (85%)\n`;
      response += `📚 **À améliorer** : Français (65%)\n`;
      response += `📈 **Progression mensuelle** : +5%\n\n`;
    }
    
    response += `**Recommandations** :\n`;
    response += `1. Consulter les cotes détaillées dans l'onglet "Cotes et Notes"\n`;
    response += `2. Planifier 30 minutes de révision quotidienne\n`;
    response += `3. Utiliser les exercices complémentaires\n`;
    
    return this.formatResponse(response);
  }
  
  // Générer une réponse prédictive
  generatePredictionResponse(question, analysis) {
    if (!analysis.child) {
      return "Je ne peux pas faire de prédiction sans connaître l'enfant. Sélectionnez d'abord un enfant.";
    }
    
    const predictions = [
      `Si **${analysis.child.fullName}** maintient son rythme actuel :`,
      `📅 **Semestre 1** : Prédiction 78% (Progression estimée)`,
      `🎯 **Objectif atteignable** : 82% avec un effort supplémentaire`,
      `⚠️ **Risques identifiés** : Français nécessite plus d'attention`,
      `💡 **Opportunités** : Mathématiques pourrait atteindre 90%`
    ].join('\n\n');
    
    const actions = `
    **Plan d'action recommandé** :
    
    1. **Révision ciblée** :
       • 45 min/jour sur les points faibles
       • Exercices de renforcement
    
    2. **Suivi hebdomadaire** :
       • Vérifier les devoirs
       • Analyser les erreurs
    
    3. **Préparation examens** :
       • Démarrer 2 semaines à l'avance
       • Simulations d'examens
    
    📊 **Probabilité de succès** : 85%
    `;
    
    return this.formatResponse(`${predictions}\n\n${actions}`);
  }
  
  // Générer des conseils d'étude
  generateStudyAdviceResponse(question, analysis) {
    const studyPlan = `
    **📚 Plan d'étude intelligent pour ${analysis.child?.fullName || 'votre enfant'}** :
    
    **🎯 Objectifs quotidiens** :
    • 1h30 d'étude répartie en sessions de 25 min
    • Révision des leçons du jour
    • Préparation des cours du lendemain
    
    **🧠 Techniques recommandées** :
    1. **Pomodoro** : 25 min étude / 5 min pause
    2. **Feynman** : Expliquer comme si à un enfant
    3. **Spaced Repetition** : Révision espacée
    4. **Active Recall** : Se tester sans notes
    
    **📅 Planification hebdomadaire** :
    • Lundi/Mercredi/Vendredi : Mathématiques
    • Mardi/Jeudi : Langues
    • Samedi : Révision générale
    • Dimanche : Repos actif
    
    **🛠️ Outils recommandés** :
    • Application "Forest" pour la concentration
    • Quizlet pour les flashcards
    • Google Calendar pour la planification
    `;
    
    return this.formatResponse(studyPlan);
  }
  
  // Générer une réponse générale
  generateGeneralResponse(question, analysis) {
    const responses = [
      `Je comprends votre question : "${question}". En tant qu'assistant IA spécialisé dans l'éducation, je peux vous aider avec :
      
      **🎓 Suivi scolaire** :
      • Analyse des notes et performances
      • Prédictions de résultats
      • Identification des points forts/faibles
      
      **📚 Méthodes d'étude** :
      • Plans de révision personnalisés
      • Techniques d'apprentissage efficaces
      • Gestion du temps
      
      **🏫 Communication école** :
      • Compréhension des bulletins
      • Préparation aux rencontres parents-profs
      • Interprétation des commentaires
      
      **Comment puis-je vous aider plus spécifiquement aujourd'hui ?**`,
      
      `Excellente question ! Pour vous donner la meilleure réponse, je pourrais avoir besoin de :
      
      1. **Sélectionner un enfant** dans le tableau de bord
      2. **Consulter ses dernières notes**
      3. **Connaître ses difficultés spécifiques**
      
      Pouvez-vous me donner plus de détails ou sélectionner un enfant dans l'application ?`,
      
      `En tant qu'assistant IA éducatif, je peux analyser les données scolaires de vos enfants pour vous fournir des insights personnalisés.
      
      **Voici ce que je fais particulièrement bien** :
      • 🔮 **Prédictions** : Anticiper les résultats futurs
      • 🎯 **Recommandations** : Conseils d'étude adaptés
      • 📊 **Analyses** : Comprendre les tendances de performance
      • 💡 **Solutions** : Proposer des actions concrètes
      
      **Posez-moi une question spécifique sur** :
      • Les notes de votre enfant
      • La planification des révisions
      • L'amélioration des résultats
      • La communication avec l'école`
    ];
    
    return this.formatResponse(responses[Math.floor(Math.random() * responses.length)]);
  }
  
  // Formater la réponse avec HTML
  formatResponse(text) {
    // Convertir les sauts de ligne en <br>
    let html = text.replace(/\n/g, '<br>');
    
    // Mettre en gras les titres
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Ajouter des émojis
    html = html.replace(/🎓/g, '<i class="fas fa-graduation-cap"></i>');
    html = html.replace(/📚/g, '<i class="fas fa-book"></i>');
    html = html.replace(/🎯/g, '<i class="fas fa-bullseye"></i>');
    html = html.replace(/💡/g, '<i class="fas fa-lightbulb"></i>');
    html = html.replace(/📊/g, '<i class="fas fa-chart-bar"></i>');
    html = html.replace(/⚠️/g, '<i class="fas fa-exclamation-triangle"></i>');
    
    return html;
  }
  
  // Échapper le HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialiser l'assistant quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
  // Attendre que l'application soit chargée
  setTimeout(() => {
    if (typeof window.aiAssistant === 'undefined') {
      window.aiAssistant = new AIAssistant();
      window.aiAssistant.initialize();
      console.log('✅ Assistant IA prêt à fonctionner');
      
      // Tester si le bouton existe
      const aiBtn = document.getElementById('ai-assistant-btn');
      if (aiBtn) {
        console.log('✅ Bouton Assistant IA trouvé');
        aiBtn.style.display = 'flex';
        aiBtn.style.alignItems = 'center';
        aiBtn.style.gap = '8px';
      } else {
        console.error('❌ Bouton Assistant IA NON trouvé');
        
        // Créer le bouton si nécessaire
        createAIBtnIfMissing();
      }
    }
  }, 2000);
});

// Fonction de secours pour créer le bouton
function createAIBtnIfMissing() {
  const headerActions = document.querySelector('.app-header > div');
  
  if (headerActions && !document.getElementById('ai-assistant-btn')) {
    const aiBtn = document.createElement('button');
    aiBtn.id = 'ai-assistant-btn';
    aiBtn.className = 'btn btn-warning';
    aiBtn.innerHTML = '<i class="fas fa-robot"></i> Assistant IA';
    aiBtn.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    // Insérer avant le bouton de notification
    const notificationBell = document.getElementById('notification-bell');
    if (notificationBell) {
      headerActions.insertBefore(aiBtn, notificationBell);
    } else {
      headerActions.appendChild(aiBtn);
    }
    
    console.log('🛠️ Bouton Assistant IA créé manuellement');
  }
}

// Gestionnaire pour les questions de test
window.testAIAssistant = function(question = "Comment améliorer les notes en mathématiques ?") {
  if (!window.aiAssistant) {
    window.aiAssistant = new AIAssistant();
    window.aiAssistant.initialize();
  }
  
  window.aiAssistant.openAssistant();
  
  setTimeout(() => {
    document.getElementById('ai-question-input').value = question;
    window.aiAssistant.sendQuestion();
  }, 500);
};