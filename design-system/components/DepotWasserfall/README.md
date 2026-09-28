Wasserfall, der zeigt, woraus sich das Ergebnis eines Zeitraums zusammensetzt: Kursgewinne, Kursverluste, Gewinnausschüttungen, Zinsen und Gehalt.

## Aufbau
- Kopf: aktueller Buchwert in `figure-lg`, Veränderung als Etikett.
- Balken schweben von Stufe zu Stufe, verbunden durch gepunktete Linien in `line-strong`. Achse beginnt bei 0 €.
- Farben: Kursgewinne `gain`, Kursverluste `loss`, alle anderen Zahlungen (Ausschüttungen, Zinsen, Gehalt) `text-muted`, Ergebnis `text-secondary`.
- Betrag über jedem Balken mit Vorzeichen (Mono, `text-primary`). Legende im Fuß.
- Gebaut aus gestapelten Balken (unsichtbarer Sockel + Betrag), nicht mit Plotlys `waterfall`, damit jeder Balken seine eigene Farbe haben kann.

## Regeln
- Nur Kursbewegungen sind grün/rot (Regel 2). Ausschüttungen, Zinsen und Gehalt sind kein Kursgewinn.
- Die y-Achse nicht abschneiden. Für den absoluten Buchwert steht der Betrag im Kopf.

## Was der Aufrufer liefert
Beträge je Posten in Euro, Buchwert vorher und aktuell.
