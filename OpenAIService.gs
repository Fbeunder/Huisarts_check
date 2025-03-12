/**
 * OpenAIService.gs - Integratie met OpenAI API voor het analyseren van huisartsenpraktijk websites
 * 
 * Deze module verzorgt de integratie met de OpenAI API voor het analyseren van huisartsenpraktijk
 * websites om te bepalen of ze nieuwe patiënten aannemen. Het biedt functies voor het ophalen
 * van website-inhoud, het analyseren hiervan, en het classificeren van de status.
 */

/**
 * OpenAIService klasse voor het analyseren van huisartsenpraktijk websites
 */
class OpenAIServiceClass {
  /**
   * Constructor voor OpenAIService
   */
  constructor() {
    // API key valideren bij instantiëring
    this._validateAPIKey();
  }
  
  /**
   * Analyseer een huisartsenpraktijk website om te bepalen of ze nieuwe patiënten aannemen
   * 
   * @param {string} url - De URL van de website om te analyseren
   * @return {Object} - Object met status en geëxtraheerde informatie
   */
  analyzeWebsite(url) {
    try {
      Logger.info(`Analyseren van website: ${url}`);
      
      // Website inhoud ophalen
      const content = this.getWebsiteContent(url);
      
      // Als geen inhoud kon worden opgehaald, return onbekende status
      if (!content) {
        Logger.warning(`Geen inhoud kunnen ophalen van: ${url}`);
        return {
          status: 'UNKNOWN',
          message: 'Geen website-inhoud kunnen ophalen',
          url: url,
          timestamp: new Date().toISOString()
        };
      }
      
      // Verwerk de inhoud en bepaal de status
      const processedContent = this.processContent(content);
      const classification = this.classifyPatientStatus(processedContent);
      const relevantInfo = this.extractRelevantInformation(processedContent);
      
      // Log resultaat
      Logger.info(`Website analyse resultaat voor ${url}: ${classification.status}`);
      
      // Return resultaat
      return {
        status: classification.status,
        confidence: classification.confidence,
        details: relevantInfo,
        url: url,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error(`Fout bij analyseren van website ${url}: ${error.toString()}`);
      throw new Error(`Fout bij analyseren van website: ${error.toString()}`);
    }
  }
  
  /**
   * Haal de inhoud van een website op
   * 
   * @param {string} url - De URL van de website
   * @return {string} - De HTML inhoud van de website
   */
  getWebsiteContent(url) {
    try {
      Logger.info(`Ophalen van website inhoud: ${url}`);
      
      // HTTP opties
      const options = {
        'muteHttpExceptions': true,
        'followRedirects': true,
        'contentType': 'text/html;charset=utf-8'
      };
      
      // Probeer de website op te halen
      const response = UrlFetchApp.fetch(url, options);
      
      // Controleer of de request succesvol was
      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        const content = response.getContentText();
        return content;
      } else {
        Logger.warning(`HTTP foutcode ${response.getResponseCode()} bij ophalen van ${url}`);
        return null;
      }
    } catch (error) {
      Logger.error(`Fout bij ophalen van website ${url}: ${error.toString()}`);
      return null;
    }
  }
  
  /**
   * Verwerk de ruwe website-inhoud voor analyse
   * 
   * @param {string} content - De ruwe HTML inhoud van de website
   * @return {string} - Verwerkte inhoud klaar voor analyse
   */
  processContent(content) {
    try {
      // Verwijder HTML tags en behoud alleen de tekst
      let processedContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
      processedContent = processedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      processedContent = processedContent.replace(/<[^>]+>/g, ' ');
      
      // Decodeer HTML entiteiten
      processedContent = processedContent.replace(/&nbsp;/g, ' ');
      processedContent = processedContent.replace(/&amp;/g, '&');
      processedContent = processedContent.replace(/&lt;/g, '<');
      processedContent = processedContent.replace(/&gt;/g, '>');
      
      // Normaliseer witruimte
      processedContent = processedContent.replace(/\s+/g, ' ').trim();
      
      // Beperk de lengte om API kosten te beheersen
      // Geef voorrang aan de eerste 8000 tekens, aangezien dat meestal het belangrijkste deel van de pagina is
      if (processedContent.length > 8000) {
        processedContent = processedContent.substring(0, 8000);
        Logger.info('Inhoud ingekort tot 8000 tekens om API-kosten te beperken');
      }
      
      return processedContent;
    } catch (error) {
      Logger.error(`Fout bij verwerken van website inhoud: ${error.toString()}`);
      return content;
    }
  }
  
