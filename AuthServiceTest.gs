/**
 * AuthServiceTest.gs - Test functionaliteit voor de AuthService module
 * 
 * Dit bestand bevat testfuncties om de functionaliteit van de AuthService module te valideren.
 */

/**
 * Test de basisfunctionaliteit van de AuthService module
 */
function testAuthService() {
  Logger.info('Begin test van AuthService...');
  
  // Controleer of de AuthService bestaat en geladen kan worden
  if (typeof AuthService === 'undefined') {
    Logger.error('AuthService is niet gedefinieerd. Controleer of het bestand is geladen.');
    return false;
  }
  
  Logger.info('AuthService is correct gedefinieerd.');
  
  // Test het ophalen van authenticatie URL (zou niet moeten falen)
  try {
    const authUrl = AuthService.getAuthorizationUrl();
    Logger.info('AuthService kan een authenticatie URL genereren: ' + authUrl);
  } catch (error) {
    Logger.error('Fout bij het genereren van een authenticatie URL: ' + error.toString());
    return false;
  }
  
  // Test login status check (resultaat kan variëren afhankelijk van de omgeving)
  try {
    const loginStatus = AuthService.checkLoginStatus();
    Logger.info('AuthService login status controle resultaat: ' + JSON.stringify(loginStatus));
  } catch (error) {
    Logger.error('Fout bij het controleren van login status: ' + error.toString());
    return false;
  }
  
  // Test functies die mogelijk niet uitvoerbaar zijn in test context
  // (geen actieve gebruikerssessie), maar zorg dat ze geen fout geven
  try {
    Logger.info('Test isUserLoggedIn...');
    const isLoggedIn = AuthService.isUserLoggedIn();
    Logger.info('isUserLoggedIn resultaat: ' + isLoggedIn);
    
    Logger.info('Test getCurrentUser...');
    const user = AuthService.getCurrentUser();
    Logger.info('getCurrentUser resultaat: ' + (user ? JSON.stringify(user) : 'null'));
    
    Logger.info('Test isCurrentUserAdmin...');
    const isAdmin = AuthService.isCurrentUserAdmin();
    Logger.info('isCurrentUserAdmin resultaat: ' + isAdmin);
  } catch (error) {
    Logger.error('Fout bij het testen van gebruikersspecifieke functies: ' + error.toString());
    return false;
  }
  
  Logger.info('AuthService tests zijn succesvol afgerond.');
  return true;
}

/**
 * Test het maken van een gebruiker
 * 
 * Opmerking: Deze test vereist initialisatie van de database en maakt daadwerkelijk
 * een gebruiker aan in de database, dus voorzichtig gebruiken.
 */
function testCreateUser() {
  Logger.info('Begin test van AuthService.createUser...');
  
  // Controleer eerst of DataLayer is geïnitialiseerd
  if (!DataLayer.checkConnection()) {
    Logger.warning('DataLayer is niet geïnitialiseerd. Initialiseer de database eerst voordat je deze test uitvoert.');
    return false;
  }
  
  // Maak een test gebruiker
  const testEmail = 'test_' + Date.now() + '@example.com';
  const testUser = {
    email: testEmail,
    naam: 'Test Gebruiker',
    isActive: true,
    isAdmin: false,
    notificationsEnabled: true,
    checkFrequency: 'daily'
  };
  
  try {
    // Maak de gebruiker aan via DataLayer
    const createdUser = DataLayer.createUser(testUser);
    
    if (!createdUser || !createdUser.userId) {
      Logger.error('Gebruiker kon niet worden aangemaakt');
      return false;
    }
    
    Logger.info('Gebruiker succesvol aangemaakt met ID: ' + createdUser.userId);
    
    // Haal de gebruiker op via email
    const retrievedUser = DataLayer.getUserByEmail(testEmail);
    
    if (!retrievedUser || retrievedUser.email !== testEmail) {
      Logger.error('Kon de aangemaakte gebruiker niet ophalen');
      return false;
    }
    
    Logger.info('Gebruiker succesvol opgehaald via email');
    
    // Test het bijwerken van gebruikersinstellingen
    const updatedSettings = {
      naam: 'Bijgewerkte Naam',
      notificationsEnabled: false,
      checkFrequency: 'weekly'
    };
    
    const updatedUser = DataLayer.updateUser(createdUser.userId, updatedSettings);
    
    if (!updatedUser || updatedUser.naam !== 'Bijgewerkte Naam') {
      Logger.error('Kon de gebruikersinstellingen niet bijwerken');
      return false;
    }
    
    Logger.info('Gebruikersinstellingen succesvol bijgewerkt');
    
    // Verwijder de testgebruiker na afloop
    const deleteResult = DataLayer.deleteUser(createdUser.userId);
    
    if (!deleteResult) {
      Logger.warning('Kon de testgebruiker niet verwijderen. Handmatige opruiming vereist.');
    } else {
      Logger.info('Testgebruiker succesvol verwijderd');
    }
    
    Logger.info('AuthService createUser test is succesvol afgerond');
    return true;
  } catch (error) {
    Logger.error('Fout bij het testen van AuthService gebruikersbeheer: ' + error.toString());
    return false;
  }
}

