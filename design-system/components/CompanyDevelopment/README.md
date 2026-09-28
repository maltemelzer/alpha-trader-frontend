Eigene Unternehmen mit Kennzahlen und Veränderung zum Vortag (`CompanyDevelopment`) sowie Beteiligungen und Übernahmemöglichkeiten (`ShareList`).

## CompanyDevelopment

- Spalten: Unternehmen · Buchwert · Bargeld · Cashflow · Net Cash · ZB-Reserven, Beträge in Kurzform.
- Unter jedem Wert die Veränderung zum Vortag in `text-secondary` mit **↑/↓** – bewusst **ohne** Gewinn-/Verlustfarbe und ohne ▲▼: Bilanzwerte sind keine Kursbewegung (Regel 2, 3).
- Fachbegriffe im Kopf als `Term`.

## ShareList

- Name, ASIN, Anteil in %, darunter eine 4px-Schiene mit Strich bei 50 % (Mehrheit; `threshold` änderbar).
- Füllung neutral in `text-secondary`. Mehrheit ist keine Belohnung – kein Messing.

## API

| Liste | Endpunkt |
| --- | --- |
| Unternehmensentwicklung | `GET /api/v2/my/companydevelopment` → `CompanyDevelopmentView` (inkl. `yesterday*`) |
| Beteiligungen | `GET /api/v2/my/companiesbyempireshare` → `ListingShareView` |
| Übernahmemöglichkeiten | `GET /api/v2/my/takeoverpossibilities` → `ListingShareView` |

## Verwendung

```jsx
<CompanyDevelopment companies={dev.content} hrefFor={c => `/unternehmen/${c.securityIdentifier}`} onFound={openFounding} />
<ShareList items={holdings.content} />
```
