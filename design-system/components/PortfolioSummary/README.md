Buchwert eines Portfolios mit seiner Zusammensetzung: Bargeld (frei und in Orders) und Wertpapiere nach Art. Kopf der Portfolio- und der Organisations-Seite.

## Aufbau

- Label in Versalien, Buchwert in `figure-lg` (Mono 28px), ab 1 Mrd. in Kurzform mit vollem Wert im Tooltip.
- Darunter ein 10px-Balken der Anteile (Trefferfläche 22px, am Touch 44px), flach, Segmente mit 2px-Fuge. Bargeld in `text-secondary`, Bargeld in Orders schraffiert, Wertpapierarten in der festen Diagrammreihenfolge: Aktien `chart-1`, Anleihen `chart-2`, Coins `chart-3`, Repos `chart-4`, Zentralbank-Repos `chart-5`, Sonstige `line-strong`.
- Liste mit Farbfeld, Betrag und Anteil in %; Zwischensummen „Bargeld“ und „Wertpapiere“ halbfett. Anteile unter 0,1 % als „< 0,1 %“.
- **Tooltip am Balken:** Hover, Fokus oder Antippen zeigt die ganze Aufteilung (Farbfeld · Art · Betrag in Kurzform · Anteil); das Segment unter dem Zeiger bleibt voll, die anderen treten zurück, seine Zeile im Tooltip ist fett.
- Leere Gruppen fallen weg.

## Regeln

1. **Keine Gewinn-/Verlustfarben** für die Zusammensetzung – sie ist keine Kursbewegung. Eine Veränderung des Buchwerts (falls man sie selbst speichert) nur über `change` als `PriceChange`.
2. Buchwert = Bargeld + Σ Volumen der Positionen, so rechnet auch das Spiel. Negative Volumina (z. B. Repo-Verbindlichkeiten) zählen im Balken mit ihrem Betrag und sind blasser.
3. Bei mehr als 500 Positionen lädt das Spiel seitenweise – dann `volumes` vorberechnet übergeben.

## API

| Feld | Quelle |
| --- | --- |
| `portfolio.cash`, `committedCash` | `GET /api/v2/my/portfolio` bzw. `/api/portfolios/{securitiesAccountId}`, Kurzform `/…/summary` |
| `portfolio.positions[].type`, `.volume` | dieselbe Antwort; Gruppen: STOCK · BOND + INTEREST_TENDER_BOND + SYSTEM_BOND · COIN · REPO · SYSTEM_REPO |

## Verwendung

```jsx
const { PortfolioSummary } = window.Bankiersgruen;
<PortfolioSummary portfolio={portfolio} label="Buchwert · Privatportfolio" />
```

## Barrierefreiheit

- Der Balken hat `role="img"`, ist per Tab erreichbar und hat eine Beschreibung aller Anteile; der Tooltip ist für Screenreader ausgeblendet (dieselben Werte stehen im Label und in der Liste darunter).
