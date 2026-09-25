import { useState } from 'react';
import { DS } from '../ds';
import {
  useCompanyEmployment,
  useCompanyWrite,
  usePossibleSalaryOf,
  type CompanyProfile,
} from '../api/queries';
import { Confirm } from './Confirm';
import { ceoRequests, logoUrlError, parseAmount, wageFigures } from './derive';

const money = (n: number) => DS.format.money(n, '€', 2, 'auto');
const pct = (n: number) => `${n.toLocaleString('de-DE', { maximumFractionDigits: n < 10 ? 2 : 1 })} %`;

/** „Führen → Logo“: the logo is a picture URL (the API takes no upload). */
export function LogoForm({ company: c, onDone }: { company: CompanyProfile; onDone: (msg: string) => void }) {
  const save = useCompanyWrite();
  const remove = useCompanyWrite();
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const err = logoUrlError(url);
  const [broken, setBroken] = useState<string | null>(null);
  const preview = !err && broken !== url.trim() ? url.trim() : null;

  return (
    <div className="ceo-logo">
      <div className="ceo-logo__row">
        <figure className="ceo-logo__fig">
          <div className="ceo-logo__img">{c.logoUrl ? <img src={c.logoUrl} alt="" /> : <span>Kein Logo</span>}</div>
          <figcaption>Jetzt</figcaption>
        </figure>
        <span className="ceo-logo__arrow" aria-hidden="true">
          →
        </span>
        <figure className="ceo-logo__fig">
          <div className="ceo-logo__img">
            {preview ? <img src={preview} alt="" onError={() => setBroken(url.trim())} /> : <span>Vorschau</span>}
          </div>
          <figcaption>Neu</figcaption>
        </figure>
      </div>
      <form
        className="ceo-logo__form"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (err) return;
          save.mutate(ceoRequests.setLogo(c.id, url), {
            onSuccess: () => {
              setUrl('');
              setTouched(false);
              onDone('Logo gespeichert.');
            },
          });
        }}
      >
        <DS.Input
          label="Adresse des Bildes"
          type="url"
          inputMode="url"
          placeholder="https://…/logo.png"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && url ? err ?? (broken === url.trim() ? 'Das Bild lässt sich nicht laden.' : undefined) : undefined}
          hint="Quadratisch wirkt am besten. Das Bild muss öffentlich erreichbar sein."
        />
        <div className="panel__actions">
          <DS.Button type="submit" size="sm" loading={save.isPending} disabled={!!err}>
            Logo speichern
          </DS.Button>
          {c.logoUrl && (
            <DS.Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>
              Logo entfernen
            </DS.Button>
          )}
        </div>
        {save.isError && <DS.Banner variant="error">Nicht gespeichert: {save.error.message}</DS.Banner>}
      </form>
      <Confirm
        open={confirmRemove}
        danger
        title="Logo entfernen?"
        description={`${c.name} zeigt dann wieder das Standardbild.`}
        confirmLabel="Entfernen"
        pending={remove.isPending}
        error={remove.isError ? remove.error.message : null}
        onClose={() => !remove.isPending && (remove.reset(), setConfirmRemove(false))}
        onConfirm={() =>
          remove.mutate(ceoRequests.removeLogo(c.id), {
            onSuccess: () => {
              setConfirmRemove(false);
              onDone('Logo entfernt.');
            },
          })
        }
      />
    </div>
  );
}

/**
 * „Führen → Gehalt“: the CEO's wage against the company, automatic payment, a new wage (goes to
 * the shareholders as CEO poll) and stepping down.
 */
