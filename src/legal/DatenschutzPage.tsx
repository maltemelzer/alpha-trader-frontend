import { Link } from 'react-router';
import { API_BASE } from '../api/client';
import { useLegalConfig } from './config';
import { LegalLayout, Operator } from './LegalLayout';
import { STORAGE } from './storage';

/** Last change of this text – update it with every change of what the site does with data. */
const AS_OF = '29. September 2026';

export function DatenschutzPage() {
  const { data } = useLegalConfig();
  const apiHost = API_BASE.replace(/^https?:\/\//, '');
  const cloudflare = data?.cdn === 'cloudflare';
  return (
    <LegalLayout title="Datenschutzerklärung">
      <p className="legal__lead">
        Kurz: Diese Seite zeigt dir das Spiel Alpha-Trader. Deine Spieldaten gehen direkt von deinem Browser zum Spielserver. Wir setzen
        keine Cookies, keine Werbung und keine Tracker ein und laden weder Schriften noch Skripte von Google oder anderen Diensten
        (Ausnahme: Bilder, die Spieler einbinden, siehe 6). Speichern tun wir nur, was du uns bei einem Test von Varianten ausdrücklich
        schickst.{cloudflare && ' Vor unserem Server steht Cloudflare, das die Aufrufe weiterleitet (siehe 2).'}
      </p>

      <section>
        <h2>1. Verantwortlich</h2>
        <Operator />
      </section>

      <section>
        <h2>2. Aufruf der Seite</h2>
        <p>
          Die Seite läuft {data?.hosting ? data.hosting.replace(/\.$/, '') : 'auf einem eigenen Server des Anbieters'}. Beim Aufruf
          speichert unser Webserver ein Protokoll: {cloudflare ? 'Adresse des Absenders' : <strong>gekürzte IP-Adresse</strong>} (bei IPv4
          ohne die letzte Stelle, z. B. 192.168.1.0), Zeitpunkt, aufgerufene Adresse, Statuscode, übertragene Datenmenge und Browserkennung.
          Die vollständige IP-Adresse wird nicht gespeichert.{' '}
          {cloudflare && 'Weil alle Aufrufe über Cloudflare laufen (siehe unten), ist der Absender dabei ein Server von Cloudflare, nicht dein Anschluss. '}
          Das Protokoll wird fortlaufend überschrieben (höchstens rund 30 MB, je nach Andrang wenige Tage bis Wochen).
        </p>
        <p>
          Zweck: die Seite ausliefern, Fehler finden, Angriffe erkennen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          am sicheren Betrieb).
        </p>
        {cloudflare && (
          <>
            <h3 id="cloudflare">Cloudflare</h3>
            <p>
              Zwischen deinem Browser und unserem Server steht Cloudflare (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA).
              Cloudflare leitet jeden Aufruf an unseren Server weiter, verschlüsselt die Verbindung und wehrt Angriffe ab. Dafür verarbeitet
              Cloudflare deine <strong>vollständige IP-Adresse</strong>, die aufgerufene Adresse, Zeitpunkt, Browserkennung und technische
              Merkmale der Verbindung und führt eigene Protokolle. Auch die Anfragen an unseren Feedback-Dienst (siehe 5) laufen über Cloudflare; die
              Spieldaten nicht – sie gehen direkt vom Browser zum Spielserver (siehe 3).
            </p>
            <p>
              Cloudflare arbeitet für uns als Auftragsverarbeiter; der Vertrag dazu (Data Processing Addendum) ist Teil der Nutzungsbedingungen
              von Cloudflare. Dabei können Daten in die USA übermittelt werden; Cloudflare ist nach dem EU-US Data Privacy Framework
              zertifiziert (Art. 45 DSGVO). Zur Abwehr von Bots kann Cloudflare technisch notwendige Cookies setzen (etwa{' '}
              <code>__cf_bm</code> oder <code>cf_clearance</code>, höchstens für Stunden bzw. Tage) – das sind die einzigen Cookies auf dieser Seite.
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren, erreichbaren Seite) und § 25 Abs. 2 Nr. 2 TDDDG.
              Mehr in der{' '}
              <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">
                Datenschutzerklärung von Cloudflare
              </a>
              .
            </p>
          </>
        )}
      </section>

      <section>
        <h2>3. Anmeldung und Spieldaten</h2>
        <p>
          Anmeldung, Kurse, Orders, Chat und alle anderen Spieldaten laufen <strong>direkt zwischen deinem Browser und dem Spielserver</strong>{' '}
          von Alpha-Trader ({apiHost}). Dein Passwort geht nur dorthin; wir sehen es nicht. Für diese Daten sind die Betreiber von Alpha-Trader
          verantwortlich, es gilt deren Datenschutzerklärung auf{' '}
          <a href="https://alpha-trader.com" target="_blank" rel="noreferrer">
            alpha-trader.com
          </a>
          .
        </p>
      </section>

      <section>
        <h2>4. Speicher in deinem Browser</h2>
        <p>
          Wir setzen <strong>keine Cookies</strong>{cloudflare && ' (nur Cloudflare kann zur Bot-Abwehr welche setzen, siehe 2)'}. Damit die Seite funktioniert und sich deine Einstellungen merkt, legt sie einige Einträge im
          Speicher deines Browsers ab (sessionStorage/localStorage). Sie verlassen deinen Browser nicht – mit Ausnahme des Zugangstokens, das
          bei jeder Anfrage an den Spielserver (und bei Tests an unseren Feedback-Dienst, siehe 5) mitgeht. Rechtsgrundlage: § 25 Abs. 2 Nr. 2
          TDDDG (für den von dir gewünschten Dienst unbedingt erforderlich). Du kannst sie jederzeit in den Einstellungen deines Browsers löschen.
        </p>
        <div className="legal__tablewrap">
          <table className="legal__table">
            <thead>
              <tr>
                <th scope="col">Eintrag</th>
                <th scope="col">Wofür</th>
                <th scope="col">Wie lange</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE.map((e) => (
                <tr key={e.key}>
                  <td>
                    <code>{e.key}</code>
                    <span className="legal__muted">{e.where}</span>
                  </td>
                  <td>{e.purpose}</td>
                  <td>{e.lasts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="experimente">
        <h2>5. Tests von Varianten (Feedback)</h2>
        <p>
          Manchmal probieren wir mehrere Varianten einer Seite aus. Dann erscheint dort die Leiste „Test“, und du kannst die Varianten
          bewerten. Das läuft über unseren eigenen Feedback-Dienst auf demselben Server; niemand sonst bekommt die Daten.
        </p>
        <ul>
          <li>
            <strong>Anmeldung beim Feedback-Dienst:</strong> Er fragt mit deinem Zugangstoken beim Spielserver nach, wer du bist, und behält
            nur deinen Spielernamen. Das Token speichert er nicht.
          </li>
          <li>
            <strong>Bewertungen:</strong> Wenn du eine Bewertung, einen Kommentar oder deine Wahl („Welche soll bleiben?“) abschickst,
            speichern wir sie <strong>mit deinem Spielernamen</strong>, damit wir nachfragen können. Das geschieht nur, wenn du selbst
            absendest. Rechtsgrundlage: deine Einwilligung, Art. 6 Abs. 1 lit. a DSGVO.
          </li>
          <li>
            <strong>Nutzung mitzählen (freiwillig, standardmäßig aus):</strong> Nur wenn du es in der Leiste „Test“ einschaltest, zählen wir
            je Variante Besuche, die Zeit, in der die Seite sichtbar war, und grobe Klickziele (z. B. „Wertpapierseite“). Gespeichert wird
            dazu nicht dein Name, sondern ein Pseudonym daraus (gesalzener Hash). Rechtsgrundlage: deine Einwilligung,
            Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG. Abschalten geht jederzeit am selben Schalter.
          </li>
          <li>
            <strong>Speicherdauer:</strong> Einträge, die zwölf Monate nicht geändert wurden, löscht der Dienst automatisch. Auf Wunsch löschen
            wir deine Daten sofort – eine E-Mail an die Adresse oben genügt.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Schriften, Bilder und Links</h2>
        <p>
          Die Schriften liefert dieser Server selbst aus; es gibt keine Verbindung zu Google Fonts oder anderen Schrift-Diensten.
        </p>
        <p>
          Einige Bilder kommen von fremden Servern: Logos von Unternehmen und Allianzen sowie Bilder in Forenbeiträgen, die Spielerinnen und
          Spieler per Adresse eingebunden haben. Beim Anzeigen lädt dein Browser sie direkt von dort; der jeweilige Server sieht dabei deine
          IP-Adresse. Welche Server das sind, bestimmen die Spieler, nicht wir. Links zu fremden Seiten öffnen erst, wenn du sie anklickst.
        </p>
      </section>

      <section>
        <h2>7. Kontakt per E-Mail</h2>
        <p>
          Schreibst du uns, verwenden wir deine Adresse und deine Nachricht nur, um zu antworten, und löschen sie, wenn die Sache erledigt ist.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
        </p>
      </section>

      <section>
        <h2>8. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
          Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen aus berechtigtem Interesse (Art. 21). Eine Einwilligung kannst
          du jederzeit für die Zukunft widerrufen (Art. 7 Abs. 3). Eine E-Mail an die Adresse oben genügt.
        </p>
        <p>
          Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), etwa der deines Wohnorts. Eine Liste
          der Aufsichtsbehörden in Deutschland findest du bei der{' '}
          <a href="https://www.bfdi.bund.de" target="_blank" rel="noreferrer">
            Bundesbeauftragten für den Datenschutz
          </a>
          .
        </p>
        <p>Wir geben keine Daten weiter, verkaufen nichts und treffen keine automatisierten Entscheidungen über dich.</p>
      </section>

      <p className="legal__muted">
        Stand: {AS_OF} · <Link to="/impressum">Impressum</Link>
      </p>
    </LegalLayout>
  );
}
