Seitenvorlage „Allianz“: `ProfileHeader` (kind `alliance`: Sprache, Gründung, Mitglieder, eigener Index, Platz im Allianz-Highscore) mit Reitern, links `AllianceMembers`, rechts Beschreibung und Erfolge.

## AllianceMembers

- Sortiert nach Rolle (Gründer · Stellvertretung · Pressesprecher · Mitglied), dann online, dann Name.
- Online-Punkt in `text-primary` am Avatar (kein Grün – online ist keine Kursbewegung).
- Gründer und Stellvertretung sehen ein Menü je Mitglied: Rolle ändern, entfernen (Verlustfarbe, mit `Dialog`).

## API

| Zweck | Endpunkt |
| --- | --- |
| Allianz | `GET /api/v2/alliances/{allianceId}` (`AllianceWithDetailsView`), bearbeiten `PUT …?name&description&locale&logoUrl` |
| Mitglieder | `GET /api/v2/alliancememberships?allianceId` → `AllianceMembershipView` |
| Rolle | `PUT /api/v2/alliancememberships/{id}?role`; entfernen `DELETE /api/v2/alliancememberships/{id}` |
| Presse | `GET /api/v2/alliances/{allianceId}/news` → `NewsFeed` |
| Erfolge | `GET /api/v2/allianceachievements/{id}`, Fortschritt `…/allianceachievementprogress/{id}` |
| Eigene | `GET /api/v2/my/alliancemembership`, austreten `DELETE` |