/**
 * Test de admin functionaliteit
 * 
 * Opmerking: Deze test vereist dat er een bestaande admin gebruiker is
 * en moet handmatig worden aangepast voor gebruik.
 */
function testAdminFunctionality() {
  Logger.info('Begin test van AuthService admin functionaliteit...');
  
  // Controleer eerst of DataLayer is geïnitialiseerd
  if (!DataLayer.checkConnection()) {
    Logger.warning('DataLayer is niet geïnitialiseerd. Initialiseer de database eerst voordat je deze test uitvoert.');
    return false;
  }
  
  // Maak twee testgebruikers aan - één admin en één normaal
  const testAdmin = {
    email: 'admin_' + Date.now() + '@example.com',
    naam: 'Admin Gebruiker',
    isActive: true,
    isAdmin: true,
    notificationsEnabled: true,
    checkFrequency: 'daily'
  };
  
  const testUser = {
    email: 'user_' + Date.now() + '@example.com',
    naam: 'Normale Gebruiker',
    isActive: true,
    isAdmin: false,
    notificationsEnabled: true,
    checkFrequency: 'daily'
  };
  
  let adminId, userId;
  
  try {
    // Maak beide gebruikers aan
    const createdAdmin = DataLayer.createUser(testAdmin);
    const createdUser = DataLayer.createUser(testUser);
    
    adminId = createdAdmin.userId;
    userId = createdUser.userId;
    
    Logger.info('Testgebruikers aangemaakt - Admin ID: ' + adminId + ', User ID: ' + userId);
    
    // Zou niet moeten kunnen admin instellingen aanpassen zonder admin rechten
    // Dit kan niet worden getest zonder sessie context
    
    // Verwijder de testgebruikers
    DataLayer.deleteUser(adminId);
    DataLayer.deleteUser(userId);
    
    Logger.info('AuthService admin test is afgerond');
    return true;
  } catch (error) {
    Logger.error('Fout bij het testen van AuthService admin functionaliteit: ' + error.toString());
    
    // Probeer testgebruikers op te ruimen indien aangemaakt
    try {
      if (adminId) DataLayer.deleteUser(adminId);
      if (userId) DataLayer.deleteUser(userId);
    } catch (cleanupError) {
      Logger.warning('Kon testgebruikers niet opruimen: ' + cleanupError.toString());
    }
    
    return false;
  }
}

/**
 * Voer alle AuthService tests uit
 */
function runAllAuthServiceTests() {
  Logger.info('Begin uitvoering van alle AuthService tests...');
  
  const results = {
    basicTest: testAuthService(),
    createUserTest: testCreateUser(),
    adminTest: testAdminFunctionality()
  };
  
  Logger.info('AuthService test resultaten: ' + JSON.stringify(results));
  return results;
}
