/**
 * UI.gs - Gebruikersinterface voor de Huisarts Check applicatie
 * 
 * Dit bestand bevat functies voor het renderen van de webinterface en het
 * afhandelen van gebruikersinteractie voor de Huisarts Check applicatie.
 * Het integreert HTML-templates en client-side JavaScript om een naadloze
 * gebruikerservaring te bieden.
 * 
 * Vereenvoudigde versie voor betere compatibiliteit met Apps Script.
 */

/**
 * Helper functie om HTML templates te laden.
 * Apps Script ondersteunt geen mappenstructuur, daarom gebruiken we deze functie om HTML-bestanden
 * consistent te benaderen.
 * 
 * @param {string} templateName - De naam van het HTML-template bestand (zonder prefix)
 * @return {HtmlTemplate} Het HTML-template object
 */
function getHtmlTemplate(templateName) {
  // In Apps Script worden bestanden in een platte structuur opgeslagen,
  // we geven de bestanden een prefix om ze onderscheidend te maken
  const htmlPrefix = 'HTML_';
  return HtmlService.createTemplateFromFile(htmlPrefix + templateName);
}

/**
 * Helper functie om HTML-inhoud vanuit andere bestanden in te voegen
 * Deze functie wordt gebruikt in de HTML-templates voor includes
 * 
 * @param {string} filename - Naam van het bestand om in te voegen
 * @return {string} De inhoud van het bestand
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * UI klasse voor het beheren van de gebruikersinterface
 */
class UIClass {
  /**
   * Constructor
   */
  constructor() {
    // Niets nodig in constructor
  }
  
  /**
   * Rendert de hoofdpagina
   * Vereenvoudigde implementatie die direct de Index-template gebruikt
   * Verbeterde versie met extra robuustheid
   * 
   * @return {HtmlOutput} HTML-uitvoer voor de hoofdpagina
   */
  renderHome() {
    try {
      Logger.info('Renderen van hoofdpagina');
      
      try {
        // Controleer login status
        const authStatus = AuthService.checkLoginStatus();
        
        // Log de status voor debugging
        Logger.info(`Auth status: loggedIn=${authStatus.loggedIn}, authUrl=${authStatus.authUrl ? 'aanwezig' : 'afwezig'}, errorMessage=${authStatus.errorMessage || 'geen'}`);
        
        // Valideer de authStatus
        if (authStatus.loggedIn && (!authStatus.user || !authStatus.user.userId)) {
          Logger.warning('Authenticatiestatus geeft aan dat gebruiker is ingelogd, maar gebruikersobject is onvolledig');
          // Laat de client-side code dit probleem afhandelen
        }
        
        // Altijd de index template gebruiken, ongeacht login status
        // De client-side code handelt de weergave af op basis van login status
        const template = getHtmlTemplate('Index');
        
        // Geef auth en gebruikersgegevens door aan client
        if (authStatus.loggedIn && authStatus.user) {
          template.authStatus = {
            loggedIn: true,
            user: authStatus.user,
            isAdmin: authStatus.isAdmin === true
          };
          
          template.user = authStatus.user;
          template.isAdmin = authStatus.isAdmin === true;
        } else if (authStatus.authUrl) {
          template.authStatus = {
            loggedIn: false,
            authUrl: authStatus.authUrl,
            errorMessage: authStatus.errorMessage
          };
          
          template.authUrl = authStatus.authUrl;
        } else if (authStatus.errorMessage) {
          template.authStatus = {
            loggedIn: false,
            errorMessage: authStatus.errorMessage
          };
          
          template.errorMessage = authStatus.errorMessage;
        } else {
          // Fallback voor onvolledige authStatus
          template.authStatus = {
            loggedIn: false,
            authUrl: ScriptApp.getService().getUrl(),
            errorMessage: 'Kon authenticatie status niet bepalen, er is een probleem met de server.'
          };
        }
        
        // Diagnostische informatie meegeven als dat beschikbaar is
        try {
          const diagnosticInfo = this.getDiagnosticInfo();
          template.diagnosticInfo = diagnosticInfo;
          
          // Log diagnostische info voor debugging
          Logger.info('Diagnostische info toegevoegd aan template: ' + JSON.stringify(diagnosticInfo));
        } catch (diagError) {
          // Negeer fouten bij diagnostische info
          Logger.warning('Kon diagnostische info niet ophalen: ' + diagError.toString());
        }
        
        // Evalueer en return de template
        const html = template.evaluate();
        
        return html
          .setTitle('Huisarts Check')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        
      } catch (authError) {
        Logger.error('Fout bij ophalen authenticatie status: ' + authError.toString());
        
        // Toon een error template met specifieke foutmelding over authenticatie
        return this.renderError('Er is een fout opgetreden bij het controleren van uw login status: ' + authError.toString());
      }
    } catch (error) {
      Logger.error('Fout bij renderen van hoofdpagina: ' + error.toString());
      return this.renderError('Er is een fout opgetreden bij het laden van de pagina: ' + error.toString());
    }
  }
  