  /**
   * Classificeer de website-inhoud om te bepalen of de praktijk nieuwe patiënten aanneemt
   * 
   * @param {string} content - De verwerkte website-inhoud
   * @return {Object} - Object met status en confidence level
   */
  classifyPatientStatus(content) {
    try {
      // Gebruik de OpenAI API om de status te bepalen
      const prompt = this._buildClassificationPrompt(content);
      const response = this._callOpenAI(prompt);
      
      // Verwerk het resultaat
      return this._parseClassificationResponse(response);
    } catch (error) {
      Logger.error(`Fout bij classificeren van patiëntstatus: ${error.toString()}`);
      return {
        status: 'UNKNOWN',
        confidence: 0
      };
    }
  }
  
  /**
   * Extraheer relevante informatie uit de website-inhoud
   * 
   * @param {string} content - De verwerkte website-inhoud
   * @return {Object} - Object met geëxtraheerde informatie
   */
  extractRelevantInformation(content) {
    try {
      // Gebruik de OpenAI API om relevante informatie te extraheren
      const prompt = this._buildExtractionPrompt(content);
      const response = this._callOpenAI(prompt);
      
      // Verwerk het resultaat
      return this._parseExtractionResponse(response);
    } catch (error) {
      Logger.error(`Fout bij extraheren van relevante informatie: ${error.toString()}`);
      return {
        waitingList: false,
        conditions: [],
        waitingTime: null,
        contactInfo: null,
        lastUpdated: null
      };
    }
  }
  
  /**
   * Bouw de prompt voor het classificeren van de patiëntstatus
   * 
   * @param {string} content - De verwerkte website-inhoud
   * @return {Array<Object>} - Array van message objects voor OpenAI API
   * @private
   */
  _buildClassificationPrompt(content) {
    const systemPrompt = {
      role: "system",
      content: `Je bent een AI die gespecialiseerd is in het analyseren van huisartsenpraktijk websites in Nederland. 
Je taak is om te bepalen of een praktijk nieuwe patiënten aanneemt gebaseerd op de website inhoud.

Classificeer de status als één van de volgende:
- "ACCEPTING" - De praktijk neemt actief nieuwe patiënten aan
- "NOT_ACCEPTING" - De praktijk neemt momenteel geen nieuwe patiënten aan of heeft een wachtlijst
- "UNKNOWN" - Het is niet duidelijk uit de inhoud of de praktijk nieuwe patiënten aanneemt

Geef je antwoord in het volgende JSON formaat:
{
  "status": "ACCEPTING|NOT_ACCEPTING|UNKNOWN",
  "confidence": 0-100,
  "reasoning": "Beknopte uitleg van je beslissing"
}

Hier zijn voorbeelden van formuleringen die aangeven dat een praktijk nieuwe patiënten AANNEEMT:
- "U kunt zich aanmelden als nieuwe patiënt"
- "Nieuwe patiënten zijn welkom"
- "Inschrijven kan via het formulier"
- "Voor het inschrijven als nieuwe patiënt kunt u..."

Voorbeelden van formuleringen die aangeven dat een praktijk GEEN nieuwe patiënten aanneemt:
- "Momenteel nemen wij geen nieuwe patiënten aan"
- "Onze praktijk heeft een patiëntenstop"
- "Er is een wachtlijst voor nieuwe patiënten"
- "Wij hebben helaas een inschrijvingsstop"
- "Onze praktijk zit vol"`
    };
    
    const userPrompt = {
      role: "user",
      content: `Analyseer de volgende website inhoud van een huisartsenpraktijk en bepaal of ze nieuwe patiënten aannemen:

${content}`
    };
    
    return [systemPrompt, userPrompt];
  }
  
