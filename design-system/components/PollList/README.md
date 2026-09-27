Die Seite „Abstimmungen“: Filter nach eigenem Abstimmungsstand und Sammelabstimmung, darunter `PollCard`s im Raster.

## Aufbau
- **Filter** als `Tabs` mit Zählern: Offen (`NOT_VOTED`) · Teilweise (`PARTIALLY_VOTED`) · Abgestimmt (`VOTED`) · Von mir beantragt (`selfInitiated=true`).
- **Sammelabstimmung** rechts: „Allen harmlosen Ja / Nein“ direkt (`POST /v2/polls?votingType=…&onlyHarmless=true`). „Alle …“ öffnet einen `Dialog`, weil er auch Kapitalerhöhungen, Fusionen und Liquidationen einschließt (`onlyHarmless=false`).
- Raster mit mindestens 380px je Karte; leere Ansicht mit einem Satz.

## Regeln
1. Die Sammelabstimmung über **alle** Anträge nie ohne Bestätigung.
2. Kein Messing-Button auf dieser Seite – Ja und Nein sind gleichwertig.

## Verwendung
```jsx
const { PollList } = window.Bankiersgruen;

<PollList polls={page.content} filter={status} onFilterChange={setStatus}
  counts={{ NOT_VOTED: 2, PARTIALLY_VOTED: 1, VOTED: 14, INITIATED: 1 }}
  onVote={vote} onVoteAll={(type, onlyHarmless) => api.post('/v2/polls', null, { params: { votingType: type, onlyHarmless } })}
  onExecute={execute} hrefFor={hrefFor} />
```
