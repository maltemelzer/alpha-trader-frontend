import { useState } from 'react';
import { DS } from '../ds';
import { useComplaint, type ComplaintType } from '../api/queries';

export interface ReportTarget {
  id: string;
  type: ComplaintType;
  /** what is reported, e.g. „Beitrag von Talis“ */
  label: string;
}

/**
 * Report content to the game's moderators (POST /api/complaints). A report cannot be taken back,
 * so it always goes through this dialog; the reason is optional.
 */
export function ReportDialog({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const report = useComplaint();
  const close = () => {
    if (report.isPending) return;
    setText('');
    setSent(false);
    report.reset();
    onClose();
  };

  return (
    <DS.Dialog
      open={!!target}
      role="alertdialog"
      size="sm"
      onClose={close}
      dismissible={!report.isPending}
      title={sent ? 'Gemeldet' : `${target?.label ?? 'Inhalt'} melden?`}
      description={
        sent
          ? 'Danke – die Moderation sieht sich das an.'
          : 'Die Moderation von Alpha-Trader bekommt den Inhalt zu sehen. Eine Meldung lässt sich nicht zurücknehmen.'
      }
      actions={
        sent ? (
          <DS.Button variant="secondary" onClick={close}>
            Schließen
          </DS.Button>
        ) : (
          <>
            <DS.Button variant="ghost" onClick={close} disabled={report.isPending}>
              Abbrechen
            </DS.Button>
            <DS.Button
              variant="danger"
              loading={report.isPending}
              onClick={() =>
                target &&
                report.mutate({ subjectMatterId: target.id, subjectMatterType: target.type, text }, { onSuccess: () => setSent(true) })
              }
            >
              Melden
            </DS.Button>
          </>
        )
      }
    >
      {!sent && (
        <DS.Textarea
          label="Grund"
          optional
          rows={3}
          maxLength={500}
          value={text}
          placeholder="Was stimmt damit nicht?"
          onChange={(e) => setText(e.target.value)}
        />
      )}
      {report.isError && <DS.Banner variant="error">Nicht gemeldet: {report.error.message}</DS.Banner>}
    </DS.Dialog>
  );
}
