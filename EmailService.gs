/**
 * EmailService.gs - Email notificatie functionaliteit voor de Huisarts Check applicatie
 * 
 * Deze module is verantwoordelijk voor het versturen van e-mailnotificaties aan gebruikers
 * wanneer de status van huisartsenpraktijken verandert.
 */

/**
 * EmailService klasse voor het beheren van e-mailnotificaties
 */
class EmailServiceClass {
  /**
   * Constructor voor EmailService
   */
  constructor() {
    // Niets nodig in constructor
  }
  
  /**
   * Verzendt een notificatie over een statuswijziging
   * 
   * @param {string} userId - ID van de gebruiker
   * @param {string} practiceId - ID van de praktijk
   * @param {string} oldStatus - Oude status
   * @param {string} newStatus - Nieuwe status
   * @return {Object} Resultaat van de verzendoperatie
   */
  sendStatusChangeNotification(userId, practiceId, oldStatus, newStatus) {
    try {
      Logger.info(`Versturen van statuswijziging notificatie aan gebruiker ${userId} voor praktijk ${practiceId}`);
      
      // Haal de gebruiker op
      const user = DataLayer.getUserById(userId);
      if (!user) {
        throw new Error(`Gebruiker met ID ${userId} niet gevonden`);
      }
      
      // Controleer of de gebruiker notificaties wil ontvangen
      if (!user.notificationsEnabled) {
        Logger.info(`Gebruiker ${userId} heeft notificaties uitgeschakeld, e-mail wordt niet verzonden`);
        return {
          success: false,
          message: 'Gebruiker heeft notificaties uitgeschakeld'
        };
      }
      
      // Haal de praktijk op
      const practice = DataLayer.getPracticeById(practiceId);
      if (!practice) {
        throw new Error(`Praktijk met ID ${practiceId} niet gevonden`);
      }
      
      // Controleer e-mailvoorkeuren voor deze praktijk
      const emailPreferences = this.getEmailPreferences(userId);
      const shouldSendEmail = this._shouldSendEmail(emailPreferences, practice);
      
      if (!shouldSendEmail) {
        Logger.info(`E-mail wordt niet verzonden vanwege gebruikersvoorkeuren voor praktijk ${practiceId}`);
        return {
          success: false,
          message: 'E-mail wordt niet verzonden vanwege gebruikersvoorkeuren'
        };
      }
      
      // Maak de e-mailinhoud aan
      const emailBody = this.createStatusChangeEmailBody(practice, oldStatus, newStatus);
      
      // Bepaal onderwerp
      const subject = `${CONFIG.EMAIL.SUBJECT_PREFIX}${CONFIG.EMAIL.SUBJECT_STATUS_CHANGE}: ${practice.naam}`;
      
      // Verzend de e-mail
      return this._sendEmail(user.email, subject, emailBody);
    } catch (error) {
      Logger.error(`Fout bij versturen van statuswijziging notificatie: ${error.toString()}`);
      return {
        success: false,
        message: `Fout bij versturen van notificatie: ${error.toString()}`
      };
    }
  }
  
  /**
   * Verstuurt een test e-mail om te controleren of de service werkt
   * 
   * @param {string} email - E-mailadres om naar te versturen
   * @return {Object} Resultaat van de test e-mail verzending
   */
  sendTestEmail(email) {
    try {
      Logger.info(`Versturen van test e-mail naar ${email}`);
      
      const subject = `${CONFIG.EMAIL.SUBJECT_PREFIX}Test e-mail`;
      const body = `
        <h2>Test e-mail van Huisarts Check</h2>
        <p>Dit is een test e-mail om te controleren of het notificatiesysteem correct werkt.</p>
        <p>Als u deze e-mail ontvangt, betekent dit dat het systeem correct is geconfigureerd.</p>
        <p>Met vriendelijke groet,<br>
        Het Huisarts Check team</p>
      `;
      
      return this._sendEmail(email, subject, body);
    } catch (error) {
      Logger.error(`Fout bij versturen van test e-mail: ${error.toString()}`);
      return {
        success: false,
        message: `Fout bij versturen van test e-mail: ${error.toString()}`
      };
    }
  }
  
