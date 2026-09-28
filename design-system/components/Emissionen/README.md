Formulare, mit denen ein CEO für sein Unternehmen Wertpapiere begibt. Alle vier teilen dasselbe Muster: wenige Felder, eine Zusammenfassung in einem Satz, ein Knopf rechts unten. Vor dem Absenden immer ein `Dialog` mit allen Werten (nicht umkehrbar).

| Formular | Inhalt | API |
| --- | --- | --- |
| `BondIssueForm` | Eigene Anleihe (Stücke, Nennwert, Zins p. a. mit Markt-Durchschnitt, Fälligkeit) oder – mit Banklizenz – Systemanleihe an die Zentralbank zum Leitzins | `POST /api/bonds?companyId&numberOfBonds&faceValue&interestRate&maturityDate` · `POST /api/systembonds?companyId&numberOfBonds` |
| `IndexBuilder` | Name, optional eigene ASIN (`ID…`, Gold), Mitglieder suchen und hinzufügen/entfernen (mind. 2) | `POST /api/v2/indexes?companyId&name&members[]&customAsin`; Regel später über `PUT /api/v2/indexes/{asin}/rule` |
| `EtfCreateForm` | Name, abgebildeter Index, Verwaltungsgebühr; nur mit Banklizenz | `POST /api/v2/etfs?companyId&name&baseIndexAsin&customAsin`, Gebühr `POST …/management-fee?percent` |
| `WarrantIssueForm` | Call/Put, Basiswert, Sicherheit in Bargeld, Bezugsverhältnis | `POST /api/v2/warrants?companyId&type&underlyingAsin&cashDeposit&ratio` |

## Regeln

1. Auf der Unternehmensseite ist höchstens eines dieser Formulare die Messing-Aktion; in der Vorlage sind alle sekundär.
2. Zinsen und Gebühren immer „p. a.“; der Zinsbetrag bis Fälligkeit ist eine Schätzung („ca.“).
3. Gesperrte Wege (keine Banklizenz, kein Gold) werden erklärt, nicht versteckt.

**Offen:** Wie sich Cap und Referenzkurs eines Optionsscheins aus der Sicherheit ergeben, geht aus der API nicht hervor – das Formular zeigt sie deshalb noch nicht vorab.
