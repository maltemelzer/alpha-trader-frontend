Wortmarke der Oberfläche: ein Siegel mit α (eigene Zeichnung, wie ein Münzprägestempel) und der Name in der Serifenschrift.

## Aufbau

- **Emblem:** zwei Ringe (1,5 px und fein), darin ein gezeichnetes α; Farbe `brass` – Messing ist die Markenfarbe.
- **Name** in Source Serif 4, halbfett, leicht enger gesetzt. Optional eine Unterzeile in Versalien (`tagline`).
- Größen: `lg` (Anmeldung, Startseite) · `md` (Kopfleiste) · `sm` (Fußzeile, Menü).

## Regeln

1. Das Emblem ist eine eigene Zeichnung für diese Oberfläche und ersetzt **nicht** das Logo des Spiels. Solange die Oberfläche inoffiziell ist, steht der Hinweis in der Fußzeile (`AppFooter note`).
2. Emblem nie in Grün/Rot, nie mit Verlauf oder Glanz.
3. Mindestgröße Emblem 20 px.

## Verwendung

```jsx
<AppHeader brand={<Wordmark />} brandHref="/" … />
<Wordmark size="lg" tagline="Börse · Unternehmen · Banken" />
```