  /**
   * Maakt de inhoud van een statuswijziging e-mail
   * 
   * @param {Object} practice - Praktijkobject
   * @param {string} oldStatus - Oude status
   * @param {string} newStatus - Nieuwe status
   * @return {string} HTML inhoud van de e-mail
   */
  createStatusChangeEmailBody(practice, oldStatus, newStatus) {
    try {
      // Bepaal de juiste teksten op basis van status
      const statusTexts = {
        'accepting': 'neemt nieuwe patiënten aan',
        'not_accepting': 'neemt geen nieuwe patiënten aan',
        'unknown': 'status onbekend'
      };
      
      const oldStatusText = statusTexts[oldStatus] || 'status onbekend';
      const newStatusText = statusTexts[newStatus] || 'status onbekend';
      
      // Bepaal de kleur voor de status indicator
      const statusColors = {
        'accepting': '#4CAF50', // Groen
        'not_accepting': '#F44336', // Rood
        'unknown': '#9E9E9E' // Grijs
      };
      
      const statusColor = statusColors[newStatus] || statusColors.unknown;
      
      // Maak een leesbare datum
      const changeDate = new Date().toLocaleDateString('nl-NL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Maak de HTML-inhoud van de e-mail
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2b5797;">Status Update voor ${practice.naam}</h2>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">De status van deze huisartsenpraktijk is veranderd:</p>
            <p style="margin: 10px 0;">
              <strong>Van:</strong> <span>${oldStatusText}</span>
            </p>
            <p style="margin: 10px 0;">
              <strong>Naar:</strong> <span style="color: ${statusColor}; font-weight: bold;">${newStatusText}</span>
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <p><strong>Huisartsenpraktijk:</strong> ${practice.naam}</p>
            <p><strong>Website:</strong> <a href="${practice.websiteUrl}" style="color: #2b5797;">${practice.websiteUrl}</a></p>
            <p><strong>Status gewijzigd op:</strong> ${changeDate}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
            <p>U ontvangt deze e-mail omdat u zich heeft aangemeld voor notificaties bij Huisarts Check.</p>
            <p>Om uw notificatievoorkeuren aan te passen, log in op uw account.</p>
          </div>
        </div>
      `;
      
      return emailBody;
    } catch (error) {
      Logger.error(`Fout bij creëren van e-mailinhoud: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Verwerkt een wachtrij van te verzenden e-mails (indien nodig voor rate limiting)
   * 
   * @return {Object} Resultaat van de verwerkingsoperatie
   */
  processEmailQueue() {
    try {
      Logger.info('Verwerken van e-mail wachtrij');
      
      // In deze implementatie gebruiken we geen wachtrij, maar dit kan later worden uitgebreid
      // als er behoefte is aan rate limiting of batch verwerking
      
      return {
        success: true,
        message: 'E-mail wachtrij verwerkt'
      };
    } catch (error) {
      Logger.error(`Fout bij verwerken van e-mail wachtrij: ${error.toString()}`);
      return {
        success: false,
        message: `Fout bij verwerken van e-mail wachtrij: ${error.toString()}`
      };
    }
  }
  
  /**
   * Haalt de e-mailvoorkeuren van een gebruiker op
   * 
   * @param {string} userId - ID van de gebruiker
   * @return {Object} E-mailvoorkeuren van de gebruiker
   */
  getEmailPreferences(userId) {
    try {
      Logger.info(`Ophalen van e-mailvoorkeuren voor gebruiker ${userId}`);
      
      // Haal de gebruiker op
      const user = DataLayer.getUserById(userId);
      if (!user) {
        throw new Error(`Gebruiker met ID ${userId} niet gevonden`);
      }
      
      // In deze fase slaan we e-mailvoorkeuren op in het gebruikersobject
      // Later kan dit worden uitgebreid naar een aparte tabel voor meer gedetailleerde voorkeuren
      
      // Standaard voorkeuren als deze niet zijn ingesteld
      const defaultPreferences = {
        notificationsEnabled: true,
        frequency: 'instant', // Opties: instant, daily, weekly
        statusesToNotify: ['accepting', 'not_accepting'], // Voor welke statuswijzigingen notificeren
        ignoredPractices: [] // IDs van praktijken waarvoor notificaties zijn uitgeschakeld
      };
      
      // Combineer de standaard voorkeuren met eventuele opgeslagen voorkeuren
      const preferences = {
        ...defaultPreferences,
        notificationsEnabled: user.notificationsEnabled,
        frequency: user.checkFrequency || defaultPreferences.frequency
      };
      
      return preferences;
    } catch (error) {
      Logger.error(`Fout bij ophalen van e-mailvoorkeuren: ${error.toString()}`);
      return {
        notificationsEnabled: false
      };
    }
  }
  
  /**
   * Werkt de e-mailvoorkeuren van een gebruiker bij
   * 
   * @param {string} userId - ID van de gebruiker
   * @param {Object} preferences - De nieuwe voorkeuren
   * @return {Object} De bijgewerkte voorkeuren
   */
  updateEmailPreferences(userId, preferences) {
    try {
      Logger.info(`Bijwerken van e-mailvoorkeuren voor gebruiker ${userId}`);
      
      // Haal de gebruiker op
      const user = DataLayer.getUserById(userId);
      if (!user) {
        throw new Error(`Gebruiker met ID ${userId} niet gevonden`);
      }
      
      // Werk de voorkeuren bij in het gebruikersobject
      // In deze fase slaan we alleen de belangrijkste voorkeuren op
      const updatedUser = DataLayer.updateUser(userId, {
        notificationsEnabled: preferences.notificationsEnabled !== undefined 
          ? preferences.notificationsEnabled 
          : user.notificationsEnabled,
        checkFrequency: preferences.frequency || user.checkFrequency
      });
      
      if (!updatedUser) {
        throw new Error('Fout bij bijwerken van gebruikersvoorkeuren');
      }
      
      // Haal de bijgewerkte voorkeuren op
      return this.getEmailPreferences(userId);
    } catch (error) {
      Logger.error(`Fout bij bijwerken van e-mailvoorkeuren: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Stuurt een e-mail naar een gebruiker
   * 
   * @param {string} recipient - E-mailadres van de ontvanger
   * @param {string} subject - Onderwerp van de e-mail
   * @param {string} body - HTML inhoud van de e-mail
   * @return {Object} Resultaat van de verzendoperatie
   * @private
   */
  _sendEmail(recipient, subject, body) {
    try {
      Logger.info(`Versturen van e-mail naar ${recipient}`);
      
      // Maak een object voor de e-mailopties
      const options = {
        htmlBody: body,
        name: CONFIG.EMAIL.SENDER_NAME,
        noReply: true
      };
      
      // Gebruik de Apps Script MailApp service om de e-mail te versturen
      MailApp.sendEmail(recipient, subject, 'Deze e-mail vereist HTML-ondersteuning', options);
      
      Logger.info('E-mail succesvol verzonden');
      return {
        success: true,
        message: 'E-mail succesvol verzonden'
      };
    } catch (error) {
      Logger.error(`Fout bij versturen van e-mail: ${error.toString()}`);
      return {
        success: false,
        message: `Fout bij versturen van e-mail: ${error.toString()}`
      };
    }
  }
  
  /**
   * Bepaalt of een e-mail verzonden moet worden op basis van de voorkeuren
   * 
   * @param {Object} preferences - E-mailvoorkeuren
   * @param {Object} practice - Praktijkobject
   * @return {boolean} true als de e-mail verzonden moet worden, anders false
   * @private
   */
  _shouldSendEmail(preferences, practice) {
    // Controleer of notificaties zijn ingeschakeld
    if (!preferences.notificationsEnabled) {
      return false;
    }
    
    // Controleer of deze praktijk is uitgesloten
    if (preferences.ignoredPractices && preferences.ignoredPractices.includes(practice.practiceId)) {
      return false;
    }
    
    // Voor nu sturen we altijd direct een e-mail bij statuswijzigingen
    // Later kan dit worden uitgebreid om rekening te houden met frequency en andere voorkeuren
    
    return true;
  }
}

// Instantieer een global EmailService object
const EmailService = new EmailServiceClass();

/**
 * Stuurt een notificatie naar een gebruiker over een statuswijziging
 * Deze functie kan worden aangeroepen vanuit WebsiteChecker
 * 
 * @param {string} userId - ID van de gebruiker
 * @param {string} practiceId - ID van de praktijk
 * @param {string} oldStatus - Oude status
 * @param {string} newStatus - Nieuwe status
 * @return {Object} Resultaat van de notificatie
 */
function sendStatusNotification(userId, practiceId, oldStatus, newStatus) {
  return EmailService.sendStatusChangeNotification(userId, practiceId, oldStatus, newStatus);
}

/**
 * Stuurt een test e-mail om de configuratie te testen
 * 
 * @param {string} email - E-mailadres om naar te versturen
 * @return {Object} Resultaat van de test
 */
function testEmailService(email) {
  return EmailService.sendTestEmail(email);
}

/**
 * Verstuurt notificaties voor alle statuswijzigingen
 * Deze functie kan worden gebruikt om alle statuswijzigingen van de dag te verwerken
 * 
 * @return {Object} Resultaat van de operatie
 */
function processAllStatusChanges() {
  try {
    Logger.info('Verwerken van alle statuswijzigingen');
    
    // Haal alle praktijken op met statuswijzigingen
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Haal controles op van de afgelopen dag
    const recentChecks = DataLayer.getChecksInDateRange(yesterday, today);
    const changedChecks = recentChecks.filter(check => check.hasChanged);
    
    if (changedChecks.length === 0) {
      Logger.info('Geen statuswijzigingen gevonden om te verwerken');
      return {
        success: true,
        message: 'Geen statuswijzigingen gevonden',
        processedCount: 0
      };
    }
    
    Logger.info(`${changedChecks.length} statuswijzigingen gevonden`);
    
    // Verwerk elke statuswijziging
    let successCount = 0;
    let errorCount = 0;
    
    for (const check of changedChecks) {
      try {
        // Haal de praktijk op
        const practice = DataLayer.getPracticeById(check.practiceId);
        if (!practice) {
          Logger.warning(`Praktijk met ID ${check.practiceId} niet gevonden, skip deze statuswijziging`);
          continue;
        }
        
        // Stuur een notificatie naar de gebruiker
        const result = EmailService.sendStatusChangeNotification(
          practice.userId, 
          practice.practiceId, 
          practice.currentStatus === check.status ? 'unknown' : practice.currentStatus, // Als gelijk, dan was het een eerste check
          check.status
        );
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          Logger.warning(`Fout bij versturen van notificatie voor praktijk ${practice.practiceId}: ${result.message}`);
        }
      } catch (checkError) {
        errorCount++;
        Logger.error(`Fout bij verwerken van statuswijziging voor check ${check.checkId}: ${checkError.toString()}`);
      }
    }
    
    return {
      success: true,
      message: `Statuswijzigingen verwerkt: ${successCount} succesvol, ${errorCount} fouten`,
      processedCount: successCount,
      errorCount: errorCount
    };
  } catch (error) {
    Logger.error(`Fout bij verwerken van alle statuswijzigingen: ${error.toString()}`);
    return {
      success: false,
      message: `Fout bij verwerken van statuswijzigingen: ${error.toString()}`
    };
  }
}
