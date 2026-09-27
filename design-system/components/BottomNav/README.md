Tab-Leiste am unteren Rand für das Handy. Unter 720 px ersetzt sie die Hauptnavigation der `AppHeader`: dort dann `items` leer lassen, sodass nur Wortmarke, Glocke und Spieler bleiben.

## Aufbau

- 4–5 Einträge mit Icon (22 px) und kurzem Wort darunter. Vorschlag: **Markt · Organisation · Orders · Community · Mehr**.
- Aktiver Eintrag: Text `text-primary` und die Messing-Linie oben – dieselbe Sprache wie Reiter und Kopfleiste. Inaktiv `text-secondary`.
- Zähler als kleines helles Schild am Icon (wie die Glocke), nie Rot.
- Mindesthöhe 56 px, Abstand für die Home-Leiste (`env(safe-area-inset-bottom)`).

## Regeln

1. Höchstens 5 Einträge; alles Weitere unter „Mehr“ (öffnet ein `Sheet` mit Liste).
2. Die Leiste ist Navigation, keine Aktion: kein Messing-Knopf darin.
3. Auf Seiten mit `TradeBar` (Wertpapierseite) wird die Tab-Leiste ausgeblendet – nur eine Leiste unten.
4. Seiten bekommen unten so viel Abstand, dass nichts von der Leiste verdeckt wird (`padding-bottom: 72px`).

## Barrierefreiheit

`nav` mit Namen, aktiver Eintrag `aria-current="page"`, Zähler wird mitgelesen („Orders, 2 neu“). Tippflächen ≥ 44 × 56 px.

## Verwendung

```jsx
<BottomNav value={section} onChange={go} items={[
  { value: 'markt', label: 'Markt', icon: 'markt', href: '/markt' },
  { value: 'org', label: 'Organisation', icon: 'organisation', href: '/organisation' },
  { value: 'orders', label: 'Orders', icon: 'orders', badge: 2, href: '/orders' },
  { value: 'community', label: 'Community', icon: 'community', badge: 4, href: '/zeitung' },
  { value: 'mehr', label: 'Mehr', icon: 'menue' }]} />
```
