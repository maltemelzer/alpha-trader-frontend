Formulare für die Unternehmensführung: **CorporateActionForm** beantragt eine Kapitalmaßnahme, **CompanyFoundingForm** gründet eine neue AG.

## CorporateActionForm
Der CEO wählt die Maßnahme; jede startet eine Abstimmung der Aktionäre (`onSubmit({ action, endpoint, params })`).

| Maßnahme | Endpunkt | Felder |
| --- | --- | --- |
| Kapitalerhöhung | `POST /v2/capitalincreasepolls` | Bezugsrechte (mit/ohne), Preis je neuer Anteil (vorbelegt mit dem letzten Kurs), Mindestvolumen → „≈ 38,6 Mrd. neue Anteile“ |
| Kapitalherabsetzung | `POST /v2/capitalreductionpolls` | Anteile, Preis → Höchstbetrag |
| Gewinnausschüttung | `POST /v2/dividendpaymentpolls` | Höchstvolumen (höchstens Bargeld der AG) |
| Fusion | `POST /v2/mergerpolls` | Übernehmende AG (`acquiringPicker`, z. B. `StockSearch`), Höchstvolumen |
| Namenswechsel | `POST /v2/changecompanynamepolls` | Neuer Name |
| Depotabverkauf | `POST /v2/cashoutpolls` | – (Erklärung) |
| Liquidation | `POST /v2/liquidationpolls` | Fehler-`Banner` „Nicht umkehrbar“, Name der AG zur Bestätigung; Knopf `danger` |

- Kopf: „Maßnahme beantragen“ mit AG und ASIN, darunter der Hinweis, dass erst die Abstimmung entscheidet.
- Zahlen gehen als String mit Punkt an die API (`price`, `minimalCashVolume`, `maximalCashVolume`).

## CompanyFoundingForm
`POST /companies` mit `name`, `cashDeposit`; mit Goldzugang (`premium`) zusätzlich `customAsin` (10 Zeichen, A–Z/0–9) und `customNumberOfShares`. Ohne Gold sind diese Felder gesperrt und neutral als „Gold“ gekennzeichnet – kein Messing.

## Regeln
1. Ein Formular hat einen Messing-Button („Abstimmung starten“ / „Unternehmen gründen“). Die Liquidation bekommt stattdessen `danger`.
2. Beträge prüfen gegen das Bargeld der AG bzw. des Spielers; Fehler nennen die Grenze.

## Verwendung
```jsx
const { CorporateActionForm, CompanyFoundingForm } = window.Bankiersgruen;

<CorporateActionForm company={company} lastPrice={48.72} outstandingShares={5e10} cash={company.bankAccount.cash}
  onSubmit={({ endpoint, params }) => api.post(endpoint, null, { params })} />

<CompanyFoundingForm cash={myCash} premium={user.userCapabilities.premium}
  onSubmit={params => api.post('/companies', null, { params })} />
```
