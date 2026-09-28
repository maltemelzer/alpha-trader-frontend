Gestapelte Balken der erhaltenen Gewinnausschüttungen je Monat, nach Unternehmen aufgeteilt; angekündigte Ausschüttungen schraffiert.

## Aufbau
- Kopf: erhaltene Summe in `figure-lg`, angekündigte Summe daneben in `text-secondary`.
- Stapel in `chart-1` … `chart-5`, alles Weitere als „Sonstige“ in `line-strong`. Fuge zwischen den Segmenten in `bg-card`.
- Angekündigte Ausschüttungen (`/v2/dividendpayments`, Start in der Zukunft): Schraffur in der Serienfarbe, getrennt durch eine gepunktete Senkrechte mit Beschriftung „erwartet“.
- Monatssumme über jedem Balken (Mono, `text-secondary`, Kurzform ab 1 Mio.), Legende unten.

## Regeln
- Ausschüttungen sind keine Kursbewegung: keine Grün/Rot-Farben, kein Messing-Tint (der ist Belohnungen vorbehalten).
- Höchstens 5 Unternehmen einzeln, der Rest unter „Sonstige“.

## Was der Aufrufer liefert
Je Unternehmen die Zahlungen pro Monat, Kennzeichen erhalten/angekündigt.
