/**
 * WebsiteChecker.gs - Website monitoring functionaliteit voor de Huisarts Check applicatie
 * 
 * Deze module is verantwoordelijk voor het coördineren van het proces van het periodiek controleren 
 * van huisartsenpraktijk websites en het detecteren van statusveranderingen.
 * 
 * Belangrijk: Dit bestand vermijdt expliciete definities die conflicteren met andere modules zoals UI.gs
 */

/**
 * WebsiteChecker klasse voor het monitoren van huisartsenpraktijk websites
 */
class WebsiteCheckerClass {
  /**
   * Constructor voor WebsiteChecker
   */
  constructor() {
    // Niets nodig in constructor
  }
  
  /**
   * Controleer alle websites die monitoring nodig hebben
   * 
   * @return {Object} Resultaten van de controle met statistieken
   */
  checkAllWebsites() {
    try {
      Logger.info('Starten van controle voor alle websites');
      
      // Haal de lijst met te controleren websites op
      const websitesToCheck = this.getWebsitesToCheck();
      
      if (!websitesToCheck || websitesToCheck.length === 0) {
        Logger.info('Geen websites gevonden om te controleren');
        return { 
          success: true, 
          message: 'Geen websites om te controleren', 
          totalChecked: 0,
          statusChanges: 0
        };
      }
      
      Logger.info(`${websitesToCheck.length} websites gevonden om te controleren`);
      
      // Verdeel websites in batches voor efficiënte verwerking
      const batches = this._createBatches(websitesToCheck, CONFIG.WEBSITE_CHECKS.BATCH_SIZE);
      
      // Statistieken bijhouden
      let totalChecked = 0;
      let statusChanges = 0;
      let errors = 0;
      
      // Verwerk elke batch
      for (let i = 0; i < batches.length; i++) {
        Logger.info(`Verwerken van batch ${i+1}/${batches.length} (${batches[i].length} websites)`);
        
        const batchResults = this.checkWebsiteBatch(batches[i]);
        
        // Update statistieken
        totalChecked += batchResults.checked;
        statusChanges += batchResults.statusChanges;
        errors += batchResults.errors;
        
        // Wacht tussen batches om rate limiting te voorkomen
        if (i < batches.length - 1) {
          Utilities.sleep(CONFIG.WEBSITE_CHECKS.API_CALL_DELAY * 1000);
        }
      }
      
      Logger.info(`Alle websites gecontroleerd. Totaal: ${totalChecked}, Statuswijzigingen: ${statusChanges}, Fouten: ${errors}`);
      
      return {
        success: true,
        message: 'Alle website controles voltooid',
        totalChecked: totalChecked,
        statusChanges: statusChanges,
        errors: errors
      };
    } catch (error) {
      Logger.error(`Fout bij het controleren van alle websites: ${error.toString()}`);
      return {
        success: false,
        message: `Fout bij het controleren van websites: ${error.toString()}`,
        totalChecked: 0,
        statusChanges: 0,
        errors: 1
      };
    }
  }
  
  /**
   * Controleer een batch van websites
   * 
   * @param {Array} websites - Array met website informatie om te controleren
   * @return {Object} Resultaten van de batch controle
   */
  checkWebsiteBatch(websites) {
    try {
      let checked = 0;
      let statusChanges = 0;
      let errors = 0;
      
      // Loop door elk website in de batch
      for (let i = 0; i < websites.length; i++) {
        try {
          const website = websites[i];
          
          // Voeg een kleine vertraging toe tussen API calls
          if (i > 0) {
            Utilities.sleep(CONFIG.WEBSITE_CHECKS.API_CALL_DELAY * 1000);
          }
          
          // Controleer de individuele website
          const result = this.checkSingleWebsite(website.websiteUrl, website.userId, website.practiceId);
          
          checked++;
          if (result.statusChanged) {
            statusChanges++;
          }
        } catch (websiteError) {
          // Log de fout maar ga door met de volgende website
          Logger.error(`Fout bij controleren van website ${websites[i].websiteUrl}: ${websiteError.toString()}`);
          errors++;
        }
      }
      
      return {
        checked: checked,
        statusChanges: statusChanges,
        errors: errors
      };
    } catch (error) {
      Logger.error(`Fout bij het verwerken van een batch websites: ${error.toString()}`);
      return {
        checked: 0,
        statusChanges: 0,
        errors: 1
      };
    }
  }
  
