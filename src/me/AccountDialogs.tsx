// Dialogs of the settings page. Every write action runs only after an explicit confirmation here.
import { useId, useState } from 'react';
import { DS } from '../ds';
import { useAccountActions, usePossibleReferrers } from '../api/queries';
import { useDebounced } from '../lib/useDebounced';
import { deletionConfirmed, fieldProblem, noteRequest, subscriptionIdOf, userChange, type AccountField } from './account';

// The page mounts a dialog only while it is open (with a key), so every dialog starts with fresh state.
export type Notify = (ok: boolean, text: string) => void;

const REPEAT_PROBLEM = 'Die Wiederholung stimmt nicht überein.';

const FIELD_TEXT: Record<AccountField, { title: string; label: string; done: string; description: string }> = {
  username: {
    title: 'Spielernamen ändern',
    label: 'Neuer Spielername',
    done: 'Spielername geändert.',
    description: 'Andere sehen ab sofort den neuen Namen – in Chats, Highscores und bei deinen Unternehmen. Du bekommst eine E-Mail dazu.',
  },
  emailaddress: {
    title: 'E-Mail-Adresse ändern',
    label: 'Neue E-Mail-Adresse',
    done: 'E-Mail-Adresse geändert.',
    description: 'An diese Adresse gehen Benachrichtigungen und der Link zum Zurücksetzen des Passworts.',
  },
  password: {
    title: 'Passwort ändern',
    label: 'Neues Passwort',
    done: 'Passwort geändert.',
    description: 'Gilt ab der nächsten Anmeldung, auch in der App und im Original-Spiel.',
  },
};

/** Change name, e-mail or password: input, check, then one PATCH on „Ändern“. */
export function ChangeFieldDialog({
  field,
  current,
  onClose,
  notify,
}: {
  field: AccountField;
  current?: string;
  onClose: () => void;
  notify: Notify;
}) {
  const act = useAccountActions();
  const [value, setValue] = useState('');
  const [repeat, setRepeat] = useState('');
  const [touched, setTouched] = useState(false);
  const t = FIELD_TEXT[field];
  const isPw = field === 'password';
  const problem = fieldProblem(field, value, isPw ? repeat : undefined, current);
  const request = userChange(field, value, isPw ? repeat : undefined, current);
  const submit = () => {
    setTouched(true);
    if (!request) return;
    act.changeUser.mutate(request, {
      onSuccess: () => {
        notify(true, t.done);
        onClose();
      },
      onError: (e) => notify(false, e.message),
    });
  };
  return (
    <DS.Dialog
      open
      size="sm"
      onClose={onClose}
      dismissible={!act.changeUser.isPending}
      title={t.title}
      description={t.description}
      actions={
        <>
          <DS.Button variant="ghost" onClick={onClose} disabled={act.changeUser.isPending}>
            Abbrechen
          </DS.Button>
          <DS.Button variant="primary" loading={act.changeUser.isPending} disabled={touched && !request} onClick={submit}>
            Ändern
          </DS.Button>
        </>
      }
    >
      <form
        className="me__dialog-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <DS.Input
          label={t.label}
          type={isPw ? 'password' : field === 'emailaddress' ? 'email' : 'text'}
          autoComplete={isPw ? 'new-password' : field === 'emailaddress' ? 'email' : 'username'}
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && problem && problem !== REPEAT_PROBLEM ? problem : undefined}
          hint={field === 'username' && current ? `Bisher: ${current}` : isPw ? 'Mindestens 8 Zeichen' : undefined}
        />
        {isPw && (
          <DS.Input
            label="Passwort wiederholen"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            error={touched && problem === REPEAT_PROBLEM ? problem : undefined}
          />
        )}
        <button type="submit" hidden />
      </form>
    </DS.Dialog>
  );
}

/**
 * Delete the account in two steps, as the API does it: with the exact player name the server mails a
 * confirmation link (DELETE without token); with the token from that link (?deletionToken=…) it deletes.
 */
