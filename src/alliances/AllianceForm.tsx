import { useState } from 'react';
import { DS } from '../ds';
import { htmlToText, textToHtml } from '../lib/html';

export interface AllianceFormValue {
  name: string;
  description: string;
  logoUrl?: string;
}

/**
 * Found or edit an alliance: name, description (plain text, sent as HTML) and an optional logo URL.
 * The description is a DS Textarea with a character counter (limit 2.000).
 */
export function AllianceForm({
  initial,
  submitLabel,
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: { name?: string; description?: string; logoUrl?: string };
  submitLabel: string;
  loading?: boolean;
  error?: string;
  onSubmit: (v: AllianceFormValue) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ? htmlToText(initial.description) : '');
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '');
  const valid = name.trim().length >= 3 && description.trim().length > 0 && (!logoUrl || /^https:\/\//.test(logoUrl));

  return (
    <form
      className="alliance-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ name: name.trim(), description: textToHtml(description.trim()), logoUrl: logoUrl.trim() || undefined });
      }}
    >
      <DS.Input label="Name" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} hint="Mindestens 3 Zeichen" />
      <DS.Textarea
        label="Beschreibung"
        rows={6}
        maxLength={2000}
        value={description}
        placeholder="Wofür steht eure Allianz? Wen sucht ihr?"
        onChange={(e) => setDescription(e.target.value)}
      />
      <DS.Input
        label="Logo-Adresse"
        optional
        value={logoUrl}
        placeholder="https://…"
        onChange={(e) => setLogoUrl(e.target.value)}
        error={logoUrl && !/^https:\/\//.test(logoUrl) ? 'Adresse muss mit https:// beginnen' : undefined}
      />
      {error && <DS.Banner variant="error">{error}</DS.Banner>}
      <div className="alliance-form__actions">
        <DS.Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Abbrechen
        </DS.Button>
        <DS.Button type="submit" variant="primary" disabled={!valid} loading={loading}>
          {submitLabel}
        </DS.Button>
      </div>
    </form>
  );
}
