import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useCompanyWrite,
  useListingProfile,
  useShareholders,
  useSpreadSearch,
  type CompanyProfile,
} from '../api/queries';
import { useDebounced } from '../lib/useDebounced';
import { Confirm } from './Confirm';
import {
  ceoRequests,
  companyStake,
  RATINGS,
  ratingLevel,
  SPONSOR_SHARE_MIN,
  sponsorEligibility,
  volumeRateText,
  type MarketMakerPolicy,
  type SponsorRating,
  type Sponsorship,
} from './derive';
import { companyHref } from './views';

const typeLabel = (t: string) => (DS.LISTING_TYPES as Record<string, string>)[t] ?? t;

/** Rating of a designated sponsor as four segments (A = all four, D = one). */
export function RatingMeter({ rating }: { rating?: SponsorRating }) {
  const level = ratingLevel(rating);
  return (
    <span className="mm-rating" role="img" aria-label={rating ? `Rating ${rating} von A bis D` : 'Noch kein Rating'}>
      <span className="mm-rating__cells" aria-hidden="true">
        {RATINGS.map((r, i) => (
          <span key={r} className={i < level ? 'mm-rating__cell mm-rating__cell--on' : 'mm-rating__cell'} />
        ))}
      </span>
      <span className="mm-rating__letter num">{rating ?? '–'}</span>
    </span>
  );
}

/**
 * Rows of sponsorships. `side="sponsor"` names the sponsoring company (who makes the market for
 * this share), `side="listing"` the sponsored security (what this company makes the market for).
 */
