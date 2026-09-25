import { DS } from '../ds';

/**
 * Confirmation before a write action on the live game. Stays open while the request runs and shows
 * the error inside, so nothing is sent twice by accident.
 */
export function Confirm({
  open,
  title,
  description,
  confirmLabel,
  danger,
  alert,
  pending,
  confirmDisabled,
  error,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** alertdialog without the danger button, e.g. before binding orders */
  alert?: boolean;
  pending?: boolean;
  confirmDisabled?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <DS.Dialog
      open={open}
      role={danger || alert ? 'alertdialog' : 'dialog'}
      size="sm"
      dismissible={!pending}
      onClose={onClose}
      title={title}
      description={description}
      actions={
        <>
          <DS.Button variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </DS.Button>
          <DS.Button variant={danger ? 'danger' : 'primary'} loading={pending} disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </DS.Button>
        </>
      }
    >
      {children}
      {error && <DS.Banner variant="error">{error}</DS.Banner>}
    </DS.Dialog>
  );
}
