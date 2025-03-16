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
 * Zorgt ervoor dat alle afhankelijkheden correct worden geïnitialiseerd
 * Dit helpt om problemen met de volgorde van module inladen te voorkomen
 * Verbeterde versie met extra logging en betere volgorde waarborging
 * 
 * @return {boolean} true als de initialisatie succesvol was, anders false
 */
function initializeDependencies() {
  try {
    console.log('Start initialisatie van dependencies');
    
    // Lijst van vereiste modules in juiste volgorde
    const requiredModules = ['Logger', 'Config', 'DataLayer', 'AuthService', 'WebsiteChecker', 'UI'];
    const missingModules = [];
    
    // Controleer modules en hou de missende modules bij
    requiredModules.forEach(moduleName => {
      if (typeof global[moduleName] === 'undefined' || global[moduleName] === null) {
        missingModules.push(moduleName);
        console.log(`Module ${moduleName} is nog niet geladen`);
      }
    });
    
    if (missingModules.length === 0) {
      console.log('Alle modules zijn beschikbaar');
      return true;
    }
    
    console.log(`${missingModules.length} modules ontbreken: ${missingModules.join(', ')}`);
    
    // Controleer eerst of Logger bestaat, dit is heel belangrijk voor debugging
    if (typeof Logger === 'undefined' || Logger === null) {
      console.log('Logger wordt tijdelijk vervangen, dit is abnormaal');
      global.Logger = {
        info: function(msg) { console.info(msg); },
        warning: function(msg) { console.warn(msg); },
        error: function(msg) { console.error(msg); }
      };
    }
    
    // Zorg dat Config bestaat
    if (typeof Config === 'undefined' || Config === null) {
      Logger.warning('Config wordt tijdelijk vervangen, dit is abnormaal');
      global.Config = {
        getSpreadsheetId: function() { return null; },
        getOpenAIKey: function() { return null; }
      };
    }
    
    // Volgorde van initialisatie is belangrijk
    // DataLayer moet eerst bestaan voordat AuthService gebruikt kan worden
    if (typeof DataLayer === 'undefined' || DataLayer === null) {
      Logger.warning('DataLayer is niet gedefinieerd, proberen opnieuw te initialiseren');
      
      try {
        // Als de klasse bestaat maar niet het singleton object
        if (typeof DataLayerClass !== 'undefined') {
          global.DataLayer = new DataLayerClass();
          Logger.info('DataLayer is opnieuw geïnitialiseerd');
        } else {
          Logger.error('DataLayerClass is niet beschikbaar, kan DataLayer niet initialiseren');
        }
      } catch (e) {
        Logger.error('Fout bij initialiseren DataLayer: ' + e.toString());
      }
    }
    
    // Controleer opnieuw of DataLayer bestaat
    const dataLayerExists = typeof DataLayer !== 'undefined' && DataLayer !== null;
    if (!dataLayerExists) {
      Logger.error('DataLayer kon niet worden geïnitialiseerd, dit is kritiek');
    } else {
      Logger.info('DataLayer is beschikbaar');
      
      // Probeer database initialisatie indien nodig
      try {
        if (typeof DataLayer.checkConnection === 'function') {
          const connected = DataLayer.checkConnection();
          if (!connected) {
            Logger.info('Database wordt geïnitialiseerd tijdens dependency check');
            DataLayer.initializeDatabase(true);
          }
        }
      } catch (dbErr) {
        Logger.warning('Kon database niet checken/initialiseren: ' + dbErr.toString());
      }
    }
    
    // Initialiseer AuthService als deze nog niet bestaat
    if (typeof AuthService === 'undefined' || AuthService === null) {
      Logger.warning('AuthService is niet gedefinieerd, proberen opnieuw te initialiseren');
      
      try {
        if (typeof AuthServiceClass !== 'undefined') {
          global.AuthService = new AuthServiceClass();
          Logger.info('AuthService is opnieuw geïnitialiseerd');
        } else {
          Logger.error('AuthServiceClass is niet beschikbaar, kan AuthService niet initialiseren');
        }
      } catch (e) {
        Logger.error('Fout bij initialiseren AuthService: ' + e.toString());
      }
    }
    
    // Kopieer functionaliteit tussen modules indien nodig
    if (typeof AuthService !== 'undefined' && AuthService !== null && 
        typeof AuthService.ensureDatabaseStructure === 'function') {
      
      if (typeof DataLayer !== 'undefined' && DataLayer !== null && 
          typeof DataLayer.ensureDatabaseStructure !== 'function') {
        
        // Kopieer de functie van AuthService naar DataLayer
        DataLayer.ensureDatabaseStructure = AuthService.ensureDatabaseStructure;
        Logger.info('ensureDatabaseStructure functie toegevoegd aan DataLayer');
      }
    }
    
    // Controleer hoeveel modules nu beschikbaar zijn
    let availableCount = 0;
    requiredModules.forEach(moduleName => {
      if (typeof global[moduleName] !== 'undefined' && global[moduleName] !== null) {
        availableCount++;
      }
    });
    
    Logger.info(`Initialisatie voltooid: ${availableCount} van ${requiredModules.length} modules beschikbaar`);
    
    return availableCount === requiredModules.length;
  } catch (error) {
    console.error('Algemene fout bij initialiseren dependencies: ' + error.toString());
    if (typeof Logger !== 'undefined' && Logger !== null) {
      Logger.error('Algemene fout bij initialiseren dependencies: ' + error.toString());
    }
    return false;
  }
}

