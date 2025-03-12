/**
 * Huisarts_check - Een Apps Script applicatie om te monitoren of huisartsen nieuwe patiënten aannemen
 * 
 * Dit is het hoofdbestand met entry points voor de applicatie.
 * 
 * @author: Stan de GitHub Agent
 * @version: 1.0.0
 */

/**
 * Wordt uitgevoerd wanneer een spreadsheet met dit script wordt geopend
 * Voegt een menu toe aan de UI
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Huisarts Check')
      .addItem('Open Dashboard', 'showDashboard')
      .addSeparator()
      .addItem('Instellingen', 'showSettings')
      .addItem('Over', 'showAbout')
      .addToUi();
      
  Logger.info('Huisarts Check menu toegevoegd aan de UI');
}

/**
 * Entry point voor web app
 * @return {HtmlOutput} De HTML van de web app
 */
function doGet() {
  try {
    Logger.info('Web app gestart door gebruiker');
    
    // Gebruik de UI module om de juiste interface te renderen
    return UI.renderHome();
  } catch (error) {
    Logger.error('Fout bij het starten van de web app: ' + error.toString());
    return UI.renderError('Er is een fout opgetreden bij het starten van de applicatie. Probeer het later opnieuw of neem contact op met de beheerder.');
  }
}

/**
 * Toont het dashboard in een modaal venster
 */
function showDashboard() {
  const html = UI.renderDashboard()
      .setWidth(800)
      .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Huisarts Check Dashboard');
}

/**
 * Toont de instellingenpagina in een modaal venster
 */
function showSettings() {
  const html = UI.renderSettings()
      .setWidth(600)
      .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Instellingen');
}

/**
 * Toont informatie over de applicatie
 */
function showAbout() {
  const html = UI.renderAbout()
      .setWidth(400)
      .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Over Huisarts Check');
}

/**
 * Trigger voor het periodiek controleren van websites
 * Deze functie wordt aangeroepen door een tijdgestuurde trigger
 */
function runWebsiteChecks() {
  try {
    Logger.info('Gestart met periodieke website controles');
    // WebsiteChecker aanroepen om de controles uit te voeren
    const results = WebsiteChecker.checkAllWebsites();
    Logger.info(`Periodieke website controles voltooid: ${results.totalChecked} websites gecontroleerd, ${results.statusChanges} statuswijzigingen`);
    return results;
  } catch (error) {
    Logger.error('Fout bij het uitvoeren van periodieke website controles: ' + error.toString());
    return {
      success: false,
      message: `Fout bij uitvoeren van website controles: ${error.toString()}`
    };
  }
}

/**
 * Installeer de nodige triggers voor de applicatie
 * Deze functie moet handmatig worden uitgevoerd bij de eerste setup
 */
function setupTriggers() {
  // Verwijder bestaande triggers om duplicaten te voorkomen
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // Voeg een dagelijkse trigger toe voor website controles
  ScriptApp.newTrigger('runWebsiteChecks')
      .timeBased()
      .everyDays(1)
      .atHour(4) // Uitvoeren om 4:00
      .create();
      
  Logger.info('Triggers succesvol ingesteld');
}

/**
 * Krijg de huidige gebruiker (voor client-side gebruik)
 * 
 * @return {Object} Het gebruikersobject van de ingelogde gebruiker of null
 */
function getCurrentUser() {
  return AuthService.getCurrentUser();
}

/**
 * Controleer de login status (voor client-side gebruik)
 * 
 * @return {Object} Object met login status, gebruiker en/of auth URL
 */
function checkLoginStatus() {
  return AuthService.checkLoginStatus();
}

/**
 * Update de instellingen van de huidige gebruiker (voor client-side gebruik)
 * 
 * @param {Object} settings - De nieuwe instellingen voor de gebruiker
 * @return {Object} Het bijgewerkte gebruikersobject
 */
function updateCurrentUserSettings(settings) {
  return AuthService.updateCurrentUserSettings(settings);
}

/**
 * Maak een nieuwe huisartsenpraktijk aan (voor client-side gebruik)
 * 
 * @param {Object} practiceInfo - Informatie over de praktijk
 * @return {Object} Het aangemaakte praktijkobject
 */
function createPractice(practiceInfo) {
  return DataLayer.createPractice(practiceInfo);
}

/**
 * Verwijder een huisartsenpraktijk (voor client-side gebruik)
 * 
 * @param {string} practiceId - ID van de praktijk
 * @return {boolean} true als verwijderen is gelukt, anders false
 */
