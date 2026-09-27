Eckdaten einer Anleihe für die Wertpapierseite. Der Kopf ist `SecurityHeader` mit `listing.type = 'BOND'` – er zeigt Kurs, Geld/Brief und Spread dann automatisch in %.

## Inhalt

Emittent · Zins bis Fälligkeit · Nennwert je Stück · ausgegebene Stücke · Volumen (Nennwert) · Ausgabe · Fälligkeit mit Restlaufzeit · Repo auf diese Anleihe (falls vorhanden). Baut auf `SummaryList`.

## Regeln

1. Im Kopf als `facts` höchstens: Zins, Fällig in, Volumen.
2. „Zins bis Fälligkeit“ und „Repo“ sind `Term`-Begriffe mit Erklärung. Der Zins gilt für die **ganze Laufzeit** und wird bei Fälligkeit gezahlt (Spec: „Interest Rate in percent to pay at maturity date“) – nie „p. a.“ nennen.
3. **Offen:** Die Rendite bis Fälligkeit zeigt das Spiel nur als Markt-Median („Yield-to-Maturity“); für die einzelne Anleihe gibt es kein API-Feld. Bis das geklärt ist, rechnen wir sie nicht selbst.

## API

- `GET /api/bonds/securityidentifier/{asin}` (im Spec untypisiert, Felder wie `BondView`)

## Verwendung

```jsx
<SecurityHeader listing={bond.listing} spread={bond.priceSpread} onBuy={…} onSell={…}
  facts={[{ label: 'Zins', value: '2,0500 %' }, { label: 'Fällig in', value: '3 Std. 12 Min.' }, { label: 'Volumen', value: bond.volume }]} />
<Card title="Anleihedaten"><BondFacts bond={bond} /></Card>
```
