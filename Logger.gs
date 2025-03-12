/**
 * Logger.gs - Logging functionaliteit voor de Huisarts Check applicatie
 * 
 * Dit bestand bevat functies voor het loggen van informatie, waarschuwingen en fouten,
 * zowel naar de Google Apps Script Logs als naar een spreadsheet.
 */

/**
 * Log niveaus definiëren
 */
const LOG_LEVELS = {
  ERROR: 4,
  WARNING: 3,
  INFO: 2,
  DEBUG: 1
};

/**
 * Logger klasse voor de applicatie
 */
class CustomLogger {
  /**
   * Constructor
   */
  constructor() {
    // Niks nodig in constructor
  }
  
  /**
   * Log een debug bericht
   * 
   * @param {string} message - Het bericht om te loggen
   */
  debug(message) {
    this._log('DEBUG', message);
  }
  
  /**
   * Log een informatiebericht
   * 
   * @param {string} message - Het bericht om te loggen
   */
  info(message) {
    this._log('INFO', message);
  }
  
  /**
   * Log een waarschuwingsbericht
   * 
   * @param {string} message - Het bericht om te loggen
   */
  warning(message) {
    this._log('WARNING', message);
  }
  
  /**
   * Log een foutbericht
   * 
   * @param {string} message - Het bericht om te loggen
   */
  error(message) {
    this._log('ERROR', message);
  }
  
  /**
   * Interne log methode
   * 
   * @param {string} level - Het log niveau (DEBUG, INFO, WARNING, ERROR)
   * @param {string} message - Het bericht om te loggen
   * @private
   */
  _log(level, message) {
    // Controleer of dit logniveau moet worden gelogd op basis van de configuratie
    if (LOG_LEVELS[level] < LOG_LEVELS[CONFIG.LOGGING.LEVEL]) {
      return;
    }
    
    // Formatteer het bericht
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    // Log naar de Google Apps Script Logs
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage);
        break;
      case 'WARNING':
        console.warn(formattedMessage);
        break;
      case 'DEBUG':
      case 'INFO':
      default:
        console.info(formattedMessage);
        break;
    }
    
    // Log naar spreadsheet indien ingeschakeld
    if (CONFIG.LOGGING.SAVE_TO_SPREADSHEET) {
      this._logToSpreadsheet(timestamp, level, message);
    }
  }
  
  /**
   * Log een bericht naar de spreadsheet
   * 
   * @param {string} timestamp - Tijdstip van het log
   * @param {string} level - Het log niveau
   * @param {string} message - Het bericht om te loggen
   * @private
   */
  _logToSpreadsheet(timestamp, level, message) {
    try {
      const spreadsheetId = getSpreadsheetId();
      
      // Als er geen spreadsheet ID is ingesteld, kunnen we niet loggen
      if (!spreadsheetId) {
        console.warn('Kan niet loggen naar spreadsheet: geen spreadsheet ID ingesteld');
        return;
      }
      
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      let sheet = spreadsheet.getSheetByName(CONFIG.SHEETS.LOGS);
      
      // Als het logs-tabblad niet bestaat, maak het aan
      if (!sheet) {
        sheet = spreadsheet.insertSheet(CONFIG.SHEETS.LOGS);
        
        // Voeg headers toe
        sheet.appendRow(['Timestamp', 'Level', 'Message']);
        
        // Formatteer headers vetgedrukt
        sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
        
        // Bevries de bovenste rij
        sheet.setFrozenRows(1);
      }
      
      // Voeg log toe aan spreadsheet
      sheet.appendRow([timestamp, level, message]);
      
      // Controleer of we het maximum aantal logs overschrijden
      const numRows = sheet.getLastRow() - 1; // -1 voor de header row
      if (numRows > CONFIG.LOGGING.MAX_LOGS) {
        // Verwijder de oudste logs
        const numToDelete = numRows - CONFIG.LOGGING.MAX_LOGS;
        sheet.deleteRows(2, numToDelete);
      }
    } catch (error) {
      // Als er een fout optreedt bij het loggen, log naar de console
      console.error(`Fout bij loggen naar spreadsheet: ${error.toString()}`);
    }
  }
}

// Instantieer een global logger object
const Logger = new CustomLogger();