export function DeleteAccountDialog({
  username,
  token,
  onClose,
  notify,
  onDeleted,
}: {
  username?: string;
  token?: string;
  onClose: () => void;
  notify: Notify;
  onDeleted: () => void;
}) {
  const act = useAccountActions();
  const [typed, setTyped] = useState('');
  const ok = deletionConfirmed(typed, username);
  const pending = act.deleteAccount.isPending;
  return (
    <DS.Dialog
      open
      size="sm"
      role="alertdialog"
      onClose={onClose}
      dismissible={!pending}
      eyebrow={token ? 'Schritt 2 von 2' : 'Schritt 1 von 2'}
      title="Konto endgültig löschen?"
      description={
        token
          ? 'Mit dem Link aus der E-Mail wird dein Konto jetzt gelöscht: Depot, Unternehmen als CEO, Nachrichten und Erfolge. Das lässt sich nicht rückgängig machen.'
          : 'Du bekommst zuerst eine E-Mail mit einem Bestätigungslink. Gelöscht wird erst, wenn du ihn öffnest – dann sind Depot, Nachrichten und Erfolge weg, unwiderruflich.'
      }
      actions={
        <>
          <DS.Button variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </DS.Button>
          <DS.Button
            variant="danger"
            disabled={!ok}
            loading={pending}
            onClick={() =>
              act.deleteAccount.mutate(token, {
                onSuccess: () => {
                  if (token) onDeleted();
                  else notify(true, 'Wir haben dir einen Bestätigungslink per E-Mail geschickt.');
                  onClose();
                },
                onError: (e) => notify(false, e.message),
              })
            }
          >
            {token ? 'Konto löschen' : 'Link anfordern'}
          </DS.Button>
        </>
      }
    >
      <DS.Input
        label="Zur Bestätigung deinen Spielernamen eintippen"
        value={typed}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setTyped(e.target.value)}
        hint={username ? `Genau so: ${username}` : undefined}
      />
    </DS.Dialog>
  );
}

/** Create or edit a note; clearing the text of an existing note deletes it (like the original game). */
export function NoteDialog({
  note,
  onClose,
  notify,
}: {
  note: { id?: string; identifier?: string; content?: string };
  onClose: () => void;
  notify: Notify;
}) {
  const act = useAccountActions();
  const areaId = useId();
  const [identifier, setIdentifier] = useState(note.identifier ?? '');
  const [content, setContent] = useState(note.content ?? '');
  const req = noteRequest(note.id, identifier, content);
  const removing = req?.method === 'DELETE';
  return (
    <DS.Dialog
      open
      size="sm"
      onClose={onClose}
      title={note.id ? 'Notiz bearbeiten' : 'Neue Notiz'}
      description="Nur für dich sichtbar. Leerer Text löscht die Notiz."
      actions={
        <>
          <DS.Button variant="ghost" onClick={onClose}>
            Abbrechen
          </DS.Button>
          <DS.Button
            variant={removing ? 'danger' : 'primary'}
            disabled={!req}
            loading={act.saveNote.isPending}
            onClick={() =>
              req &&
              act.saveNote.mutate(req, {
                onSuccess: () => {
                  notify(true, removing ? 'Notiz gelöscht.' : 'Notiz gespeichert.');
                  onClose();
                },
                onError: (e) => notify(false, e.message),
              })
            }
          >
            {removing ? 'Löschen' : 'Speichern'}
          </DS.Button>
        </>
      }
    >
      <div className="me__dialog-form">
        <DS.Input
          label="Bezug"
          value={identifier}
          disabled={!!note.id}
          placeholder="ASIN oder Spielername"
          hint={note.id ? undefined : 'z. B. STSN3G03LB'}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <div className="bnk-field bnk-field--full">
          <label className="bnk-field__label" htmlFor={areaId}>
            Notiz
          </label>
          <div className="bnk-input me__area">
            <textarea id={areaId} className="bnk-input__control" rows={5} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        </div>
      </div>
    </DS.Dialog>
  );
}

