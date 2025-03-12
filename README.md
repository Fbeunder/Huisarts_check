# Huisarts Check

## Overzicht
Een Apps Script applicatie die huisartsenpraktijk websites monitort om te controleren of ze nieuwe patiënten aannemen. Gebruikers kunnen zich aanmelden met hun Google account, een persoonlijke lijst met URLs van huisartsen opgeven, en worden via e-mail op de hoogte gebracht wanneer een huisarts van status verandert naar het aannemen van nieuwe patiënten.

## Kenmerken
- Google account authenticatie
- Persoonlijke monitoring lijst van huisartsen websites
- Automatische controle van websites via OpenAI web search API
- E-mail notificaties bij statusveranderingen
- Efficiënte monitoring door consolidatie van dubbele website checks
- Dashboard voor gebruikers om hun huisartsenlijst te beheren

## Installatiehandleiding

### Vereisten
- Een Google-account
- Toegang tot Google Apps Script
- Een OpenAI API-sleutel met toegang tot web search functionaliteit

### Stap 1: Google Spreadsheet aanmaken
1. Ga naar [Google Spreadsheets](https://docs.google.com/spreadsheets/)
2. Maak een nieuwe spreadsheet aan
3. Geef de spreadsheet een naam, bijvoorbeeld "Huisarts Check Database"
4. Maak de volgende tabbladen aan:
   - Gebruikers
   - Huisartsen
   - Controles
   - Logs
5. Kopieer de spreadsheet ID (het lange deel in de URL tussen /d/ en /edit)

### Stap 2: Apps Script project aanmaken
1. Vanuit je spreadsheet, ga naar Extensions > Apps Script
2. Geef het project een naam, bijvoorbeeld "Huisarts Check"
3. Verwijder eventuele standaardcode in de editor

### Stap 3: Bestanden toevoegen aan het project
1. Kopieer alle .gs bestanden uit deze repository naar je Apps Script project:
   - Code.gs (hoofdbestand)
   - AuthService.gs
   - Config.gs
   - DataLayer.gs
   - EmailService.gs
   - Logger.gs
   - OpenAIService.gs
   - UI.gs
   - WebsiteChecker.gs

2. Kopieer alle HTML-bestanden uit deze repository naar je Apps Script project
   - **Belangrijk**: Apps Script ondersteunt geen submappen zoals in deze repository
   - Hernoem de HTML-bestanden door prefix `HTML_` toe te voegen:
     - `HtmlTemplates/Dashboard.html` → `HTML_Dashboard.html`
     - `HtmlTemplates/Login.html` → `HTML_Login.html`
     - `HtmlTemplates/About.html` → `HTML_About.html`
     - etc.

### Stap 4: Configuratie instellen
1. Open Config.gs
2. Vul de volgende parameters in:
   - Zorg dat de tabbladen precies overeenkomen met de namen die je in de spreadsheet hebt aangemaakt

### Stap 5: API-sleutels configureren
1. Ga naar Project Settings (tandwiel pictogram) > Script properties
2. Klik op "Add script property"
3. Voeg de volgende properties toe:
   - Naam: SPREADSHEET_ID, Waarde: [ID van je spreadsheet]
   - Naam: OPENAI_API_KEY, Waarde: [je OpenAI API-sleutel]

### Stap 6: OAuth Scopes instellen
Zorg ervoor dat appsscript.json de volgende OAuth scopes bevat:
```json
{
  "timeZone": "Europe/Amsterdam",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "ANYONE",
    "executeAs": "USER_DEPLOYING"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.send"
  ]
}
```

### Stap 7: Project deployen
1. Klik op "Deploy" > "New deployment"
2. Selecteer Type: "Web app"
3. Vul in:
   - Beschrijving: "Huisarts Check App"
   - Execute as: "User accessing the web app"
   - Who has access: "Anyone"
4. Klik op "Deploy"
5. Kopieer de Web App URL die wordt weergegeven

### Stap 8: Triggers instellen
1. Open het Apps Script project
2. Klik op de knop "Executions" aan de linkerkant
3. Klik op de knop "+ Add Trigger" onderaan de pagina
4. Stel de trigger in:
   - Choose function to run: "runWebsiteChecks"
   - Choose which deployment: "Head"
   - Event source: "Time-driven"
   - Type of time: "Day timer"
   - Time of day: "4am to 5am" (of een andere tijd die je verkiest)
   - Failure notification: Optioneel e-mail
5. Klik op "Save" om de trigger te maken

### Stap 9: Eerste keer uitvoeren en testen
1. Ga naar de Web App URL die je in stap 7 hebt gekopieerd
2. Log in met je Google-account
3. Voeg een testhuisartsenpraktijk toe
4. Voer een handmatige controle uit om te zien of alles correct werkt

## Gebruik

### Huisartsen toevoegen
1. Log in op de web app
2. Klik op "Huisartsen beheren"
3. Klik op "Nieuwe huisarts toevoegen"
4. Voer de volgende gegevens in:
   - Naam van de praktijk
   - Website URL (volledige URL inclusief https://)
   - Eventuele aantekeningen
5. Klik op "Opslaan"

### Handmatige controle starten
1. Log in op de web app
2. Klik op "Huisartsen beheren"
3. Klik op "Nu controleren" naast een specifieke huisarts of
4. Klik op "Alle huisartsen controleren" om alle huisartsen in je lijst te controleren

### E-mailnotificaties aanpassen
1. Log in op de web app
2. Klik op "Instellingen"
3. Pas je e-mailvoorkeuren aan:
   - Frequentie van notificaties
   - Type notificaties
4. Klik op "Opslaan"

## Technische details
- Gebouwd met Google Apps Script
- Data opslag in Google Spreadsheets
- Frontend met HTML/JavaScript
- Integratie met OpenAI web search API voor website analyse
- E-mail verzending via Gmail API

### HTML-templating in Apps Script
Apps Script heeft specifieke beperkingen voor wat betreft bestandsstructuur:
1. Alle bestanden worden in een platte structuur opgeslagen, zonder fysieke submappen
2. Om HTML-templates te organiseren, gebruiken we een naamconventie met een prefix (`HTML_`)
3. De `UI.gs` module bevat een helper functie `getHtmlTemplate()` om dit consistent te hanteren
4. Voor meer details, zie het bestand `HTML_BESTANDENINFO.md` in deze repository

## Probleemoplossing

### Veel voorkomende problemen
1. **Website controles werken niet**
   - Controleer of je OpenAI API-sleutel correct is ingesteld
   - Controleer of de API-sleutel toegang heeft tot web search functionaliteit
   - Controleer de Logs in de spreadsheet voor specifieke foutmeldingen

2. **E-mailnotificaties komen niet aan**
   - Controleer of het e-mailadres correct is ingesteld
   - Controleer of de Gmail OAuth-scope is toegevoegd
   - Controleer de Logs voor e-mail gerelateerde fouten

3. **Toegangsproblemen**
   - Zorg ervoor dat je bent ingelogd met hetzelfde Google-account als waarmee je de app hebt gedeployed
   - Controleer of de OAuth-scopes correct zijn ingesteld

4. **HTML-templates worden niet correct geladen**
   - Controleer of je de HTML-bestanden met prefix `HTML_` hebt hernoemd
   - Controleer of de bestanden echt in de root van het Apps Script project staan en niet in een submap
   - Controleer de console logs voor foutmeldingen gerelateerd aan ontbrekende bestanden

### Logs bekijken
1. Open de Google Spreadsheet
2. Ga naar het tabblad "Logs"
3. Bekijk de logregels voor foutmeldingen en debugging informatie

## Bijdragen
Dit is een persoonlijk project en bijdragen worden momenteel alleen geaccepteerd door de projecteigenaar.

## Licentie
Dit project is voor persoonlijk gebruik en valt onder de bepalingen die door de eigenaar zijn vastgesteld.