export function SponsorshipRows({
  items,
  side,
  onEnd,
  endLabel,
  onQuote,
}: {
  items: Sponsorship[];
  side: 'sponsor' | 'listing';
  onEnd?: (s: Sponsorship) => void;
  endLabel?: string;
  /** the sponsor's CEO: open the quote form for this listing */
  onQuote?: (s: Sponsorship) => void;
}) {
  return (
    <ul className="mm-list">
      {items.map((s) => {
        const key = `${s.designatedSponsor.id}-${s.listing.securityIdentifier}`;
        const rating = s.sponsorRating?.value;
        return (
          <li key={key} className={onQuote && onEnd ? 'mm-row mm-row--two' : 'mm-row'}>
            {/* name and meta line form one link, so the tap target is the whole cell */}
            {side === 'sponsor' ? (
              <a
                className="mm-row__name"
                href={s.designatedSponsor.securityIdentifier ? companyHref(s.designatedSponsor.securityIdentifier) : undefined}
              >
                <span className="mm-row__title">{s.designatedSponsor.name}</span>
                <span className="mm-row__meta">
                  {s.designatedSponsor.ceo?.username ? `CEO ${s.designatedSponsor.ceo.username}` : 'Kein CEO'}
                </span>
              </a>
            ) : (
              <a className="mm-row__name" href={`/wertpapier/${s.listing.securityIdentifier}`}>
                <span className="mm-row__title">{s.listing.name}</span>
                <span className="mm-row__meta">
                  <span className="num">{s.listing.securityIdentifier}</span> · {typeLabel(s.listing.type)}
                </span>
              </a>
            )}
            <span className="mm-row__rating">
              <RatingMeter rating={rating} />
              <span className="mm-row__meta" title="Quotierte Anteile pro Tag, in % aller Anteile">
                <span className="num">{volumeRateText(s.sponsorRating?.dailyVolumeRate)}</span> / Tag
              </span>
            </span>
            {onQuote && (
              <DS.Button size="sm" onClick={() => onQuote(s)}>
                Quote
              </DS.Button>
            )}
            {onEnd && (
              <DS.Button size="sm" variant="ghost" onClick={() => onEnd(s)}>
                {endLabel ?? 'Beenden'}
              </DS.Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Tab „Market Maker“ on the company page, for everyone: who quotes this share as designated
 * sponsor and which securities this company quotes. The CEO manages it under „Führen“.
 */
export function MarketMakerFacts({
  company: c,
  isCeo,
  onQuote,
}: {
  company: CompanyProfile;
  isCeo: boolean;
  onQuote?: (s: Sponsorship) => void;
}) {
  const sponsors = c.designatedSponsors ?? [];
  const sponsored = c.sponsoredListings ?? [];
  const open = c.marketMakerPolicy !== 'CLOSED';
  return (
    <div className="company__pad mm">
      <div className="mm__cols">
        <section className="mm__col" aria-labelledby="mm-own">
          <h3 id="mm-own" className="mm__title">
            Market Maker für {c.name}
          </h3>
          <p className="company__note">
            {open ? 'Zugelassen: Unternehmen mit mindestens 5 % der Aktien können Kurse stellen.' : 'Geschlossen: keine neuen Market Maker.'}
          </p>
          {sponsors.length ? (
            <SponsorshipRows items={sponsors} side="sponsor" />
          ) : (
            <DS.EmptyState compact as="h4" title="Kein Designated Sponsor">
              Niemand stellt für diese Aktie verbindliche Kauf- und Verkaufskurse.
            </DS.EmptyState>
          )}
        </section>
        <section className="mm__col" aria-labelledby="mm-mandates">
          <h3 id="mm-mandates" className="mm__title">
            Mandate von {c.name}
          </h3>
          <p className="company__note">Wertpapiere, für die dieses Unternehmen Kurse stellt.</p>
          {sponsored.length ? (
            <SponsorshipRows items={sponsored} side="listing" onQuote={isCeo ? onQuote : undefined} />
          ) : (
            <DS.EmptyState compact as="h4" title="Keine Mandate">
              Das Unternehmen ist für kein Wertpapier Designated Sponsor.
            </DS.EmptyState>
          )}
        </section>
      </div>
      <p className="company__note">
        Ein Quote stellt je Seite 1–2 % der Anteile, Geld und Brief mindestens 5 % auseinander. Rating A–D: wie viel der
        Sponsor pro Tag quotet (A am meisten).{' '}
        {isCeo && (
          <>
            Verwalten unter <a href={companyHref(c.securityIdentifier, 'fuehren', { aktion: 'marketmaker' })}>Führen → Market Maker</a>.
          </>
        )}
      </p>
    </div>
  );
}

type Pending = { kind: 'end'; s: Sponsorship; asIssuer: boolean } | { kind: 'start'; asin: string; name: string } | null;

/** „Führen → Market Maker“: policy, remove sponsors of the own share, end or take up mandates. */
export function MarketMakerManage({
  company: c,
  onDone,
  onQuote,
}: {
  company: CompanyProfile;
  onDone: (msg: string) => void;
  onQuote?: (s: Sponsorship) => void;
}) {
  const policyWrite = useCompanyWrite();
  const write = useCompanyWrite();
  const [pending, setPending] = useState<Pending>(null);
  const policy: MarketMakerPolicy = c.marketMakerPolicy === 'CLOSED' ? 'CLOSED' : 'OPEN';
  const sponsors = c.designatedSponsors ?? [];
  const sponsored = c.sponsoredListings ?? [];

  const close = () => {
    if (write.isPending) return;
    write.reset();
    setPending(null);
  };
  const confirm = () => {
    if (!pending) return;
    const r =
      pending.kind === 'start'
        ? ceoRequests.startSponsorship(c.id, pending.asin)
        : ceoRequests.endSponsorship(pending.s.designatedSponsor.id, pending.s.listing.securityIdentifier);
    write.mutate(r, {
      onSuccess: () => {
        setPending(null);
        onDone(
          pending.kind === 'start'
            ? `Mandat für ${pending.name} übernommen.`
            : pending.asIssuer
              ? `${pending.s.designatedSponsor.name} ist kein Market Maker mehr.`
              : `Mandat für ${pending.s.listing.name} beendet.`,
        );
      },
    });
  };

  return (
    <div className="mm-manage">
      <DS.Switch
        label={`Market Maker für ${c.securityIdentifier} zulassen`}
        hint="Andere Unternehmen mit mindestens 5 % der Aktien dürfen Designated Sponsor werden und Kurse stellen."
        checked={policy === 'OPEN'}
        disabled={policyWrite.isPending}
        onText="Offen"
        offText="Geschlossen"
        onChange={(on) =>
          policyWrite.mutate(ceoRequests.setMarketMakerPolicy(c.id, on ? 'OPEN' : 'CLOSED'), {
            onSuccess: () => onDone(on ? 'Market Maker zugelassen.' : 'Market Maker geschlossen.'),
          })
        }
      />
      {policyWrite.isError && <DS.Banner variant="error">Nicht geändert: {policyWrite.error.message}</DS.Banner>}

      <section className="mm__col" aria-labelledby="mmm-own">
        <h3 id="mmm-own" className="mm__title">
          Designated Sponsors deiner Aktie
        </h3>
        {sponsors.length ? (
          <SponsorshipRows items={sponsors} side="sponsor" endLabel="Entziehen" onEnd={(s) => setPending({ kind: 'end', s, asIssuer: true })} />
        ) : (
          <p className="company__note">Noch keiner.</p>
        )}
      </section>

      <section className="mm__col" aria-labelledby="mmm-mandates">
        <h3 id="mmm-mandates" className="mm__title">
          Mandate deines Unternehmens
        </h3>
        {sponsored.length ? (
          <SponsorshipRows
            items={sponsored}
            side="listing"
            endLabel="Beenden"
            onEnd={(s) => setPending({ kind: 'end', s, asIssuer: false })}
            onQuote={onQuote}
          />
        ) : (
          <p className="company__note">Noch keine.</p>
        )}
        <NewMandate company={c} onPick={(asin, name) => setPending({ kind: 'start', asin, name })} />
      </section>

      <Confirm
        open={!!pending}
        title={
          pending?.kind === 'start'
            ? `Market Maker für ${pending.name} werden?`
            : pending?.asIssuer
              ? `${pending.s.designatedSponsor.name} entziehen?`
              : `Mandat für ${pending?.s.listing.name ?? ''} beenden?`
        }
        description={
          pending?.kind === 'start'
            ? `${c.name} wird Designated Sponsor und kann für ${pending.asin} verbindliche Kauf- und Verkaufskurse stellen.`
            : 'Die laufenden Quotes des Sponsors werden gelöscht.'
        }
        confirmLabel={pending?.kind === 'start' ? 'Mandat übernehmen' : pending?.asIssuer ? 'Entziehen' : 'Mandat beenden'}
        danger={pending?.kind === 'end'}
        pending={write.isPending}
        error={write.isError ? write.error.message : null}
        onConfirm={confirm}
        onClose={close}
      />
    </div>
  );
}

/** Search a security, check the 5 % stake and the issuer's policy, then offer to take up the mandate. */
function NewMandate({ company: c, onPick }: { company: CompanyProfile; onPick: (asin: string, name: string) => void }) {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const search = useSpreadSearch(useDebounced(q, 250), 8);
  // The chosen security stays in the URL (?mandat=ASIN), so it can be linked and photographed.
  const asin = params.get('mandat') ?? '';
  const holders = useShareholders(asin);
  const profile = useListingProfile(asin);
  const picked = asin ? { asin, name: profile.data?.name ?? asin } : null;
  const setPicked = (p: { asin: string } | null) => {
    const next = new URLSearchParams(params);
    if (p) next.set('mandat', p.asin);
    else next.delete('mandat');
    setParams(next, { replace: true });
  };
  const stake = asin ? companyStake(holders.isSuccess ? holders.data : undefined, c.id) : undefined;
  const check = picked
    ? sponsorEligibility({
        companyId: c.id,
        asin,
        stake,
        policy: profile.data?.company?.marketMakerPolicy,
        sponsored: c.sponsoredListings ?? [],
        type: profile.data?.type,
      })
    : null;
  const results = (search.data?.content ?? [])
    .filter((r) => r.listing.securityIdentifier !== c.securityIdentifier)
    .map((r) => ({ id: r.listing.securityIdentifier, name: r.listing.name, ticker: r.listing.securityIdentifier, meta: typeLabel(r.listing.type) }));

  return (
    <div className="mm-new">
      <DS.StockSearch
        label="Neues Mandat"
        placeholder="Wertpapier suchen"
        size="sm"
        value={q}
        onChange={setQ}
        results={q.trim().length >= 2 ? results : []}
        loading={search.isFetching}
        emptyText={q.trim().length < 2 ? 'Mindestens zwei Zeichen eingeben.' : 'Nichts gefunden.'}
        onSelect={(r) => {
          setQ('');
          if (r.id) setPicked({ asin: r.id });
        }}
      />
      {picked && (
        <div className="mm-new__check">
          <DS.ProgressBar
            size="sm"
            variant="neutral"
            label={`Anteil von ${c.name} an ${picked.name}`}
            value={Math.min(stake ?? 0, SPONSOR_SHARE_MIN)}
            max={SPONSOR_SHARE_MIN}
            valueText={stake == null ? 'wird geladen' : `${stake.toLocaleString('de-DE', { maximumFractionDigits: 2 })} % von ${SPONSOR_SHARE_MIN} %`}
            hint={
              profile.data?.company
                ? `Emittent: ${profile.data.company.marketMakerPolicy === 'CLOSED' ? 'keine Market Maker' : 'Market Maker zugelassen'}`
                : ' '
            }
          />
          {check && !check.ok && stake != null && (
            <ul className="mm-new__reasons">
              {check.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <div className="panel__actions">
            <DS.Button size="sm" disabled={!check?.ok} onClick={() => onPick(picked.asin, picked.name)}>
              Mandat übernehmen …
            </DS.Button>
            <DS.Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
              Andere Auswahl
            </DS.Button>
          </div>
        </div>
      )}
    </div>
  );
}