  /**
   * Bouw de prompt voor het extraheren van relevante informatie
   * 
   * @param {string} content - De verwerkte website-inhoud
   * @return {Array<Object>} - Array van message objects voor OpenAI API
   * @private
   */
  _buildExtractionPrompt(content) {
    const systemPrompt = {
      role: "system",
      content: `Je bent een AI die gespecialiseerd is in het analyseren van huisartsenpraktijk websites in Nederland.
Je taak is om relevante informatie te extraheren over het aannamebeleid van nieuwe patiënten.

Extract de volgende informatie uit de inhoud en geef je antwoord in het volgende JSON formaat:
{
  "waitingList": true|false|null,
  "conditions": ["voorwaarde1", "voorwaarde2", ...],
  "waitingTime": "geschatte wachttijd als tekst"|null,
  "contactInfo": "contactinformatie voor inschrijving"|null,
  "lastUpdated": "datum van laatste update als vermeld"|null
}

- "waitingList": Geeft aan of er een wachtlijst is (true), zeker geen wachtlijst is (false), of onbekend (null)
- "conditions": Array van voorwaarden voor inschrijving, zoals woongebied of andere vereisten
- "waitingTime": Geschatte wachttijd voor nieuwe patiënten als vermeld op de website
- "contactInfo": Specifieke contactinformatie voor inschrijving als nieuwe patiënt
- "lastUpdated": Datum van laatste update van deze informatie als vermeld op de website`
    };
    
    const userPrompt = {
      role: "user",
      content: `Extraheer relevante informatie over het aannamebeleid voor nieuwe patiënten uit de volgende website inhoud:

${content}`
    };
    
    return [systemPrompt, userPrompt];
  }
  
  /**
   * Roep de OpenAI API aan
   * 
   * @param {Array<Object>} messages - Array van messages voor de API
   * @return {Object} - Het resultaat van de API aanroep
   * @private
   */
  _callOpenAI(messages) {
    try {
      // Valideer de API key
      this._validateAPIKey();
      
      // Bouw request payload
      const payload = {
        model: CONFIG.OPENAI_API.MODEL,
        messages: messages,
        temperature: CONFIG.OPENAI_API.TEMPERATURE,
        max_tokens: CONFIG.OPENAI_API.MAX_TOKENS,
        n: 1
      };
      
      // HTTP opties
      const options = {
        'method': 'post',
        'contentType': 'application/json',
        'payload': JSON.stringify(payload),
        'headers': {
          'Authorization': `Bearer ${getOpenAIApiKey()}`
        },
        'muteHttpExceptions': true
      };
      
      // Implementeer exponentiële backoff
      let attempt = 0;
      const maxAttempts = 3;
      let response;
      
      while (attempt < maxAttempts) {
        // Implementeer rate limiting
        if (attempt > 0) {
          // Exponentiële backoff wachttijd (1s, 2s, 4s)
          const waitTime = Math.pow(2, attempt);
          Logger.info(`Wachten ${waitTime} seconden voor API retry poging ${attempt + 1}`);
          Utilities.sleep(waitTime * 1000);
        }
        
        // Roep de API aan
        response = UrlFetchApp.fetch(CONFIG.OPENAI_API.URL, options);
        
        // Controleer de response
        if (response.getResponseCode() === 200) {
          // Succes
          break;
        } else if (response.getResponseCode() === 429) {
          // Rate limiting, probeer opnieuw
          Logger.warning(`Rate limiting bij OpenAI API, poging ${attempt + 1} van ${maxAttempts}`);
          attempt++;
        } else {
          // Andere fout, log en gooi exception
          const errorText = response.getContentText();
          Logger.error(`OpenAI API fout (${response.getResponseCode()}): ${errorText}`);
          throw new Error(`OpenAI API fout (${response.getResponseCode()}): ${errorText}`);
        }
      }
      
      // Als we hier komen en er is rate limiting, gooi een fout
      if (response.getResponseCode() === 429) {
        throw new Error('OpenAI API rate limiting na meerdere pogingen');
      }
      
      // Verwerk de response
      const jsonResponse = JSON.parse(response.getContentText());
      return jsonResponse;
    } catch (error) {
      Logger.error(`Fout bij aanroepen van OpenAI API: ${error.toString()}`);
      throw new Error(`Fout bij aanroepen van OpenAI API: ${error.toString()}`);
    }
  }
  
