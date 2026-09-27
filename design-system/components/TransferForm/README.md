Überweisung zwischen eigenen Konten (`TransferForm`) und Kontoauszug (`AccountStatement`).

## TransferForm

- **Von / An** als `Select` mit Kontostand im Namen („Hanse Beteiligungs AG · 2,52 Mrd. €“), dazwischen ⇄ zum Tauschen.
- **Betrag** mit Schnellwahl 25 % · 50 % · Alles; Fehler, wenn der Betrag das Guthaben übersteigt oder Absender = Empfänger.
- Zusammenfassung in einem Satz, bevor „Überweisen“ aktiv wird.
- Nur eigene Konten: Die API erwartet eine Bankkonto-ID; Überweisungen an Fremde gibt es in der Oberfläche nicht.

## AccountStatement

- Spalten: Zeit · Vorgang (`message.filledString`) · Betrag.
- **Eingänge** mit „+“ in `text-primary`, **Ausgänge** mit „−“ in `text-secondary`. Kein Grün/Rot: Geld bewegt sich, kein Kurs.

## API

| Zweck | Endpunkt |
| --- | --- |
| Konten | `GET /api/v2/my/bankaccounts` → `{ id, cash }`; Unternehmen: `company.bankAccount` |
| Überweisen | `PUT /api/v2/banktransfer/{senderBankAccountId}?receiverBankAccountId&cashAmount` |
| Kontoauszug | `GET /api/v2/cashtransferlogs/{bankAccountId}?page&size&search` → `CashTransferLogEntryView` |

## Verwendung

```jsx
<TransferForm accounts={[{ id: me.bankAccountId, name: 'Privat', cash }, ...companies.map(c => ({ id: c.bankAccount.id, name: c.name, cash: c.bankAccount.cash }))]}
              onSubmit={t => confirmTransfer(t)} />
<AccountStatement entries={log.content} bankAccountId={company.bankAccount.id} />
```
