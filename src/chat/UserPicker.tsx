import { useState } from 'react';
import { DS } from '../ds';
import { useUserSearch } from '../api/queries';
import type { UsernameView } from '../api/types';
import { useDebounced } from '../lib/useDebounced';

/** DS.UserPicker wired to the player search (GET /api/search/users/{namePart}). */
export function UserPicker({
  label,
  value,
  onChange,
  exclude = [],
}: {
  label: string;
  value: UsernameView[];
  onChange: (users: UsernameView[]) => void;
  exclude?: string[];
}) {
  const [q, setQ] = useState('');
  const search = useUserSearch(useDebounced(q, 250));
  const results = (search.data ?? [])
    .filter((u) => !u.myUser && u.id && u.username)
    .map((u) => ({ ...u, id: u.id!, username: u.username! }));
  return (
    <DS.UserPicker
      label={label}
      value={value.map((u) => ({ ...u, id: u.id!, username: u.username! }))}
      onChange={(users) => onChange(users as UsernameView[])}
      onSearch={setQ}
      results={results}
      loading={search.isFetching}
      exclude={exclude}
    />
  );
}
