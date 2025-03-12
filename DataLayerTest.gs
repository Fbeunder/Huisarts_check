/**
 * DataLayerTest.gs - Test functies voor de DataLayer module
 * 
 * Dit bestand bevat functies voor het testen van de DataLayer functionaliteit.
 * Het is bedoeld voor ontwikkelingsdoeleinden en kan later worden verwijderd of aangepast.
 */

/**
 * Voert een uitgebreide test uit van de DataLayer functionaliteit
 */
function testDataLayer() {
  Logger.info('Start van DataLayer test');
  
  try {
    // Test database initialisatie
    Logger.info('Test: Database initialisatie');
    const initResult = DataLayer.initializeDatabase();
    Logger.info('Initialisatie resultaat: ' + initResult);
    
    // Test database verbinding
    Logger.info('Test: Database verbinding');
    const connectionOk = DataLayer.checkConnection();
    Logger.info('Verbinding OK: ' + connectionOk);
    
    if (!connectionOk) {
      throw new Error('Database verbinding mislukt, verdere tests worden overgeslagen');
    }
    
    // Test gebruikersbeheer
    Logger.info('Test: Gebruikersbeheer - Aanmaken gebruiker');
    const testUser = DataLayer.createUser({
      naam: 'Test Gebruiker',
      email: 'test@voorbeeld.nl',
      isAdmin: false
    });
    Logger.info('Gebruiker aangemaakt met ID: ' + testUser.userId);
    
    Logger.info('Test: Gebruikersbeheer - Ophalen gebruiker');
    const retrievedUser = DataLayer.getUserById(testUser.userId);
    Logger.info('Gebruiker opgehaald: ' + JSON.stringify(retrievedUser));
    
    Logger.info('Test: Gebruikersbeheer - Bijwerken gebruiker');
    const updatedUser = DataLayer.updateUser(testUser.userId, {
      naam: 'Bijgewerkte Test Gebruiker',
      checkFrequency: 'weekly'
    });
    Logger.info('Gebruiker bijgewerkt: ' + JSON.stringify(updatedUser));
    
    // Test huisartsenpraktijk beheer
    Logger.info('Test: Praktijkbeheer - Aanmaken praktijk');
    const testPractice = DataLayer.createPractice({
      userId: testUser.userId,
      naam: 'Test Praktijk',
      websiteUrl: 'https://testpraktijk.nl',
      currentStatus: 'nee'
    });
    Logger.info('Praktijk aangemaakt met ID: ' + testPractice.practiceId);
    
    Logger.info('Test: Praktijkbeheer - Ophalen praktijk');
    const retrievedPractice = DataLayer.getPracticeById(testPractice.practiceId);
    Logger.info('Praktijk opgehaald: ' + JSON.stringify(retrievedPractice));
    
    Logger.info('Test: Praktijkbeheer - Bijwerken praktijk');
    const updatedPractice = DataLayer.updatePractice(testPractice.practiceId, {
      naam: 'Bijgewerkte Test Praktijk',
      currentStatus: 'ja'
    });
    Logger.info('Praktijk bijgewerkt: ' + JSON.stringify(updatedPractice));
    
    Logger.info('Test: Praktijkbeheer - Ophalen praktijken van gebruiker');
    const userPractices = DataLayer.getPracticesByUser(testUser.userId);
    Logger.info('Praktijken van gebruiker: ' + userPractices.length);
    
    // Test controlebeheer
    Logger.info('Test: Controlebeheer - Toevoegen controle');
    const testCheck1 = DataLayer.addCheck({
      practiceId: testPractice.practiceId,
      status: 'nee',
      resultText: 'Deze praktijk neemt geen nieuwe patiënten aan',
      hasChanged: false
    });
    Logger.info('Controle 1 toegevoegd met ID: ' + testCheck1.checkId);
    
    // Voeg een tweede controle toe na een kleine vertraging
    Utilities.sleep(1000);
    
    const testCheck2 = DataLayer.addCheck({
      practiceId: testPractice.practiceId,
      status: 'ja',
      resultText: 'Deze praktijk neemt nieuwe patiënten aan',
      hasChanged: true
    });
    Logger.info('Controle 2 toegevoegd met ID: ' + testCheck2.checkId);
    
    Logger.info('Test: Controlebeheer - Ophalen controles van praktijk');
    const practiceChecks = DataLayer.getChecksByPractice(testPractice.practiceId);
    Logger.info('Controles van praktijk: ' + practiceChecks.length);
    
    Logger.info('Test: Controlebeheer - Ophalen laatste controle van praktijk');
    const latestCheck = DataLayer.getLatestCheckForPractice(testPractice.practiceId);
    Logger.info('Laatste controle: ' + JSON.stringify(latestCheck));
    
    Logger.info('Test: Controlebeheer - Ophalen controles van gebruiker');
    const userChecks = DataLayer.getChecksByUser(testUser.userId);
    Logger.info('Controles van gebruiker: ' + userChecks.length);
    
    // Test datum range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // Gisteren
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1); // Morgen
    
    Logger.info('Test: Controlebeheer - Ophalen controles in datum range');
    const rangeChecks = DataLayer.getChecksInDateRange(startDate, endDate);
    Logger.info('Controles in range: ' + rangeChecks.length);
    
    // Test logbeheer
    Logger.info('Test: Logbeheer - Toevoegen logbericht');
    const logResult = DataLayer.addLogEntry({
      level: 'INFO',
      message: 'Test logbericht'
    });
    Logger.info('Logbericht toegevoegd: ' + logResult);
    
    Logger.info('Test: Logbeheer - Ophalen logberichten');
    const logs = DataLayer.getLogEntries({ limit: 10 });
    Logger.info('Logberichten opgehaald: ' + logs.length);
    
    // Opschonen testdata
    Logger.info('Test: Opschonen - Verwijderen controles (niet mogelijk via API)');
    // Controles kunnen niet direct worden verwijderd in huidige implementatie
    
    Logger.info('Test: Opschonen - Verwijderen praktijk');
    const deletePracticeResult = DataLayer.deletePractice(testPractice.practiceId);
    Logger.info('Praktijk verwijderd: ' + deletePracticeResult);
    
    Logger.info('Test: Opschonen - Verwijderen gebruiker');
    const deleteUserResult = DataLayer.deleteUser(testUser.userId);
    Logger.info('Gebruiker verwijderd: ' + deleteUserResult);
    
    Logger.info('DataLayer test succesvol afgerond');
  } catch (error) {
    Logger.error('Fout tijdens testen: ' + error.toString());
  }
}

