/**
 * AuthService.gs - Google authenticatie service voor de Huisarts Check applicatie
 * 
 * Dit bestand bevat functies voor gebruikersauthenticatie via Google OAuth, 
 * inclusief het inloggen, sessie-beheer en gebruikersregistratie.
 * Verbeterde versie met robuustere authenticatieafhandeling.
 */

/**
 * AuthService klasse voor de authenticatie functionaliteit
 */
class AuthServiceClass {
  /**
   * Constructor
   */
  constructor() {
    // Niets nodig in constructor
  }
  
  /**
   * Controleert of de huidige gebruiker is ingelogd
   * Verbeterde versie met extra foutafhandeling
   * 
   * @return {boolean} true als de gebruiker is ingelogd, anders false
   */
  isUserLoggedIn() {
    try {
      const activeUser = Session.getActiveUser();
      if (!activeUser) {
        Logger.warning('Geen actieve gebruiker gevonden');
        return false;
      }
      
      const userEmail = activeUser.getEmail();
      
      // Controleer of email aanwezig is en een geldige waarde heeft
      if (!userEmail || userEmail.trim().length === 0) {
        Logger.warning('Geen geldig email adres voor gebruiker');
        return false;
      }
      
      return true;
    } catch (error) {
      Logger.error('Fout bij controleren login status: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Haalt de huidige ingelogde gebruiker op uit de database
   * Als de gebruiker niet bestaat in de database, wordt deze aangemaakt
   * Verbeterde versie met extra database connectie checks
   * 
   * @return {Object|null} Het gebruikersobject of null bij fout
   */
  getCurrentUser() {
    try {
      // Zorg dat de gebruiker is ingelogd
      if (!this.isUserLoggedIn()) {
        Logger.warning('Gebruiker is niet ingelogd bij getCurrentUser');
        return null;
      }
      
      // Veilig ophalen van e-mail
      let userEmail = null;
      try {
        userEmail = Session.getActiveUser().getEmail();
      } catch (emailError) {
        Logger.error('Fout bij ophalen van gebruikers e-mail: ' + emailError.toString());
        return null;
      }
      
      if (!userEmail) {
        Logger.error('Geen e-mail gevonden voor actieve gebruiker');
        return null;
      }
      
      // Zorg altijd dat de database geïnitialiseerd is
      try {
        if (!DataLayer.checkConnection()) {
          Logger.info('Database initialiseren in getCurrentUser');
          DataLayer.initializeDatabase();
        }
      } catch (dbError) {
        Logger.error('Fout bij database-initialisatie: ' + dbError.toString());
        // Probeer nog een keer om de database te initialiseren
        try {
          DataLayer.initializeDatabase(true); // forceer initialisatie
        } catch (forceError) {
          Logger.error('Fout bij geforceerde database-initialisatie: ' + forceError.toString());
          return null;
        }
      }
      
      // Probeer de gebruiker op te halen uit de database
      let user = null;
      try {
        user = DataLayer.getUserByEmail(userEmail);
      } catch (error) {
        Logger.warning('Fout bij ophalen gebruiker, tweede poging: ' + error.toString());
        
        // Extra poging: controleer of spreadsheet bestaat
        try {
          // Controleer of de tabbladen bestaan, zo niet, maak ze aan
          DataLayer.initializeDatabase(true);
          user = DataLayer.getUserByEmail(userEmail);
        } catch (retryError) {
          Logger.error('Tweede poging getUserByEmail mislukt: ' + retryError.toString());
        }
      }
      
      // Als de gebruiker niet bestaat, maak deze aan
      if (!user) {
        Logger.info('Nieuwe gebruiker aanmelden: ' + userEmail);
        
        // Haal de naam van de gebruiker op als die beschikbaar is
        let userName = '';
        try {
          userName = Session.getActiveUser().getUsername() || userEmail.split('@')[0];
        } catch (e) {
          // Negeer fouten bij het ophalen van de gebruikersnaam
          userName = userEmail.split('@')[0];
        }
        
        // Maak een nieuw gebruikersobject aan
        const newUser = {
          email: userEmail,
          naam: userName,
          isActive: true,
          isAdmin: false,
          notificationsEnabled: true,
          checkFrequency: 'daily'
        };
        
        // Sla de nieuwe gebruiker op in de database
        try {
          user = DataLayer.createUser(newUser);
          Logger.info('Nieuwe gebruiker aangemaakt: ' + userEmail);
        } catch (createError) {
          Logger.error('Fout bij aanmaken van gebruiker: ' + createError.toString());
          
          // Als het aanmaken mislukt, probeer het nog een keer na database controle
          try {
            // Zorg dat de database correct is geïnitialiseerd
            DataLayer.ensureDatabaseStructure();
            user = DataLayer.createUser(newUser);
            Logger.info('Nieuwe gebruiker aangemaakt na database controle: ' + userEmail);
          } catch (finalCreateError) {
            Logger.error('Definitief mislukt om gebruiker aan te maken: ' + finalCreateError.toString());
            return null;
          }
        }
      }
      
      // Update lastLogin voor de gebruiker
      if (user) {
        try {
          DataLayer.updateUser(user.userId, {lastLogin: new Date()});
          Logger.info('Gebruiker login bijgewerkt: ' + userEmail);
        } catch (updateError) {
          Logger.warning('Kon lastLogin niet bijwerken: ' + updateError.toString());
          // Dit is geen kritieke fout, dus we laten de gebruiker doorgaan
        }
      }
      
      return user;
    } catch (error) {
      Logger.error('Algemene fout bij ophalen huidige gebruiker: ' + error.toString());
      return null;
    }
  }
  
  /**
   * Controleert of de huidige gebruiker een admin is
   * 
   * @return {boolean} true als de gebruiker een admin is, anders false
   */
  isCurrentUserAdmin() {
    try {
      const user = this.getCurrentUser();
      return user && user.isAdmin === true;
    } catch (error) {
      Logger.error('Fout bij controleren admin status: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Configureert de vereiste OAuth scopes voor de applicatie
   * Deze functie wordt gebruikt om de juiste permissions aan te vragen
   * 
   * @return {Object} AuthorizationInfo object
   */
  getOAuthToken() {
    try {
      const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
      return authInfo;
    } catch (error) {
      Logger.error('Fout bij ophalen OAuth token: ' + error.toString());
      throw error; // Propageer de fout omdat dit een kritieke operatie is
    }
  }
  
  /**
   * Genereert een URL voor het inloggen (gebruikt door de UI)
   * 
   * @return {string} De OAuth URL om in te loggen
   */
  getAuthorizationUrl() {
    try {
      const authInfo = this.getOAuthToken();
      return authInfo.getAuthorizationUrl();
    } catch (error) {
      Logger.error('Fout bij ophalen autorisatie URL: ' + error.toString());
      // Fallback URL indien mogelijk
      return ScriptApp.getService().getUrl();
    }
  }
  
  /**
   * Zorgt dat de gebruiker is ingelogd en heeft de vereiste permissies
   * Returns de gebruiker, auth URL, of fout afhankelijk van de staat
   * Verbeterde versie met robuustere error handling
   * 
   * @return {Object} Object met login status, gebruiker en/of auth URL
   */
  checkLoginStatus() {
    try {
      Logger.info('Login status controleren');
      
      // Controleer of de gebruiker is ingelogd
      if (!this.isUserLoggedIn()) {
        Logger.info('Gebruiker niet ingelogd, autorisatie URL genereren');
        return {
          loggedIn: false,
          authUrl: this.getAuthorizationUrl(),
          errorMessage: null
        };
      }
      
      // Controleer of we alle vereiste scopes hebben
      try {
        const authInfo = this.getOAuthToken();
        const authStatus = authInfo.getAuthorizationStatus();
        
        if (authStatus === ScriptApp.AuthorizationStatus.REQUIRED) {
          Logger.info('Aanvullende autorisatie vereist');
          return {
            loggedIn: false,
            authUrl: authInfo.getAuthorizationUrl(),
            errorMessage: null
          };
        }
      } catch (scopeError) {
        Logger.error('Fout bij controleren OAuth scopes: ' + scopeError.toString());
        // We gaan verder ondanks de fout, mogelijk kunnen we de gebruiker nog ophalen
      }
      
      // Controleer of de database is geïnitialiseerd
      try {
        if (!DataLayer.checkConnection()) {
          Logger.info('Database initialiseren in checkLoginStatus');
          const initialized = DataLayer.initializeDatabase();
          
          if (!initialized) {
            return {
              loggedIn: false,
              authUrl: null,
              errorMessage: 'Er is een probleem met de database. Probeer het later nog eens of neem contact op met de beheerder.'
            };
          }
        }
      } catch (dbError) {
        Logger.error('Fout bij database controle: ' + dbError.toString());
        
        // Probeer database te herstellen
        try {
          DataLayer.initializeDatabase(true);
        } catch (initError) {
          Logger.error('Fout bij database initialisatie herstelpoging: ' + initError.toString());
          return {
            loggedIn: false,
            authUrl: null,
            errorMessage: 'Er is een probleem met de database verbinding. Probeer het later nog eens.'
          };
        }
      }
      
      // Gebruiker ophalen of aanmaken indien nodig
      let user = null;
      try {
        user = this.getCurrentUser();
      } catch (userError) {
        Logger.error('Fout bij ophalen gebruiker: ' + userError.toString());
        return {
          loggedIn: false,
          authUrl: null,
          errorMessage: 'Er is een fout opgetreden bij het ophalen van uw gebruikersinformatie. Probeer het later nog eens.'
        };
      }
      
      if (!user) {
        Logger.error('Geen gebruiker gevonden of aangemaakt');
        
        // Probeer één laatste keer om een admin account aan te maken als vangnet
        try {
          const email = Session.getActiveUser().getEmail();
          this.createEmergencyAdmin(email);
          user = DataLayer.getUserByEmail(email);
        } catch (emergencyError) {
          Logger.error('Noodprocedure voor gebruikersaanmaak gefaald: ' + emergencyError.toString());
        }
        
        if (!user) {
          return {
            loggedIn: false,
            authUrl: null,
            errorMessage: 'Uw gebruikersaccount kon niet worden gevonden of aangemaakt. Neem contact op met de beheerder.'
          };
        }
      }
      
      // Controleer of de gebruiker actief is
      if (!user.isActive) {
        return {
          loggedIn: false,
          authUrl: null,
          errorMessage: 'Uw account is gedeactiveerd. Neem contact op met de beheerder.'
        };
      }
      
      // Gebruiker is ingelogd en actief
      Logger.info('Gebruiker succesvol ingelogd: ' + user.email);
      return {
        loggedIn: true,
        user: user,
        isAdmin: user.isAdmin === true
      };
    } catch (error) {
      Logger.error('Algemene fout bij login check: ' + error.toString());
      
      // Probeer database initialisatie als fallback
      try {
        DataLayer.initializeDatabase(true);
      } catch (dbError) {
        Logger.error('Kon database niet initialiseren: ' + dbError.toString());
      }
      
      return {
        loggedIn: false,
        authUrl: null,
        errorMessage: 'Er is een onverwachte fout opgetreden bij het verifiëren van uw login status. Probeer het later nog eens.'
      };
    }
  }
  
  /**
   * Maakt een gebruiker admin
   * 
   * @param {string} userEmail - E-mailadres van de gebruiker
   * @return {boolean} true als het instellen is gelukt, anders false
   */
  setUserAsAdmin(userEmail) {
    try {
      // Alleen de huidige gebruiker kan deze actie uitvoeren als ze al admin zijn
      if (!this.isCurrentUserAdmin()) {
        Logger.warning('Poging om admin toe te wijzen zonder admin rechten: ' + Session.getActiveUser().getEmail());
        return false;
      }
      
      const user = DataLayer.getUserByEmail(userEmail);
      
      if (!user) {
        Logger.error('Kan gebruiker niet tot admin maken: gebruiker niet gevonden: ' + userEmail);
        return false;
      }
      
      // Update de gebruiker naar admin
      DataLayer.updateUser(user.userId, {isAdmin: true});
      Logger.info('Gebruiker ingesteld als admin: ' + userEmail);
      
      return true;
    } catch (error) {
      Logger.error('Fout bij instellen van admin status: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Haalt de login URL op voor de applicatie
   * 
   * @return {string} De volledige URL van de web applicatie
   */
  getLoginUrl() {
    try {
      return ScriptApp.getService().getUrl();
    } catch (error) {
      Logger.error('Fout bij ophalen login URL: ' + error.toString());
      // Geef een redelijke fallback terug
      return 'https://script.google.com/';
    }
  }
  
  /**
   * Update de instellingen van de huidige gebruiker
   * 
   * @param {Object} settings - De nieuwe instellingen voor de gebruiker
   * @return {Object|null} Het bijgewerkte gebruikersobject of null bij fout
   */
  updateCurrentUserSettings(settings) {
    try {
      const user = this.getCurrentUser();
      
      if (!user) {
        Logger.error('Kan gebruikersinstellingen niet bijwerken: gebruiker niet ingelogd');
        return null;
      }
      
      // Beperk de velden die kunnen worden bijgewerkt tot veilige instellingen
      const safeSettings = {
        naam: settings.naam,
        notificationsEnabled: settings.notificationsEnabled,
        checkFrequency: settings.checkFrequency
      };
      
      // Update de gebruiker in de database
      const updatedUser = DataLayer.updateUser(user.userId, safeSettings);
      Logger.info('Gebruikersinstellingen bijgewerkt voor: ' + user.email);
      
      return updatedUser;
    } catch (error) {
      Logger.error('Fout bij bijwerken gebruikersinstellingen: ' + error.toString());
      return null;
    }
  }
  
  /**
   * Deactiveert een gebruiker (alleen voor admins)
   * 
   * @param {string} userId - ID van de gebruiker om te deactiveren
   * @return {boolean} true als deactiveren is gelukt, anders false
   */
  deactivateUser(userId) {
    try {
      // Controleer of de huidige gebruiker admin is
      if (!this.isCurrentUserAdmin()) {
        Logger.warning('Poging om gebruiker te deactiveren zonder admin rechten');
        return false;
      }
      
      // Update de gebruiker naar inactief
      DataLayer.updateUser(userId, {isActive: false});
      Logger.info('Gebruiker gedeactiveerd: ' + userId);
      
      return true;
    } catch (error) {
      Logger.error('Fout bij deactiveren gebruiker: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Activeert een gebruiker (alleen voor admins)
   * 
   * @param {string} userId - ID van de gebruiker om te activeren
   * @return {boolean} true als activeren is gelukt, anders false
   */
  activateUser(userId) {
    try {
      // Controleer of de huidige gebruiker admin is
      if (!this.isCurrentUserAdmin()) {
        Logger.warning('Poging om gebruiker te activeren zonder admin rechten');
        return false;
      }
      
      // Update de gebruiker naar actief
      DataLayer.updateUser(userId, {isActive: true});
      Logger.info('Gebruiker geactiveerd: ' + userId);
      
      return true;
    } catch (error) {
      Logger.error('Fout bij activeren gebruiker: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Maakt een noodfallback admin gebruiker aan als er nog geen admins zijn
   * Dit is handig bij de eerste setup van de applicatie
   * 
   * @param {string} email - E-mailadres van de gebruiker
   * @return {boolean} true als aanmaken is gelukt, anders false
   */
  createEmergencyAdmin(email) {
    try {
      // Valideer e-mail
      if (!email || email.indexOf('@') === -1) {
        Logger.error('Ongeldige e-mail voor emergency admin: ' + email);
        return false;
      }
      
      // Controleer of de database is geïnitialiseerd
      if (!DataLayer.checkConnection()) {
        Logger.info('Database initialiseren voor emergency admin');
        DataLayer.initializeDatabase(true);
      }
      
      // Controleer of er al een admin gebruiker bestaat
      let allUsers = [];
      try {
        allUsers = DataLayer.getAllUsers();
      } catch (usersError) {
        Logger.warning('Kon gebruikers niet ophalen voor admin check: ' + usersError.toString());
        // Ga door met het aanmaken van de admin, aangezien we niet zeker weten of er al admins zijn
      }
      
      const hasAdmin = allUsers.some(user => user.isAdmin === true);
      
      if (hasAdmin) {
        Logger.warning('Poging om emergency admin aan te maken terwijl er al een admin bestaat');
        return false;
      }
      
      // Controleer of de gebruiker al bestaat
      let user = null;
      try {
        user = DataLayer.getUserByEmail(email);
      } catch (userError) {
        Logger.warning('Kon bestaande gebruiker niet controleren: ' + userError.toString());
        // Ga door met het aanmaken van de admin
      }
      
      if (user) {
        // Update bestaande gebruiker naar admin
        try {
          DataLayer.updateUser(user.userId, {isAdmin: true});
          Logger.info('Bestaande gebruiker ingesteld als emergency admin: ' + email);
          return true;
        } catch (updateError) {
          Logger.error('Kon bestaande gebruiker niet bijwerken naar admin: ' + updateError.toString());
          // Probeer een nieuwe gebruiker aan te maken als fallback
        }
      }
      
      // Maak een nieuwe admin gebruiker aan
      try {
        user = DataLayer.createUser({
          email: email,
          naam: 'Admin',
          isActive: true,
          isAdmin: true,
          notificationsEnabled: true,
          checkFrequency: 'daily'
        });
        Logger.info('Nieuwe emergency admin aangemaakt: ' + email);
        return true;
      } catch (createError) {
        Logger.error('Kon nieuwe admin niet aanmaken: ' + createError.toString());
        return false;
      }
    } catch (error) {
      Logger.error('Algemene fout bij aanmaken emergency admin: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Deze methode wordt toegevoegd voor diagnostische doeleinden
   * Het biedt een eenvoudige manier om de authenticatiestatus te controleren vanuit de UI
   * 
   * @return {Object} Een object met diagnostische informatie
   */
  getDiagnosticInfo() {
    try {
      const result = {
        timestamp: new Date().toISOString(),
        isLoggedIn: this.isUserLoggedIn(),
        email: null,
        hasUser: false,
        hasAdmin: false,
        databaseConnected: false,
        errors: []
      };
      
      // E-mail ophalen
      try {
        result.email = Session.getActiveUser().getEmail();
      } catch (emailError) {
        result.errors.push('Email error: ' + emailError.toString());
      }
      
      // Database controle
      try {
        result.databaseConnected = DataLayer.checkConnection();
      } catch (dbError) {
        result.errors.push('Database error: ' + dbError.toString());
      }
      
      // Gebruiker controle
      try {
        const user = this.getCurrentUser();
        result.hasUser = !!user;
        if (user) {
          result.isAdmin = user.isAdmin === true;
        }
      } catch (userError) {
        result.errors.push('User error: ' + userError.toString());
      }
      
      // Admin gebruiker controle
      try {
        const allUsers = DataLayer.getAllUsers();
        result.hasAdmin = allUsers.some(user => user.isAdmin === true);
      } catch (adminError) {
        result.errors.push('Admin check error: ' + adminError.toString());
      }
      
      return result;
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.toString()
      };
    }
  }
}

// Voeg een functie toe aan DataLayer voor database structuur validatie
if (typeof DataLayer.ensureDatabaseStructure !== 'function') {
  /**
   * Zorgt ervoor dat de database structuur correct is
   * Deze functie controleert en repareert indien nodig de database tabbladen en kolommen
   * 
   * @return {boolean} true als de database structuur correct is, anders false
   */
  DataLayer.ensureDatabaseStructure = function() {
    try {
      Logger.info('Database structuur controleren en herstellen');
      
      // Controleer of er een spreadsheet ID is ingesteld
      const spreadsheetId = Config.getSpreadsheetId();
      if (!spreadsheetId) {
        Logger.error('Geen spreadsheet ID gevonden');
        return false;
      }
      
      // Open de spreadsheet
      let spreadsheet;
      try {
        spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      } catch (openError) {
        Logger.error('Kon spreadsheet niet openen: ' + openError.toString());
        return false;
      }
      
      // Controleer of alle benodigde tabbladen bestaan
      const requiredSheets = ['users', 'practices', 'checks'];
      const existingSheets = spreadsheet.getSheets().map(sheet => sheet.getName());
      
      for (const sheetName of requiredSheets) {
        if (!existingSheets.includes(sheetName)) {
          Logger.info(`Tabbald '${sheetName}' ontbreekt, wordt aangemaakt`);
          
          try {
            const newSheet = spreadsheet.insertSheet(sheetName);
            
            // Configureer headers op basis van het type tabblad
            let headers = [];
            
            if (sheetName === 'users') {
              headers = ['userId', 'email', 'naam', 'isActive', 'isAdmin', 'notificationsEnabled', 'checkFrequency', 'lastLogin', 'createdAt', 'updatedAt'];
            } else if (sheetName === 'practices') {
              headers = ['practiceId', 'userId', 'naam', 'websiteUrl', 'currentStatus', 'lastStatusChange', 'notes', 'createdAt', 'updatedAt'];
            } else if (sheetName === 'checks') {
              headers = ['checkId', 'practiceId', 'timestamp', 'status', 'resultText', 'hasChanged', 'createdAt'];
            }
            
            // Schrijf headers naar het nieuwe tabblad
            if (headers.length > 0) {
              newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
              Logger.info(`Headers toegevoegd aan tabblad '${sheetName}'`);
            }
          } catch (createError) {
            Logger.error(`Kon tabblad '${sheetName}' niet aanmaken: ${createError.toString()}`);
          }
        } else {
          // Tabblad bestaat, controleer of het de juiste headers heeft
          try {
            const sheet = spreadsheet.getSheetByName(sheetName);
            const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
            
            // Als er geen gegevens zijn in het tabblad, herstel de headers
            if (sheet.getLastColumn() === 0 || headerRange.isBlank()) {
              Logger.info(`Tabblad '${sheetName}' heeft geen headers, worden toegevoegd`);
              
              let headers = [];
              if (sheetName === 'users') {
                headers = ['userId', 'email', 'naam', 'isActive', 'isAdmin', 'notificationsEnabled', 'checkFrequency', 'lastLogin', 'createdAt', 'updatedAt'];
              } else if (sheetName === 'practices') {
                headers = ['practiceId', 'userId', 'naam', 'websiteUrl', 'currentStatus', 'lastStatusChange', 'notes', 'createdAt', 'updatedAt'];
              } else if (sheetName === 'checks') {
                headers = ['checkId', 'practiceId', 'timestamp', 'status', 'resultText', 'hasChanged', 'createdAt'];
              }
              
              // Schrijf headers naar het tabblad
              if (headers.length > 0) {
                sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
                Logger.info(`Headers toegevoegd aan tabblad '${sheetName}'`);
              }
            }
          } catch (headerError) {
            Logger.error(`Fout bij controleren headers voor tabblad '${sheetName}': ${headerError.toString()}`);
          }
        }
      }
      
      Logger.info('Database structuur controle voltooid');
      return true;
    } catch (error) {
      Logger.error('Algemene fout bij controleren database structuur: ' + error.toString());
      return false;
    }
  };
}

// Instantieer een global AuthService object
const AuthService = new AuthServiceClass();