/** Enter who referred you – only players older than you can be chosen (the API lists them). */
export function ReferrerDialog({ onClose, notify }: { onClose: () => void; notify: Notify }) {
  const act = useAccountActions();
  const [text, setText] = useState('');
  const q = useDebounced(text, 300);
  const found = usePossibleReferrers(q);
  const [picked, setPicked] = useState<{ username: string; refId: string } | null>(null);
  const list = found.data?.content ?? [];
  return (
    <DS.Dialog
      open
      size="sm"
      onClose={onClose}
      title="Wer hat dich geworben?"
      description="Lässt sich nur einmal eintragen. Der Werber muss sich vor dir angemeldet haben."
      actions={
        <>
          <DS.Button variant="ghost" onClick={onClose}>
            Abbrechen
          </DS.Button>
          <DS.Button
            variant="primary"
            disabled={!picked}
            loading={act.setReferrer.isPending}
            onClick={() =>
              picked &&
              act.setReferrer.mutate(picked.refId, {
                onSuccess: () => {
                  notify(true, `${picked.username} ist als Werber eingetragen.`);
                  onClose();
                },
                onError: (e) => notify(false, e.message),
              })
            }
          >
            {picked ? `${picked.username} eintragen` : 'Eintragen'}
          </DS.Button>
        </>
      }
    >
      <div className="me__dialog-form">
        <DS.Input label="Spielername" value={text} onChange={(e) => setText(e.target.value)} hint="Mindestens 2 Zeichen" />
        <ul className="me__picklist" aria-label="Mögliche Werber">
          {q.trim().length >= 2 && !found.isLoading && !list.length && <li className="me__muted">Niemand gefunden, der infrage kommt.</li>}
          {list.map((u) => (
            <li key={u.id}>
              <DS.Button
                variant={picked?.refId === u.refId ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={picked?.refId === u.refId}
                onClick={() => u.refId && u.username && setPicked({ username: u.username, refId: u.refId })}
              >
                {u.username}
              </DS.Button>
            </li>
          ))}
        </ul>
      </div>
    </DS.Dialog>
  );
}

/** Redeem a gold voucher: the code is checked first (GET), redeemed only on confirmation (PATCH). */
export function RedeemDialog({ code, days, onClose, notify }: { code: string; days?: number; onClose: () => void; notify: Notify }) {
  const act = useAccountActions();
  return (
    <DS.Dialog
      open
      size="sm"
      onClose={onClose}
      title="Gutschein einlösen?"
      description={`${days ? `${days.toLocaleString('de-DE')} Tage Gold` : 'Der Gutschein'} werden deinem Konto gutgeschrieben. Der Code ist danach verbraucht.`}
      actions={
        <>
          <DS.Button variant="ghost" onClick={onClose}>
            Abbrechen
          </DS.Button>
          <DS.Button
            variant="primary"
            loading={act.redeemLicense.isPending}
            onClick={() =>
              act.redeemLicense.mutate(code, {
                onSuccess: (r) => {
                  notify(true, `${(r?.days ?? days ?? 0).toLocaleString('de-DE')} Tage Gold gutgeschrieben.`);
                  onClose();
                },
                onError: (e) => notify(false, e.message),
              })
            }
          >
            Einlösen
          </DS.Button>
        </>
      }
    />
  );
}

/**
 * Cancel a paid subscription (§ 312k BGB): code to the e-mail address → status → cancel. The status
 * answer is only typed as `object`; the cancel button shows up only when it names a subscription id.
 */
export function SubscriptionDialog({ email, onClose, notify }: { email?: string; onClose: () => void; notify: Notify }) {
  const act = useAccountActions();
  const [step, setStep] = useState<'mail' | 'code' | 'status'>('mail');
  const [mail, setMail] = useState(email ?? '');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Record<string, unknown> | undefined>();
  const subId = subscriptionIdOf(status);
  const busy = act.sendSubscriptionCode.isPending || act.subscriptionStatus.isPending || act.cancelSubscription.isPending;
  const fail = (e: Error) => notify(false, e.message);
  const primary =
    step === 'mail' ? (
      <DS.Button variant="primary" loading={busy} disabled={!mail.includes('@')} onClick={() => act.sendSubscriptionCode.mutate(mail.trim(), { onSuccess: () => setStep('code'), onError: fail })}>
        Code senden
      </DS.Button>
    ) : step === 'code' ? (
      <DS.Button
        variant="primary"
        loading={busy}
        disabled={!code.trim()}
        onClick={() =>
          act.subscriptionStatus.mutate(
            { email: mail.trim(), code: code.trim() },
            {
              onSuccess: (s) => {
                setStatus(s ?? {});
                setStep('status');
              },
              onError: fail,
            },
          )
        }
      >
        Abo anzeigen
      </DS.Button>
    ) : subId ? (
      <DS.Button
        variant="danger"
        loading={busy}
        onClick={() =>
          act.cancelSubscription.mutate(subId, {
            onSuccess: () => {
              notify(true, 'Abo gekündigt. Gold bleibt bis zum Ende des bezahlten Zeitraums.');
              onClose();
            },
            onError: fail,
          })
        }
      >
        Jetzt kündigen
      </DS.Button>
    ) : null;
  return (
    <DS.Dialog
      open
      size="sm"
      onClose={onClose}
      dismissible={!busy}
      eyebrow={`Schritt ${step === 'mail' ? 1 : step === 'code' ? 2 : 3} von 3`}
      title="Abo kündigen"
      description="Zur Sicherheit schicken wir einen Code an die E-Mail-Adresse, mit der du bezahlt hast."
      actions={
        <>
          <DS.Button variant="ghost" onClick={onClose} disabled={busy}>
            {step === 'status' ? 'Schließen' : 'Abbrechen'}
          </DS.Button>
          {primary}
        </>
      }
    >
      {step === 'mail' && <DS.Input label="E-Mail-Adresse" type="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} />}
      {step === 'code' && <DS.Input label="Code aus der E-Mail" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} hint={`Gesendet an ${mail}`} />}
      {step === 'status' &&
        (Object.keys(status ?? {}).length ? (
          <dl className="me__kv">
            {Object.entries(status!)
              .filter(([, v]) => v == null || typeof v !== 'object')
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v == null ? '–' : String(v)}</dd>
                </div>
              ))}
          </dl>
        ) : (
          <DS.EmptyState compact title="Kein laufendes Abo">
            Zu dieser Adresse gibt es kein Abo, das sich kündigen ließe.
          </DS.EmptyState>
        ))}
    </DS.Dialog>
  );
}
