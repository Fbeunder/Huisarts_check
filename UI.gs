/**
 * UI.gs - Gebruikersinterface voor de Huisarts Check applicatie
 * 
 * Dit bestand bevat functies voor het renderen van de webinterface en het
 * afhandelen van gebruikersinteractie voor de Huisarts Check applicatie.
 * Het integreert HTML-templates en client-side JavaScript om een naadloze
 * gebruikerservaring te bieden.
 */

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
   * Rendert het dashboard voor ingelogde gebruikers
   * 
   * @return {HtmlOutput} HTML-uitvoer voor het dashboard
   */
  renderDashboard() {
    try {
      Logger.info('Renderen van dashboard');
      
      // Controleer login status
      const authStatus = AuthService.checkLoginStatus();
      
      if (!authStatus.loggedIn) {
        // Gebruiker is niet ingelogd, redirect naar login pagina
        return this.renderLogin(authStatus.authUrl, authStatus.errorMessage);
      }
      
      // Laad dashboard template
      const template = HtmlService.createTemplateFromFile('HtmlTemplates/Dashboard');
      
      // Geef gebruiker en instellingen door
      template.user = authStatus.user;
      template.isAdmin = authStatus.isAdmin;
      
      // Laad praktijken van de gebruiker
      template.practices = DataLayer.getPracticesByUser(authStatus.user.userId);
      
      return template.evaluate()
        .setTitle('Dashboard - Huisarts Check')
        .setFaviconUrl('https://www.google.com/s2/favicons?domain=huisarts.nl');
    } catch (error) {
      Logger.error('Fout bij renderen van dashboard: ' + error.toString());
      return this.renderError('Er is een fout opgetreden bij het laden van het dashboard: ' + error.toString());
    }
  }
  
  /**
   * Rendert de instellingenpagina
   * 
   * @return {HtmlOutput} HTML-uitvoer voor de instellingen
   */
  renderSettings() {
    try {
      Logger.info('Renderen van instellingenpagina');
      
      // Controleer login status
      const authStatus = AuthService.checkLoginStatus();
      
      if (!authStatus.loggedIn) {
        // Gebruiker is niet ingelogd, redirect naar login pagina
        return this.renderLogin(authStatus.authUrl, authStatus.errorMessage);
      }
      
      // Laad settings template
      const template = HtmlService.createTemplateFromFile('HtmlTemplates/Settings');
      
      // Geef gebruiker en instellingen door
      template.user = authStatus.user;
      template.isAdmin = authStatus.isAdmin;
      
      return template.evaluate()
        .setTitle('Instellingen - Huisarts Check')
        .setFaviconUrl('https://www.google.com/s2/favicons?domain=huisarts.nl');
    } catch (error) {
      Logger.error('Fout bij renderen van instellingenpagina: ' + error.toString());
      return this.renderError('Er is een fout opgetreden bij het laden van de instellingen: ' + error.toString());
    }
  }
  
  /**
   * Rendert de login pagina
   * 
   * @param {string} authUrl - URL voor Google authenticatie
   * @param {string} errorMessage - Optionele foutmelding
   * @return {HtmlOutput} HTML-uitvoer voor de login pagina
   */
  renderLogin(authUrl, errorMessage = null) {
    try {
      Logger.info('Renderen van login pagina');
      
      // Laad login template
      const template = HtmlService.createTemplateFromFile('HtmlTemplates/Login');
      
      // Geef auth URL door
      template.authUrl = authUrl || AuthService.getLoginUrl();
      
      // Geef eventuele foutmelding door
      template.errorMessage = errorMessage;
      
      return template.evaluate()
        .setTitle('Inloggen - Huisarts Check')
        .setFaviconUrl('https://www.google.com/s2/favicons?domain=huisarts.nl');
    } catch (error) {
      Logger.error('Fout bij renderen van login pagina: ' + error.toString());
      return this.renderError('Er is een fout opgetreden bij het laden van de login pagina.');
    }
  }
  
  /**
   * Rendert de hoofdpagina
   * 
   * @return {HtmlOutput} HTML-uitvoer voor de hoofdpagina
   */
  renderHome() {
    try {
      Logger.info('Renderen van hoofdpagina');
      
      // Controleer login status
      const authStatus = AuthService.checkLoginStatus();
      
      if (!authStatus.loggedIn) {
        // Gebruiker is niet ingelogd, toon login pagina
        return this.renderLogin(authStatus.authUrl, authStatus.errorMessage);
      }
      
      // Gebruiker is ingelogd, laad normale UI
      const template = HtmlService.createTemplateFromFile('HtmlTemplates/Index');
      
      // Geef gebruikersgegevens door aan client
      template.user = authStatus.user;
      template.isAdmin = authStatus.isAdmin;
      
      return template.evaluate()
        .setTitle('Huisarts Check')
        .setFaviconUrl('https://www.google.com/s2/favicons?domain=huisarts.nl')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (error) {
      Logger.error('Fout bij renderen van hoofdpagina: ' + error.toString());
      return this.renderError('Er is een fout opgetreden bij het laden van de pagina.');
    }
  }
  
  /**
   * Rendert de 'Over' pagina
   * 
   * @return {HtmlOutput} HTML-uitvoer voor de over-pagina
   */
  renderAbout() {
    try {
      Logger.info('Renderen van Over pagina');
      
      // Laad about template
      const template = HtmlService.createTemplateFromFile('HtmlTemplates/About');
      
      return template.evaluate()
        .setTitle('Over - Huisarts Check')
        .setFaviconUrl('https://www.google.com/s2/favicons?domain=huisarts.nl');
    } catch (error) {
      Logger.error('Fout bij renderen van Over pagina: ' + error.toString());
      return this.renderError('Er is een fout opgetreden bij het laden van de pagina.');
    }
  }
  
  /**
   * Rendert de lijst met huisartsenpraktijken
   * 
   * @param {string} userId - ID van de gebruiker
   * @return {HtmlOutput} HTML-uitvoer voor de praktijkenlijst
   */
  renderPracticeList(userId) {
    try {
      Logger.info('Renderen van praktijkenlijst voor gebruiker ' + userId);
      
      // Controleer login status
      const authStatus = AuthService.checkLoginStatus();
      
      if (!authStatus.loggedIn) {
        // Gebruiker is niet ingelogd, return foutmelding
        return this.renderContentSection('<p>U moet ingelogd zijn om uw huisartsen te bekijken.</p>');
      }
      
      // Controleer of de gebruiker zijn eigen lijst bekijkt of een admin is
      if (userId !== authStatus.user.userId && !authStatus.isAdmin) {
        return this.renderContentSection('<p>U heeft geen toegang tot deze huisartsenlijst.</p>');
      }
      
      // Haal praktijken op
      const practices = DataLayer.getPracticesByUser(userId);
      
      // Als er geen praktijken zijn, toon lege state
      if (!practices || practices.length === 0) {
        return this.renderContentSection(`
          <div class="empty-state">
            <h3>Geen huisartsen gevonden</h3>
            <p>U heeft nog geen huisartsenpraktijken toegevoegd om te monitoren.</p>
            <button onclick="showAddPracticeForm()">Huisarts Toevoegen</button>
          </div>
        `);
      }
      
      // Bouw de lijst op
      let html = '<h3>Mijn Huisartsen</h3><div class="practices-grid">';
      
      practices.forEach(practice => {
        // Status klasse bepalen
        let statusClass = 'status-unknown';
        let statusText = 'Onbekend';
        
        if (practice.currentStatus === 'ja') {
          statusClass = 'status-accepting';
          statusText = 'Neemt patiënten aan';
        } else if (practice.currentStatus === 'nee') {
          statusClass = 'status-not-accepting';
          statusText = 'Neemt geen patiënten aan';
        }
        
        // Bouw praktijk kaart
        html += `
          <div class="practice-card">
            <h4>${practice.naam}</h4>
            <div class="practice-status ${statusClass}">
              <span>${statusText}</span>
            </div>
            <div class="practice-url">
              <a href="${practice.websiteUrl}" target="_blank">${practice.websiteUrl}</a>
            </div>
            <div class="practice-updated">
              Laatste update: ${this._formatDate(practice.updatedAt)}
            </div>
            <div class="practice-actions">
              <button class="btn-check" onclick="checkPractice('${practice.practiceId}')">Controleren</button>
              <button class="btn-edit" onclick="editPractice('${practice.practiceId}')">Bewerken</button>
              <button class="btn-delete" onclick="deletePractice('${practice.practiceId}')">Verwijderen</button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      
      return this.renderContentSection(html);
    } catch (error) {
      Logger.error('Fout bij renderen van praktijkenlijst: ' + error.toString());
      return this.renderContentSection('<p>Er is een fout opgetreden bij het laden van de huisartsenlijst: ' + error.toString() + '</p>');
    }
  }
  
  /**
   * Rendert het formulier voor het toevoegen van een praktijk
   * 
   * @return {HtmlOutput} HTML-uitvoer voor het formulier
   */
  renderAddPracticeForm() {
    try {
      Logger.info('Renderen van formulier voor toevoegen praktijk');
      
      // Controleer login status
      const authStatus = AuthService.checkLoginStatus();
      
      if (!authStatus.loggedIn) {
        // Gebruiker is niet ingelogd, return foutmelding
        return this.renderContentSection('<p>U moet ingelogd zijn om een huisarts toe te voegen.</p>');
      }
      
      // Bouw formulier
      let html = `
        <h3>Huisarts Toevoegen</h3>
        <form id="add-practice-form" onsubmit="return submitAddPracticeForm();">
          <div class="form-group">
            <label for="practice-name">Naam van de praktijk:</label>
            <input type="text" id="practice-name" name="naam" required>
          </div>
          <div class="form-group">
            <label for="practice-url">Website URL:</label>
            <input type="url" id="practice-url" name="websiteUrl" required placeholder="https://www.voorbeeld.nl">
          </div>
          <div class="form-group">
            <label for="practice-notes">Notities:</label>
            <textarea id="practice-notes" name="notes"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">Toevoegen</button>
            <button type="button" onclick="showPracticeList()">Annuleren</button>
          </div>
        </form>
      `;
      
      return this.renderContentSection(html);
    } catch (error) {
      Logger.error('Fout bij renderen van formulier voor toevoegen praktijk: ' + error.toString());
      return this.renderContentSection('<p>Er is een fout opgetreden bij het laden van het formulier: ' + error.toString() + '</p>');
    }
  }
  
  /**
   * Rendert het formulier voor het bewerken van een praktijk
   * 
   * @param {string} practiceId - ID van de praktijk
   * @return {HtmlOutput} HTML-uitvoer voor het formulier
   */
  renderEditPracticeForm(practiceId) {
    try {
      Logger.info('Renderen van formulier voor bewerken praktijk ' + practiceId);
      
      // Controleer login status
      const authStatus = AuthService.checkLoginStatus();
      
      if (!authStatus.loggedIn) {
        // Gebruiker is niet ingelogd, return foutmelding
        return this.renderContentSection('<p>U moet ingelogd zijn om een huisarts te bewerken.</p>');
      }
      
      // Haal praktijk op
      const practice = DataLayer.getPracticeById(practiceId);
      
      if (!practice) {
        return this.renderContentSection('<p>Huisartsenpraktijk niet gevonden.</p>');
      }
      
      // Controleer of de gebruiker toegang heeft tot deze praktijk
      if (practice.userId !== authStatus.user.userId && !authStatus.isAdmin) {
        return this.renderContentSection('<p>U heeft geen toegang tot deze huisartsenpraktijk.</p>');
      }
      
      // Bouw formulier
      let html = `
        <h3>Huisarts Bewerken</h3>
        <form id="edit-practice-form" onsubmit="return submitEditPracticeForm('${practiceId}');">
          <div class="form-group">
            <label for="practice-name">Naam van de praktijk:</label>
            <input type="text" id="practice-name" name="naam" value="${practice.naam}" required>
          </div>
          <div class="form-group">
            <label for="practice-url">Website URL:</label>
            <input type="url" id="practice-url" name="websiteUrl" value="${practice.websiteUrl}" required>
          </div>
          <div class="form-group">
            <label for="practice-notes">Notities:</label>
            <textarea id="practice-notes" name="notes">${practice.notes || ''}</textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">Opslaan</button>
            <button type="button" onclick="showPracticeList()">Annuleren</button>
          </div>
        </form>
      `;
      
      return this.renderContentSection(html);
    } catch (error) {
      Logger.error('Fout bij renderen van formulier voor bewerken praktijk: ' + error.toString());
      return this.renderContentSection('<p>Er is een fout opgetreden bij het laden van het formulier: ' + error.toString() + '</p>');
    }
  }
  
  /**
   * Rendert gedetailleerde informatie over een praktijk
   * 
   * @param {string} practiceId - ID van de praktijk
   * @return {HtmlOutput} HTML-uitvoer voor de praktijkdetails
   */
  renderPracticeDetail(practiceId) {
    try {
      Logger.info('Renderen van praktijkdetails voor ' + practiceId);
      
      // Controleer login status
      const authStatus = AuthService.checkLoginStatus();
      
      if (!authStatus.loggedIn) {
        // Gebruiker is niet ingelogd, return foutmelding
        return this.renderContentSection('<p>U moet ingelogd zijn om huisartsendetails te bekijken.</p>');
      }
      
      // Haal praktijk op
      const practice = DataLayer.getPracticeById(practiceId);
      
      if (!practice) {
        return this.renderContentSection('<p>Huisartsenpraktijk niet gevonden.</p>');
      }
      
      // Controleer of de gebruiker toegang heeft tot deze praktijk
      if (practice.userId !== authStatus.user.userId && !authStatus.isAdmin) {
        return this.renderContentSection('<p>U heeft geen toegang tot deze huisartsenpraktijk.</p>');
      }
      
      // Haal controlegeschiedenis op
      const checks = DataLayer.getChecksByPractice(practiceId);
      
      // Status klasse bepalen
      let statusClass = 'status-unknown';
      let statusText = 'Onbekend';
      
      if (practice.currentStatus === 'ja') {
        statusClass = 'status-accepting';
        statusText = 'Neemt patiënten aan';
      } else if (practice.currentStatus === 'nee') {
        statusClass = 'status-not-accepting';
        statusText = 'Neemt geen patiënten aan';
      }
      
      // Bouw detailweergave
      let html = `
        <div class="practice-detail">
          <h3>${practice.naam}</h3>
          
          <div class="practice-header">
            <div class="practice-status ${statusClass}">
              <span>${statusText}</span>
            </div>
            <div class="practice-actions">
              <button class="btn-check" onclick="checkPractice('${practiceId}')">Controleren</button>
              <button class="btn-edit" onclick="editPractice('${practiceId}')">Bewerken</button>
              <button class="btn-delete" onclick="deletePractice('${practiceId}')">Verwijderen</button>
              <button class="btn-back" onclick="showPracticeList()">Terug naar overzicht</button>
            </div>
          </div>
          
          <div class="practice-info">
            <div class="info-group">
              <label>Website:</label>
              <a href="${practice.websiteUrl}" target="_blank">${practice.websiteUrl}</a>
            </div>
            
            <div class="info-group">
              <label>Laatste statuswijziging:</label>
              <span>${this._formatDate(practice.lastStatusChange)}</span>
            </div>
            
            <div class="info-group">
              <label>Toegevoegd op:</label>
              <span>${this._formatDate(practice.createdAt)}</span>
            </div>
            
            <div class="info-group">
              <label>Notities:</label>
              <p>${practice.notes || 'Geen notities'}</p>
            </div>
          </div>
      `;
      
      // Voeg controlegeschiedenis toe als die er is
      if (checks && checks.length > 0) {
        html += '<div class="practice-history"><h4>Controlegeschiedenis</h4><table class="history-table">';
        html += '<tr><th>Datum</th><th>Status</th><th>Resultaat</th><th>Verandering</th></tr>';
        
        // Sorteer checks op timestamp (nieuwste eerst)
        const sortedChecks = checks.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });
        
        // Beperk tot de 10 meest recente controles
        const recentChecks = sortedChecks.slice(0, 10);
        
        recentChecks.forEach(check => {
          const changeClass = check.hasChanged ? 'changed' : '';
          const changeIcon = check.hasChanged ? '✓' : '-';
          
          html += `
            <tr class="${changeClass}">
              <td>${this._formatDate(check.timestamp)}</td>
              <td>${check.status}</td>
              <td>${check.resultText || '-'}</td>
              <td>${changeIcon}</td>
            </tr>
          `;
        });
        
        html += '</table></div>';
      } else {
        html += '<div class="practice-history"><p>Nog geen controles uitgevoerd.</p></div>';
      }
      
      html += '</div>';
      
      return this.renderContentSection(html);
    } catch (error) {
      Logger.error('Fout bij renderen van praktijkdetails: ' + error.toString());
      return this.renderContentSection('<p>Er is een fout opgetreden bij het laden van de praktijkdetails: ' + error.toString() + '</p>');
    }
  }
  
  /**
   * Rendert een sectie voor de inhoud
   * 
   * @param {string} html - HTML inhoud
   * @return {HtmlOutput} HTML uitvoer
   * @private
   */
  renderContentSection(html) {
    try {
      // Creëer een HTML uitvoer object
      const output = HtmlService.createHtmlOutput(html);
      return output;
    } catch (error) {
      Logger.error('Fout bij renderen van content sectie: ' + error.toString());
      return HtmlService.createHtmlOutput('<p>Er is een fout opgetreden bij het laden van de content: ' + error.toString() + '</p>');
    }
  }
  
  /**
   * Rendert een foutpagina
   * 
   * @param {string} errorMessage - Foutmelding
   * @return {HtmlOutput} HTML-uitvoer voor de foutpagina
   */
  renderError(errorMessage) {
    try {
      Logger.info('Renderen van foutpagina');
      
      // Bouw foutpagina
      const html = `
        <div class="error-container">
          <h2>Er is een fout opgetreden</h2>
          <p>${errorMessage}</p>
          <button onclick="window.location.reload()">Probeer opnieuw</button>
        </div>
      `;
      
      return HtmlService.createHtmlOutput(html)
        .setTitle('Fout - Huisarts Check')
        .setFaviconUrl('https://www.google.com/s2/favicons?domain=huisarts.nl');
    } catch (error) {
      Logger.error('Fout bij renderen van foutpagina: ' + error.toString());
      return HtmlService.createHtmlOutput('<h2>Er is een fout opgetreden</h2><p>Details konden niet worden geladen.</p>');
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