  /**
   * Controleer een enkele praktijk
   * 
   * @param {Object} practice - Het praktijkobject
   * @return {Object} Resultaat van de controle
   */
  checkPractice(practice) {
    try {
      if (!practice || !practice.websiteUrl || !practice.userId) {
        throw new Error('Ongeldig praktijkobject');
      }
      
      Logger.info(`Controleren van praktijk: ${practice.naam} (${practice.websiteUrl})`);
      
      // Gebruik checkSingleWebsite voor de controle
      return this.checkSingleWebsite(practice.websiteUrl, practice.userId, practice.practiceId);
    } catch (error) {
      Logger.error(`Fout bij controleren van praktijk: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Controleer een enkele website
   * 
   * @param {string} url - URL van de website om te controleren
   * @param {string} userId - ID van de gebruiker die de website monitort
   * @param {string} [practiceId] - Optioneel: ID van de praktijk (indien bekend)
   * @return {Object} Resultaat van de controle
   */
  checkSingleWebsite(url, userId, practiceId) {
    try {
      Logger.info(`Controleren van website: ${url}`);
      
      // Haal de praktijk informatie op als practiceId is opgegeven, anders op basis van URL
      let practice;
      if (practiceId) {
        practice = DataLayer.getPracticeById(practiceId);
      } else {
        // Zoek de praktijk op basis van URL en userId
        const userPractices = DataLayer.getPracticesByUser(userId);
        practice = userPractices.find(p => p.websiteUrl === url);
      }
      
      // Als de praktijk niet gevonden is, kunnen we niet doorgaan
      if (!practice) {
        throw new Error(`Praktijk niet gevonden voor URL: ${url} en gebruiker: ${userId}`);
      }
      
      // Analyzeer de website met OpenAI
      const analysisResult = OpenAIService.analyzeWebsite(url);
      
      // Verwerk de resultaten
      const processedResult = this.processResults(analysisResult, practice);
      
      return processedResult;
    } catch (error) {
      Logger.error(`Fout bij controleren van website ${url}: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Verwerk de resultaten van de OpenAI analyse
   * 
   * @param {Object} analysisResult - Resultaat van de OpenAI analyse
   * @param {Object} practice - Huisartsenpraktijk object
   * @return {Object} Verwerkt resultaat
   */
  processResults(analysisResult, practice) {
    try {
      Logger.info(`Verwerken van resultaten voor praktijk ${practice.naam}`);
      
      // Mappings voor statuswaarden
      const statusMappings = {
        'ACCEPTING': 'accepting',
        'NOT_ACCEPTING': 'not_accepting',
        'UNKNOWN': 'unknown'
      };
      
      // Normaliseer de status naar het formaat dat we gebruiken in de database
      const normalizedStatus = statusMappings[analysisResult.status] || 'unknown';
      
      // Controleer of de status is veranderd
      const oldStatus = practice.currentStatus;
      const statusChanged = normalizedStatus !== oldStatus && oldStatus !== 'unknown';
      
      // Stel resultaattekst samen
      const resultText = JSON.stringify({
        status: normalizedStatus,
        confidence: analysisResult.confidence,
        details: analysisResult.details,
        reasoning: analysisResult.reasoning,
        timestamp: analysisResult.timestamp
      });
      
      // Maak een nieuwe controle aan in de database
      const checkData = {
        practiceId: practice.practiceId,
        status: normalizedStatus,
        resultText: resultText,
        hasChanged: statusChanged
      };
      
      const check = DataLayer.addCheck(checkData);
      
      // Update de praktijk in de database als de status is veranderd
      if (statusChanged) {
        Logger.info(`Status veranderd voor praktijk ${practice.naam}: ${oldStatus} -> ${normalizedStatus}`);
        
        DataLayer.updatePractice(practice.practiceId, {
          currentStatus: normalizedStatus,
          lastStatusChange: new Date()
        });
        
        // Stuur een e-mailnotificatie over de statusverandering
        try {
          // Controleer of EmailService beschikbaar is
          if (typeof EmailService !== 'undefined') {
            Logger.info(`Versturen van notificatie voor statuswijziging van praktijk ${practice.practiceId}`);
            
            // Stuur een e-mail notificatie
            const emailResult = EmailService.sendStatusChangeNotification(
              practice.userId,
              practice.practiceId,
              oldStatus,
              normalizedStatus
            );
            
            if (!emailResult.success) {
              Logger.warning(`Kon geen e-mailnotificatie verzenden: ${emailResult.message}`);
            }
          } else {
            Logger.warning('EmailService is niet beschikbaar, geen notificatie verzonden');
          }
        } catch (emailError) {
          // Vang fouten af zodat de rest van de functie nog steeds werkt
          Logger.error(`Fout bij versturen van e-mailnotificatie: ${emailError.toString()}`);
        }
      }
      
      return {
        checkId: check.checkId,
        practiceId: practice.practiceId,
        oldStatus: oldStatus,
        newStatus: normalizedStatus,
        statusChanged: statusChanged,
        timestamp: check.timestamp
      };
    } catch (error) {
      Logger.error(`Fout bij verwerken van resultaten: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Detecteer veranderingen in status
   * 
   * @param {string} newStatus - De nieuwe status
   * @param {string} oldStatus - De oude status
   * @return {boolean} True als de status is veranderd, anders false
   */
  detectStatusChanges(newStatus, oldStatus) {
    // Alleen relevant als beide statussen bekend zijn
    if (newStatus === 'unknown' || oldStatus === 'unknown') {
      return false;
    }
    
    // Controleer of de status is veranderd
    return newStatus !== oldStatus;
  }
  
  /**
   * Plan website controles
   * 
   * @return {Object} Informatie over de geplande controles
   */
  scheduleChecks() {
    try {
      Logger.info('Planning van website controles');
      
      const now = new Date();
      
      // Verwijder bestaande triggers
      const triggers = ScriptApp.getProjectTriggers();
      const websiteCheckTriggers = triggers.filter(t => t.getHandlerFunction() === 'runWebsiteChecks');
      
      websiteCheckTriggers.forEach(trigger => {
        ScriptApp.deleteTrigger(trigger);
      });
      
      // Maak een nieuwe trigger aan voor dagelijkse controles
      ScriptApp.newTrigger('runWebsiteChecks')
        .timeBased()
        .everyDays(1)
        .atHour(4) // Uitvoeren om 4:00
        .create();
      
      return {
        success: true,
        message: 'Website controles ingepland voor dagelijkse uitvoering om 4:00',
        nextCheck: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 4, 0, 0)
      };
    } catch (error) {
      Logger.error(`Fout bij plannen van website controles: ${error.toString()}`);
      return {
        success: false,
        message: `Fout bij plannen van website controles: ${error.toString()}`
      };
    }
  }
  
  /**
   * Haal de lijst met te controleren websites op
   * 
   * @return {Array} Array met websiteobjecten om te controleren
   */
  getWebsitesToCheck() {
    try {
      Logger.info('Ophalen van te controleren websites');
      
      // Haal alle praktijken op
      const allPractices = DataLayer.getAllPractices();
      
      // Bereid een lijst voor met websites om te controleren
      const websitesToCheck = [];
      
      // Bepaal voor elke praktijk of deze gecontroleerd moet worden
      for (const practice of allPractices) {
        // Haal de laatste controle op
        const latestCheck = DataLayer.getLatestCheckForPractice(practice.practiceId);
        
        // Bepaal of deze praktijk gecontroleerd moet worden
        const shouldCheck = this._shouldCheckPractice(practice, latestCheck);
        
        if (shouldCheck) {
          websitesToCheck.push({
            practiceId: practice.practiceId,
            userId: practice.userId,
            websiteUrl: practice.websiteUrl,
            lastCheck: latestCheck ? latestCheck.timestamp : null
          });
        }
      }
      
      // Sorteer op prioriteit (oudste controles eerst)
      websitesToCheck.sort((a, b) => {
        // Als er geen lastCheck is, geef hoogste prioriteit
        if (!a.lastCheck) return -1;
        if (!b.lastCheck) return 1;
        
        // Anders sorteer op oudste controle eerst
        return new Date(a.lastCheck) - new Date(b.lastCheck);
      });
      
      Logger.info(`${websitesToCheck.length} websites gevonden om te controleren`);
      return websitesToCheck;
    } catch (error) {
      Logger.error(`Fout bij ophalen van te controleren websites: ${error.toString()}`);
      return [];
    }
  }
  
  /**
   * Bepaal of een praktijk gecontroleerd moet worden
   * 
   * @param {Object} practice - Huisartsenpraktijk object
   * @param {Object} latestCheck - Het meest recente controle object (kan null zijn)
   * @return {boolean} True als de praktijk gecontroleerd moet worden, anders false
   * @private
   */
  _shouldCheckPractice(practice, latestCheck) {
    // Als er nog geen controle is uitgevoerd, controleer zeker
    if (!latestCheck) {
      return true;
    }
    
    // Controleer of de praktijk actief is
    // We gaan ervan uit dat als er geen expliciete inactieve status is, de praktijk actief is
    
    const now = new Date();
    const lastCheckTime = new Date(latestCheck.timestamp);
    
    // Bepaal de controlefrequentie - standaard dagelijks
    const checkFrequency = 1; // Dagen tussen controles
    
    // Controleer of er voldoende tijd is verstreken sinds de laatste controle
    const daysSinceLastCheck = (now - lastCheckTime) / (1000 * 60 * 60 * 24);
    
    return daysSinceLastCheck >= checkFrequency;
  }
  
  /**
   * Verdeel een array in batches van specifieke grootte
   * 
   * @param {Array} array - De array om te verdelen
   * @param {number} batchSize - Grootte van elke batch
   * @return {Array} Array van batches
   * @private
   */
  _createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
}

// Instantieer een global WebsiteChecker object
const WebsiteChecker = new WebsiteCheckerClass();

/**
 * Voert de website controles uit
 * Deze functie wordt aangeroepen door de trigger
 */
function runWebsiteChecks() {
  try {
    Logger.info('Starten van geplande website controles');
    const results = WebsiteChecker.checkAllWebsites();
    Logger.info(`Website controles voltooid. Totaal: ${results.totalChecked}, Statuswijzigingen: ${results.statusChanges}`);
    
    // Verwerk eventuele statuswijzigingen en stuur e-mails
    if (results.statusChanges > 0 && typeof processAllStatusChanges === 'function') {
      Logger.info('Verwerken van statuswijzigingen voor e-mailnotificaties');
      const emailResults = processAllStatusChanges();
      Logger.info(`E-mailnotificaties verwerkt: ${emailResults.processedCount || 0} verzonden`);
    }
    
    return results;
  } catch (error) {
    Logger.error(`Fout bij uitvoeren van website controles: ${error.toString()}`);
    return {
      success: false,
      message: `Fout bij uitvoeren van website controles: ${error.toString()}`
    };
  }
}

/**
 * Handmatig controleren van een specifieke website
 * 
 * @param {string} url - URL van de website om te controleren
 * @param {string} userId - ID van de gebruiker die de website monitort
 * @return {Object} Resultaat van de controle
 */
function checkWebsite(url, userId) {
  try {
    return WebsiteChecker.checkSingleWebsite(url, userId);
  } catch (error) {
    Logger.error(`Fout bij handmatig controleren van website ${url}: ${error.toString()}`);
    return {
      success: false,
      message: `Fout bij controleren van website: ${error.toString()}`
    };
  }
}

/**
 * Test de WebsiteChecker functionaliteit
 * 
 * @param {string} url - URL van de website om te testen
 * @return {Object} Testresultaten
 */
function testWebsiteChecker(url) {
  try {
    // Maak test gebruiker en praktijk als deze niet bestaan
    let user = DataLayer.getUserByEmail('test@example.com');
    if (!user) {
      user = DataLayer.createUser({
        email: 'test@example.com',
        naam: 'Testgebruiker'
      });
    }
    
    // Zoek bestaande praktijk of maak een nieuwe aan
    const userPractices = DataLayer.getPracticesByUser(user.userId);
    let practice = userPractices.find(p => p.websiteUrl === url);
    
    if (!practice) {
      practice = DataLayer.createPractice({
        userId: user.userId,
        naam: 'Testpraktijk',
        websiteUrl: url,
        currentStatus: 'unknown'
      });
    }
    
    // Voer een test check uit
    const result = WebsiteChecker.checkSingleWebsite(url, user.userId, practice.practiceId);
    
    return {
      success: true,
      message: 'Website check test succesvol uitgevoerd',
      userId: user.userId,
      practiceId: practice.practiceId,
      result: result
    };
  } catch (error) {
    Logger.error(`Fout bij testen van WebsiteChecker: ${error.toString()}`);
    return {
      success: false,
      message: `Fout bij testen van WebsiteChecker: ${error.toString()}`
    };
  }
}
