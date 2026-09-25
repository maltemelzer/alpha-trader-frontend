import { useState } from 'react';
import { DS } from '../ds';
import { useMe } from '../api/queries';
import { useAuth } from '../auth/AuthProvider';
import { getTheme, setTheme } from '../lib/theme';
import './MePage.css';

/** Settings: account (read-only here), display options for this browser, gold access, sign out. */
export function SettingsPage() {
  const me = useMe();
  const { logout } = useAuth();
  const [cb, setCb] = useState(getTheme() === 'cb');
  const u = me.data;
  const caps = u?.userCapabilities;

  return (
    <div className="page me__settings">
      <DS.PageHeader size="md" title="Einstellungen" meta={u?.username ? <span>{u.username}</span> : '\u00a0'} />
      <div className="me__settings-body">
        <DS.SettingsSection title="Konto" description="Name und E-Mail ändern geht derzeit nur im Original-Spiel.">
          <DS.SettingsRow label="Spielername" description={u?.username ?? '\u00a0'} />
          <DS.SettingsRow
            label="Dabei seit"
            description={u?.registrationDate ? new Date(u.registrationDate).toLocaleDateString('de-DE') : '\u00a0'}
          />
          <DS.SettingsRow
            label="Newsletter"
            description={!u ? '\u00a0' : u.emailSubscriptionType === 'UNSUBSCRIBED' ? 'Abbestellt' : 'Abonniert'}
          />
          <DS.SettingsRow label="Werbe-Code" description="Für neue Spieler, die du einlädst.">
            <code className="me__code">{u?.refId}</code>
          </DS.SettingsRow>
        </DS.SettingsSection>
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
        <DS.SettingsSection title="Gold" description="Bezahlter Komfort, kein Vorteil im Spielergebnis.">
          <DS.SettingsRow
            label={
              <span>
                Goldzugang {caps?.premium && <span className="bnk-gold">Gold</span>}
              </span>
            }
            description={
              caps?.premium && caps.premiumEndDate
                ? `Aktiv bis ${new Date(caps.premiumEndDate).toLocaleDateString('de-DE')}`
                : 'Nicht aktiv'
            }
          />
        </DS.SettingsSection>
        <DS.SettingsSection title="Sitzung">
          <DS.SettingsRow label="Abmelden" description="Meldet dich in diesem Browser ab.">
            <DS.Button size="sm" onClick={logout}>
              Abmelden
            </DS.Button>
          </DS.SettingsRow>
        </DS.SettingsSection>
      </div>
    </div>
  );
}