function deletePractice(practiceId) {
  return DataLayer.deletePractice(practiceId);
}

/**
 * Haal alle praktijken van een gebruiker op (voor client-side gebruik)
 * 
 * @param {string} userId - ID van de gebruiker
 * @return {Array} Array met praktijkobjecten
 */
function getPracticesByUser(userId) {
  return DataLayer.getPracticesByUser(userId);
}

/**
 * Werk een bestaande praktijk bij (voor client-side gebruik)
 * 
 * @param {string} practiceId - ID van de praktijk
 * @param {Object} updates - De bij te werken velden
 * @return {Object} Het bijgewerkte praktijkobject
 */
function updatePractice(practiceId, updates) {
  return DataLayer.updatePractice(practiceId, updates);
}

/**
 * Handmatig controleren van een specifieke website (voor client-side gebruik)
 * 
 * @param {string} url - URL van de website om te controleren
 * @param {string} userId - ID van de gebruiker die de website monitort
 * @return {Object} Resultaat van de controle
 */
function checkWebsiteManually(url, userId) {
  return WebsiteChecker.checkSingleWebsite(url, userId);
}

/**
 * Start een handmatige controle van alle websites van een gebruiker (voor client-side gebruik)
 * 
 * @param {string} userId - ID van de gebruiker
 * @return {Object} Resultaten van de controle
 */
function checkAllUserWebsites(userId) {
  try {
    Logger.info(`Starten van handmatige controle voor alle websites van gebruiker ${userId}`);
    
    // Haal alle praktijken van de gebruiker op
    const practices = DataLayer.getPracticesByUser(userId);
    
    if (!practices || practices.length === 0) {
      return {
        success: true,
        message: 'Geen huisartsenpraktijken gevonden om te controleren',
        totalChecked: 0,
        statusChanges: 0
      };
    }
    
    // Converteer praktijken naar het formaat dat WebsiteChecker.checkWebsiteBatch verwacht
    const websitesToCheck = practices.map(practice => ({
      practiceId: practice.practiceId,
      userId: userId,
      websiteUrl: practice.websiteUrl
    }));
    
    // Gebruik WebsiteChecker om de batch te controleren
    const batchResults = WebsiteChecker.checkWebsiteBatch(websitesToCheck);
    
    Logger.info(`Handmatige controle voltooid voor gebruiker ${userId}: ${batchResults.checked} websites gecontroleerd, ${batchResults.statusChanges} statuswijzigingen`);
    
    return {
      success: true,
      message: `Controle voltooid voor ${batchResults.checked} huisartsenpraktijken`,
      totalChecked: batchResults.checked,
      statusChanges: batchResults.statusChanges,
      errors: batchResults.errors
    };
  } catch (error) {
    Logger.error(`Fout bij handmatig controleren van alle websites voor gebruiker ${userId}: ${error.toString()}`);
    return {
      success: false,
      message: `Fout bij controleren van websites: ${error.toString()}`
    };
  }
}

/**
 * Toon de lijst met huisartsenpraktijken (voor client-side gebruik)
 * 
 * @return {HtmlOutput} HTML voor de lijst met praktijken
 */
function showPracticeList() {
  const user = AuthService.getCurrentUser();
  if (!user) return UI.renderContentSection('<p>U moet ingelogd zijn om uw huisartsen te bekijken.</p>');
  return UI.renderPracticeList(user.userId);
}

/**
 * Toon het formulier voor het toevoegen van een praktijk (voor client-side gebruik)
 * 
 * @return {HtmlOutput} HTML voor het formulier
 */
function showAddPracticeForm() {
  return UI.renderAddPracticeForm();
}

/**
 * Toon het formulier voor het bewerken van een praktijk (voor client-side gebruik)
 * 
 * @param {string} practiceId - ID van de praktijk
 * @return {HtmlOutput} HTML voor het formulier
 */
function showEditPracticeForm(practiceId) {
  return UI.renderEditPracticeForm(practiceId);
}

/**
 * Toon de details van een praktijk (voor client-side gebruik)
 * 
 * @param {string} practiceId - ID van de praktijk
 * @return {HtmlOutput} HTML voor de praktijkdetails
 */
function showPracticeDetail(practiceId) {
  return UI.renderPracticeDetail(practiceId);
}

/**
 * Hulpfunctie voor het insluiten van HTML-bestanden
 * 
 * @param {string} filename - Bestandsnaam om in te sluiten
 * @return {string} De inhoud van het bestand
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
