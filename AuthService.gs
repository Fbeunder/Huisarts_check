/**
 * AuthService.gs - Google authenticatie service voor de Huisarts Check applicatie
 * 
 * Dit bestand bevat functies voor gebruikersauthenticatie via Google OAuth, 
 * inclusief het inloggen, sessie-beheer en gebruikersregistratie.
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
   * 
   * @return {boolean} true als de gebruiker is ingelogd, anders false
   */
  isUserLoggedIn() {
    try {
      const userEmail = Session.getActiveUser().getEmail();
      return userEmail && userEmail.length > 0;
    } catch (error) {
      Logger.error('Fout bij controleren login status: ' + error.toString());
      return false;
    }
  }
  
  /**
   * Haalt de huidige ingelogde gebruiker op uit de database
   * Als de gebruiker niet bestaat in de database, wordt deze aangemaakt
   * 
   * @return {Object|null} Het gebruikersobject of null bij fout
   */
  getCurrentUser() {
    try {
      // Zorg dat de gebruiker is ingelogd
      if (!this.isUserLoggedIn()) {
        return null;
      }
      
      const userEmail = Session.getActiveUser().getEmail();
      
      // Controleer of de database is geïnitialiseerd
      if (!DataLayer.checkConnection()) {
        // Initialiseer de database indien nodig
        Logger.info('Database initialiseren in AuthService');
        DataLayer.initializeDatabase();
      }
      
      // Probeer de gebruiker op te halen uit de database
      let user = null;
      try {
        user = DataLayer.getUserByEmail(userEmail);
      } catch (error) {
        Logger.warning('Fout bij ophalen van gebruiker, database mogelijk nog niet volledig geïnitialiseerd: ' + error.toString());
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
          Logger.error('Fout bij aanmaken van gebruiker in database: ' + createError.toString());
          // Als het aanmaken mislukt, probeer het nog een keer na database initialisatie
          DataLayer.initializeDatabase();
          user = DataLayer.createUser(newUser);
        }
      }
      
      // Update lastLogin voor de gebruiker
      if (user) {
        try {
          DataLayer.updateUser(user.userId, {lastLogin: new Date()});
        } catch (updateError) {
          Logger.warning('Kon lastLogin niet bijwerken: ' + updateError.toString());
          // Dit is geen kritieke fout, dus we laten de gebruiker doorgaan
        }
      }
      
      return user;
    } catch (error) {
      Logger.error('Fout bij ophalen huidige gebruiker: ' + error.toString());
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
    const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    return authInfo;
  }
  
  /**
   * Genereert een URL voor het inloggen (gebruikt door de UI)
   * 
   * @return {string} De OAuth URL om in te loggen
   */
  getAuthorizationUrl() {
    const authInfo = this.getOAuthToken();
    return authInfo.getAuthorizationUrl();
  }
  
  /**
   * Zorgt dat de gebruiker is ingelogd en heeft de vereiste permissies
   * Returns de gebruiker, auth URL, of fout afhankelijk van de staat
   * 
   * @return {Object} Object met login status, gebruiker en/of auth URL
   */
  checkLoginStatus() {
    try {
      // Controleer of de gebruiker is ingelogd
      if (!this.isUserLoggedIn()) {
        return {
          loggedIn: false,
          authUrl: this.getAuthorizationUrl(),
          errorMessage: null
        };
      }
      
      // Controleer of we alle vereiste scopes hebben
      const authInfo = this.getOAuthToken();
      const authStatus = authInfo.getAuthorizationStatus();
      
      if (authStatus === ScriptApp.AuthorizationStatus.REQUIRED) {
        return {
          loggedIn: false,
          authUrl: authInfo.getAuthorizationUrl(),
          errorMessage: null
        };
      }
      
      // Controleer of de database is geïnitialiseerd
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
      
      // Gebruiker ophalen of aanmaken indien nodig
      const user = this.getCurrentUser();
      
      if (!user) {
        return {
          loggedIn: false,
          authUrl: null,
          errorMessage: 'Er is een fout opgetreden bij het ophalen van uw gebruikersinformatie. Probeer het later nog eens.'
        };
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
      return {
        loggedIn: true,
        user: user,
        isAdmin: user.isAdmin === true
      };
    } catch (error) {
      Logger.error('Fout bij login check: ' + error.toString());
      
      // Probeer database initialisatie als fallback
      try {
        DataLayer.initializeDatabase();
      } catch (dbError) {
        Logger.error('Kon database niet initialiseren: ' + dbError.toString());
      }
      
      return {
        loggedIn: false,
        authUrl: null,
        errorMessage: 'Er is een fout opgetreden bij het verifiëren van uw login status. Probeer het later nog eens.'
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
    return ScriptApp.getService().getUrl();
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
      // Controleer of de database is geïnitialiseerd
      if (!DataLayer.checkConnection()) {
        Logger.info('Database initialiseren voor emergency admin');
        DataLayer.initializeDatabase();
      }
      
      // Controleer of er al een admin gebruiker bestaat
      const allUsers = DataLayer.getAllUsers();
      const hasAdmin = allUsers.some(user => user.isAdmin === true);
      
      if (hasAdmin) {
        Logger.warning('Poging om emergency admin aan te maken terwijl er al een admin bestaat');
        return false;
      }
      
      // Controleer of de gebruiker al bestaat
      let user = DataLayer.getUserByEmail(email);
      
      if (user) {
        // Update bestaande gebruiker naar admin
        DataLayer.updateUser(user.userId, {isAdmin: true});
        Logger.info('Bestaande gebruiker ingesteld als emergency admin: ' + email);
      } else {
        // Maak een nieuwe admin gebruiker aan
        user = DataLayer.createUser({
          email: email,
          naam: 'Admin',
          isActive: true,
          isAdmin: true,
          notificationsEnabled: true,
          checkFrequency: 'daily'
        });
        Logger.info('Nieuwe emergency admin aangemaakt: ' + email);
      }
      
      return true;
    } catch (error) {
      Logger.error('Fout bij aanmaken emergency admin: ' + error.toString());
      return false;
    }
  }
}

// Instantieer een global AuthService object
const AuthService = new AuthServiceClass();