  /**
   * Parse de response van de OpenAI API voor classificatie
   * 
   * @param {Object} response - De response van de OpenAI API
   * @return {Object} - Geparseerde classificatie
   * @private
   */
  _parseClassificationResponse(response) {
    try {
      // Haal het antwoord uit de response
      const content = response.choices[0].message.content;
      
      // Probeer JSON te parsen
      const parsedContent = JSON.parse(content);
      
      // Valideer de response
      if (!parsedContent.status || !['ACCEPTING', 'NOT_ACCEPTING', 'UNKNOWN'].includes(parsedContent.status)) {
        Logger.warning(`Ongeldige status in OpenAI response: ${parsedContent.status}`);
        return {
          status: 'UNKNOWN',
          confidence: 0,
          reasoning: 'Ongeldige response van model'
        };
      }
      
      // Normaliseer confidence tussen 0-100
      let confidence = parsedContent.confidence;
      if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
        confidence = 50; // Default waarde als confidence ongeldig is
      }
      
      return {
        status: parsedContent.status,
        confidence: confidence,
        reasoning: parsedContent.reasoning || 'Geen redenering opgegeven'
      };
    } catch (error) {
      Logger.error(`Fout bij parsen van classificatie response: ${error.toString()}`);
      return {
        status: 'UNKNOWN',
        confidence: 0,
        reasoning: 'Fout bij parsen van response'
      };
    }
  }
  
  /**
   * Parse de response van de OpenAI API voor informatie extractie
   * 
   * @param {Object} response - De response van de OpenAI API
   * @return {Object} - Geparseerde informatie
   * @private
   */
  _parseExtractionResponse(response) {
    try {
      // Haal het antwoord uit de response
      const content = response.choices[0].message.content;
      
      // Probeer JSON te parsen
      const parsedContent = JSON.parse(content);
      
      // Valideer en normaliseer de velden
      return {
        waitingList: typeof parsedContent.waitingList === 'boolean' ? parsedContent.waitingList : null,
        conditions: Array.isArray(parsedContent.conditions) ? parsedContent.conditions : [],
        waitingTime: typeof parsedContent.waitingTime === 'string' ? parsedContent.waitingTime : null,
        contactInfo: typeof parsedContent.contactInfo === 'string' ? parsedContent.contactInfo : null,
        lastUpdated: typeof parsedContent.lastUpdated === 'string' ? parsedContent.lastUpdated : null
      };
    } catch (error) {
      Logger.error(`Fout bij parsen van extractie response: ${error.toString()}`);
      return {
        waitingList: null,
        conditions: [],
        waitingTime: null,
        contactInfo: null,
        lastUpdated: null
      };
    }
  }
  
  /**
   * Valideer of de API key is ingesteld
   * 
   * @throws {Error} Als de API key niet is ingesteld
   * @private
   */
  _validateAPIKey() {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      const errorMsg = 'OpenAI API key is niet ingesteld. Gebruik setOpenAIApiKey() om deze in te stellen.';
      Logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

// Instantieer een global OpenAIService object
const OpenAIService = new OpenAIServiceClass();

/**
 * Test de OpenAI service met een specifieke URL
 * 
 * @param {string} url - De URL om te testen
 * @return {Object} - Het resultaat van de analyse
 */
function testOpenAIService(url) {
  try {
    return OpenAIService.analyzeWebsite(url);
  } catch (error) {
    Logger.error(`Test van OpenAIService gefaald: ${error.toString()}`);
    return {
      error: error.toString()
    };
  }
}