/**
 * Entry point voor web app
 * Verbeterde versie met uitgebreide foutafhandeling
 * 
 * @return {HtmlOutput} De HTML van de web app
 */
function doGet() {
  // Gebruik eerst console.log omdat Logger mogelijk nog niet bestaat
  console.log('Web app gestart, initialisatie beginnen');
  
  try {
    // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
    const initResult = initializeDependencies();
    
    if (typeof Logger !== 'undefined' && Logger !== null) {
      Logger.info(`Web app gestart door gebruiker (dependencies geladen: ${initResult})`);
    }
    
    // We gaan door, zelfs als niet alle dependencies zijn geladen
    // UI.renderHome zal een fallback tonen als er iets mis is
    
    if (typeof UI === 'undefined' || UI === null) {
      console.error('UI module is niet beschikbaar, toon fallback error pagina');
      
      // Fallback error pagina zonder UI module
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <base target="_top">
            <meta charset="utf-8">
            <title>Fout - Huisarts Check</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .error-container { max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #dc3545; border-radius: 5px; background-color: #f8d7da; }
              h2 { color: #dc3545; margin-top: 0; }
              button { background-color: #007bff; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 5px; }
              button:hover { background-color: #0069d9; }
              .diagnostic { font-family: monospace; background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h2>Er is een fout opgetreden bij het laden van de applicatie</h2>
              <p>De applicatie kon niet correct worden geladen. Dit kan komen door een probleem met de server of met de scripts.</p>
              <p>Probeer de pagina te vernieuwen of neem contact op met de beheerder.</p>
              <button onclick="window.location.reload()">Probeer opnieuw</button>
              <div class="diagnostic">
                <p><strong>Diagnostische informatie:</strong></p>
                <p>UI Module: Niet beschikbaar</p>
                <p>Dependencies geladen: ${initResult}</p>
                <p>Timestamp: ${new Date().toISOString()}</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(html)
        .setTitle('Fout - Huisarts Check')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // Als UI wel beschikbaar is, gebruik deze om de interface te renderen
    return UI.renderHome();
  } catch (error) {
    console.error('Fout bij het starten van de web app: ' + error.toString());
    
    if (typeof Logger !== 'undefined' && Logger !== null) {
      Logger.error('Fout bij het starten van de web app: ' + error.toString());
    }
    
    if (typeof UI !== 'undefined' && UI !== null) {
      return UI.renderError('Er is een fout opgetreden bij het starten van de applicatie: ' + error.toString());
    } else {
      // Fallback error pagina zonder UI module
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <base target="_top">
            <meta charset="utf-8">
            <title>Fout - Huisarts Check</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .error-container { max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #dc3545; border-radius: 5px; background-color: #f8d7da; }
              h2 { color: #dc3545; margin-top: 0; }
              p.error { font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-wrap: break-word; }
              button { background-color: #007bff; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 5px; }
              button:hover { background-color: #0069d9; }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h2>Er is een fout opgetreden</h2>
              <p>De applicatie kon niet worden gestart door een onverwachte fout:</p>
              <p class="error">${error.toString()}</p>
              <button onclick="window.location.reload()">Probeer opnieuw</button>
            </div>
          </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(html)
        .setTitle('Fout - Huisarts Check')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
}

/**
 * Toont het dashboard in een modaal venster
 */
function showDashboard() {
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
  const html = UI.renderDashboard()
      .setWidth(800)
      .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Huisarts Check Dashboard');
}

/**
 * Toont de instellingenpagina in een modaal venster
 */
function showSettings() {
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
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
    
    // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
    initializeDependencies();
    
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
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
  try {
    return AuthService.getCurrentUser();
  } catch (error) {
    Logger.error('Fout bij ophalen huidige gebruiker: ' + error.toString());
    return null;
  }
}

/**
 * Controleert de login status (voor client-side gebruik)
 * Verbeterde versie met extra foutafhandeling en logging
 * 
 * @return {Object} Object met login status, gebruiker en/of auth URL
 */
function checkLoginStatus() {
  console.log('checkLoginStatus aangeroepen vanuit client');
  
  try {
    // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
    const initResult = initializeDependencies();
    console.log(`Dependencies geïnitialiseerd: ${initResult}`);
    
    if (typeof AuthService === 'undefined' || AuthService === null) {
      console.error('AuthService is niet beschikbaar');
      return {
        loggedIn: false,
        authUrl: null,
        errorMessage: 'AuthService is niet beschikbaar. Probeer de pagina te vernieuwen.'
      };
    }
    
    // Controleer login status via AuthService
    const authStatus = AuthService.checkLoginStatus();
    
    // Voeg extra validatie toe om te zorgen dat de gebruiker alle benodigde velden heeft
    if (authStatus.loggedIn && authStatus.user) {
      console.log('Gebruiker is ingelogd, valideer gebruikersobject');
      
      // Controleer of gebruiker alle essentiële velden heeft
      if (!authStatus.user.userId || !authStatus.user.email) {
        console.error('Gebruikersobject is onvolledig');
        Logger.error('Ongeldig gebruikersobject: ' + JSON.stringify(authStatus.user));
        
        return {
          loggedIn: false,
          authUrl: AuthService.getAuthorizationUrl(),
          errorMessage: 'Gebruikersgegevens zijn onvolledig. Probeer opnieuw in te loggen.'
        };
      }
    }
    
    return authStatus;
  } catch (error) {
    console.error('Fout bij controleren login status: ' + error.toString());
    Logger.error('Fout bij controleren login status: ' + error.toString());
    
    return {
      loggedIn: false,
      authUrl: null,
      errorMessage: 'Er is een onverwachte fout opgetreden bij het controleren van uw login status: ' + error.toString()
    };
  }
}

/**
 * Update de instellingen van de huidige gebruiker (voor client-side gebruik)
 * 
 * @param {Object} settings - De nieuwe instellingen voor de gebruiker
 * @return {Object} Het bijgewerkte gebruikersobject
 */
function updateCurrentUserSettings(settings) {
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
  return AuthService.updateCurrentUserSettings(settings);
}

/**
 * Maak een nieuwe huisartsenpraktijk aan (voor client-side gebruik)
 * 
 * @param {Object} practiceInfo - Informatie over de praktijk
 * @return {Object} Het aangemaakte praktijkobject
 */
function createPractice(practiceInfo) {
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
  return DataLayer.createPractice(practiceInfo);
}

/**
 * Verwijder een huisartsenpraktijk (voor client-side gebruik)
 * 
 * @param {string} practiceId - ID van de praktijk
 * @return {boolean} true als verwijderen is gelukt, anders false
 */
function deletePractice(practiceId) {
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
  return DataLayer.deletePractice(practiceId);
}

/**
 * Haal alle praktijken van een gebruiker op (voor client-side gebruik)
 * 
 * @param {string} userId - ID van de gebruiker
 * @return {Array} Array met praktijkobjecten
 */
function getPracticesByUser(userId) {
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
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
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
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
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
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
    
    // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
    initializeDependencies();
    
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
  // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
  initializeDependencies();
  
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

/**
 * Geeft diagnostische informatie over de staat van de modules en afhankelijkheden
 * Handig voor troubleshooting bij runtime problemen
 * 
 * @return {Object} Diagnostische informatie
 */
function getDiagnosticInfo() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      modules: {
        Logger: typeof Logger !== 'undefined',
        Config: typeof Config !== 'undefined',
        DataLayer: typeof DataLayer !== 'undefined',
        AuthService: typeof AuthService !== 'undefined',
        WebsiteChecker: typeof WebsiteChecker !== 'undefined',
        UI: typeof UI !== 'undefined'
      },
      classes: {
        DataLayerClass: typeof DataLayerClass !== 'undefined',
        AuthServiceClass: typeof AuthServiceClass !== 'undefined'
      },
      functions: {},
      scriptProperties: {
        scriptId: ScriptApp.getScriptId(),
        serviceUrl: ScriptApp.getService().getUrl()
      }
    };
    
    // Check DataLayer functions
    if (typeof DataLayer !== 'undefined' && DataLayer !== null) {
      diagnostics.functions.DataLayer = {
        checkConnection: typeof DataLayer.checkConnection === 'function',
        initializeDatabase: typeof DataLayer.initializeDatabase === 'function',
        getUserByEmail: typeof DataLayer.getUserByEmail === 'function',
        ensureDatabaseStructure: typeof DataLayer.ensureDatabaseStructure === 'function'
      };
    }
    
    // Check AuthService functions
    if (typeof AuthService !== 'undefined' && AuthService !== null) {
      diagnostics.functions.AuthService = {
        getCurrentUser: typeof AuthService.getCurrentUser === 'function',
        checkLoginStatus: typeof AuthService.checkLoginStatus === 'function',
        ensureDatabaseStructure: typeof AuthService.ensureDatabaseStructure === 'function'
      };
    }
    
    // Probeer database info op te halen
    try {
      if (typeof Config !== 'undefined' && Config !== null) {
        diagnostics.spreadsheetId = Config.getSpreadsheetId() || '(niet ingesteld)';
      }
    } catch (e) {
      diagnostics.configError = e.toString();
    }
    
    // Check authenticatie status
    try {
      if (typeof AuthService !== 'undefined' && AuthService !== null) {
        const authStatus = AuthService.checkLoginStatus();
        diagnostics.authStatus = {
          loggedIn: authStatus.loggedIn,
          hasAuthUrl: authStatus.authUrl !== null && authStatus.authUrl !== undefined,
          hasErrorMessage: authStatus.errorMessage !== null && authStatus.errorMessage !== undefined
        };
        
        if (authStatus.loggedIn && authStatus.user) {
          diagnostics.authStatus.userInfo = {
            hasUserId: !!authStatus.user.userId,
            hasEmail: !!authStatus.user.email,
            isActive: authStatus.user.isActive
          };
        }
      }
    } catch (e) {
      diagnostics.authError = e.toString();
    }
    
    return diagnostics;
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      error: error.toString(),
      scriptId: ScriptApp.getScriptId()
    };
  }
}

/**
 * Handmatig controleren van een praktijk (voor client-side gebruik)
 * 
 * @param {string} practiceId - ID van de praktijk om te controleren
 * @return {Object} Resultaat van de controle
 */
function checkPracticeNow(practiceId) {
  try {
    // Initialiseer afhankelijkheden om te zorgen dat alles beschikbaar is
    initializeDependencies();
    
    const practice = DataLayer.getPracticeById(practiceId);
    if (!practice) {
      return {
        success: false,
        message: 'Praktijk niet gevonden'
      };
    }
    
    // Controleer autorisatie
    const authStatus = AuthService.checkLoginStatus();
    if (!authStatus.loggedIn) {
      return {
        success: false,
        message: 'U bent niet ingelogd'
      };
    }
    
    if (practice.userId !== authStatus.user.userId && !authStatus.isAdmin) {
      return {
        success: false,
        message: 'U heeft geen toegang tot deze praktijk'
      };
    }
    
    // Controleer de praktijk website
    const checkResult = WebsiteChecker.checkPractice(practice);
    
    // Haal de bijgewerkte praktijk op
    const updatedPractice = DataLayer.getPracticeById(practiceId);
    
    return {
      success: true,
      practice: updatedPractice,
      checkResult: checkResult,
      message: 'Praktijk succesvol gecontroleerd'
    };
  } catch (error) {
    Logger.error('Fout bij controleren praktijk: ' + error.toString());
    return {
      success: false,
      message: 'Fout bij controleren praktijk: ' + error.toString()
    };
  }
}
