import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useAlliance, useAllianceActions, useAllianceMembers, useMyChats } from '../api/queries';
import type { UsernameView } from '../api/types';
import type { AllianceMembership } from '../../vendor/bankiersgruen';
import { UserPicker } from '../chat/UserPicker';
import { AllianceForm } from './AllianceForm';
import { htmlToText } from '../lib/html';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useMediaQuery } from '../lib/useMediaQuery';
import './AlliancePage.css';

/**
 * Alliance: header with key figures; description and members side by side (tabs when narrow).
 * Members can leave; owner and deputies take in players, change roles and remove members; the owner edits the profile.
 */
export function AlliancePage() {
  const { id = '' } = useParams();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const [params, setParams] = useSearchParams();
  const onLinkClick = useInternalLinks();
  const navigate = useNavigate();
  const alliance = useAlliance(id);
  const members = useAllianceMembers(id);
  const chats = useMyChats();
  const act = useAllianceActions();
  const sheet = params.get('bearbeiten') ? 'edit' : params.get('aufnehmen') ? 'add' : null;
  const [picked, setPicked] = useState<UsernameView[]>([]);
  const [confirm, setConfirm] = useState<{ kind: 'leave' } | { kind: 'remove'; m: AllianceMembership } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (alliance.isError) {
    return (
      <div className="page">
        <DS.EmptyState title="Allianz nicht gefunden" />
      </div>
    );
  }
  const a = alliance.data;
  const list = members.data ?? [];
  const online = list.filter((m) => m.online).length;
  const mine = list.find((m) => m.member.myUser);
  const isMember = !!mine;
  const isOwner = mine?.role === 'OWNER';
  const canManage = isOwner || mine?.role === 'DEPUTY';
  const openSheet = (key: 'bearbeiten' | 'aufnehmen' | null) => {
    const next = new URLSearchParams(params);
    next.delete('bearbeiten');
    next.delete('aufnehmen');
    if (key) next.set(key, '1');
    setParams(next, { replace: true });
  };
  const failed = [act.add, act.role, act.remove, act.leave, act.edit].find((m) => m.isError);
  const hasChat = !!a?.chatId && chats.data?.some((c) => c.id === a.chatId);

  const about = (
    <div className="panel__fill scroll alliance__about">
      {a?.description ? <p>{htmlToText(a.description)}</p> : <DS.EmptyState compact as="h3" title="Keine Beschreibung" />}
    </div>
  );
  const memberList = members.isLoading ? (
    <DS.Loading rows={8} />
  ) : (
    <div className="alliance__members">
      <DS.AllianceMembers
        members={list}
        hrefFor={(m) => `/spieler/${encodeURIComponent(m.member.username)}`}
        onRoleChange={canManage ? (m, role) => act.role.mutate({ membershipId: m.id, role }) : undefined}
        onRemove={canManage ? (m) => setConfirm({ kind: 'remove', m }) : undefined}
      />
    </div>
  );

  const addButton = canManage ? (
    <DS.Button variant="ghost" size="sm" onClick={() => openSheet('aufnehmen')}>
      Aufnehmen
    </DS.Button>
  ) : undefined;

  return (
    <div className="page alliance" onClick={onLinkClick}>
      <DS.ProfileHeader
        kind="alliance"
        kindLabel="Allianz"
        name={a?.name ?? '…'}
        logoUrl={a?.logoUrl}
        meta={a?.dateCreated ? [`Gegründet ${new Date(a.dateCreated).toLocaleDateString('de-DE')}`] : ['\u00a0']}
        tags={isMember ? [{ label: 'Deine Allianz' }] : undefined}
        actions={
          <>
            {isOwner && (
              <DS.Button variant="ghost" size="sm" onClick={() => openSheet('bearbeiten')}>
                Bearbeiten
              </DS.Button>
            )}
            {isMember && (
              <DS.Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: 'leave' })}>
                Verlassen
              </DS.Button>
            )}
            {a?.index && (
              <DS.Button variant="secondary" size="sm" onClick={() => navigate(`/wertpapier/${a.index!.securityIdentifier}`)}>
                Allianz-Index
              </DS.Button>
            )}
            {hasChat && (
              <DS.Button variant="primary" size="sm" onClick={() => navigate(`/nachrichten/${a!.chatId}`)}>
                Allianz-Chat
              </DS.Button>
            )}
          </>
        }
        stats={[
          { label: 'Mitglieder', value: String(list.length || a?.numberOfMembers || '–') },
          { label: 'Online', value: members.data ? String(online) : '–' },
          { label: 'Erfolge', value: a ? `${a.achievementCount ?? 0} von ${a.achievementTotal ?? 0}` : '–' },
        ]}
      />
      {isWide ? (
        <div className="page__body alliance__body">
          <DS.Card className="panel" title="Über die Allianz">
            {about}
          </DS.Card>
          <DS.Card className="panel" title="Mitglieder" action={addButton}>
            <div className="panel__fill scroll">{memberList}</div>
          </DS.Card>
        </div>
      ) : (
        <DS.Card flush className="panel">
          <div className="panel__tabs">
            <DS.Tabs
              size="sm"
              aria-label="Allianz"
              value={params.get('ansicht') ?? 'mitglieder'}
              onChange={(v) => setParams({ ansicht: v }, { replace: true })}
              items={[
                {
                  value: 'mitglieder',
                  label: 'Mitglieder',
                  count: list.length,
                  content: (
                    <>
                      {addButton && <div className="alliance__add">{addButton}</div>}
                      {memberList}
                    </>
                  ),
                },
                { value: 'ueber', label: 'Über uns', content: <div className="alliance__about">{about}</div> },
              ]}
            />
          </div>
        </DS.Card>
      )}
      {failed && (
        <DS.Banner variant="error" className="alliance__error">
          Nicht ausgeführt: {failed.error?.message}
        </DS.Banner>
      )}
      <DS.Sheet open={sheet === 'edit'} onClose={() => openSheet(null)} title="Allianz bearbeiten" side="auto" width={520}>
        {a && (
          <AllianceForm
            initial={a}
            submitLabel="Speichern"
            loading={act.edit.isPending}
            onCancel={() => openSheet(null)}
            onSubmit={(v) => act.edit.mutate({ allianceId: a.id, ...v }, { onSuccess: () => openSheet(null) })}
          />
        )}
      </DS.Sheet>
      <DS.Sheet
        open={sheet === 'add'}
        onClose={() => openSheet(null)}
        title="Mitglied aufnehmen"
        side="auto"
        width={440}
        footer={
          <DS.Button
            variant="primary"
            disabled={!picked.length}
            loading={act.add.isPending}
            onClick={async () => {
              for (const u of picked) await act.add.mutateAsync({ allianceId: id, userId: u.id! });
              setNotice(picked.length === 1 ? `${picked[0].username} aufgenommen.` : `${picked.length} Spieler aufgenommen.`);
              setPicked([]);
              openSheet(null);
            }}
          >
            Aufnehmen
          </DS.Button>
        }
      >
        <UserPicker label="Spieler" value={picked} onChange={setPicked} exclude={list.map((m) => m.member.username)} />
      </DS.Sheet>
      <DS.Dialog
        open={!!confirm}
        role="alertdialog"
        size="sm"
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'leave' ? 'Allianz verlassen?' : `${confirm?.kind === 'remove' ? confirm.m.member.username : ''} entfernen?`}
        description={
          confirm?.kind === 'leave'
            ? isOwner
              ? 'Du bist Gründer. Übertrage die Rolle vorher an ein anderes Mitglied, sonst bleibt die Allianz ohne Leitung.'
              : 'Du verlierst den Zugang zum Allianz-Chat.'
            : 'Das Mitglied verliert den Zugang zum Allianz-Chat.'
        }
        actions={
          <>
            <DS.Button variant="ghost" onClick={() => setConfirm(null)}>
              Abbrechen
            </DS.Button>
            <DS.Button
              variant="danger"
              loading={act.leave.isPending || act.remove.isPending}
              onClick={() => {
                if (confirm?.kind === 'leave') act.leave.mutate(id, { onSuccess: () => navigate('/allianzen') });
                else if (confirm?.kind === 'remove') act.remove.mutate(confirm.m.id);
                setConfirm(null);
              }}
            >
              {confirm?.kind === 'leave' ? 'Verlassen' : 'Entfernen'}
            </DS.Button>
          </>
        }
      />
      {notice && (
        <DS.ToastRegion>
          <DS.Toast title="Allianz" duration={5000} onClose={() => setNotice(null)}>
            {notice}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </div>
  );
}
