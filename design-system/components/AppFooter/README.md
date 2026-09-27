Fußzeile im Stil eines Impressums („Kolophon“): Wortmarke mit Hinweis, Linkspalten, darunter Stand, Version und API-Status.

## Aufbau

- Oben eine 2-px-Linie in `line-strong`, Fläche `bg-page`.
- Links Wortmarke (`sm`) und ein kurzer Hinweis – **Pflicht**, solange die Oberfläche inoffiziell ist: „Eine alternative Oberfläche für Alpha-Trader … Kein offizielles Angebot der Betreiber.“
- Linkspalten mit Rubrik in Versalien und Links in der Serifenschrift; externe Links mit Icon und „(öffnet neues Fenster)“ für Screenreader.
- Unterste Zeile: Stand, Version – rechts der API-Status mit Punkt: `ok` (gefüllt, neutral), `slow` (Ring), `down` (Verlustfarbe – ist ein Fehler).

## Verwendung

```jsx
<AppFooter note="Eine alternative Oberfläche für Alpha-Trader …"
  columns={[{ title: 'Spiel', links: [{ label: 'Markt', href: '/markt' }] }, { title: 'Original', links: [{ label: 'alpha-trader.com', href: 'https://alpha-trader.com', external: true }] }]}
  meta={['Stand 24.9.2026, 14:58', 'Version 0.4']} status={{ state: 'ok', label: 'API erreichbar' }} />
```
