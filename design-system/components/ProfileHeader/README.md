Kopf für Profilseiten von Spielern, Unternehmen und Allianzen, dazu `EmploymentList` (Anstellungen als CEO).

## Aufbau

- Links Avatar mit Initialen (oder `logoUrl`), rechts: Rubrik (Art · Allianz bzw. ASIN · Art), Name in der Serifenschrift mit Messing-Linie wie eine Seitenüberschrift, Metazeile, Merkmale als kleine umrandete Etiketten.
- **Merkmale:** Banklizenz, Market Maker, ATSX-Mitglied, Partner, Team – neutral. Goldzugang mit `.bnk-gold`, nie Messing (Regel 5).
- Rechts höchstens zwei Aktionen (secondary/ghost), z. B. „Nachricht“, „Abonnieren“, „Zum Wertpapier“.
- **Kennzahlen-Leiste** zwischen zwei Linien, 3–5 Werte. Mit `rank` steht der Highscore-Platz als `RankBadge` davor – Plätze sind Belohnungen und dürfen Messing tragen.
- Optional `Tabs` darunter (Übersicht · Beiträge · Erfolge).

## EmploymentList

Unternehmen · CEO seit · Gehalt je Tag, mit Summenzeile. Gehälter sind Geldflüsse – ohne Farbe.

## API

| Profil | Endpunkte |
| --- | --- |
| Spieler | `GET /api/users/username/{username}` (`UsernameView`: `registrationDate`, `userCapabilities.premium/partner/achievementCount/achievementTotal/teamRole`), `GET /api/userprofiles/{username}`, `GET /api/v2/userachievements/{username}` |
| Unternehmen | `GET /api/companies/securityIdentifier/{asin}` (`CompanyView`: `ceo`, `logoUrl`, `marketMakerPolicy`, `achievementCount/Total`), `GET /api/companyprofiles/{companyId}` |
| Allianz | `GET /api/v2/alliances/{allianceId}` (`AllianceWithDetailsView`) |
| Anstellungen | `CompanyEmploymentAgreementView` (`company`, `startDate`, `dailyWage`) |

`userprofiles`, `companyprofiles` und `alliances/{id}` sind im Spec untypisiert.

## Verwendung

```jsx
<ProfileHeader kind="user" name="CptnIglo" eyebrow={['Hanseatische Allianz']} meta={['dabei seit 12.4.2021']}
  tags={[{ label: 'Gold', gold: true }]} stats={[{ label: 'Buchwert', value: 5134000000, rank: 149 }]}
  actions={<Button size="sm">Nachricht</Button>} />
```