export function SalaryPanel({ company: c, onDone }: { company: CompanyProfile; onDone: (msg: string) => void }) {
  const employment = useCompanyEmployment(c.id);
  // GET /api/v2/possibledailysalary/{userId}: the daily wage over all of the CEO's posts (not what is due now)
  const due = usePossibleSalaryOf(c.ceo?.id);
  const auto = useCompanyWrite();
  const resign = useCompanyWrite();
  const [confirmResign, setConfirmResign] = useState(false);
  const e = employment.data;
  const wage = e?.dailyWage ?? c.ceoEmploymentAgreement?.dailyWage ?? 0;
  const caps = c.companyCapabilities;
  const f = wageFigures(wage, caps?.bookValue, c.bankAccount?.cash);
  const next = e?.lastPayment?.nextPossiblePaymentDate;

  return (
    <div className="ceo-salary">
      <DS.StatGroup columns="repeat(3, minmax(0, 1fr))" aria-label="Gehalt">
        <DS.StatTile label="Tagesgehalt" value={wage} compact="auto" hint={`${money(f.perYear)} im Jahr`} />
        <DS.StatTile
          label="Nächste Zahlung"
          value={next ? <DS.Countdown to={next} short endedText="jetzt abholbereit" /> : '–'}
          hint={
            e?.payAutomatically
              ? 'wird automatisch ausgezahlt'
              : e?.lastPayment?.date
                ? `zuletzt ${DS.format.dateTime(e.lastPayment.date)}`
                : ' '
          }
        />
        <DS.StatTile
          label="Alle CEO-Posten"
          value={due.data?.value ?? wage}
          compact="auto"
          hint={`Tagesgehalt von ${c.ceo?.username ?? '–'} insgesamt`}
        />
      </DS.StatGroup>
      <DS.ProgressBar
        size="sm"
        variant="neutral"
        label="Jahresgehalt im Verhältnis zum Buchwert"
        value={Math.min(f.shareOfBookValue ?? 0, 100)}
        valueText={f.shareOfBookValue != null ? pct(f.shareOfBookValue) : '–'}
        hint={f.daysOfCash != null ? `Das Bargeld reicht für ${f.daysOfCash.toLocaleString('de-DE')} Tagesgehälter.` : ' '}
      />
      <DS.Switch
        label="Gehalt automatisch auszahlen"
        hint="Sonst holst du es einmal am Tag unter Meine Unternehmen ab."
        checked={!!e?.payAutomatically}
        disabled={!e || auto.isPending}
        onChange={(on) =>
          auto.mutate(ceoRequests.setPayAutomatically(c.id, on), {
            onSuccess: () => onDone(on ? 'Gehalt wird automatisch ausgezahlt.' : 'Automatische Auszahlung aus.'),
          })
        }
      />
      {auto.isError && <DS.Banner variant="error">Nicht geändert: {auto.error.message}</DS.Banner>}
      <div className="panel__actions">
        <CeoPollButton company={c} currentWage={wage} label="Neues Gehalt beantragen" onDone={onDone} self />
        <DS.Button size="sm" variant="ghost" disabled={!e} onClick={() => setConfirmResign(true)}>
          Als CEO zurücktreten
        </DS.Button>
      </div>
      <Confirm
        open={confirmResign}
        danger
        title="Als CEO zurücktreten?"
        description={`Du führst ${c.name} dann nicht mehr und bekommst kein Gehalt. Zurück nur über eine neue CEO-Wahl der Aktionäre.`}
        confirmLabel="Zurücktreten"
        pending={resign.isPending}
        error={resign.isError ? resign.error.message : null}
        onClose={() => !resign.isPending && (resign.reset(), setConfirmResign(false))}
        onConfirm={() =>
          e &&
          resign.mutate(ceoRequests.resign(e.id), {
            onSuccess: () => {
              setConfirmResign(false);
              onDone('Du bist als CEO zurückgetreten.');
            },
          })
        }
      />
    </div>
  );
}

/**
 * Starts a CEO poll: the player asks the shareholders to employ them as CEO for a daily wage.
 * Shareholders use it to take over („Als CEO bewerben“), the CEO to change their wage.
 */
export function CeoPollButton({
  company: c,
  currentWage,
  label,
  self,
  onDone,
  variant = 'secondary',
}: {
  company: CompanyProfile;
  currentWage?: number;
  label: string;
  /** the CEO asks for a new wage (instead of a player applying) */
  self?: boolean;
  onDone: (msg: string) => void;
  variant?: 'secondary' | 'ghost';
}) {
  const poll = useCompanyWrite();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const wage = parseAmount(raw);
  const invalid = raw.trim() !== '' && wage == null;
  const diff = wage != null && currentWage ? ((wage - currentWage) / currentWage) * 100 : undefined;
  const close = () => {
    if (poll.isPending) return;
    poll.reset();
    setOpen(false);
  };

  return (
    <>
      <DS.Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </DS.Button>
      <Confirm
        open={open}
        title={self ? 'Neues Gehalt beantragen' : `CEO von ${c.name} werden`}
        description={
          self
            ? 'Die Aktionäre stimmen über dein neues Tagesgehalt ab.'
            : 'Die Aktionäre stimmen ab. Gewinnst du, führst du das Unternehmen zu diesem Tagesgehalt.'
        }
        confirmLabel="Abstimmung starten"
        pending={poll.isPending}
        error={poll.isError ? poll.error.message : null}
        confirmDisabled={wage == null || wage <= 0}
        onClose={close}
        onConfirm={() => {
          if (wage == null) return;
          poll.mutate(ceoRequests.employCeoPoll(c.id, wage), {
            onSuccess: () => {
              setOpen(false);
              setRaw('');
              onDone('Abstimmung über den CEO gestartet.');
            },
          });
        }}
      >
        <DS.Input
          label="Tagesgehalt"
          numeric
          suffix="€"
          placeholder="z. B. 2,5 Mrd."
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          error={invalid ? 'Betrag wie „2.500.000“ oder „2,5 Mrd.“' : undefined}
          hint={
            wage != null
              ? `${money(wage)} je Tag${diff != null ? ` · ${diff >= 0 ? '▲ +' : '▼ −'}${pct(Math.abs(diff))} zum jetzigen Gehalt` : ''}`
              : currentWage
                ? `Jetzt ${money(currentWage)} je Tag`
                : 'Das Unternehmen hat keinen CEO.'
          }
        />
      </Confirm>
    </>
  );
}
