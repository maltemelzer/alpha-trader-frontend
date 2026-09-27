Übersicht aller Erfolge einer Art (Spieler, Unternehmen, Allianz) mit Abholen.

## Aufbau

- Kopf: Fortschritt „erreicht / gesamt“ als `ProgressBar variant="reward"`, rechts „n abholen · x AlphaCoins“ (Messing – das ist die Belohnung, Regel 5).
- Raster aus `Achievement`-Karten: **abholbar** (Messing-Ton, „Neu“, Knopf „Abholen“) zuerst, dann **offen** mit Fortschritt in %, dann **erreicht**.
- Titel auf Deutsch aus `ACHIEVEMENT_TITLES` (z. B. `BANKER` → „Bankier“), Beschreibung aus der API plus Belohnung in AlphaCoins.
- Reiter Spieler · Unternehmen · Allianz darüber (`Tabs`).

## API

| Zweck | Endpunkt |
| --- | --- |
| Erreichte | `GET /api/v2/userachievements/{username}`, `…/companyachievements…`, `/api/v2/allianceachievements/{id}` |
| Fortschritt | `GET /api/v2/userachievementprogress/{username}` (`progressInPercent`), entsprechend für Unternehmen/Allianz |
| Noch nicht abgeholt | `GET /api/v2/my/notyetclaimeduserachievements` (bzw. alliance…) |
| Abholen | `PUT /api/v2/my/userachievementclaim/{achievementId}`; alle: `PUT /api/v2/my/userachievementclaim` (Unternehmen: `companyachievementclaim?companyId`) |
