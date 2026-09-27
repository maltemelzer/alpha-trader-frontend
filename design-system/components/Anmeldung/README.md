Seitenvorlage „Anmelden“ und „Konto anlegen“ mit `AuthForm`.

## Aufbau

Wortmarke groß, Überschrift mit Messing-Linie, große Felder (44 px), „Passwort anzeigen“ im Feld, **ein** Messing-Knopf über die volle Breite, darunter der Wechsel zwischen Anmelden und Registrieren.

## Regeln

1. Fehler als `Banner variant="error"` über den Feldern, in Klartext („Dieser Spielername ist schon vergeben.“) – nie „Fehler 409“.
2. Richtige `autocomplete`-Werte (`username`, `current-password`, `new-password`, `email`), damit Passwort-Manager funktionieren.
3. Registrieren: Name 3–20 Zeichen, Passwort mindestens 8, Spielregeln akzeptieren – Knopf erst dann aktiv.
4. Kein Captcha-Ersatz, keine Tricks: Die Seite zeigt den Hinweis auf die inoffizielle Oberfläche (`AppFooter`).

## API

Anmelden `POST /user/token` (liefert das JWT), Registrieren `POST /user/register`, Passwort zurücksetzen `PUT /user/passwordreset`.
