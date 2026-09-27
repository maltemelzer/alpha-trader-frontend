Die Zeitung des Spiels: Pressemitteilungen der Unternehmen, Beiträge der Spieler und der Changelog, gebaut auf `GET /v2/news` (`PostView`). Zustimmung und Ablehnung über `PUT /v2/my/likes/{postId}?type=LIKE|DISLIKE`.

## Aufbau
- **Rubrik-Überschrift** (`title`): Serif 24px mit 2px-Messing-Linie (Regel 6), rechts optional eine Nebenaktion („Artikel schreiben“).
- **Kopfzeile jedes Artikels:** Herausgeber (Unternehmen oder Allianz, sonst „Leserbeitrag“) in Versalien, Datum in Mono, Sprache als kleines Kürzel („DE“, „EN“).
- **Titel** in der Serifenschrift – beim Aufmacher 30px, sonst 18px –, darunter „von Autor“ und ggf. „bearbeitet …“.
- **Anriss:** Anfang des Inhalts als Klartext (Markdown und Bilder entfernt), 180 bzw. 320 Zeichen.
- **Fuß:** erwähnte Aktie (`listing`) als `TickerMention`, Hashtags, rechts die Bewertung.
- **Bewertung** (`ReactionBar`): „+“ Zustimmung und „−“ Ablehnung mit Zahl, dazu Kommentare. Die eigene Wahl ist gefüllt (`text-primary`). **Kein Grün/Rot und keine Daumen** – das ist Meinung, keine Kursbewegung.
- **Kurzliste** (`variant="brief"`): Uhrzeit links, Titel, darunter Herausgeber und Kommentare – für „Neueste“ oder die Seitenleiste.
- Haarlinien zwischen den Artikeln, keine Karten, keine Bilder.

## Regeln
1. Ein Aufmacher pro Seite, z. B. `GET /v2/news/hot`. Rubrik-Linien in Messing nur an Überschriften.
2. Titel sind Links (Hover: Messing-Unterstreichung). Ein zweiter Klick auf die eigene Bewertung nimmt sie zurück (`onReact(post, null)` → `DELETE /v2/my/likes/{postId}`).
3. Artikel in anderer Sprache bleiben in der Liste; das Kürzel und `lang` am Artikel helfen Screenreadern.

## Verwendung
```jsx
const { NewsFeed } = window.Bankiersgruen;

<NewsFeed title="Zeitung" lead={hot[0]} items={news.content}
  reactions={{ [postId]: 'LIKE' }}
  onReact={(post, type) => type ? api.put(`/v2/my/likes/${post.id}`, null, { params: { type } }) : api.delete(`/v2/my/likes/${post.id}`)}
  onComments={post => openComments(post.id)}
  hrefFor={post => `/post/${post.id}`} tagHref={tag => `/hashtag/${tag}`} />

<NewsFeed title="Neueste" variant="brief" items={latest} hrefFor={post => `/post/${post.id}`} />
```

## Barrierefreiheit
- `section` mit Rubrik als `h2`, jeder Artikel ein `article` (mit `lang`) und Titel als `h3` (Aufmacher `h2`), Datum als `time`.
- Bewertungsknöpfe sind Umschalter (`aria-pressed`) mit Namen „Gefällt: 42“ / „Gefällt nicht: 3“.
