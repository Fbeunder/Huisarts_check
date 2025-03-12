/**
 * DataLayer.gs - Database operaties voor de Huisarts Check applicatie
 * 
 * Dit bestand bevat functies voor interactie met de Google Spreadsheet database.
 * Het biedt CRUD-operaties voor gebruikers, huisartsenpraktijken en controles.
 */

/**
 * DataLayer klasse voor database operaties
 */
class DataLayerClass {
  /**
   * Constructor
   */
  constructor() {
    // Niets nodig in constructor
  }
  
  /**
   * Initialiseert de database als deze nog niet bestaat
   * Maakt de benodigde tabbladen aan en voegt headers toe
   * 
   * @return {boolean} true als initialisatie succesvol was, anders false
   */
  initializeDatabase() {
    try {
      const spreadsheetId = getSpreadsheetId();
      
      if (!spreadsheetId) {
        Logger.error('Kan database niet initialiseren: geen spreadsheet ID ingesteld');
        return false;
      }
      
      Logger.info('Initialiseren van database met ID: ' + spreadsheetId);
      
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      
      // Tabblad voor gebruikers
      this._initializeSheet(spreadsheet, CONFIG.SHEETS.USERS, [
        'userId', 'email', 'naam', 'dateCreated', 'lastLogin', 
        'isActive', 'isAdmin', 'notificationsEnabled', 'checkFrequency'
      ]);
      
      // Tabblad voor huisartsenpraktijken
      this._initializeSheet(spreadsheet, CONFIG.SHEETS.PRACTICES, [
        'practiceId', 'userId', 'naam', 'websiteUrl', 'currentStatus',
        'lastStatusChange', 'createdAt', 'updatedAt', 'notes'
      ]);
      
      // Tabblad voor controles
      this._initializeSheet(spreadsheet, CONFIG.SHEETS.CHECKS, [
        'checkId', 'practiceId', 'timestamp', 'status', 'resultText', 'hasChanged'
      ]);
      
      // Tabblad voor logs (indien niet al geïnitialiseerd door Logger.gs)
      this._initializeSheet(spreadsheet, CONFIG.SHEETS.LOGS, [
        'timestamp', 'level', 'message'
      ]);
      
      Logger.info('Database succesvol geïnitialiseerd');
      return true;
    } catch (error) {
      Logger.error('Fout bij initialiseren van database: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Initialiseert een tabblad met headers
   * 
   * @param {Spreadsheet} spreadsheet - De spreadsheet
   * @param {string} sheetName - Naam van het tabblad
   * @param {Array} headers - Array met header namen
   * @private
   */
  _initializeSheet(spreadsheet, sheetName, headers) {
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    // Als het tabblad niet bestaat, maak het aan
    if (!sheet) {
      Logger.info(`Aanmaken van tabblad: ${sheetName}`);
      sheet = spreadsheet.insertSheet(sheetName);
      
      // Voeg headers toe
      sheet.appendRow(headers);
      
      // Formatteer headers vetgedrukt
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      
      // Bevries de bovenste rij
      sheet.setFrozenRows(1);
    } else {
      Logger.info(`Tabblad ${sheetName} bestaat al`);
    }
  }
  
  /**
   * Controleert of het verbinden met de database is gelukt
   * 
   * @return {boolean} true als verbinding gelukt is, anders false
   */
  checkConnection() {
    try {
      const spreadsheetId = getSpreadsheetId();
      
      if (!spreadsheetId) {
        return false;
      }
      
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      
      // Controleer of de vereiste tabbladen bestaan
      const allSheetsExist = Object.values(CONFIG.SHEETS).every(
        sheetName => spreadsheet.getSheetByName(sheetName) !== null
      );
      
      return allSheetsExist;
    } catch (error) {
      Logger.error('Fout bij controleren van database verbinding: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Genereert een uniek ID
   * 
   * @return {string} Een uniek ID
   * @private
   */
  _generateId() {
    return Utilities.getUuid();
  }
  
  /**
   * Haalt de spreadsheet op
   * 
   * @return {Spreadsheet} De spreadsheet voor de database
   * @private
   */
  _getSpreadsheet() {
    const spreadsheetId = getSpreadsheetId();
    
    if (!spreadsheetId) {
      throw new Error('Geen spreadsheet ID ingesteld');
    }
    
    return SpreadsheetApp.openById(spreadsheetId);
  }
  
  /**
   * Haalt een tabblad op basis van naam op
   * 
   * @param {string} sheetName - Naam van het tabblad
   * @return {Sheet} Het tabblad
   * @private
   */
  _getSheet(sheetName) {
    const spreadsheet = this._getSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Tabblad '${sheetName}' niet gevonden`);
    }
    
    return sheet;
  }
  
  /**
   * Zoekt de index van een rij op basis van ID kolom en waarde
   * 
   * @param {Sheet} sheet - Het tabblad
   * @param {string} idColumnName - Naam van de ID kolom
   * @param {string} idValue - Waarde van de ID
   * @return {number} Row index of -1 als niet gevonden
   * @private
   */
  _findRowIndex(sheet, idColumnName, idValue) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumnIndex = headers.indexOf(idColumnName);
    
    if (idColumnIndex === -1) {
      throw new Error(`Kolom '${idColumnName}' niet gevonden`);
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumnIndex] === idValue) {
        return i + 1; // +1 because array is 0-indexed, but sheets are 1-indexed
      }
    }
    
    return -1; // Not found
  }
  
  /**
   * Haalt de headers van een tabblad op
   * 
   * @param {Sheet} sheet - Het tabblad
   * @return {Array} Array met headers
   * @private
   */
  _getHeaders(sheet) {
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  
  /**
   * Converteert een rij data en headers naar een object
   * 
   * @param {Array} headers - Array met headers
   * @param {Array} rowData - Array met rij data
   * @return {Object} Object met de data
   * @private
   */
  _rowToObject(headers, rowData) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = rowData[index];
    });
    return obj;
  }
  
  /**
   * Converteert een object naar een rij data
   * 
   * @param {Array} headers - Array met headers
   * @param {Object} obj - Object met data
   * @return {Array} Array met rij data
   * @private
   */
  _objectToRow(headers, obj) {
    return headers.map(header => obj[header] || '');
  }
  
  // --- Gebruikersbeheer functies ---
  
  /**
   * Maakt een nieuwe gebruiker aan
   * 
   * @param {Object} userInfo - Informatie over de gebruiker
   * @return {Object} Het aangemaakte gebruikersobject, inclusief ID
   */
  createUser(userInfo) {
    try {
      Logger.info('Aanmaken van nieuwe gebruiker: ' + JSON.stringify(userInfo));
      
      // Genereer een uniek ID als deze niet is opgegeven
      const userId = userInfo.userId || this._generateId();
      
      // Haal het gebruikers-tabblad op
      const sheet = this._getSheet(CONFIG.SHEETS.USERS);
      const headers = this._getHeaders(sheet);
      
      // Controleer of de gebruiker al bestaat op basis van e-mail
      if (userInfo.email && this.getUserByEmail(userInfo.email)) {
        throw new Error('Een gebruiker met dit e-mailadres bestaat al');
      }
      
      // Bereid de gebruikersdata voor
      const now = new Date();
      const userData = {
        userId: userId,
        email: userInfo.email || '',
        naam: userInfo.naam || '',
        dateCreated: now,
        lastLogin: now,
        isActive: userInfo.isActive !== undefined ? userInfo.isActive : true,
        isAdmin: userInfo.isAdmin !== undefined ? userInfo.isAdmin : false,
        notificationsEnabled: userInfo.notificationsEnabled !== undefined ? userInfo.notificationsEnabled : true,
        checkFrequency: userInfo.checkFrequency || 'daily'
      };
      
      // Voeg de nieuwe gebruiker toe
      sheet.appendRow(this._objectToRow(headers, userData));
      
      Logger.info('Nieuwe gebruiker aangemaakt met ID: ' + userId);
      return userData;
    } catch (error) {
      Logger.error('Fout bij aanmaken van gebruiker: ' + error.toString());
      throw error;
    }
  }
  
  /**
   * Haalt een gebruiker op basis van ID op
   * 
   * @param {string} userId - ID van de gebruiker
   * @return {Object|null} Het gebruikersobject of null als niet gevonden
   */
  getUserById(userId) {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.USERS);
      const headers = this._getHeaders(sheet);
      const rowIndex = this._findRowIndex(sheet, 'userId', userId);
      
      if (rowIndex === -1) {
        return null;
      }
      
      const userData = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      return this._rowToObject(headers, userData);
    } catch (error) {
      Logger.error('Fout bij ophalen van gebruiker met ID ' + userId + ': ' + error.toString());
      return null;
    }
  }
  
  /**
   * Haalt een gebruiker op basis van e-mail op
   * 
   * @param {string} email - E-mailadres van de gebruiker
   * @return {Object|null} Het gebruikersobject of null als niet gevonden
   */
  getUserByEmail(email) {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.USERS);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const emailIndex = headers.indexOf('email');
      
      if (emailIndex === -1) {
        throw new Error('Kolom \'email\' niet gevonden');
      }
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][emailIndex] === email) {
          return this._rowToObject(headers, data[i]);
        }
      }
      
      return null;
    } catch (error) {
      Logger.error('Fout bij ophalen van gebruiker met e-mail ' + email + ': ' + error.toString());
      return null;
    }
  }
  
  /**
   * Werkt een bestaande gebruiker bij
   * 
   * @param {string} userId - ID van de gebruiker
   * @param {Object} updates - Velden om bij te werken
   * @return {Object|null} Het bijgewerkte gebruikersobject of null bij fout
   */
  updateUser(userId, updates) {
    try {
      Logger.info('Bijwerken van gebruiker met ID ' + userId);
      
      const sheet = this._getSheet(CONFIG.SHEETS.USERS);
      const headers = this._getHeaders(sheet);
      const rowIndex = this._findRowIndex(sheet, 'userId', userId);
      
      if (rowIndex === -1) {
        throw new Error('Gebruiker niet gevonden');
      }
      
      // Huidige data ophalen
      const currentData = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      const currentUser = this._rowToObject(headers, currentData);
      
      // Data bijwerken (maar userId behouden)
      const updatedUser = { ...currentUser, ...updates, userId };
      
      // Bijgewerkte data terugschrijven
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([
        this._objectToRow(headers, updatedUser)
      ]);
      
      Logger.info('Gebruiker succesvol bijgewerkt');
      return updatedUser;
    } catch (error) {
      Logger.error('Fout bij bijwerken van gebruiker: ' + error.toString());
      return null;
    }
  }
  
  /**
   * Verwijdert een gebruiker
   * 
   * @param {string} userId - ID van de gebruiker
   * @return {boolean} true als verwijderen is gelukt, anders false
   */
  deleteUser(userId) {
    try {
      Logger.info('Verwijderen van gebruiker met ID ' + userId);
      
      const sheet = this._getSheet(CONFIG.SHEETS.USERS);
      const rowIndex = this._findRowIndex(sheet, 'userId', userId);
      
      if (rowIndex === -1) {
        throw new Error('Gebruiker niet gevonden');
      }
      
      sheet.deleteRow(rowIndex);
      Logger.info('Gebruiker succesvol verwijderd');
      return true;
    } catch (error) {
      Logger.error('Fout bij verwijderen van gebruiker: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Haalt alle gebruikers op
   * 
   * @return {Array} Array met gebruikersobjecten
   */
  getAllUsers() {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.USERS);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // Converteer data naar array van objecten, sla de headers over
      return data.slice(1).map(row => this._rowToObject(headers, row));
    } catch (error) {
      Logger.error('Fout bij ophalen van alle gebruikers: ' + error.toString());
      return [];
    }
  }
  
  // --- Huisartsenpraktijk beheer functies ---
  
  /**
   * Maakt een nieuwe huisartsenpraktijk aan
   * 
   * @param {Object} practiceInfo - Informatie over de praktijk
   * @return {Object} Het aangemaakte praktijkobject, inclusief ID
   */
  createPractice(practiceInfo) {
    try {
      Logger.info('Aanmaken van nieuwe huisartsenpraktijk');
      
      if (!practiceInfo.userId) {
        throw new Error('UserId is verplicht voor het aanmaken van een praktijk');
      }
      
      if (!practiceInfo.websiteUrl) {
        throw new Error('WebsiteUrl is verplicht voor het aanmaken van een praktijk');
      }
      
      // Genereer een uniek ID als deze niet is opgegeven
      const practiceId = practiceInfo.practiceId || this._generateId();
      
      // Haal het praktijken-tabblad op
      const sheet = this._getSheet(CONFIG.SHEETS.PRACTICES);
      const headers = this._getHeaders(sheet);
      
      // Bereid de praktijkdata voor
      const now = new Date();
      const practiceData = {
        practiceId: practiceId,
        userId: practiceInfo.userId,
        naam: practiceInfo.naam || 'Onbekende praktijk',
        websiteUrl: practiceInfo.websiteUrl,
        currentStatus: practiceInfo.currentStatus || 'onbekend',
        lastStatusChange: practiceInfo.lastStatusChange || now,
        createdAt: now,
        updatedAt: now,
        notes: practiceInfo.notes || ''
      };
      
      // Voeg de nieuwe praktijk toe
      sheet.appendRow(this._objectToRow(headers, practiceData));
      
      Logger.info('Nieuwe huisartsenpraktijk aangemaakt met ID: ' + practiceId);
      return practiceData;
    } catch (error) {
      Logger.error('Fout bij aanmaken van huisartsenpraktijk: ' + error.toString());
      throw error;
    }
  }
  
  /**
   * Haalt een huisartsenpraktijk op basis van ID op
   * 
   * @param {string} practiceId - ID van de praktijk
   * @return {Object|null} Het praktijkobject of null als niet gevonden
   */
  getPracticeById(practiceId) {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.PRACTICES);
      const headers = this._getHeaders(sheet);
      const rowIndex = this._findRowIndex(sheet, 'practiceId', practiceId);
      
      if (rowIndex === -1) {
        return null;
      }
      
      const practiceData = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      return this._rowToObject(headers, practiceData);
    } catch (error) {
      Logger.error('Fout bij ophalen van praktijk met ID ' + practiceId + ': ' + error.toString());
      return null;
    }
  }
  
  /**
   * Werkt een bestaande huisartsenpraktijk bij
   * 
   * @param {string} practiceId - ID van de praktijk
   * @param {Object} updates - Velden om bij te werken
   * @return {Object|null} Het bijgewerkte praktijkobject of null bij fout
   */
  updatePractice(practiceId, updates) {
    try {
      Logger.info('Bijwerken van praktijk met ID ' + practiceId);
      
      const sheet = this._getSheet(CONFIG.SHEETS.PRACTICES);
      const headers = this._getHeaders(sheet);
      const rowIndex = this._findRowIndex(sheet, 'practiceId', practiceId);
      
      if (rowIndex === -1) {
        throw new Error('Praktijk niet gevonden');
      }
      
      // Huidige data ophalen
      const currentData = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      const currentPractice = this._rowToObject(headers, currentData);
      
      // Als de status is veranderd, update lastStatusChange
      if (updates.currentStatus && updates.currentStatus !== currentPractice.currentStatus) {
        updates.lastStatusChange = new Date();
      }
      
      // Data bijwerken (maar practiceId behouden)
      const updatedPractice = { 
        ...currentPractice, 
        ...updates, 
        practiceId,
        updatedAt: new Date() 
      };
      
      // Bijgewerkte data terugschrijven
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([
        this._objectToRow(headers, updatedPractice)
      ]);
      
      Logger.info('Praktijk succesvol bijgewerkt');
      return updatedPractice;
    } catch (error) {
      Logger.error('Fout bij bijwerken van praktijk: ' + error.toString());
      return null;
    }
  }
  
  /**
   * Verwijdert een huisartsenpraktijk
   * 
   * @param {string} practiceId - ID van de praktijk
   * @return {boolean} true als verwijderen is gelukt, anders false
   */
  deletePractice(practiceId) {
    try {
      Logger.info('Verwijderen van praktijk met ID ' + practiceId);
      
      const sheet = this._getSheet(CONFIG.SHEETS.PRACTICES);
      const rowIndex = this._findRowIndex(sheet, 'practiceId', practiceId);
      
      if (rowIndex === -1) {
        throw new Error('Praktijk niet gevonden');
      }
      
      sheet.deleteRow(rowIndex);
      Logger.info('Praktijk succesvol verwijderd');
      return true;
    } catch (error) {
      Logger.error('Fout bij verwijderen van praktijk: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Haalt alle huisartsenpraktijken op
   * 
   * @return {Array} Array met praktijkobjecten
   */
  getAllPractices() {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.PRACTICES);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // Converteer data naar array van objecten, sla de headers over
      return data.slice(1).map(row => this._rowToObject(headers, row));
    } catch (error) {
      Logger.error('Fout bij ophalen van alle praktijken: ' + error.toString());
      return [];
    }
  }
  
  /**
   * Haalt alle huisartsenpraktijken van een specifieke gebruiker op
   * 
   * @param {string} userId - ID van de gebruiker
   * @return {Array} Array met praktijkobjecten
   */
  getPracticesByUser(userId) {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.PRACTICES);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const userIdIndex = headers.indexOf('userId');
      
      if (userIdIndex === -1) {
        throw new Error('Kolom \'userId\' niet gevonden');
      }
      
      // Filter op praktijken van de specifieke gebruiker
      const userPractices = data.slice(1).filter(row => row[userIdIndex] === userId);
      
      // Converteer data naar array van objecten
      return userPractices.map(row => this._rowToObject(headers, row));
    } catch (error) {
      Logger.error('Fout bij ophalen van praktijken voor gebruiker ' + userId + ': ' + error.toString());
      return [];
    }
  }
  
  // --- Controlebeheer functies ---
  
  /**
   * Voegt een nieuwe controle toe
   * 
   * @param {Object} checkInfo - Informatie over de controle
   * @return {Object} Het aangemaakte controle-object, inclusief ID
   */
  addCheck(checkInfo) {
    try {
      Logger.info('Toevoegen van nieuwe controle voor praktijk ' + checkInfo.practiceId);
      
      if (!checkInfo.practiceId) {
        throw new Error('PracticeId is verplicht voor het toevoegen van een controle');
      }
      
      // Genereer een uniek ID als deze niet is opgegeven
      const checkId = checkInfo.checkId || this._generateId();
      
      // Haal het controles-tabblad op
      const sheet = this._getSheet(CONFIG.SHEETS.CHECKS);
      const headers = this._getHeaders(sheet);
      
      // Bereid de controledata voor
      const checkData = {
        checkId: checkId,
        practiceId: checkInfo.practiceId,
        timestamp: checkInfo.timestamp || new Date(),
        status: checkInfo.status || 'onbekend',
        resultText: checkInfo.resultText || '',
        hasChanged: checkInfo.hasChanged !== undefined ? checkInfo.hasChanged : false
      };
      
      // Voeg de nieuwe controle toe
      sheet.appendRow(this._objectToRow(headers, checkData));
      
      Logger.info('Nieuwe controle toegevoegd met ID: ' + checkId);
      return checkData;
    } catch (error) {
      Logger.error('Fout bij toevoegen van controle: ' + error.toString());
      throw error;
    }
  }
  
  /**
   * Haalt alle controles voor een specifieke praktijk op
   * 
   * @param {string} practiceId - ID van de praktijk
   * @return {Array} Array met controle-objecten
   */
  getChecksByPractice(practiceId) {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.CHECKS);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const practiceIdIndex = headers.indexOf('practiceId');
      
      if (practiceIdIndex === -1) {
        throw new Error('Kolom \'practiceId\' niet gevonden');
      }
      
      // Filter op controles voor de specifieke praktijk
      const practiceChecks = data.slice(1).filter(row => row[practiceIdIndex] === practiceId);
      
      // Converteer data naar array van objecten
      return practiceChecks.map(row => this._rowToObject(headers, row));
    } catch (error) {
      Logger.error('Fout bij ophalen van controles voor praktijk ' + practiceId + ': ' + error.toString());
      return [];
    }
  }
  
  /**
   * Haalt alle controles voor praktijken van een specifieke gebruiker op
   * 
   * @param {string} userId - ID van de gebruiker
   * @return {Array} Array met controle-objecten
   */
  getChecksByUser(userId) {
    try {
      // Haal eerst alle praktijken van de gebruiker op
      const userPractices = this.getPracticesByUser(userId);
      const practiceIds = userPractices.map(practice => practice.practiceId);
      
      // Als er geen praktijken zijn, return een lege array
      if (practiceIds.length === 0) {
        return [];
      }
      
      // Haal alle controles op
      const sheet = this._getSheet(CONFIG.SHEETS.CHECKS);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const practiceIdIndex = headers.indexOf('practiceId');
      
      if (practiceIdIndex === -1) {
        throw new Error('Kolom \'practiceId\' niet gevonden');
      }
      
      // Filter op controles voor de praktijken van de gebruiker
      const userChecks = data.slice(1).filter(row => practiceIds.includes(row[practiceIdIndex]));
      
      // Converteer data naar array van objecten
      return userChecks.map(row => this._rowToObject(headers, row));
    } catch (error) {
      Logger.error('Fout bij ophalen van controles voor gebruiker ' + userId + ': ' + error.toString());
      return [];
    }
  }
  
  /**
   * Haalt de meest recente controle voor een specifieke praktijk op
   * 
   * @param {string} practiceId - ID van de praktijk
   * @return {Object|null} Het meest recente controle-object of null
   */
  getLatestCheckForPractice(practiceId) {
    try {
      const checks = this.getChecksByPractice(practiceId);
      
      if (checks.length === 0) {
        return null;
      }
      
      // Sorteer op timestamp (nieuwste eerst) en return de eerste
      return checks.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      })[0];
    } catch (error) {
      Logger.error('Fout bij ophalen van laatste controle voor praktijk ' + practiceId + ': ' + error.toString());
      return null;
    }
  }
  
  /**
   * Haalt controles op binnen een specifieke datum range
   * 
   * @param {Date} startDate - Begin datum
   * @param {Date} endDate - Eind datum
   * @return {Array} Array met controle-objecten
   */
  getChecksInDateRange(startDate, endDate) {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.CHECKS);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const timestampIndex = headers.indexOf('timestamp');
      
      if (timestampIndex === -1) {
        throw new Error('Kolom \'timestamp\' niet gevonden');
      }
      
      // Converteer Date objecten naar timestamps voor vergelijking
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();
      
      // Filter op controles binnen de datum range
      const checksInRange = data.slice(1).filter(row => {
        const checkTime = new Date(row[timestampIndex]).getTime();
        return checkTime >= startTime && checkTime <= endTime;
      });
      
      // Converteer data naar array van objecten
      return checksInRange.map(row => this._rowToObject(headers, row));
    } catch (error) {
      Logger.error('Fout bij ophalen van controles in datum range: ' + error.toString());
      return [];
    }
  }
  
  // --- Logger-integratie functies ---
  
  /**
   * Voegt een logbericht toe aan het logs-tabblad
   * 
   * @param {Object} logInfo - Informatie over het logbericht
   * @return {boolean} true als toevoegen is gelukt, anders false
   */
  addLogEntry(logInfo) {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.LOGS);
      const headers = this._getHeaders(sheet);
      
      // Bereid de logdata voor
      const logData = {
        timestamp: logInfo.timestamp || new Date().toISOString(),
        level: logInfo.level || 'INFO',
        message: logInfo.message || ''
      };
      
      // Voeg het logbericht toe
      sheet.appendRow(this._objectToRow(headers, logData));
      
      // Controleer of we het maximum aantal logs overschrijden
      const numRows = sheet.getLastRow() - 1; // -1 voor de header row
      if (numRows > CONFIG.LOGGING.MAX_LOGS) {
        // Verwijder de oudste logs
        const numToDelete = numRows - CONFIG.LOGGING.MAX_LOGS;
        sheet.deleteRows(2, numToDelete);
      }
      
      return true;
    } catch (error) {
      // We loggen niet naar Logger om oneindige recursie te voorkomen
      console.error('Fout bij toevoegen van logbericht: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Haalt logberichten op met filtering opties
   * 
   * @param {Object} options - Opties voor filtering (level, startDate, endDate, limit)
   * @return {Array} Array met logbericht-objecten
   */
  getLogEntries(options = {}) {
    try {
      const sheet = this._getSheet(CONFIG.SHEETS.LOGS);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // Bereid indices voor voor filtering
      const timestampIndex = headers.indexOf('timestamp');
      const levelIndex = headers.indexOf('level');
      
      if (timestampIndex === -1 || levelIndex === -1) {
        throw new Error('Vereiste kolommen niet gevonden');
      }
      
      // Filter op basis van opties
      let filteredLogs = data.slice(1);
      
      // Filter op level
      if (options.level) {
        filteredLogs = filteredLogs.filter(row => row[levelIndex] === options.level);
      }
      
      // Filter op datum range
      if (options.startDate || options.endDate) {
        filteredLogs = filteredLogs.filter(row => {
          const logTime = new Date(row[timestampIndex]).getTime();
          
          if (options.startDate && options.endDate) {
            return logTime >= options.startDate.getTime() && logTime <= options.endDate.getTime();
          } else if (options.startDate) {
            return logTime >= options.startDate.getTime();
          } else {
            return logTime <= options.endDate.getTime();
          }
        });
      }
      
      // Converteer data naar array van objecten
      const logObjects = filteredLogs.map(row => this._rowToObject(headers, row));
      
      // Limiteer aantal resultaten indien nodig
      if (options.limit && options.limit > 0) {
        return logObjects.slice(0, options.limit);
      }
      
      return logObjects;
    } catch (error) {
      Logger.error('Fout bij ophalen van logberichten: ' + error.toString());
      return [];
    }
  }
}

// Instantieer een global DataLayer object
const DataLayer = new DataLayerClass();
