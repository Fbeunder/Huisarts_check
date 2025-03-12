/**
 * OpenAIService.gs - Integratie met OpenAI Web Search API voor het analyseren van huisartsenpraktijk websites
 * 
 * Deze module verzorgt de integratie met de OpenAI Web Search API voor het analyseren van huisartsenpraktijk
 * websites om te bepalen of ze nieuwe patiënten aannemen. Het biedt functionaliteit om de API te bevragen
 * en de resultaten te verwerken voor gebruik in de applicatie.
 */

/**
 * OpenAIService klasse voor het analyseren van huisartsenpraktijk websites via Web Search API
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
      Logger.info(`Analyseren van website via Web Search API: ${url}`);
      
      // Roep de OpenAI Web Search API aan om de website te analyseren
      const response = this._callWebSearchAPI(url);
      
      // Als er geen resultaat is, geef onbekende status terug
      if (!response || !response.length) {
        Logger.warning(`Geen resultaat van Web Search API voor: ${url}`);
        return {
          status: 'UNKNOWN',
          message: 'Geen resultaat van Web Search API',
          url: url,
          timestamp: new Date().toISOString()
        };
      }
      
      // Verwerk en interpreteer het antwoord van de API
      const classificationResult = this._interpretSearchResults(response, url);
      
      // Log resultaat
      Logger.info(`Website analyse resultaat voor ${url}: ${classificationResult.status}`);
      
      return classificationResult;
    } catch (error) {
      Logger.error(`Fout bij analyseren van website ${url}: ${error.toString()}`);
      throw new Error(`Fout bij analyseren van website: ${error.toString()}`);
    }
  }
  
  /**
   * Roep de OpenAI Web Search API aan om een website te analyseren
   * 
   * @param {string} url - De URL van de website om te analyseren
   * @return {Object} - Het resultaat van de API-aanroep
   * @private
   */
  _callWebSearchAPI(url) {
    try {
      // Valideer de API key
      this._validateAPIKey();
      
      // Bouw de prompt voor het analyseren van de huisartsenpraktijk website
      const input = this._buildWebSearchPrompt(url);
      
      // Bouw payload voor de API-aanroep
      const payload = {
        model: CONFIG.OPENAI_API.MODEL,
        tools: [{
          type: "web_search_preview",
          search_context_size: CONFIG.OPENAI_API.SEARCH_CONTEXT_SIZE,
          user_location: {
            type: "approximate",
            country: CONFIG.OPENAI_API.COUNTRY_CODE
          }
        }],
        tool_choice: { type: "web_search_preview" }, // Forceer gebruik van web search
        input: input,
        max_tokens: CONFIG.OPENAI_API.MAX_TOKENS,
        temperature: CONFIG.OPENAI_API.TEMPERATURE
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
      Logger.error(`Fout bij aanroepen van OpenAI Web Search API: ${error.toString()}`);
      throw new Error(`Fout bij aanroepen van OpenAI Web Search API: ${error.toString()}`);
    }
  }
  
  /**
   * Bouw de prompt voor de Web Search API om een huisartsenpraktijk website te analyseren
   * 
   * @param {string} url - De URL van de website om te analyseren
   * @return {string} - De prompt voor de Web Search API
   * @private
   */
  _buildWebSearchPrompt(url) {
    return `Bezoek en analyseer de huisartsenpraktijk website ${url} om te bepalen of ze nieuwe patiënten aannemen. 
    
Zoek naar specifieke informatie over het aannamebeleid, zoals:
1. Of ze expliciet vermelden dat ze nieuwe patiënten aannemen of juist niet
2. Of er een patiëntenstop, inschrijvingsstop of wachtlijst is
3. Voorwaarden voor inschrijving (zoals woongebied, etc.)
4. Hoe lang eventuele wachttijden zijn
5. Contactinformatie specifiek voor nieuwe patiënten

Geef je antwoord in JSON-formaat:
{
  "status": "ACCEPTING", "NOT_ACCEPTING", of "UNKNOWN",
  "confidence": [0-100],
  "details": {
    "waitingList": true/false/null,
    "conditions": ["voorwaarde1", "voorwaarde2", ...],
    "waitingTime": "geschatte wachttijd als vermeld" of null,
    "contactInfo": "contactinformatie voor inschrijving" of null,
    "lastUpdated": "datum van laatste update" of null
  },
  "reasoning": "korte uitleg van je beslissing",
  "url": "${url}",
  "timestamp": "huidige datum en tijd"
}

Formats zoals "Nieuwe patiënten zijn welkom", "U kunt zich aanmelden", "Voor het inschrijven" duiden op ACCEPTING.
Formats zoals "Momenteel nemen wij geen nieuwe patiënten aan", "Patiëntenstop", "Inschrijvingsstop", "Wachtlijst" duiden op NOT_ACCEPTING.
Bij onduidelijkheid, kies UNKNOWN.`;
  }
  
  /**
   * Interpreteer de resultaten van de Web Search API aanroep
   * 
   * @param {Object} response - De respons van de Web Search API
   * @param {string} url - De URL van de geanalyseerde website
   * @return {Object} - Geïnterpreteerde resultaten in gestructureerd formaat
   * @private
   */
  _interpretSearchResults(response, url) {
    try {
      // Zoek het message item in de respons
      const messageItem = response.find(item => item.type === 'message');
      
      if (!messageItem || !messageItem.content || !messageItem.content.length) {
        Logger.warning(`Geen message inhoud gevonden in Web Search API respons voor ${url}`);
        return {
          status: 'UNKNOWN',
          confidence: 0,
          details: {
            waitingList: null,
            conditions: [],
            waitingTime: null,
            contactInfo: null,
            lastUpdated: null
          },
          reasoning: 'Geen geldige respons van Web Search API',
          url: url,
          timestamp: new Date().toISOString()
        };
      }
      
      // Haal de tekstinhoud op
      const textContent = messageItem.content.find(content => content.type === 'output_text');
      
      if (!textContent || !textContent.text) {
        Logger.warning(`Geen tekstinhoud gevonden in Web Search API respons voor ${url}`);
        return {
          status: 'UNKNOWN',
          confidence: 0,
          details: {
            waitingList: null,
            conditions: [],
            waitingTime: null,
            contactInfo: null,
            lastUpdated: null
          },
          reasoning: 'Geen tekstinhoud in respons van Web Search API',
          url: url,
          timestamp: new Date().toISOString()
        };
      }
      
      // Probeer JSON te extraheren uit de tekstinhoud
      // Tekst kan ook andere informatie bevatten, dus we zoeken naar JSON-blokken
      const jsonMatch = textContent.text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          // Probeer de gevonden JSON te parsen
          const parsedJson = JSON.parse(jsonMatch[0]);
          
          // Valideer en normaliseer de JSON-output
          const result = this._normalizeJsonOutput(parsedJson, url);
          
          // Citaties uit annotaties extraheren indien beschikbaar
          if (textContent.annotations && textContent.annotations.length) {
            result.citations = textContent.annotations
              .filter(anno => anno.type === 'url_citation')
              .map(anno => ({
                url: anno.url,
                title: anno.title
              }));
          }
          
          return result;
        } catch (e) {
          Logger.warning(`Fout bij parsen van JSON in Web Search API respons voor ${url}: ${e}`);
        }
      }
      
      // Als JSON-extractie niet lukt, probeer handmatig de status te bepalen
      return this._fallbackInterpretation(textContent.text, url);
    } catch (error) {
      Logger.error(`Fout bij interpreteren van Web Search resultaten: ${error.toString()}`);
      return {
        status: 'UNKNOWN',
        confidence: 0,
        details: {
          waitingList: null,
          conditions: [],
          waitingTime: null,
          contactInfo: null,
          lastUpdated: null
        },
        reasoning: `Fout bij interpreteren van resultaten: ${error.toString()}`,
        url: url,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Normaliseer de JSON-output van de Web Search API
   * 
   * @param {Object} json - De geparseerde JSON uit de API-respons
   * @param {string} url - De URL van de geanalyseerde website
   * @return {Object} - Genormaliseerde JSON-structuur
   * @private
   */
  _normalizeJsonOutput(json, url) {
    // Zorg ervoor dat alle vereiste velden aanwezig zijn
    const normalizedOutput = {
      status: json.status && ['ACCEPTING', 'NOT_ACCEPTING', 'UNKNOWN'].includes(json.status) 
        ? json.status 
        : 'UNKNOWN',
      confidence: typeof json.confidence === 'number' && json.confidence >= 0 && json.confidence <= 100
        ? json.confidence
        : 50,
      details: {
        waitingList: typeof json.details?.waitingList === 'boolean'
          ? json.details.waitingList
          : null,
        conditions: Array.isArray(json.details?.conditions)
          ? json.details.conditions
          : [],
        waitingTime: typeof json.details?.waitingTime === 'string'
          ? json.details.waitingTime
          : null,
        contactInfo: typeof json.details?.contactInfo === 'string'
          ? json.details.contactInfo
          : null,
        lastUpdated: typeof json.details?.lastUpdated === 'string'
          ? json.details.lastUpdated
          : null
      },
      reasoning: typeof json.reasoning === 'string'
        ? json.reasoning
        : 'Geen redenering opgegeven',
      url: url,
      timestamp: new Date().toISOString()
    };
    
    return normalizedOutput;
  }
  
  /**
   * Fallback interpretatie voor het geval JSON-extractie niet lukt
   * 
   * @param {string} text - De tekstinhoud van de API-respons
   * @param {string} url - De URL van de geanalyseerde website
   * @return {Object} - Geïnterpreteerde resultaten
   * @private
   */
  _fallbackInterpretation(text, url) {
    // Controleer op sleutelwoorden die duiden op het aannemen van nieuwe patiënten
    const acceptingKeywords = [
      'nieuwe patiënten zijn welkom', 
      'kunt zich aanmelden', 
      'nieuwe patiënten aannemen',
      'aanmelden als nieuwe patiënt',
      'inschrijven als nieuwe patiënt',
      'inschrijven als patiënt',
      'nieuwe patiënten kunnen zich',
      'nieuwe inschrijvingen',
      'aanmeldformulier',
      'inschrijfformulier'
    ];
    
    // Controleer op sleutelwoorden die duiden op het niet aannemen van nieuwe patiënten
    const notAcceptingKeywords = [
      'geen nieuwe patiënten', 
      'patiëntenstop', 
      'wachtlijst',
      'inschrijvingsstop',
      'praktijk zit vol',
      'niet open voor nieuwe patiënten',
      'momenteel gesloten voor nieuwe patiënten',
      'tijdelijk geen nieuwe patiënten',
      'niet meer mogelijk om in te schrijven',
      'nemen niet meer aan'
    ];
    
    const textLower = text.toLowerCase();
    
    // Zoek naar accepterende en niet-accepterende sleutelwoorden
    const foundAccepting = acceptingKeywords.some(keyword => textLower.includes(keyword.toLowerCase()));
    const foundNotAccepting = notAcceptingKeywords.some(keyword => textLower.includes(keyword.toLowerCase()));
    
    let status, confidence, reasoning;
    
    if (foundAccepting && !foundNotAccepting) {
      status = 'ACCEPTING';
      confidence = 80;
      reasoning = 'Website bevat duidelijke indicaties dat nieuwe patiënten worden aangenomen';
    } else if (foundNotAccepting && !foundAccepting) {
      status = 'NOT_ACCEPTING';
      confidence = 80;
      reasoning = 'Website bevat duidelijke indicaties dat nieuwe patiënten niet worden aangenomen';
    } else if (foundAccepting && foundNotAccepting) {
      status = 'UNKNOWN';
      confidence = 50;
      reasoning = 'Website bevat tegenstrijdige informatie over het aannemen van nieuwe patiënten';
    } else {
      status = 'UNKNOWN';
      confidence = 30;
      reasoning = 'Geen duidelijke informatie gevonden over het aannemen van nieuwe patiënten';
    }
    
    // Probeer wachtlijstinformatie te extraheren
    let waitingList = null;
    if (textLower.includes('wachtlijst')) {
      waitingList = true;
    }
    
    // Probeer contactinformatie te extraheren (eenvoudige benadering)
    let contactInfo = null;
    const contactMatches = text.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/); // Eenvoudige e-mail regex
    if (contactMatches) {
      contactInfo = contactMatches[0];
    }
    
    return {
      status: status,
      confidence: confidence,
      details: {
        waitingList: waitingList,
        conditions: [],
        waitingTime: null,
        contactInfo: contactInfo,
        lastUpdated: null
      },
      reasoning: reasoning,
      url: url,
      timestamp: new Date().toISOString()
    };
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
