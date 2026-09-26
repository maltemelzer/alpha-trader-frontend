import { DS } from '../ds';
import './PhoneSearch.css';

/**
 * Phone header row: a search icon beside the view switch and the main actions, instead of a search
 * field in a row of its own. Tapping it swaps the row for the field; ✕ clears and closes it again.
 * (Forum and newspaper share it.)
 */
export function SearchIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <DS.Button variant="secondary" size="sm" className="psearch__icon" aria-label={label} title={label} onClick={onClick}>
      <DS.Icon name="suche" size={20} />
    </DS.Button>
  );
}

export function PhoneSearchRow({
  value,
  onChange,
  label,
  placeholder,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  onClose: () => void;
}) {
  return (
    <div className="psearch" role="search">
      <DS.Input
        type="search"
        // opened on purpose by the search icon: straight into typing
        autoFocus={!value}
        aria-label={label}
        placeholder={placeholder}
        size="sm"
        className="psearch__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <DS.Button variant="ghost" size="sm" className="psearch__icon" aria-label="Suche schließen" onClick={onClose}>
        <DS.Icon name="schliessen" size={20} />
      </DS.Button>
    </div>
  );
}