/**
 * Snelle test functie om de initialisatie van de database te controleren
 */
function testInitDatabase() {
  const result = DataLayer.initializeDatabase();
  Logger.info('Database initialisatie resultaat: ' + result);
}

/**
 * Test functie om een gebruiker aan te maken
 */
function testCreateUser() {
  const user = DataLayer.createUser({
    naam: 'Test Gebruiker',
    email: 'test@voorbeeld.nl',
    isAdmin: false
  });
  Logger.info('Gebruiker aangemaakt: ' + JSON.stringify(user));
}

/**
 * Test functie om een praktijk aan te maken
 * (Vereist een bestaande gebruiker ID)
 */
function testCreatePractice() {
  // Vervang door een bestaande gebruiker ID
  const userId = 'VOER_GEBRUIKER_ID_IN';
  
  const practice = DataLayer.createPractice({
    userId: userId,
    naam: 'Test Praktijk',
    websiteUrl: 'https://testpraktijk.nl',
    currentStatus: 'nee'
  });
  Logger.info('Praktijk aangemaakt: ' + JSON.stringify(practice));
}

/**
 * Test functie om een controle toe te voegen
 * (Vereist een bestaande praktijk ID)
 */
function testAddCheck() {
  // Vervang door een bestaande praktijk ID
  const practiceId = 'VOER_PRAKTIJK_ID_IN';
  
  const check = DataLayer.addCheck({
    practiceId: practiceId,
    status: 'nee',
    resultText: 'Deze praktijk neemt geen nieuwe patiënten aan',
    hasChanged: false
  });
  Logger.info('Controle toegevoegd: ' + JSON.stringify(check));
}

/**
 * Test functie om te controleren of de database verbinding werkt
 */
function testConnection() {
  const result = DataLayer.checkConnection();
  Logger.info('Database verbinding: ' + result);
}
