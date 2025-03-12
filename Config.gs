/**
 * Config.gs - Configuratie-instellingen voor de Huisarts Check applicatie
 * 
 * Dit bestand bevat constanten en configuratiewaarden die door de hele applicatie
 * worden gebruikt. Centraliseren van configuratie maakt het eenvoudiger om
 * instellingen aan te passen zonder dat in meerdere bestanden te hoeven doen.
 */

/**
 * Algemene applicatie-instellingen
 */
const CONFIG = {
  // Applicatie-informatie
  APP_NAME: 'Huisarts Check',
  APP_VERSION: '1.0.0',
  DEVELOPER: 'Stan de GitHub Agent',
  
  // Database instellingen
  // ID van de Google Spreadsheet die dient als database
  // Dit moet worden bijgewerkt nadat het spreadsheet is aangemaakt
  SPREADSHEET_ID: '',
  
  // Namen van de tabbladen in de database spreadsheet
  SHEETS: {
    USERS: 'Gebruikers',
    PRACTICES: 'Huisartsen',
    CHECKS: 'Controles',
    LOGS: 'Logs'
  },
  
  // OpenAI API instellingen
  OPENAI_API: {
    URL: 'https://api.openai.com/v1/chat/completions',
    MODEL: 'gpt-4',
    // API key moet veilig worden opgeslagen en opgehaald
    // API_KEY: PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY'),
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.2,
  },
  
  // Email instellingen
  EMAIL: {
    SENDER_NAME: 'Huisarts Check',
    SUBJECT_PREFIX: '[Huisarts Check] ',
    SUBJECT_STATUS_CHANGE: 'Status Update Huisarts',
  },
  
  // Logging-instellingen
  LOGGING: {
    // Log niveaus: ERROR, WARNING, INFO, DEBUG
    LEVEL: 'INFO',
    // Of logs naar een spreadsheet moeten worden geschreven
    SAVE_TO_SPREADSHEET: true,
    // Maximum aantal logs om te behouden in de spreadsheet
    MAX_LOGS: 1000
  },
  
  // Instellingen voor website controles
  WEBSITE_CHECKS: {
    // Aantal seconden tussen API calls om rate limiting te voorkomen
    API_CALL_DELAY: 2,
    // Maximum aantal URLs per batch
    BATCH_SIZE: 10,
    // Of screenshots moeten worden gemaakt en opgeslagen
    SAVE_SCREENSHOTS: false,
  }
};

/**
 * Functie om de spreadsheet-ID in te stellen
 * Dit moet worden uitgevoerd nadat de spreadsheet is gemaakt
 * 
 * @param {string} id - ID van de spreadsheet
 */
function setSpreadsheetId(id) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('SPREADSHEET_ID', id);
  Logger.info('Spreadsheet ID ingesteld: ' + id);
}

/**
 * Functie om de OpenAI API key in te stellen
 * Dit moet veilig worden opgeslagen in de script properties
 * 
 * @param {string} key - OpenAI API key
 */
function setOpenAIApiKey(key) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('OPENAI_API_KEY', key);
  Logger.info('OpenAI API key ingesteld');
}

/**
 * Functie om de spreadsheet-ID op te halen uit de script properties
 * 
 * @return {string} ID van de spreadsheet
 */
function getSpreadsheetId() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const id = scriptProperties.getProperty('SPREADSHEET_ID');
  
  if (!id) {
    Logger.warning('Spreadsheet ID is niet ingesteld');
  }
  
  return id;
}

/**
 * Functie om de OpenAI API key op te halen uit de script properties
 * 
 * @return {string} OpenAI API key
 */
function getOpenAIApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const key = scriptProperties.getProperty('OPENAI_API_KEY');
  
  if (!key) {
    Logger.warning('OpenAI API key is niet ingesteld');
  }
  
  return key;
}
