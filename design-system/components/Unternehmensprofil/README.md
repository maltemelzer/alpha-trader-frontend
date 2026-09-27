Seitenvorlage „Unternehmensprofil“: `ProfileHeader` (CEO, Merkmale wie Banklizenz/Market Maker, Kurs, Buchwert mit Platz, Net Cash, Erfolge), links die `BalanceSheet`, rechts Stammdaten (`SummaryList`) und größte Aktionäre (`ShareList`).

- Reiter: Übersicht · Bilanz · Pressemitteilungen (`NewsFeed`) · Abstimmungen (`PollList`).
- Kurs und Handel gehören auf die Wertpapierseite („Zum Wertpapier“); das Profil zeigt das Unternehmen, nicht die Aktie.
- Für Aktionäre: `GET /api/v2/sharepositions?securityIdentifier` liefert die Positionen; Anteil = `numberOfShares` ÷ ausgegebene Anteile.