  /**
   * Haalt diagnostische informatie op voor troubleshooting
   * 
   * @return {Object} Diagnostische informatie
   */
  getDiagnosticInfo() {
    try {
      // Basis info
      const info = {
        timestamp: new Date().toISOString(),
        ui: {
          htmlTemplatesAvailable: true
        },
        auth: {
          status: 'onbekend'
        },
        modules: {
          AuthService: typeof AuthService !== 'undefined',
          DataLayer: typeof DataLayer !== 'undefined',
          Logger: typeof Logger !== 'undefined'
        }
      };
      
      // Test toegang tot templates
      try {
        const testTemplate = getHtmlTemplate('Index');
        if (!testTemplate) {
          info.ui.htmlTemplatesAvailable = false;
        }
      } catch (e) {
        info.ui.htmlTemplatesAvailable = false;
        info.ui.templateError = e.toString();
      }
      
      // Controleer authenticatie indien mogelijk
      if (typeof AuthService !== 'undefined' && AuthService !== null) {
        try {
          const isLoggedIn = AuthService.isUserLoggedIn();
          info.auth.status = isLoggedIn ? 'ingelogd' : 'niet ingelogd';
          
          if (isLoggedIn) {
            const userEmail = Session.getActiveUser().getEmail();
            info.auth.userEmail = userEmail;
            
            try {
              const user = AuthService.getCurrentUser();
              info.auth.userInDatabase = !!user;
              
              if (user) {
                info.auth.isAdmin = user.isAdmin === true;
                info.auth.hasUserId = !!user.userId;
              }
            } catch (userError) {
              info.auth.userError = userError.toString();
            }
          }
        } catch (authError) {
          info.auth.error = authError.toString();
        }
      }
      
      // Controleer database indien mogelijk
      if (typeof DataLayer !== 'undefined' && DataLayer !== null) {
        try {
          info.database = {
            connected: false
          };
          
          const connected = DataLayer.checkConnection();
          info.database.connected = connected;
          
          if (connected) {
            info.database.spreadsheetId = Config.getSpreadsheetId();
          }
        } catch (dbError) {
          info.database = {
            error: dbError.toString()
          };
        }
      }
      
      return info;
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.toString()
      };
    }
  }
  
  /**
   * Rendert een foutpagina
   * Vereenvoudigde implementatie voor betere fouttolerantie
   * 
   * @param {string} errorMessage - Foutmelding
   * @return {HtmlOutput} HTML-uitvoer voor de foutpagina
   */
  renderError(errorMessage) {
    try {
      Logger.info('Renderen van foutpagina');
      
      // Eenvoudige foutpagina zonder template en zonder favicon
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <base target="_top">
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Fout - Huisarts Check</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .error-container { max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #dc3545; border-radius: 5px; background-color: #f8d7da; }
              h2 { color: #dc3545; margin-top: 0; }
              button { background-color: #007bff; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 5px; margin-right: 10px; }
              button:hover { background-color: #0069d9; }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h2>Er is een fout opgetreden</h2>
              <p>${errorMessage || 'Er is een onbekende fout opgetreden.'}</p>
              <button onclick="window.location.reload()">Probeer opnieuw</button>
              <button onclick="window.location.href='${ScriptApp.getService().getUrl()}'">Ga naar startpagina</button>
              <button onclick="window.top.location.href='${ScriptApp.getService().getUrl()}'">Vernieuw hele pagina</button>
            </div>
          </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(html)
        .setTitle('Fout - Huisarts Check')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (error) {
      Logger.error('Fout bij renderen van foutpagina: ' + error.toString());
      // Absolute minimale foutpagina als laatste redmiddel
      return HtmlService.createHtmlOutput('<h2>Er is een fout opgetreden</h2><p>Details konden niet worden geladen.</p>')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
  
  /**
   * Rendert datastructuren voor client-side gebruik
   * Deze functie wordt aangeroepen vanuit client-side JavaScript
   * om data op te halen voor het dashboard
   * 
   * @param {string} userId - ID van de gebruiker
   * @return {Object} Object met verschillende datastructuren
   */
  getDataForDashboard(userId) {
    try {
      Logger.info('Ophalen van dashboard data voor gebruiker ' + userId);
      
      // Controleer login status
      const authStatus = AuthService.checkLoginStatus();
      
      if (!authStatus.loggedIn) {
        return {
          success: false,
          error: 'U bent niet ingelogd'
        };
      }
      
      // Controleer of de gebruiker geautoriseerd is
      if (userId !== authStatus.user.userId && !authStatus.isAdmin) {
        return {
          success: false,
          error: 'U heeft geen toegang tot deze gegevens'
        };
      }
      
      // Haal praktijken op
      const practices = DataLayer.getPracticesByUser(userId);
      
      // Return de data
      return {
        success: true,
        user: authStatus.user,
        isAdmin: authStatus.isAdmin,
        practices: practices
      };
    } catch (error) {
      Logger.error('Fout bij ophalen dashboard data: ' + error.toString());
      return {
        success: false,
        error: 'Fout bij ophalen gegevens: ' + error.toString()
      };
    }
  }
  
  /**
   * Formatteert een datum voor weergave
   * 
   * @param {Date|string} date - Datum om te formatteren
   * @return {string} Geformatteerde datum
   * @private
   */
  _formatDate(date) {
    try {
      if (!date) return 'Onbekend';
      
      // Zorg dat we een Date object hebben
      const dateObj = (typeof date === 'string') ? new Date(date) : date;
      
      // Controleer of het een valide datum is
      if (isNaN(dateObj.getTime())) return 'Onbekend';
      
      // Formatteer de datum
      return dateObj.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      Logger.error('Fout bij formatteren van datum: ' + error.toString());
      return 'Onbekend';
    }
  }
}

// Instantieer een global UI object
const UI = new UIClass();

/**
 * Functies die worden blootgesteld aan de client-side code
 */

/**
 * Entry point voor de web applicatie
 * Deze functie wordt automatisch aangeroepen door Apps Script
 * wanneer de web app wordt geopend
 * 
 * @return {HtmlOutput} De HTML uitvoer voor de web app
 */
function doGet() {
  try {
    Logger.info('Web app gestart door gebruiker');
    return UI.renderHome();
  } catch (error) {
    Logger.error('Fout bij starten web app: ' + error.toString());
    return UI.renderError('Er is een fout opgetreden bij het starten van de applicatie: ' + error.toString());
  }
}

/**
 * Controleert de login status van de gebruiker
 * Deze functie wordt aangeroepen vanuit client-side JavaScript
 * 
 * @return {Object} Object met login status informatie
 */
function checkLoginStatus() {
  try {
    return AuthService.checkLoginStatus();
  } catch (error) {
    Logger.error('Fout bij controleren login status: ' + error.toString());
    return {
      loggedIn: false,
      authUrl: null,
      errorMessage: 'Fout bij controleren login status: ' + error.toString()
    };
  }
}

/**
 * Haalt de praktijken op voor een gebruiker
 * Deze functie wordt aangeroepen vanuit client-side JavaScript
 * 
 * @param {string} userId - ID van de gebruiker
 * @return {Array} Array met praktijken
 */
function getPracticesByUser(userId) {
  try {
    // Valideer user ID
    if (!userId) {
      Logger.error('Geen geldige userId opgegeven');
      throw new Error('Geen geldige userId opgegeven');
    }
    
    return DataLayer.getPracticesByUser(userId);
  } catch (error) {
    Logger.error('Fout bij ophalen praktijken: ' + error.toString());
    throw new Error('Fout bij ophalen praktijken: ' + error.toString());
  }
}

/**
 * Maakt een nieuwe praktijk aan
 * Deze functie wordt aangeroepen vanuit client-side JavaScript
 * 
 * @param {Object} practiceData - Gegevens van de nieuwe praktijk
 * @return {Object} De aangemaakte praktijk
 */
function createPractice(practiceData) {
  try {
    return DataLayer.createPractice(practiceData);
  } catch (error) {
    Logger.error('Fout bij aanmaken praktijk: ' + error.toString());
    throw new Error('Fout bij aanmaken praktijk: ' + error.toString());
  }
}

/**
 * Werkt de instellingen van de huidige gebruiker bij
 * Deze functie wordt aangeroepen vanuit client-side JavaScript
 * 
 * @param {Object} settings - De nieuwe instellingen
 * @return {Object} De bijgewerkte gebruiker
 */
function updateCurrentUserSettings(settings) {
  try {
    return AuthService.updateCurrentUserSettings(settings);
  } catch (error) {
    Logger.error('Fout bij bijwerken instellingen: ' + error.toString());
    throw new Error('Fout bij bijwerken instellingen: ' + error.toString());
  }
}

/**
 * Controleert een praktijk direct
 * Deze functie wordt aangeroepen vanuit client-side JavaScript
 * 
 * @param {string} practiceId - ID van de praktijk
 * @return {Object} Het resultaat van de controle
 */
function checkPracticeNow(practiceId) {
  try {
    const practice = DataLayer.getPracticeById(practiceId);
    if (!practice) {
      throw new Error('Praktijk niet gevonden');
    }
    
    // Controleer of de gebruiker geautoriseerd is
    const authStatus = AuthService.checkLoginStatus();
    if (!authStatus.loggedIn) {
      throw new Error('U bent niet ingelogd');
    }
    
    if (practice.userId !== authStatus.user.userId && !authStatus.isAdmin) {
      throw new Error('U heeft geen toegang tot deze praktijk');
    }
    
    // Voer de controle uit
    const result = WebsiteChecker.checkPractice(practice);
    
    return {
      success: true,
      practice: practice,
      result: result,
      message: 'Praktijk succesvol gecontroleerd'
    };
  } catch (error) {
    Logger.error('Fout bij controleren praktijk: ' + error.toString());
    throw new Error('Fout bij controleren praktijk: ' + error.toString());
  }
}

/**
 * Verwijdert een praktijk
 * Deze functie wordt aangeroepen vanuit client-side JavaScript
 * 
 * @param {string} practiceId - ID van de praktijk
 * @return {boolean} true als het verwijderen is gelukt, anders false
 */
function deletePractice(practiceId) {
  try {
    const practice = DataLayer.getPracticeById(practiceId);
    if (!practice) {
      throw new Error('Praktijk niet gevonden');
    }
    
    // Controleer of de gebruiker geautoriseerd is
    const authStatus = AuthService.checkLoginStatus();
    if (!authStatus.loggedIn) {
      throw new Error('U bent niet ingelogd');
    }
    
    if (practice.userId !== authStatus.user.userId && !authStatus.isAdmin) {
      throw new Error('U heeft geen toegang tot deze praktijk');
    }
    
    // Verwijder de praktijk
    return DataLayer.deletePractice(practiceId);
  } catch (error) {
    Logger.error('Fout bij verwijderen praktijk: ' + error.toString());
    throw new Error('Fout bij verwijderen praktijk: ' + error.toString());
  }
}

/**
 * Haalt diagnostische informatie op
 * Deze functie kan worden gebruikt voor debugging
 * 
 * @return {Object} Object met diagnostische informatie
 */
function getDiagnosticInfo() {
  try {
    return UI.getDiagnosticInfo();
  } catch (error) {
    Logger.error('Fout bij ophalen diagnostische info: ' + error.toString());
    return {
      error: 'Fout bij ophalen diagnostische info: ' + error.toString()
    };
  }
}
