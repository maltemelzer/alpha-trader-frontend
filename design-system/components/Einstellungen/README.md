Seitenvorlage „Einstellungen“ aus `SettingsSection` (Titel und Erklärung links) und `SettingsRow` (Bezeichnung, Hinweis, Bedienelement rechts). Unter 720 px stehen Titel und Zeilen untereinander, unter 480 px Felder und Knöpfe unter der Bezeichnung; Schalter bleiben rechts.

## Abschnitte

Konto · Darstellung (Zahlen abkürzen, Farbenblind-Modus, Sprache) · Benachrichtigungen · Gold (neutral, `.bnk-gold`) · Gefahrenzone (`danger`, Titel in Verlustfarbe, Knopf `danger`, Bestätigung mit Namen im `Dialog`).

## Regeln

1. Sofort wirksame Einstellungen als `Switch`, alles mit Folgen über einen Knopf und `Dialog`.
2. Keine Messing-Knöpfe auf der Einstellungsseite – es gibt keine Hauptaktion.
3. Die Beschriftung eines `Select`/`Input` in einer Zeile wird nur für Screenreader ausgegeben; sichtbar ist die Zeilenbezeichnung.

## API

`GET/POST /api/v2/userpreferences?type&identifier&content`, `PUT/DELETE /api/v2/userpreferences/{prefId}` – beliebige Schlüssel/Werte je Nutzer; E-Mail-Abo über `UserAccountView.emailSubscriptionType`.
