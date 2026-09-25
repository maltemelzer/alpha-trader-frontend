import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useAccountActions,
  useMe,
  useMyLocale,
  useNotes,
  useOnlineTracking,
  usePremiumLicense,
  usePremiumOrderEvents,
  useReferredUsers,
  useReferrer,
  type PremiumOrderEventView,
  type UserPreferenceView,
} from '../api/queries';
import { useAuth } from '../auth/AuthProvider';
import { Plot } from '../charts/Plot';
import { getTheme, setTheme } from '../lib/theme';
import { useDebounced } from '../lib/useDebounced';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useNow } from '../lib/useNow';
import { useParamState } from '../lib/useParamState';
import {
  LOCALES,
  PROCESSING_STATE,
  licenseDays,
  localeOption,
  minutesText,
  newsletterChange,
  newsletterOn,
  noteTarget,
  onlineStats,
  premiumDaysLeft,
  referralsByMonth,
  type AccountField,
} from './account';
import { ChangeFieldDialog, DeleteAccountDialog, NoteDialog, RedeemDialog, ReferrerDialog, SubscriptionDialog } from './AccountDialogs';
import { referralsChart } from './charts';
import './MePage.css';

const AREAS = [
  { value: 'konto', label: 'Konto' },
  { value: 'gold', label: 'Gold' },
  { value: 'werben', label: 'Werben' },
  { value: 'notizen', label: 'Notizen' },
];
const date = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString('de-DE') : '–');
const dateTime = (ms?: number | null) =>
  ms ? new Date(ms).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';
const NBSP = ' ';

type Dialog =
  | { kind: 'field'; field: AccountField }
  | { kind: 'delete' }
  | { kind: 'note'; note: { id?: string; identifier?: string; content?: string } }
  | { kind: 'referrer' }
  | { kind: 'redeem'; code: string; days?: number }
  | { kind: 'subscription' };

/**
 * Settings: key figures on top, then one area at a time (?bereich=konto|gold|werben|notizen).
 * Every change to the account runs through a dialog with an explicit confirmation.
 */
