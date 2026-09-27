Eine Aktionärsabstimmung: Antrag, Eckdaten je Art, Stand der Stimmen und die eigene Stimmabgabe. Gebaut auf `AbstractPollView` (`GET /v2/my/polls`, `GET /v2/companies/{id}/polls`) und `POST /v2/polls/{pollId}?votingType=YES|NO&voices=…`.

## Aufbau
- **Kopfzeile:** Status als Zeichen und Text – „Läuft“ (gefüllter Punkt, `text-primary`), „Angenommen“ (Punkt gedämpft), „Abgelehnt“ (Strich) –, optional „harmlos“, rechts die Restzeit (`Countdown`).
- **Titel:** Art der Maßnahme und Unternehmen in der Serifenschrift. Die Art wird aus den Feldern erkannt (`capitalIncreaseType` → Kapitalerhöhung, `acquiringCompany` → Fusion, `dailyWage` → CEO einstellen, `name` → Namenswechsel, `numberOfShares` + `price` → Kapitalherabsetzung, `maximalCashVolume` → Gewinnausschüttung).
- **Eckdaten** als `SummaryList`: Unternehmen mit ASIN, Bezugsrechte und Verhältnis, Preis, Anteile, Mindest- oder Höchstvolumen, übernehmende AG, neuer Name, Gehaltsforderung, Antragsteller oder Bewerber, Enthaltungsregel, Ende, Gültigkeit des Ergebnisses.
- **Stimmen** (`VoteBar`): gestapelter Balken **Ja** (Tintenblau, `chart-2`) · **Nein** (Kupfer, `chart-3`) · **offen** (Fläche `bg-page`), gestrichelte Marke bei 50 %, darunter Prozente und Gesamtstimmen. Kein Grün/Rot – eine Abstimmung ist keine Kursbewegung.
- **Eigene Stimme:** Zahl der freien Stimmen (aus `group` minus eigene `votes`), Eingabe, Knöpfe **Ja** und **Nein** – beide `secondary`, gleich gewichtet. Nach der Abgabe ein Satz: „Sie haben mit 40,0 Mio. Stimmen Ja gestimmt.“
- **Fuß** (optional): „Ergebnis ausführen“ (`PUT /v2/polls/{id}`) bei angenommenen Anträgen, „Abstimmung löschen“ für den Antragsteller.

## Regeln
1. Ja und Nein sehen gleich aus. Keine Vorauswahl.
2. Beendete Abstimmungen treten zurück (Titel `text-secondary`), bleiben aber lesbar.
3. Gekürzte Stimmenzahlen („3,76 Bio. Stimmen“), der volle Wert im Tooltip.

## Verwendung
```jsx
const { PollCard } = window.Bankiersgruen;

<PollCard poll={poll}
  onVote={(poll, type, voices) => api.post(`/v2/polls/${poll.id}`, null, { params: { votingType: type, voices } })}
  onExecute={poll => api.put(`/v2/polls/${poll.id}`)}
  hrefFor={(ent, kind) => kind === 'company' ? `/security/${ent.securityIdentifier}` : `/user/${ent.username}`} />
```

## Offen
- Welche Anträge „harmlos“ sind, liefert die API nicht sichtbar; das Kennzeichen kommt über `poll.harmless`.
- `approvalVotesPercentage` wird genutzt, wenn vorhanden; sonst zählt Ja gegen Nein.

## Barrierefreiheit
- `article` mit dem Titel als Name; der Balken hat einen vollständigen Text („Ja 42,1 %, Nein 9,8 %, noch offen 48,1 %“).
- Die Stimmen-Eingabe prüft die Obergrenze und nennt sie.
