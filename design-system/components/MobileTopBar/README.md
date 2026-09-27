Kompakte Kopfzeile für Unterseiten auf dem Handy (Wertpapier, Thema, Profil): Zurück links, Titel mittig mit Rubrik, bis zu zwei Icon-Aktionen rechts. Bleibt beim Scrollen oben stehen.

## Regeln

1. Nur auf Unterseiten; Hauptbereiche haben die `AppHeader` bzw. einen `PageHeader`.
2. Titel einzeilig mit „…“ – der volle Titel steht darunter im Inhalt (z. B. `SecurityHeader`).
3. Aktionen nur als Icons mit `label` (wird `aria-label`), z. B. Merken, Kursalarm. Mehr als zwei → `DropdownMenu` im Inhalt.
4. Mit `backText` („Forum“) steht der Titel linksbündig.

## Verwendung

```jsx
<MobileTopBar onBack={() => history.back()} eyebrow="STALSTERKS · Aktie" title="Alsterkasse SE"
  actions={[{ icon: 'merken', label: 'Merken', pressed: watched, onClick: toggle }, { icon: 'glocke', label: 'Kursalarm' }]} />
```
