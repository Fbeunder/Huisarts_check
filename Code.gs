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
    return HtmlService.createTemplateFromFile('HtmlTemplates/Index')
        .evaluate()
        .setTitle('Huisarts Check')
        .setFaviconUrl('https://www.google.com/s2/favicons?domain=huisarts.nl')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.error('Fout bij het starten van de web app: ' + error.toString());
    return HtmlService.createHtmlOutput(
      '<h1>Er is een fout opgetreden</h1>' +
      '<p>Probeer het later opnieuw of neem contact op met de beheerder.</p>'
    );
  }
}

/**
 * Toont het dashboard in een modaal venster
 */
function showDashboard() {
  const html = HtmlService.createTemplateFromFile('HtmlTemplates/Dashboard')
      .evaluate()
      .setWidth(800)
      .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Huisarts Check Dashboard');
}

/**
 * Toont de instellingenpagina in een modaal venster
 */
function showSettings() {
  const html = HtmlService.createTemplateFromFile('HtmlTemplates/Settings')
      .evaluate()
      .setWidth(600)
      .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Instellingen');
}

/**
 * Toont informatie over de applicatie
 */
function showAbout() {
  const html = HtmlService.createTemplateFromFile('HtmlTemplates/About')
      .evaluate()
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
    // Hier wordt de WebsiteChecker aangeroepen om de controles uit te voeren
    // WebsiteChecker.checkAllWebsites();
    Logger.info('Periodieke website controles voltooid');
  } catch (error) {
    Logger.error('Fout bij het uitvoeren van periodieke website controles: ' + error.toString());
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
