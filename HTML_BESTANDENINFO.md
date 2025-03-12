# HTML-bestandenconventie voor Huisarts Check

Dit document beschrijft hoe HTML-bestanden moeten worden genoemd en georganiseerd binnen dit Apps Script project.

## Achtergrond

Google Apps Script ondersteunt geen fysieke mappenstructuur zoals in een traditioneel bestandssysteem. Alle bestanden worden "plat" in het project opgeslagen, zonder submappen. Dit betekent dat verwijzingen naar bestanden zoals `HtmlTemplates/Dashboard.html` niet direct werken binnen Apps Script.

## Naamgevingsconventie

Om dit probleem op te lossen, gebruiken we de volgende naamgevingsconventie:

1. Alle HTML-templatebestanden krijgen het voorvoegsel `HTML_` om ze te onderscheiden van andere bestanden.
2. De oorspronkelijke bestanden uit de `HtmlTemplates` map moeten worden hernoemd volgens dit patroon.

Bijvoorbeeld:
- `HtmlTemplates/Dashboard.html` → `HTML_Dashboard.html`
- `HtmlTemplates/Login.html` → `HTML_Login.html`
- `HtmlTemplates/About.html` → `HTML_About.html`

## Toegang tot HTML-bestanden

Om HTML-bestanden consequent te laden, is er een hulpfunctie `getHtmlTemplate()` toegevoegd aan `UI.gs`. Deze functie zorgt voor het juiste voorvoegsel bij het benaderen van de HTML-templates.

```javascript
function getHtmlTemplate(templateName) {
  const htmlPrefix = 'HTML_';
  return HtmlService.createTemplateFromFile(htmlPrefix + templateName);
}
```

Gebruik deze functie als volgt:

```javascript
// In plaats van
const template = HtmlService.createTemplateFromFile('HtmlTemplates/Dashboard');

// Gebruik
const template = getHtmlTemplate('Dashboard');
```

## Implementatiestappen

Als je het project importeert in Google Apps Script, volg deze stappen:

1. Upload alle HTML-bestanden naar het Apps Script project.
2. Hernoem de bestanden door `HTML_` toe te voegen aan het begin van elke bestandsnaam.
3. Verwijder de map `HtmlTemplates/` aangezien deze niet ondersteund wordt.

## Voordelen van deze aanpak

- Duidelijke naamgevingsconventie die aangeeft dat het om HTML-templatebestanden gaat
- Consistente en duidelijke manier om HTML-templates te laden
- Vermijdt conflicten met andere bestandsnamen in de platte structuur
- Maakt het gemakkelijker om nieuwe templates toe te voegen in de toekomst
