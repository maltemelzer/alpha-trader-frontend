Die Ansicht eines Themas: Kopf wie eine Zeitungsseite, Beiträge untereinander, Seiten oben und unten, Antwortfeld am Ende.

## Aufbau
- **Kopf:** `PageHeader` in `md`: Rubrik (Forum · Bereich, als Link), Titel mit 2px-Messing-Linie (Regel 6), Metazeile (Antworten, Aufrufe, Beginn), rechts Nebenaktionen wie „Beobachten“.
- **Beiträge:** geordnete Liste von `ForumPost`, oben eine 1px-Linie in `line-strong`, dazwischen Haarlinien.
- **Seiten:** `Pagination` rechtsbündig über und unter den Beiträgen.
- **Ende:** `ForumEditor` im Modus `reply` – oder, bei `locked`, ein Hinweis mit Schloss-Kennzeichen statt des Editors.
- `notice` für einen Hinweis über den Beiträgen, z. B. ein `Banner`.

## Regeln
1. **Die Messing-Aktion ist „Antworten“** im Editor. „Beobachten“, „Zitieren“ und Ähnliches sind Sekundär- oder Ghost-Buttons.
2. 20 Beiträge pro Seite. Beim Zitieren springt der Fokus ins Antwortfeld (`ref.insertQuote(autor, text)` und `ref.focus()`).
3. Kein seitliches Menü mit Autorenprofilen – die Autorzeile reicht.

## Verwendung
```jsx
const { ForumThread, ForumPost, ForumEditor, Pagination, Button } = window.Bankiersgruen;
const editor = useRef();

<ForumThread
  eyebrow={<a href="/forum/aktien">Forum · Aktien im Gespräch</a>}
  title="Reedereien nach den Quartalszahlen – noch kaufen?"
  meta={[<span>24 Antworten</span>, <span>612 Aufrufe</span>]}
  actions={<Button size="sm">Beobachten</Button>}
  pagination={<Pagination page={page} pages={3} onChange={setPage} />}
  reply={<ForumEditor ref={editor} mode="reply" onSubmit={send} />}>
  {posts.map(p => <ForumPost key={p.id} {...p}
    onQuote={() => { editor.current.insertQuote(p.author.name, p.text); editor.current.focus(); }} />)}
</ForumThread>
```

## Barrierefreiheit
- Die Ansicht ist eine `section`, der Titel ist `h1` (über `as` änderbar). Beiträge sind eine geordnete Liste.
