import { Link } from 'react-router';
import { LegalLayout, Operator } from './LegalLayout';

const REPO = 'https://github.com/maltemelzer/alpha-trader-frontend';

export function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <section>
        <h2>Anbieter</h2>
        <p className="legal__muted">Angaben gemäß § 5 DDG und § 18 Abs. 1 MStV</p>
        <Operator />
      </section>

      <section>
        <h2>Inoffizielles Angebot</h2>
        <p>
          Diese Seite ist eine inoffizielle, nicht kommerzielle Oberfläche für die Börsensimulation{' '}
          <a href="https://alpha-trader.com" target="_blank" rel="noreferrer">
            Alpha-Trader
          </a>
          . Sie wird nicht von den Betreibern von Alpha-Trader angeboten oder verantwortet. Das Spiel selbst, dein Spielkonto und alle
          Spieldaten liegen bei Alpha-Trader.
        </p>
        <p>
          Inhalte von Spielerinnen und Spielern – Chat, Forum, Zeitung, Unternehmensprofile – kommen unverändert vom Spielserver. Für sie
          sind die jeweiligen Verfasser verantwortlich; Verstöße meldest du am besten direkt im Spiel.
        </p>
      </section>

      <section>
        <h2>Quellcode</h2>
        <p>
          Der Quellcode ist offen (MIT-Lizenz):{' '}
          <a href={REPO} target="_blank" rel="noreferrer">
            {REPO.replace('https://', '')}
          </a>
          . Die Schriften Source Serif 4, Libre Franklin und IBM Plex Mono stehen unter der SIL Open Font License.
        </p>
      </section>

      <section>
        <h2>Links</h2>
        <p>
          Für Inhalte verlinkter fremder Seiten sind deren Betreiber verantwortlich. Werden uns Rechtsverstöße bekannt, entfernen wir den
          Link.
        </p>
      </section>

      <p className="legal__muted">
        Wie wir mit Daten umgehen, steht in der <Link to="/datenschutz">Datenschutzerklärung</Link>.
      </p>
    </LegalLayout>
  );
}