export function SettingsPage() {
  const me = useMe();
  const { logout } = useAuth();
  const u = me.data;
  const caps = u?.userCapabilities;
  const online = useOnlineTracking();
  const referred = useReferredUsers();
  const [area, setArea] = useParamState('bereich', 'konto', AREAS);
  const [params, setParams] = useSearchParams();
  const deletionToken = params.get('deletionToken') ?? undefined;
  const [dialog, setDialog] = useState<Dialog | null>(deletionToken ? { kind: 'delete' } : null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const notify = useCallback((ok: boolean, text: string) => setToast({ ok, text }), []);
  const close = useCallback(() => {
    setDialog(null);
    if (deletionToken)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('deletionToken');
          return next;
        },
        { replace: true },
      );
  }, [deletionToken, setParams]);
  const onLinkClick = useInternalLinks();
  const wide = useMediaQuery('(min-width: 1100px)');
  const now = useNow();

  const stats = onlineStats(online.data?.onlineMinutes, u?.registrationDate, now);
  const goldDays = premiumDaysLeft(caps?.premium ? caps.premiumEndDate : null, now);
  const years = u?.registrationDate ? (now - u.registrationDate) / (365.25 * 86_400_000) : undefined;

  return (
    <div className="page me__settings" onClick={onLinkClick}>
      <DS.PageHeader size="md" title="Einstellungen" meta={<span>{u?.username ?? NBSP}</span>} />
      <DS.StatGroup className="me__tiles" aria-label="Dein Konto in Zahlen">
        <DS.StatTile
          label="Dabei seit"
          value={u?.registrationDate ? new Date(u.registrationDate).getFullYear().toString() : NBSP}
          hint={years != null ? `${years.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Jahre` : NBSP}
        />
        <DS.StatTile
          label="Online-Zeit"
          value={stats ? minutesText(stats.hours >= 10 ? Math.round(stats.hours) * 60 : stats.hours * 60) : NBSP}
          hint={stats?.perDay != null ? `Ø ${minutesText(stats.perDay)} am Tag` : NBSP}
        />
        <DS.StatTile
          label="Gold"
          value={!u ? NBSP : goldDays ? `${goldDays.toLocaleString('de-DE')} Tage` : 'Nicht aktiv'}
          hint={goldDays ? `bis ${date(caps?.premiumEndDate)}` : 'kein Spielvorteil'}
        />
        <DS.StatTile
          label="Geworben"
          value={referred.data ? `${referred.data.totalElements.toLocaleString('de-DE')} Spieler` : NBSP}
          hint={u?.refId ? `Code ${u.refId}` : NBSP}
        />
      </DS.StatGroup>
      <div className="me__settings-main">
        <DS.SegmentedControl aria-label="Bereich" options={AREAS} value={area} onChange={setArea} fullWidth={!wide} className="me__areas" />
        <div className={`me__settings-body${wide ? ' me__settings-body--wide' : ''}`}>
          {area === 'konto' && <AccountArea wide={wide} onDialog={setDialog} notify={notify} onLogout={logout} />}
          {area === 'gold' && <GoldArea onDialog={setDialog} />}
          {area === 'werben' && <ReferralArea onDialog={setDialog} />}
          {area === 'notizen' && <NotesArea onDialog={setDialog} />}
        </div>
      </div>

      {dialog?.kind === 'field' && (
        <ChangeFieldDialog
          key={dialog.field}
          field={dialog.field}
          current={dialog.field === 'username' ? u?.username : dialog.field === 'emailaddress' ? u?.emailAddress : undefined}
          onClose={close}
          notify={notify}
        />
      )}
      {dialog?.kind === 'delete' && <DeleteAccountDialog username={u?.username} token={deletionToken} onClose={close} notify={notify} onDeleted={logout} />}
      {dialog?.kind === 'note' && <NoteDialog note={dialog.note} onClose={close} notify={notify} />}
      {dialog?.kind === 'referrer' && <ReferrerDialog onClose={close} notify={notify} />}
      {dialog?.kind === 'redeem' && <RedeemDialog code={dialog.code} days={dialog.days} onClose={close} notify={notify} />}
      {dialog?.kind === 'subscription' && <SubscriptionDialog email={u?.emailAddress} onClose={close} notify={notify} />}
      {toast && (
        <DS.ToastRegion>
          <DS.Toast variant={toast.ok ? 'info' : 'error'} title="Einstellungen" duration={toast.ok ? 5000 : undefined} onClose={() => setToast(null)}>
            {toast.text}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </div>
  );
}

type AreaProps = { onDialog: (d: Dialog) => void };

function AccountArea({ wide, onDialog, notify, onLogout }: AreaProps & { wide: boolean; notify: (ok: boolean, t: string) => void; onLogout: () => void }) {
  const me = useMe();
  const u = me.data;
  const locale = useMyLocale();
  const act = useAccountActions();
  const [cb, setCb] = useState(getTheme() === 'cb');
  const localeValue = localeOption(locale.data ?? u?.userCapabilities?.locale) ?? '';
  const change = (field: AccountField) => (
    <DS.Button size="sm" onClick={() => onDialog({ kind: 'field', field })}>
      Ändern
    </DS.Button>
  );

  const account = (
    <DS.SettingsSection title="Konto" description="Änderungen bestätigst du im nächsten Schritt; der Server schickt dir eine E-Mail dazu.">
      <DS.SettingsRow label="Spielername" description={u?.username ?? NBSP}>
        {change('username')}
      </DS.SettingsRow>
      <DS.SettingsRow label="E-Mail-Adresse" description={u?.emailAddress ?? NBSP}>
        {change('emailaddress')}
      </DS.SettingsRow>
      <DS.SettingsRow label="Passwort" description="Gilt auch für das Original-Spiel.">
        {change('password')}
      </DS.SettingsRow>
      <DS.SettingsRow
        label="Newsletter"
        description={u?.emailSubscriptionType === 'NOT_CONFIRMED_SUBSCRIBED' ? 'Wartet auf deine Bestätigung per E-Mail.' : 'Neuigkeiten zum Spiel per E-Mail.'}
      >
        <DS.Switch
          label="Newsletter"
          checked={newsletterOn(u?.emailSubscriptionType)}
          disabled={!u || act.changeUser.isPending}
          onChange={(on) =>
            act.changeUser.mutate(newsletterChange(on), {
              onSuccess: () => notify(true, on ? 'Newsletter bestellt.' : 'Newsletter abbestellt.'),
              onError: (e) => notify(false, e.message),
            })
          }
        />
      </DS.SettingsRow>
      <DS.SettingsRow label="Sprache" description="Für E-Mails und Texte vom Spiel-Server. Diese Oberfläche bleibt deutsch.">
        <DS.Select
          aria-label="Sprache"
          size="sm"
          fullWidth={false}
          value={localeValue}
          placeholder={localeValue ? undefined : 'Andere'}
          disabled={act.setLocale.isPending || locale.isLoading}
          options={LOCALES.map((l) => ({ value: l.value, label: l.label }))}
          onChange={(e) =>
            act.setLocale.mutate(e.target.value, {
              onSuccess: () => notify(true, 'Sprache gespeichert.'),
              onError: (err) => notify(false, err.message),
            })
          }
        />
      </DS.SettingsRow>
    </DS.SettingsSection>
  );
  const rest = (
    <>
      <DS.SettingsSection title="Darstellung" description="Gilt nur in diesem Browser.">
        <DS.SettingsRow label="Farbenblind-Modus" description="Gewinn in Blau, Verlust in Orange.">
          <DS.Switch
            label="Farbenblind-Modus"
            checked={cb}
            onChange={(on) => {
              setCb(on);
              setTheme(on ? 'cb' : 'standard');
            }}
          />
        </DS.SettingsRow>
      </DS.SettingsSection>
      <DS.SettingsSection title="Sitzung">
        <DS.SettingsRow label="Abmelden" description="Meldet dich in diesem Browser ab.">
          <DS.Button size="sm" onClick={onLogout}>
            Abmelden
          </DS.Button>
        </DS.SettingsRow>
      </DS.SettingsSection>
      <DS.SettingsSection title="Konto löschen" danger>
        <DS.SettingsRow label="Alles löschen" description="Depot, Nachrichten und Erfolge – unwiderruflich. Erst nach Bestätigung per E-Mail.">
          <DS.Button size="sm" variant="danger" onClick={() => onDialog({ kind: 'delete' })}>
            Löschen …
          </DS.Button>
        </DS.SettingsRow>
      </DS.SettingsSection>
    </>
  );
  return wide ? (
    <>
      <div className="me__col">{account}</div>
      <div className="me__col">{rest}</div>
    </>
  ) : (
    <div className="me__col">
      {account}
      {rest}
    </div>
  );
}

function GoldArea({ onDialog }: AreaProps) {
  const me = useMe();
  const caps = me.data?.userCapabilities;
  const events = usePremiumOrderEvents();
  const [code, setCode] = useState('');
  const debounced = useDebounced(code, 400);
  const license = usePremiumLicense(debounced);
  const days = licenseDays(license.data);
  const checked = debounced.trim().length >= 4 && debounced === code;
  const columns = useMemo(
    () => [
      { key: 'eventCreated', label: 'Datum', render: (e: PremiumOrderEventView) => dateTime(e.eventCreated), sortValue: (e: PremiumOrderEventView) => e.eventCreated ?? 0 },
      { key: 'type', label: 'Vorgang', render: (e: PremiumOrderEventView) => e.type ?? '–' },
      { key: 'reference', label: 'Referenz', render: (e: PremiumOrderEventView) => <code className="me__code">{e.reference ?? '–'}</code> },
      { key: 'processingState', label: 'Status', render: (e: PremiumOrderEventView) => PROCESSING_STATE[e.processingState ?? ''] ?? e.processingState ?? '–' },
    ],
    [],
  );
  return (
    <>
      <div className="me__col">
        <DS.SettingsSection title="Goldzugang" description="Bezahlter Komfort, kein Vorteil im Spielergebnis.">
          <DS.SettingsRow
            label={<span>Status {caps?.premium && <span className="bnk-gold">Gold</span>}</span>}
            description={caps?.premium && caps.premiumEndDate ? `Aktiv bis ${date(caps.premiumEndDate)}` : 'Nicht aktiv'}
          />
          <DS.SettingsRow label="Gutschein einlösen" description="Code eingeben – er wird erst geprüft, eingelöst erst nach Bestätigung." stacked>
            <div className="me__inline">
              <DS.Input
                aria-label="Gutschein-Code"
                size="sm"
                value={code}
                autoComplete="off"
                spellCheck={false}
                placeholder="Code"
                onChange={(e) => setCode(e.target.value.trim())}
                error={checked && license.isError ? 'Unbekannter oder verbrauchter Code.' : undefined}
                hint={checked && license.data ? (days ? `Gültig: ${days.toLocaleString('de-DE')} Tage Gold` : 'Gültiger Code') : NBSP}
              />
              <DS.Button size="sm" disabled={!checked || !license.data} loading={license.isFetching} onClick={() => onDialog({ kind: 'redeem', code, days })}>
                Einlösen …
              </DS.Button>
            </div>
          </DS.SettingsRow>
          <DS.SettingsRow label="Abo kündigen" description="Für bezahlte Abos: Bestätigung per Code an deine E-Mail-Adresse.">
            <DS.Button size="sm" onClick={() => onDialog({ kind: 'subscription' })}>
              Kündigen …
            </DS.Button>
          </DS.SettingsRow>
        </DS.SettingsSection>
      </div>
      <div className="me__col">
        <DS.SettingsSection title="Zahlungen" description="Vorgänge des Zahlungsanbieters zu deinem Goldzugang.">
          {events.isLoading ? (
            <DS.Skeleton variant="rows" />
          ) : (
            <DS.DataTable
              columns={columns}
              rows={events.data?.content ?? []}
              rowKey={(e: PremiumOrderEventView) => `${e.reference}-${e.eventCreated}`}
              density="sm"
              stack="auto"
              caption="Zahlungen"
              empty={<DS.EmptyState compact symbol={false} title="Keine Zahlungen">Du hast Gold bisher nicht gekauft.</DS.EmptyState>}
            />
          )}
        </DS.SettingsSection>
      </div>
    </>
  );
}

function ReferralArea({ onDialog }: AreaProps) {
  const me = useMe();
  const referrer = useReferrer();
  const referred = useReferredUsers();
  const users = useMemo(() => referred.data?.content ?? [], [referred.data]);
  const months = useMemo(() => referralsByMonth(users), [users]);
  const [copied, setCopied] = useState(false);
  const refId = me.data?.refId;
  return (
    <>
      <div className="me__col">
        <DS.SettingsSection title="Werben" description="Neue Spieler geben bei der Anmeldung deinen Code an.">
          <DS.SettingsRow label="Dein Werbe-Code" description={copied ? 'Kopiert.' : 'Zum Weitergeben.'}>
            <span className="me__inline">
              <code className="me__code">{refId ?? NBSP}</code>
              <DS.Button
                size="sm"
                variant="ghost"
                disabled={!refId}
                onClick={() => {
                  void navigator.clipboard?.writeText(refId ?? '').then(() => setCopied(true));
                }}
              >
                Kopieren
              </DS.Button>
            </span>
          </DS.SettingsRow>
          <DS.SettingsRow
            label="Geworben von"
            description={referrer.isLoading ? NBSP : referrer.data ? <a href={`/spieler/${encodeURIComponent(referrer.data.username)}`}>{referrer.data.username}</a> : 'Niemand eingetragen.'}
          >
            {!referrer.isLoading && !referrer.data && (
              <DS.Button size="sm" onClick={() => onDialog({ kind: 'referrer' })}>
                Eintragen …
              </DS.Button>
            )}
          </DS.SettingsRow>
        </DS.SettingsSection>
      </div>
      <div className="me__col">
        <DS.SettingsSection title={`Geworbene Spieler${users.length ? ` · ${users.length.toLocaleString('de-DE')}` : ''}`}>
          {referred.isLoading ? (
            <DS.Skeleton variant="rows" />
          ) : !users.length ? (
            <DS.EmptyState compact title="Noch niemand">
              Wer sich mit deinem Code anmeldet, erscheint hier.
            </DS.EmptyState>
          ) : (
            <>
              {months.length > 1 && (
                <div className="me__chart">
                  <Plot aria-label="Geworbene Spieler je Monat" figure={(t, w) => referralsChart(t, w, months)} />
                </div>
              )}
              <ul className="me__people">
                {users.map((p) => (
                  <li key={p.id}>
                    <DS.Avatar name={p.username} size={28} />
                    <a href={`/spieler/${encodeURIComponent(p.username ?? '')}`}>{p.username}</a>
                    <span className="me__muted">seit {date(p.registrationDate)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DS.SettingsSection>
      </div>
    </>
  );
}

function NotesArea({ onDialog }: AreaProps) {
  const notes = useNotes();
  const rows = notes.data?.content ?? [];
  const columns = useMemo(
    () => [
      {
        key: 'identifier',
        label: 'Bezug',
        render: (n: UserPreferenceView) => {
          const t = noteTarget(n.identifier);
          return t.href ? <a href={t.href}>{t.label}</a> : t.label;
        },
      },
      { key: 'content', label: 'Notiz', render: (n: UserPreferenceView) => <span className="me__note-text">{n.content}</span> },
      {
        key: 'edit',
        label: '',
        action: true,
        render: (n: UserPreferenceView) => (
          <DS.Button size="sm" variant="ghost" onClick={() => onDialog({ kind: 'note', note: { id: n.id, identifier: n.identifier, content: n.content } })}>
            Bearbeiten
          </DS.Button>
        ),
      },
    ],
    [onDialog],
  );
  return (
    <div className="me__col me__col--full">
      <DS.SettingsSection
        title={`Notizen${rows.length ? ` · ${rows.length.toLocaleString('de-DE')}` : ''}`}
        description="Private Notizen zu Wertpapieren und Spielern – dieselben wie im Original-Spiel."
      >
        <div className="me__toolbar">
          <DS.Button size="sm" onClick={() => onDialog({ kind: 'note', note: {} })}>
            Neue Notiz
          </DS.Button>
        </div>
        {notes.isLoading ? (
          <DS.Skeleton variant="rows" />
        ) : (
          <DS.DataTable
            columns={columns}
            rows={rows}
            rowKey="id"
            density="sm"
            stack="auto"
            caption="Notizen"
            empty={<DS.EmptyState compact symbol={false} title="Keine Notizen">Leg eine an, z. B. zu einer Aktie, die du beobachtest.</DS.EmptyState>}
          />
        )}
      </DS.SettingsSection>
    </div>
  );
}
