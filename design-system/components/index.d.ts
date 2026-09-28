import type * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = Messing, höchstens einmal pro Bildschirm · secondary = umrandet (Standard) · ghost = nur Text · danger = destruktive Aktion */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** sm 28px · md 36px (Standard) · lg 44px (Touch, Order-Maske) */
  size?: 'sm' | 'md' | 'lg';
  /** zeigt einen Spinner, deaktiviert den Button und setzt aria-busy */
  loading?: boolean;
  /** Icon vor dem Label (dekorativ, aria-hidden) */
  iconStart?: React.ReactNode;
  /** Icon nach dem Label (dekorativ, aria-hidden) */
  iconEnd?: React.ReactNode;
  /** volle Breite des Containers */
  fullWidth?: boolean;
}
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

export interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** default = bg-card · reward = Messing-getönt, nur für Ränge, Erfolge, Belohnungen */
  variant?: 'default' | 'reward';
  /** kleine Rubrik über dem Titel, in Versalien */
  eyebrow?: React.ReactNode;
  /** Kartentitel in der Serifenschrift */
  title?: React.ReactNode;
  /** Überschriften-Ebene des Titels, Standard h3 */
  titleAs?: 'h2' | 'h3' | 'h4';
  /** eine Nebenaktion oben rechts, z. B. <Button variant="ghost" size="sm"> – entfällt bei klickbaren Karten */
  action?: React.ReactNode;
  /** Fußzeile, z. B. Stand/Quelle, in text-secondary */
  footer?: React.ReactNode;
  /** Inhalt ohne Innenabstand – für Listen (.bnk-list) und Tabellen */
  flush?: boolean;
  /** füllt die Grid-Zelle (height 100 %); der Inhalt scrollt in sich – für Seiten ohne Seiten-Scroll */
  fill?: boolean;
  /** macht die ganze Karte zum Link */
  href?: string;
  /** macht die ganze Karte klickbar (role=button, per Tastatur mit Enter/Leertaste bedienbar) */
  onClick?: React.MouseEventHandler;
  /** eigenes Element statt section / a / div */
  as?: keyof JSX.IntrinsicElements;
}
export declare const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLElement>>;

export interface PriceChangeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Veränderung in Prozent, z. B. 2.34 oder -0.62. Bestimmt Richtung, Pfeil, Vorzeichen und Farbe. */
  value: number;
  /** optional: absolute Veränderung, z. B. 1.12 → „▲ +1,12 € (+2,34 %)“ (Vorzeichen folgt value) */
  amount?: number;
  /** Währung für amount, Standard „€“ */
  currency?: string;
  /** Nachkommastellen der Prozentangabe, Standard 2 */
  decimals?: number;
  /** text = Kurszettel für Listen und Tabellen (Standard) · tag = Etikett für wichtige Einzelwerte */
  variant?: 'text' | 'tag';
  /** sm 12px · md 13px (Standard) · lg 15px (neben figure-lg) */
  size?: 'sm' | 'md' | 'lg';
  /** Zusatz nach dem Wert, z. B. „heute“ oder „seit Kauf“ */
  suffix?: string;
}
export declare const PriceChange: React.ForwardRefExoticComponent<PriceChangeProps & React.RefAttributes<HTMLSpanElement>>;

export interface SparklineProps {
  /** Kurse im Zeitraum, älteste zuerst (mind. 2 Werte) */
  data: number[];
  /** Bezugswert, z. B. Vortagesschluss – gestrichelte Linie; bestimmt die Richtung statt des ersten Werts */
  baseline?: number;
  /** Breite in px, Standard 80 */
  width?: number;
  /** Höhe in px, Standard 24 */
  height?: number;
  /** auto (Standard) = Farbe nach Richtung · neutral = text-secondary, z. B. für Indizes ohne Wertung */
  variant?: 'auto' | 'neutral';
  /** Richtung erzwingen, z. B. wenn sie von außen kommt */
  trend?: 'up' | 'down' | 'flat';
  /** Punkt am letzten Kurs (Standard true) */
  showEnd?: boolean;
  /** Name für die Beschreibung, z. B. „Hanse Reederei AG“ */
  label?: string;
  currency?: string;
  'aria-label'?: string;
  className?: string;
}
export declare const Sparkline: React.ForwardRefExoticComponent<SparklineProps & React.RefAttributes<SVGSVGElement>>;

export interface StockRowProps {
  /** Aktienname, in der Serifenschrift */
  name: React.ReactNode;
  /** Tickersymbol, in Versalien */
  ticker?: string;
  /** Zusatz neben dem Ticker, z. B. „12 Stk. · Ø 41,20 €“ */
  meta?: React.ReactNode;
  /** aktueller Kurs (Zahl wird formatiert, Text bleibt wie er ist) */
  price: number | string;
  /** Veränderung in Prozent (→ PriceChange als Kurszettel) */
  change: number;
  /** optional: Positionswert (Depot-Ansicht) – steht dann in der Zahlenspalte, der Kurs klein darunter */
  value?: number | string;
  /** Währung, Standard „€“ */
  currency?: string;
  /** ListingView.type – Anleihen/Repos werden in % notiert */
  listingType?: string;
  /** Kurzform: true = ab 1 Mio. · 'auto' = ab 1 Mrd. · Zahl = eigene Schwelle · false = nie */
  compact?: boolean | 'auto' | number;
  /** optional: Kurse für eine Sparkline zwischen Name und Kurs (64 × 22px) */
  spark?: number[];
  /** Bezugswert der Sparkline, z. B. Vortagesschluss */
  sparkBaseline?: number;
  /** ganze Zeile als Link */
  href?: string;
  /** ganze Zeile als Button */
  onClick?: React.MouseEventHandler;
  /** äußeres Element, Standard li (für .bnk-list) */
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}
export declare const StockRow: React.ForwardRefExoticComponent<StockRowProps & React.RefAttributes<HTMLElement>>;

interface FieldProps {
  /** Label über dem Feld (Versalien, text-secondary) – Pflicht, außer es gibt ein aria-label */
  label?: React.ReactNode;
  /** Hinweis unter dem Feld, z. B. „Aktueller Kurs 48,72 €“ */
  hint?: React.ReactNode;
  /** Fehlermeldung – ersetzt den Hinweis, färbt den Rahmen in loss, setzt aria-invalid */
  error?: React.ReactNode;
  /** zeigt „(optional)“ hinter dem Label */
  optional?: boolean;
  /** sm 28px · md 36px (Standard) · lg 44px (Order-Maske, Touch) */
  size?: 'sm' | 'md' | 'lg';
  /** volle Breite (Standard true) */
  fullWidth?: boolean;
}

export interface InputProps extends FieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /** Zahlenfeld: Monospace, rechtsbündig, inputMode="decimal". Werte im deutschen Format („1.234,50“). */
  numeric?: boolean;
  /** −/+ Knöpfe links und rechts; auch Pfeiltasten hoch/runter. Nutzt step, min, max. */
  stepper?: boolean;
  /** Text vor dem Wert, z. B. „≥“ */
  prefix?: React.ReactNode;
  /** Einheit hinter dem Wert, z. B. „€“ oder „Stk.“ */
  suffix?: React.ReactNode;
}
export declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;

export interface TextareaProps extends FieldProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Zeilen, Standard 4 (mindestens 88 px hoch, vom Nutzer vergrößerbar) */
  rows?: number;
  /** mit maxLength: Zeichenzähler „120 / 2.000“ – false blendet ihn aus */
  counter?: boolean;
}
export declare const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>;

export interface SelectOption { value: string; label: React.ReactNode; disabled?: boolean }
export interface SelectProps extends FieldProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Optionen – alternativ <option>-Kinder */
  options?: SelectOption[];
  /** nicht wählbarer Platzhalter, z. B. „Börse wählen“ */
  placeholder?: string;
}
export declare const Select: React.ForwardRefExoticComponent<SelectProps & React.RefAttributes<HTMLSelectElement>>;

export interface SegmentedControlProps {
  /** 2 bis 4 Optionen */
  options: SelectOption[];
  /** gewählter Wert (kontrolliert) */
  value?: string;
  /** Startwert (unkontrolliert), sonst die erste Option */
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  'aria-label'?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  id?: string;
  className?: string;
}
export declare const SegmentedControl: React.ForwardRefExoticComponent<SegmentedControlProps & React.RefAttributes<HTMLDivElement>>;

export interface DataTableColumn<Row = any> {
  /** Schlüssel im Zeilenobjekt (auch für Sortierung und Summenzeile) */
  key: string;
  /** Spaltenkopf, wird in Versalien gesetzt */
  label: React.ReactNode;
  /** stock = { name, ticker?, meta? } · currency · number · percent · change (PriceChange als Kurszettel) · sparkline (Zahlenreihe) · text (Standard) */
  type?: 'text' | 'stock' | 'currency' | 'price' | 'number' | 'percent' | 'change' | 'sparkline';
  /** bei type „price“: Wertpapierart (fest) oder Schlüssel der Zeile mit ListingView.type */
  listingType?: string;
  listingTypeKey?: string;
  /** bei currency/number: Kurzform, Standard true (ab 1 Mio.) */
  compact?: boolean | 'auto' | number;
  /** bei type „sparkline“: Schlüssel des Bezugswerts (z. B. Vortagesschluss) */
  baselineKey?: string;
  /** bei type „sparkline“: Breite in px, Standard 72 */
  sparkWidth?: number;
  /** Zahlen stehen automatisch rechts, Text links */
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  /** erste Sortierrichtung beim Klick; Standard: Zahlen absteigend, Text aufsteigend */
  defaultDir?: 'asc' | 'desc';
  /** Nachkommastellen für currency/number/percent */
  decimals?: number;
  /** Einheit hinter number, z. B. „Stk.“ oder „Mio. €“ */
  unit?: string;
  /** Währung für currency, Standard „€“ */
  currency?: string;
  /** bei type „change“: Schlüssel des absoluten Betrags → „▲ +1,12 € (+2,34 %)“ */
  amountKey?: string;
  /** fixiert die Spalte beim horizontalen Scrollen (sinnvoll für die erste) */
  sticky?: boolean;
  width?: string | number;
  /** Wert aus der Zeile holen, statt row[key] */
  accessor?: (row: Row) => any;
  /** eigener Sortierwert */
  sortValue?: (row: Row) => string | number;
  /** eigene Darstellung der Zelle */
  render?: (row: Row) => React.ReactNode;
  /** Handy (stack="auto"): 'title' = volle Breite oben (Standard: erste Spalte) · false = ausblenden */
  mobile?: 'title' | false;
  /** Handy: Beschriftung über dem Wert, wenn label kein Text ist (z. B. ein Term) */
  mobileLabel?: string;
  /** Handy: Zelle über zwei Spalten (lange Zahlen) */
  mobileWide?: boolean;
  /** Aktionsspalte (Menü, Knöpfe): auf dem Handy oben rechts in der Karte */
  action?: boolean;
}
export interface DataTableProps<Row = any> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  /** Schlüssel oder Funktion für stabile React-Keys, z. B. „ticker“ */
  rowKey?: string | ((row: Row) => string);
  /** Startsortierung (unkontrolliert) */
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  /** Sortierung (kontrolliert), z. B. für Sortierung auf dem Server */
  sort?: { key: string; dir: 'asc' | 'desc' } | null;
  onSortChange?: (sort: { key: string; dir: 'asc' | 'desc' }) => void;
  /** macht jede Zeile zum Link (die erste Zelle wird zum Link und deckt die Zeile ab) */
  getRowHref?: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /** Zeile hervorheben (brass-tint), z. B. der eigene Platz in der Rangliste */
  isRowHighlighted?: (row: Row) => boolean;
  /** Summenzeile: Werte je Spaltenschlüssel, in der ersten Spalte ein Label wie „Gesamt“ */
  summary?: Record<string, any>;
  /** md (Standard) · sm für dichte Listen */
  density?: 'md' | 'sm';
  /** unsichtbare Tabellenbeschriftung für Screenreader */
  caption?: string;
  /** Text, wenn rows leer ist */
  empty?: React.ReactNode;
  /** 'auto': unter 600 px Containerbreite wird jede Zeile zur Karte (Titel oben, Werte in drei Spalten, Sortier-Auswahl darüber) · 'never' (Standard): waagerecht scrollen */
  stack?: 'auto' | 'never';
  className?: string;
}
export declare const DataTable: React.ForwardRefExoticComponent<DataTableProps & React.RefAttributes<HTMLDivElement>>;

export interface NavItem {
  label: React.ReactNode;
  href?: string;
  /** aktuelle Seite: Messing-Linie, aria-current="page" */
  active?: boolean;
  /** kleine Zahl hinter dem Label, z. B. offene Orders */
  badge?: number | string;
  /** Unterpunkte: der Hauptbereich wird zum Ausklapper (Klick öffnet eine senkrechte Liste) */
  children?: NavItem[];
  /** nur für Unterpunkte: eine Zeile Erklärung unter dem Label */
  description?: React.ReactNode;
}
export interface AppHeaderProps {
  /** Tab-Leiste fürs Handy: unter 720 px ersetzt sie Navigation und Menü (BottomNav wird mitgerendert) */
  bottomNav?: BottomNavProps;
  /** Name des Spiels als Wortmarke in der Serifenschrift */
  brand: React.ReactNode;
  brandHref?: string;
  /** Zeile neben der Wortmarke, z. B. „Saison 3 · Mi., 23. Sept.“ */
  dateline?: React.ReactNode;
  /** Hauptnavigation, 4 bis 6 Einträge */
  items: NavItem[];
  /** rechte Seite, z. B. <HeaderStat> für Depotwert und Barmittel, Spieler-Menü */
  meta?: React.ReactNode;
  /** zusätzlicher Inhalt unten im mobilen Menü, z. B. dieselben Kennzahlen */
  menuFooter?: React.ReactNode;
  /** auto = Menü unter 720px Breite der Kopfleiste (Standard) · always · never */
  collapse?: 'auto' | 'always' | 'never';
  defaultMenuOpen?: boolean;
  /** Index des Hauptbereichs, dessen Ausklapper anfangs offen ist (für Vorschauen) */
  defaultOpenItem?: number;
  navLabel?: string;
  /** wird bei jedem Klick auf einen Eintrag aufgerufen (z. B. für Client-Routing) */
  onNavigate?: (item: NavItem, e: React.MouseEvent) => void;
  /** eigenes Link-Element (z. B. Router-Link): (item, props, children) => element */
  renderLink?: (item: NavItem, props: Record<string, any>, children: React.ReactNode) => React.ReactElement;
  id?: string;
  className?: string;
}
export declare const AppHeader: React.ForwardRefExoticComponent<AppHeaderProps & React.RefAttributes<HTMLElement>>;

export interface HeaderStatProps {
  /** z. B. „Depotwert“ */
  label: React.ReactNode;
  /** Zahl (wird ab 1 Mrd. gekürzt) oder fertiger Text */
  value: React.ReactNode | number;
  currency?: string;
  compact?: boolean | 'auto' | number;
  /** optional: Veränderung in Prozent, als Kurszettel neben dem Wert */
  change?: number;
}
export declare function HeaderStat(props: HeaderStatProps): React.ReactElement;

export interface TabItem {
  value: string;
  label: React.ReactNode;
  /** kleine Zahl hinter dem Label, z. B. Anzahl Nachrichten */
  count?: number | string;
  disabled?: boolean;
  /** Inhalt des Reiters – wenn gesetzt, rendert Tabs die Panels selbst */
  content?: React.ReactNode;
}
export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  'aria-label'?: string;
  /** md 44px (Standard) · sm 36px, z. B. in Karten */
  size?: 'md' | 'sm';
  id?: string;
  className?: string;
}
export declare const Tabs: React.ForwardRefExoticComponent<TabsProps & React.RefAttributes<HTMLDivElement>>;

export interface PlayerMenuItem {
  label?: React.ReactNode;
  href?: string;
  onClick?: React.MouseEventHandler;
  /** kleine Zahl, z. B. neue Erfolge */
  badge?: number | string;
  /** Trennlinie statt Eintrag */
  divider?: boolean;
}
export interface PlayerMenuProps {
  /** Spielername, in der Serifenschrift im Kopf des Menüs */
  name: React.ReactNode;
  /** Kürzel im Kreis; Standard: Anfangsbuchstaben aus name */
  initials?: string;
  /** Zeile unter dem Namen, z. B. „Liga Gold · Platz 3“ */
  subtitle?: React.ReactNode;
  /** Einträge; { divider: true } für eine Trennlinie */
  items: PlayerMenuItem[];
  /** dropdown (Standard) · inline = offen, z. B. als menuFooter im mobilen Menü */
  variant?: 'dropdown' | 'inline';
  defaultOpen?: boolean;
  onNavigate?: (item: PlayerMenuItem, e: React.MouseEvent) => void;
  id?: string;
  className?: string;
}
export declare const PlayerMenu: React.ForwardRefExoticComponent<PlayerMenuProps & React.RefAttributes<HTMLDivElement>>;

export interface RankBadgeProps {
  /** Highscore-Platz – steht als Zahl in der Medaille */
  rank?: number;
  /** Text neben der Medaille, z. B. „Buchwert“ (Highscore-Kategorie) oder ein Titel */
  label?: string;
  /** Zeichen in der Medaille, wenn kein rank gesetzt ist */
  symbol?: string;
  /** Text ausblenden, nur die Medaille zeigen */
  showLabel?: boolean;
  /** eigener Text neben der Medaille statt label */
  children?: React.ReactNode;
  /** Medaille sm 24px · md 30px (Standard) · lg 40px */
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  'aria-label'?: string;
  className?: string;
}
export declare const RankBadge: React.ForwardRefExoticComponent<RankBadgeProps & React.RefAttributes<HTMLSpanElement>>;

export interface ProgressBarProps {
  value: number;
  /** Standard 100 */
  max?: number;
  /** Label links oben, Versalien */
  label?: React.ReactNode;
  /** Einheit hinter „12.400 / 20.000“, z. B. „Pkt.“ */
  unit?: string;
  /** eigener Wert-Text rechts oben, z. B. „62 %“ */
  valueText?: React.ReactNode;
  /** Wert rechts oben anzeigen (Standard true) */
  showValue?: boolean;
  /** Zeile darunter, z. B. „Noch 7.600 Pkt. bis Liga Platin“ */
  hint?: React.ReactNode;
  /** reward = Messing (Ränge, Erfolge) · neutral = Textfarbe (alles andere) */
  variant?: 'reward' | 'neutral';
  /** sm 4px · md 6px (Standard) · lg 10px */
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
  id?: string;
  className?: string;
}
export declare const ProgressBar: React.ForwardRefExoticComponent<ProgressBarProps & React.RefAttributes<HTMLDivElement>>;

export interface AchievementProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** freigeschaltet: Messing-getönt, Medaille in Messing */
  unlocked?: boolean;
  /** Zeichen in der Medaille, Standard: erster Buchstabe des Titels (Serif) */
  symbol?: React.ReactNode;
  /** bei unlocked: Datum, z. B. „12.09.2026“ */
  date?: string;
  /** bei gesperrt: Fortschritt, z. B. { value: 3, max: 5, unit: 'Trades' } */
  progress?: { value: number; max: number; unit?: string };
  /** kleines „Neu“-Etikett, Messing umrandet */
  isNew?: boolean;
  className?: string;
}
export declare const Achievement: React.ForwardRefExoticComponent<AchievementProps & React.RefAttributes<HTMLDivElement>>;

export interface ToastProps {
  /** info (Standard, neutral) · reward (Messing-getönt, Erfolge/Ränge) · error (Verlustfarbe, nur Fehler) */
  variant?: 'info' | 'reward' | 'error';
  title?: React.ReactNode;
  /** Text; Zahlen darin mit <span className="num"> in Monospace setzen */
  children?: React.ReactNode;
  /** eine Aktion, z. B. <Button variant="ghost" size="sm">Order ansehen</Button> */
  action?: React.ReactNode;
  /** eigenes Zeichen statt ✓ / Medaille / ✕ */
  icon?: React.ReactNode;
  /** schließt nach n Millisekunden (ruft onClose) – nicht bei Fehlern verwenden */
  duration?: number;
  /** zeigt ✕ zum Schließen */
  onClose?: () => void;
  className?: string;
}
export declare const Toast: React.ForwardRefExoticComponent<ToastProps & React.RefAttributes<HTMLDivElement>>;
export declare function ToastRegion(props: { children?: React.ReactNode; inline?: boolean; className?: string }): React.ReactElement;

export interface DialogProps {
  open?: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  /** Rubrik über dem Titel, z. B. „Kauforder · Xetra“ */
  eyebrow?: React.ReactNode;
  /** Satz unter dem Titel */
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Knöpfe unten rechts: zuerst der Nebenknopf, zuletzt die Hauptaktion */
  actions?: React.ReactNode;
  /** sm 400px · md 520px (Standard) · lg 720px */
  size?: 'sm' | 'md' | 'lg';
  /** alertdialog für Rückfragen vor destruktiven Aktionen */
  role?: 'dialog' | 'alertdialog';
  /** false: kein ✕, Escape und Klick daneben schließen nicht (z. B. während eine Order gesendet wird) */
  dismissible?: boolean;
  /** Klick auf den abgedunkelten Hintergrund schließt (Standard true) */
  closeOnOverlay?: boolean;
  /** ohne Overlay im Seitenfluss rendern – nur für Vorschauen */
  inline?: boolean;
  id?: string;
  className?: string;
}
export declare const Dialog: React.ForwardRefExoticComponent<DialogProps & React.RefAttributes<HTMLDivElement>>;

export interface SummaryItem {
  label: React.ReactNode;
  /** Zahl wird als Betrag formatiert, Text bleibt wie er ist */
  value: React.ReactNode | number;
  /** Einheit statt Währung, z. B. „Stk.“ */
  unit?: string;
  currency?: string;
  decimals?: number;
  /** Summenzeile mit kräftiger Linie darüber */
  total?: boolean;
  /** Wert in text-secondary */
  muted?: boolean;
  /** Kurzform: true = ab 1 Mio. · 'auto' = ab 1 Mrd. · Zahl = eigene Schwelle · false = nie */
  compact?: boolean | 'auto' | number;
}
export declare function SummaryList(props: { items: SummaryItem[]; currency?: string; className?: string }): React.ReactElement;

export interface StockSearchResult {
  id?: string;
  name: string;
  ticker?: string;
  /** Zusatz, z. B. „Industrie · Xetra“ */
  meta?: React.ReactNode;
  price?: number;
  change?: number;
}
export interface StockSearchProps {
  /** Suchtext (kontrolliert) */
  value?: string;
  defaultValue?: string;
  /** bei jeder Eingabe – hier die Treffer laden */
  onChange?: (query: string) => void;
  /** Treffer zum aktuellen Suchtext */
  results: StockSearchResult[];
  onSelect?: (result: StockSearchResult) => void;
  loading?: boolean;
  placeholder?: string;
  /** Text, wenn nichts gefunden wurde */
  emptyText?: React.ReactNode;
  /** Taste, die die Suche von überall fokussiert, z. B. „/“ */
  shortcut?: string;
  /** Zeile unter den Treffern, z. B. „Enter öffnet · ↑↓ wählen“ */
  footer?: React.ReactNode;
  label?: React.ReactNode;
  'aria-label'?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Seite, an der die Trefferliste bündig steht: start (Standard) wächst nach rechts, end nach links – für Felder am rechten Rand wie in der Kopfleiste */
  align?: 'start' | 'end';
  currency?: string;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
}
export declare const StockSearch: React.ForwardRefExoticComponent<StockSearchProps & React.RefAttributes<HTMLInputElement>>;

export interface StatusLabelProps {
  /** open ○ · pending ◌ · partial ◐ · filled ● · cancelled – · expired □ · rejected × (Verlustfarbe) */
  status: 'open' | 'pending' | 'partial' | 'filled' | 'cancelled' | 'expired' | 'rejected';
  /** eigener Text statt des Standards („Offen“, „Ausgeführt“ …) */
  children?: React.ReactNode;
  className?: string;
}
export declare function StatusLabel(props: StatusLabelProps): React.ReactElement;

export interface BannerProps {
  /** info (Standard) · reward (Messing-getönt, Belohnungen) · error (Verlustfarbe, nur Fehler) */
  variant?: 'info' | 'reward' | 'error';
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** eine Aktion rechts, z. B. <Button size="sm"> */
  action?: React.ReactNode;
  icon?: React.ReactNode;
  /** zeigt ✕ – nur für Hinweise, die man wirklich wegklicken darf */
  onClose?: () => void;
  className?: string;
}
export declare function Banner(props: BannerProps): React.ReactElement;

export interface StatTileProps {
  /** Label in Versalien, z. B. „Depotwert“ */
  label: React.ReactNode;
  /** Zahl wird formatiert (Betrag oder mit unit), Text bleibt wie er ist */
  value: React.ReactNode | number;
  currency?: string;
  /** Einheit statt Währung, z. B. „Pkt.“ oder „%“ */
  unit?: string;
  decimals?: number;
  /** Vorzeichen am Wert zeigen (für Gewinn/Verlust-Beträge); die Farbe kommt nur von change */
  signed?: boolean;
  /** Veränderung in Prozent → PriceChange */
  change?: number;
  /** absoluter Betrag zur Veränderung */
  changeAmount?: number;
  /** z. B. „heute“ */
  changeSuffix?: string;
  /** Standard: tag bei lead, sonst text */
  changeVariant?: 'text' | 'tag';
  /** Kurse für eine Sparkline unter dem Wert */
  spark?: number[];
  sparkBaseline?: number;
  sparkWidth?: number;
  /** Zeile darunter in text-secondary; Zahlen mit <span className="num"> */
  hint?: React.ReactNode;
  /** Hauptkennzahl: 28px, Veränderung als Etikett, größere Sparkline – höchstens eine pro Bereich */
  lead?: boolean;
  /** Kurzform, Standard 'auto' (ab 1 Mrd.) */
  compact?: boolean | 'auto' | number;
  className?: string;
}
export declare function StatTile(props: StatTileProps): React.ReactElement;
export declare function StatGroup(props: { children?: React.ReactNode; /** CSS grid-template-columns, z. B. „2fr 1fr 1fr 1fr“ */ columns?: string; 'aria-label'?: string; className?: string }): React.ReactElement;

export interface PageHeaderProps {
  /** Seitentitel in der Serifenschrift, mit 2px-Messing-Linie darunter */
  title: React.ReactNode;
  /** Rubrik darüber, z. B. „Markt · Aktien“ (auch mit Links) */
  eyebrow?: React.ReactNode;
  /** Unterzeile in Versalien, z. B. „HRD · Xetra · Logistik“ */
  meta?: React.ReactNode;
  /** ein bis zwei Sätze Erklärung */
  description?: React.ReactNode;
  /** rechts neben dem Titel, z. B. Kurs und PriceChange */
  aside?: React.ReactNode;
  /** Knöpfe rechts; höchstens einer primary */
  actions?: React.ReactNode;
  /** Reiter unter dem Kopf, z. B. <Tabs> */
  tabs?: React.ReactNode;
  /** lg = 40px (Standard, Hauptseiten) · md = 28px (Unterseiten) */
  size?: 'lg' | 'md';
  /** Überschriften-Ebene, Standard h1 */
  as?: 'h1' | 'h2';
  className?: string;
}
export declare function PageHeader(props: PageHeaderProps): React.ReactElement;

export interface ChatAuthor { name: string; initials?: string; /** z. B. <RankBadge rank={3} size="sm" /> neben dem Namen */ badge?: React.ReactNode }
export interface TradeShareProps {
  side: 'buy' | 'sell';
  name: string;
  ticker: string;
  qty: number;
  price: number;
  /** z. B. „ausgeführt“ */
  status?: string;
  /** Kursveränderung seit dem Trade in Prozent */
  change?: number;
  changeSuffix?: string;
  currency?: string;
}
export declare function TradeShare(props: TradeShareProps): React.ReactElement;
export declare function TickerMention(props: { ticker: string; info?: { name?: string; change?: number; href?: string } }): React.ReactElement;
export declare function Avatar(props: { name?: string; initials?: string; size?: number; group?: boolean; className?: string }): React.ReactElement;

export interface ChatMessage {
  id?: string;
  /** eigene Nachricht: rechts, ohne Namen */
  own?: boolean;
  author?: ChatAuthor;
  /** Text; „$HRD“ wird zur Ticker-Erwähnung */
  text?: string;
  /** geteilter Trade als Anhang */
  trade?: TradeShareProps;
  /** Uhrzeit, z. B. „17:42“ */
  time?: string;
  /** nur eigene: „Gesendet“, „Gelesen“ */
  status?: string;
  /** Tagestrenner statt Nachricht, z. B. „Heute“ */
  day?: string;
  /** Systemzeile statt Nachricht, z. B. „Anleger Paul ist der Liga beigetreten.“ */
  system?: string;
}
export interface ChatThreadProps {
  messages: ChatMessage[];
  /** Infos zu Tickern für $-Erwähnungen: { HRD: { name, change, href } } */
  tickers?: Record<string, { name?: string; change?: number; href?: string }>;
  /** Namen über fremden Nachrichten (Standard true; in Direktnachrichten false) */
  showNames?: boolean;
  /** z. B. „Frieda schreibt …“ */
  typing?: React.ReactNode;
  /** beim Hinzufügen neuer Nachrichten nach unten scrollen (Standard true) */
  autoScroll?: boolean;
  'aria-label'?: string;
  className?: string;
}
export declare const ChatThread: React.ForwardRefExoticComponent<ChatThreadProps & React.RefAttributes<HTMLDivElement>>;

export interface ChatComposerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Enter oder Klick auf Senden; der Text ist schon getrimmt */
  onSend?: (text: string) => void;
  placeholder?: string;
  /** Zeile unter dem Feld, Standard „Enter senden · Umschalt+Enter neue Zeile“ */
  hint?: React.ReactNode;
  /** Standard 500; ab 50 verbleibenden Zeichen erscheint ein Zähler */
  maxLength?: number;
  /** Knöpfe links im Feld, z. B. <Button variant="ghost" size="sm">Trade teilen</Button> */
  actions?: React.ReactNode;
  /** Standard primary; secondary, wenn der Bildschirm schon eine Messing-Aktion hat */
  sendVariant?: 'primary' | 'secondary';
  sendLabel?: string;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
}
export declare const ChatComposer: React.ForwardRefExoticComponent<ChatComposerProps & React.RefAttributes<HTMLTextAreaElement>>;

export interface Conversation {
  id?: string;
  /** direct (Standard, runder Kreis) · group (Liga, Freunde: eckig mit #) · market (Marktplatz: eckig mit №) */
  /** direct (Standard) · group (groupChat, Allianz) · public (publicChat, Lobby) */
  kind?: 'direct' | 'group' | 'public' | 'market';
  name: string;
  initials?: string;
  preview?: React.ReactNode;
  time?: string;
  unread?: number;
  online?: boolean;
  active?: boolean;
  href?: string;
}
export interface ConversationListProps {
  /** Abschnitte, z. B. [{ label: 'Direkt', items }, { label: 'Gruppen', items }, { label: 'Marktplatz', items }] */
  groups?: { label?: React.ReactNode; items: Conversation[] }[];
  items?: Conversation[];
  onSelect?: (c: Conversation) => void;
  'aria-label'?: string;
  className?: string;
}
export declare function ConversationList(props: ConversationListProps): React.ReactElement;

/** UsernameView (GET /api/search/users/{namePart}) – die genutzten Felder */
export interface PickedUser { id: string; username: string; /** Zusatz rechts im Treffer, z. B. „online“ */ meta?: React.ReactNode }
export interface UserPickerProps {
  label?: React.ReactNode;
  /** gewählte Spieler (kontrolliert) */
  value: PickedUser[];
  onChange?: (users: PickedUser[]) => void;
  /** Suchtext bei jeder Eingabe – der Aufrufer lädt die Treffer */
  onSearch?: (query: string) => void;
  /** Treffer zum aktuellen Suchtext; Gewählte und exclude werden ausgeblendet */
  results?: PickedUser[];
  loading?: boolean;
  /** Namen, die nicht wählbar sind (z. B. schon Mitglied) */
  exclude?: string[];
  /** Standard 2 */
  minChars?: number;
  /** höchstens so viele Treffer in der Liste (nicht: gewählte Spieler), Standard 8 */
  max?: number;
  placeholder?: string; hint?: React.ReactNode; emptyText?: React.ReactNode; id?: string; className?: string;
}
export declare function UserPicker(props: UserPickerProps): React.ReactElement;

export interface ChatWindowProps {
  title: React.ReactNode;
  /** z. B. „12 Mitglieder · 4 online“ */
  subtitle?: React.ReactNode;
  /** Knöpfe im Kopf, z. B. Mitglieder, Stummschalten */
  actions?: React.ReactNode;
  /** <ConversationList> links; unter 720px Breite ausgeblendet */
  list?: React.ReactNode;
  /** unter 720px: Liste statt Verlauf zeigen */
  mobileShowList?: boolean;
  /** unter 720px: Zurück-Knopf zur Liste */
  onBack?: () => void;
  /** Hinweis über dem Verlauf, z. B. <Banner> mit Marktplatz-Regeln */
  notice?: React.ReactNode;
  /** der Verlauf, meist <ChatThread> */
  children?: React.ReactNode;
  /** die Eingabe, meist <ChatComposer> */
  composer?: React.ReactNode;
  /** Höhe, Standard 560px */
  height?: number | string;
  className?: string;
}
export declare function ChatWindow(props: ChatWindowProps): React.ReactElement;

type TickerInfo = { name?: string; change?: number; href?: string };

export interface StockEmbedProps { name: string; ticker: string; price: number; change?: number; spark?: number[]; period?: string; href?: string; currency?: string }
export declare function StockEmbed(props: StockEmbedProps): React.ReactElement;
/** Beitragstext mit **fett**, *kursiv*, > Zitat, - Liste und $TICKER */
export declare function ForumText(props: { text: string; tickers?: Record<string, TickerInfo>; className?: string }): React.ReactElement;
export interface HelpfulButtonProps { count?: number; active?: boolean; defaultActive?: boolean; onToggle?: (active: boolean) => void; disabled?: boolean }
export declare function HelpfulButton(props: HelpfulButtonProps): React.ReactElement;

export interface ForumCategory {
  id?: string; name: string; initials?: string; description?: React.ReactNode; href?: string;
  threads?: number; posts?: number;
  /** true = „Neu“, Zahl = „12 neu“ */
  unread?: boolean | number;
  last?: { title: string; href?: string; author?: string; time?: string };
}
export interface ForumCategoryListProps { categories: ForumCategory[]; onSelect?: (c: ForumCategory, e: React.MouseEvent) => void; label?: string; 'aria-label'?: string; className?: string }
export declare function ForumCategoryList(props: ForumCategoryListProps): React.ReactElement;

export interface ForumThreadItem {
  id?: string | number; title: string; href?: string;
  author: { name: string } | string; time?: string;
  /** Ticker ohne $, z. B. ['HRD','NBH'] (höchstens 3) */
  tickers?: string[];
  replies?: number; views?: number;
  pinned?: boolean; locked?: boolean;
  unread?: boolean | number;
  last?: { author: string; time?: string };
}
export interface ThreadListProps { threads: ForumThreadItem[]; tickers?: Record<string, TickerInfo>; onSelect?: (t: ForumThreadItem, e: React.MouseEvent) => void; emptyText?: React.ReactNode; 'aria-label'?: string; className?: string }
export declare function ThreadList(props: ThreadListProps): React.ReactElement;

export interface ForumPostProps {
  id?: string;
  author: { name: string; initials?: string; rank?: number; alliance?: string; posts?: number; role?: string; href?: string };
  /** Beitragsnummer, erscheint als #12 */
  number?: number;
  permalink?: string;
  time?: string;
  /** „um 11:12“ → „Bearbeitet um 11:12“ */
  edited?: string;
  /** Themenstarter: Kennzeichen und etwas größerer Text */
  op?: boolean;
  /** Text mit Forum-Formatierung; alternativ children */
  text?: string;
  children?: React.ReactNode;
  tickers?: Record<string, TickerInfo>;
  quote?: { author?: string; number?: number; text: string };
  stocks?: StockEmbedProps[];
  trade?: TradeShareProps;
  helpful?: HelpfulButtonProps;
  onQuote?: () => void;
  onReply?: () => void;
  /** weitere Aktionen im Fuß; false blendet den Fuß aus */
  actions?: React.ReactNode | false;
  className?: string;
}
export declare const ForumPost: React.ForwardRefExoticComponent<ForumPostProps & React.RefAttributes<HTMLElement>>;

export interface PaginationProps { page: number; pages: number; onChange?: (page: number) => void; hrefFor?: (page: number) => string; total?: React.ReactNode; 'aria-label'?: string; className?: string }
export declare function Pagination(props: PaginationProps): React.ReactElement;

export interface ForumThreadProps {
  title: React.ReactNode; eyebrow?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode;
  as?: 'h1' | 'h2';
  notice?: React.ReactNode;
  /** <Pagination>, erscheint über und unter den Beiträgen */
  pagination?: React.ReactNode;
  /** <ForumEditor mode="reply"> am Ende */
  reply?: React.ReactNode;
  /** geschlossen: Hinweis statt Antwortfeld; Text optional */
  locked?: boolean | string;
  /** die <ForumPost>-Beiträge */
  children?: React.ReactNode;
  className?: string;
}
export declare function ForumThread(props: ForumThreadProps): React.ReactElement;

export interface ForumEditorProps {
  mode?: 'thread' | 'reply';
  heading?: React.ReactNode;
  categories?: { value: string; label: string }[];
  defaultCategory?: string; defaultTitle?: string; defaultValue?: string;
  defaultTab?: 'write' | 'preview';
  tickers?: Record<string, TickerInfo>;
  placeholder?: string; titlePlaceholder?: string; hint?: React.ReactNode;
  maxTitle?: number; maxLength?: number; rows?: number;
  submitLabel?: string; submitVariant?: 'primary' | 'secondary'; cancelLabel?: string;
  loading?: boolean; disabled?: boolean;
  onSubmit?: (v: { title: string; category: string; body: string }) => void;
  onCancel?: () => void;
  id?: string; className?: string;
}
export interface ForumEditorHandle { focus(): void; insertQuote(author: string, text: string): void }
export declare const ForumEditor: React.ForwardRefExoticComponent<ForumEditorProps & React.RefAttributes<ForumEditorHandle>>;

type ListingType = 'STOCK' | 'BOND' | 'INTEREST_TENDER_BOND' | 'REPO' | 'SYSTEM_BOND' | 'SYSTEM_REPO' | 'COIN' | 'INDEX' | 'ETF' | 'WARRANT' | 'BUILDING' | 'OTHER';
/** ListingView der API */
export interface Listing { securityIdentifier: string; name: string; type?: ListingType; startDate?: number; endDate?: number }
/** PriceSpreadView der API */
export interface PriceSpread { bidPrice?: number; bidSize?: number; askPrice?: number; askSize?: number; spreadAbs?: number; spreadPercent?: number; lastPrice?: { value: number; date?: number } | number; minAskPrice?: number; maxBidPrice?: number; date?: number }
/** Query-Parameter für POST /securityorders */
export interface SecurityOrderParams {
  owner: string; securityIdentifier: string; action: 'BUY' | 'SELL'; type: 'MARKET' | 'LIMIT';
  /** Limit als String mit Punkt */
  price?: string; numberOfShares: number; hourlyChange?: string;
  /** Epoch-Millisekunden (Goldzugang) */
  goodAfterDate?: number; goodTillDate?: number;
  counterparty?: string; checkOrderOnly?: boolean;
}
/** OrderCheck der API */
export interface OrderCheck {
  executionPrice?: number; executionVolume?: number; numberOfShares?: number; uncommittedCash?: number; spread?: PriceSpread;
  checkResult?: { ok?: boolean; failed?: boolean; msg?: { message?: string; filledString?: string; substitutions?: string[] } | string;
    concerningParams?: Array<'OWNER' | 'LISTING' | 'NUMBER_OF_SHARES' | 'PRICE' | 'TYPE' | 'ACTION' | 'HOURLY_CHANGE' | 'GOOD_AFTER_DATE' | 'GOOD_TILL_DATE'> };
}
export interface OrderAccount { id: string; name: string; privateAccount?: boolean; cash?: number }
export interface OrderTicketProps {
  listing: Listing;
  spread?: PriceSpread;
  /** Tagesveränderung in % für den Kopf */
  change?: number; changeSuffix?: string;
  /** Wertpapierkonten: privat und AGs, deren CEO man ist; wird zu owner */
  accounts: OrderAccount[];
  defaultAccountId?: string; accountId?: string; onAccountChange?: (id: string) => void;
  /** Bargeld, falls accounts keinen cash-Wert tragen */
  cash?: number;
  /** SharePositionView des gewählten Kontos */
  position?: { numberOfShares: number; averageBuyingPrice?: number };
  /** Nennwert je Anteil bei Anleihen (Kurs in %) */
  faceValue?: number;
  /** feste Aktion, blendet den Umschalter aus */
  action?: 'BUY' | 'SELL';
  defaultAction?: 'BUY' | 'SELL'; defaultType?: 'MARKET' | 'LIMIT'; defaultShares?: number; defaultPrice?: number;
  /** Goldzugang: schaltet Gültig ab / bis frei */
  premium?: boolean;
  /** Suchfeld, wenn noch kein Wertpapier gewählt ist (z. B. <StockSearch>) */
  listingPicker?: React.ReactNode;
  /** Prüfung über die API (checkOrderOnly=true) */
  onCheck?: (params: SecurityOrderParams) => Promise<OrderCheck> | OrderCheck;
  /** Prüfergebnis von außen setzen */
  check?: OrderCheck | null;
  /** false: ohne Prüfschritt direkt absenden */
  confirm?: boolean;
  submitVariant?: 'primary' | 'secondary';
  loading?: boolean; disabled?: boolean; currency?: string;
  onSubmit?: (params: SecurityOrderParams) => void;
  className?: string;
}
export declare const OrderTicket: React.ForwardRefExoticComponent<OrderTicketProps & React.RefAttributes<{ reset(): void }>>;

export type HighscoreType = 'BOOK_VALUE' | 'NET_CASH' | 'RESERVES' | 'CASH_FLOW' | 'TRADES' | 'ACHIEVEMENTS' | 'BUILDING' | 'MINER' | 'CHAT_MESSAGES' | 'ONLINE_TIME';
/** UserHighscoreEntryView / CompanyHighscoreEntryView / AllianceHighscoreEntryView */
export interface HighscoreEntry {
  user?: { id: string; username: string; myUser?: boolean; userCapabilities?: { achievementCount?: number; achievementTotal?: number } };
  company?: { id: string; name: string; securityIdentifier?: string; logoUrl?: string };
  alliance?: { id: string; name: string; logoUrl?: string };
  value: number; historyPosition?: number; historyValue?: number; date?: string;
  /** Platz, falls bekannt; sonst offset + Position */
  rank?: number;
}
export interface HighscoreTableProps {
  kind?: 'user' | 'company' | 'alliance';
  type: HighscoreType;
  entries: HighscoreEntry[];
  /** Platz des ersten Eintrags − 1 (Seite × Größe) */
  offset?: number;
  /** eigener Eintrag (bei Nutzern reicht myUser) */
  ownId?: string;
  hrefFor?: (entity: any, kind: 'user' | 'company' | 'alliance') => string;
  valueLabel?: string; emptyText?: React.ReactNode; 'aria-label'?: string; className?: string;
}
export declare function HighscoreTable(props: HighscoreTableProps): React.ReactElement;
export declare const HIGHSCORE_TYPES: Record<HighscoreType, { label: string; description: string; format: 'money' | 'count' | 'percent' | 'coins' | 'minutes'; signed?: boolean }>;
export declare const LISTING_TYPES: Record<ListingType, string>;

/** PostView der API */
export interface Post {
  id: string; title: string; content?: string; locale?: string;
  author?: { username: string }; company?: { name: string; securityIdentifier?: string }; alliance?: { name: string };
  listing?: Listing; hashTags?: Array<{ tag: string }>;
  numberOfLikes?: number; numberOfDislikes?: number; numberOfComments?: number;
  dateCreated?: number; dateEdited?: number;
}
export type Reaction = 'LIKE' | 'DISLIKE' | null;
export interface NewsItemProps {
  post: Post; variant?: 'lead' | 'default' | 'brief'; href?: string; onOpen?: (e: React.MouseEvent) => void;
  myReaction?: Reaction; onReact?: (post: Post, type: Reaction) => void; onComments?: (post: Post) => void;
  tagHref?: (tag: string) => string; tickerInfo?: Record<string, TickerInfo>; rubric?: string; as?: 'h2' | 'h3' | 'h4'; className?: string;
  /** Autor als Link, z. B. auf die gefilterte Zeitung */
  authorHref?: (author: string, post: Post) => string;
  /** Herausgeber (Unternehmen/Allianz) als Link */
  publisherHref?: (post: Post) => string | undefined;
}
export declare function NewsItem(props: NewsItemProps): React.ReactElement;
export interface NewsFeedProps {
  title?: React.ReactNode; action?: React.ReactNode; lead?: Post; items: Post[]; variant?: 'default' | 'brief';
  /** eigene Bewertungen je postId */
  reactions?: Record<string, Reaction>;
  onReact?: (post: Post, type: Reaction) => void; onComments?: (post: Post) => void;
  hrefFor?: (post: Post) => string; tagHref?: (tag: string) => string; tickerInfo?: Record<string, TickerInfo>; footer?: React.ReactNode; className?: string;
  authorHref?: (author: string, post: Post) => string; publisherHref?: (post: Post) => string | undefined;
}
export declare function NewsFeed(props: NewsFeedProps): React.ReactElement;
export declare function ReactionBar(props: { likes?: number; dislikes?: number; comments?: number; myReaction?: Reaction; onReact?: (type: Reaction) => void; onComments?: () => void; disabled?: boolean; className?: string }): React.ReactElement;

export interface AmountProps { value: number; currency?: string; decimals?: number; unit?: string; signed?: boolean; compact?: boolean | 'auto' | number; className?: string }
/** Betrag; ab der Schwelle in Kurzform (Mio., Mrd., Bio., Brd.), voller Wert im Tooltip */
export declare function Amount(props: AmountProps): React.ReactElement;
export declare const format: {
  money(n: number, currency?: string, decimals?: number, compact?: boolean | 'auto' | number): string;
  /** Kurs je Wertpapierart: Anleihen/Repos in %, sonst € */
  price(n: number, listingType?: string, currency?: string): string;
  /** 24.9.2026, 06:47 */
  dateTime(ms: number, withTime?: boolean): string;
  /** „3,04 Brd.“ oder null unter der Schwelle */
  compact(n: number, threshold?: number): string | null;
};

export interface CountdownProps { to: Date | number; label?: string; variant?: 'inline' | 'tile'; short?: boolean; hint?: React.ReactNode; endedText?: string; onEnd?: () => void; interval?: number; className?: string }
export declare function Countdown(props: CountdownProps): React.ReactElement;

export interface SecurityFact { label: React.ReactNode; value: React.ReactNode | number; sub?: React.ReactNode; currency?: string; unit?: string; decimals?: number; compact?: boolean | 'auto' | number }
export interface SecurityHeaderProps {
  listing: Listing;
  spread?: PriceSpread;
  /** CompactCompanyView bei Aktien: logoUrl, achievementCount/Total */
  company?: { name?: string; logoUrl?: string; achievementCount?: number; achievementTotal?: number; ceo?: { username: string } } | null;
  change?: number; changeAmount?: number; changeSuffix?: string;
  /** höchstens fünf Eckdaten */
  facts?: SecurityFact[];
  onBuy?: (askPrice?: number) => void;
  onSell?: (bidPrice?: number) => void;
  actions?: React.ReactNode;
  /** z. B. <Banner> für laufende Kapitalmaßnahmen */
  notice?: React.ReactNode;
  tabs?: React.ReactNode;
  as?: 'h1' | 'h2';
  /** Kompakt für Ein-Bildschirm-Seiten: weniger Abstand oben, Kurszeile und Eckdaten in einer Zeile, ohne Spread */
  compact?: boolean;
  currency?: string; className?: string;
}
export declare function SecurityHeader(props: SecurityHeaderProps): React.ReactElement;

export interface OrderBookLevel { price: number; numberOfShares: number; marketMaker?: boolean; own?: boolean }
export interface OrderBookProps {
  listing?: Listing;
  /** Antwort von GET /orderbook/{asin} */
  orderbook?: { sellEntries?: Array<{ priceLimit: number; size: number }>; buyEntries?: Array<{ priceLimit: number; size: number }>; maxSellSize?: number; maxBuySize?: number };
  /** alternativ: Verkaufsangebote (Brief) */
  asks?: OrderBookLevel[];
  /** alternativ: Kaufgesuche (Geld) */
  bids?: OrderBookLevel[];
  lastPrice?: number;
  /** Stufen je Seite vor „Alle Stufen zeigen“, Standard 8 */
  depth?: number;
  onSelect?: (sel: { side: 'BUY' | 'SELL'; price: number; numberOfShares: number }) => void;
  currency?: string; 'aria-label'?: string; className?: string;
}
export declare function OrderBook(props: OrderBookProps): React.ReactElement;

/** AbstractPollView plus die Felder der Unterklassen */
export interface Poll {
  id: string; type?: 'YES_NO'; motion?: string; startDate?: number; endDate?: number; resultExpireDate?: number;
  pollInitiator?: { username: string }; applicant?: { username: string };
  company?: { id?: string; name: string; securityIdentifier?: string }; acquiringCompany?: { name: string; securityIdentifier?: string };
  group?: Array<{ groupMember: { username: string; myUser?: boolean }; numberOfVoices: number }>;
  votes?: Array<{ type: 'YES' | 'NO'; voices: number; voter: { username: string; myUser?: boolean } }>;
  totalNumberOfVoices?: number; totalNumberOfCastVotes?: number; castVotesPercentage?: number; approvalVotesPercentage?: number;
  abstentionRule?: 'COUNTS_AS_APPROVAL' | 'COUNTS_AS_REFUSAL';
  capitalIncreaseType?: 'WITH_SUBSCRIPTION_RIGHTS' | 'WITHOUT_SUBSCRIPTION_RIGHTS'; subscriptionFraction?: number;
  price?: number; numberOfShares?: number; minimalCashVolume?: number; maximalCashVolume?: number; dailyWage?: number; name?: string;
  /** vom Aufrufer gesetzt */
  harmless?: boolean;
  kind?: 'CAPITAL_INCREASE' | 'CAPITAL_REDUCTION' | 'DIVIDEND_PAYMENT' | 'MERGER' | 'CHANGE_NAME' | 'CASH_OUT' | 'LIQUIDATION' | 'EMPLOY_CEO' | 'OTHER';
}
export interface PollCardProps {
  poll: Poll; title?: React.ReactNode; showMotion?: boolean; threshold?: number; now?: number; currency?: string;
  onVote?: (poll: Poll, type: 'YES' | 'NO', voices: number) => void;
  onExecute?: (poll: Poll) => void; onDelete?: (poll: Poll) => void;
  hrefFor?: (entity: any, kind: 'company' | 'user') => string | null; className?: string;
}
export declare function PollCard(props: PollCardProps): React.ReactElement;
export declare function VoteBar(props: { tally: { yes: number; no: number; open: number; total: number }; threshold?: number }): React.ReactElement;
export interface PollListProps {
  polls: Poll[];
  filter?: 'NOT_VOTED' | 'PARTIALLY_VOTED' | 'VOTED' | 'INITIATED'; defaultFilter?: PollListProps['filter'];
  onFilterChange?: (f: NonNullable<PollListProps['filter']>) => void;
  counts?: Partial<Record<NonNullable<PollListProps['filter']>, number>>;
  onVote?: PollCardProps['onVote']; onVoteAll?: (type: 'YES' | 'NO', onlyHarmless: boolean) => void;
  onExecute?: PollCardProps['onExecute']; onDelete?: PollCardProps['onDelete']; hrefFor?: PollCardProps['hrefFor'];
  cardProps?: Partial<PollCardProps>; emptyText?: React.ReactNode; className?: string;
}
export declare function PollList(props: PollListProps): React.ReactElement;
export declare const POLL_KINDS: Record<NonNullable<Poll['kind']>, string>;

export type CorporateAction = 'CAPITAL_INCREASE' | 'CAPITAL_REDUCTION' | 'DIVIDEND_PAYMENT' | 'MERGER' | 'CHANGE_NAME' | 'CASH_OUT' | 'LIQUIDATION';
export interface CorporateActionFormProps {
  company: { id: string; name: string; securityIdentifier?: string };
  defaultAction?: CorporateAction; lastPrice?: number; outstandingShares?: number;
  /** Bargeld der AG */
  cash?: number;
  /** Auswahl der übernehmenden AG, z. B. <StockSearch>; sonst Textfeld */
  acquiringPicker?: React.ReactNode; acquiringCompanyId?: string;
  heading?: React.ReactNode | false; submitVariant?: 'primary' | 'secondary'; loading?: boolean; currency?: string;
  onSubmit?: (req: { action: CorporateAction; endpoint: string; params: Record<string, string | number> }) => void;
  onCancel?: () => void; className?: string;
}
export declare const CorporateActionForm: React.ForwardRefExoticComponent<CorporateActionFormProps & React.RefAttributes<HTMLFormElement>>;
export declare const CORPORATE_ACTIONS: Array<{ value: CorporateAction; label: string; endpoint: string }>;
export interface CompanyFoundingFormProps {
  /** Bargeld des Spielers */
  cash?: number; minDeposit?: number;
  /** Goldzugang: eigene ASIN und Anteilszahl */
  premium?: boolean;
  onSubmit?: (params: { name: string; cashDeposit: string; customAsin?: string; customNumberOfShares?: number }) => void;
  onCancel?: () => void; heading?: React.ReactNode; submitVariant?: 'primary' | 'secondary'; loading?: boolean; currency?: string; className?: string;
}
export declare function CompanyFoundingForm(props: CompanyFoundingFormProps): React.ReactElement;

/* ---------- Grundbausteine ---------- */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** halb angekreuzt, z. B. „Alle“ wenn nur einige Unterpunkte gewählt sind */
  indeterminate?: boolean;
}
export declare const Checkbox: React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLInputElement>>;

export interface SwitchProps {
  label: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  /** wirkt sofort – kein Speichern-Knopf nötig */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  hint?: React.ReactNode;
  /** Zustand als Wort rechts; Standard true */
  showState?: boolean;
  onText?: string;
  offText?: string;
  id?: string;
  className?: string;
}
export declare const Switch: React.ForwardRefExoticComponent<SwitchProps & React.RefAttributes<HTMLButtonElement>>;

export interface RadioOption { value: string; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean; }
export interface RadioGroupProps {
  label?: React.ReactNode;
  options: RadioOption[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  name?: string;
  /** Optionen nebeneinander (nur für kurze Beschriftungen) */
  inline?: boolean;
  disabled?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
}
export declare function RadioGroup(props: RadioGroupProps): React.ReactElement;

export interface TooltipProps {
  /** genau ein fokussierbares Element */
  children: React.ReactElement;
  content: React.ReactNode;
  title?: React.ReactNode;
  /** ohne Angabe: oben, bei wenig Platz unten */
  placement?: 'top' | 'bottom';
  /** Verzögerung in ms, Standard 250 */
  delay?: number;
  width?: number | string;
  defaultOpen?: boolean;
  /** Blase nur fürs Auge: kein role=tooltip/aria-describedby, wenn der Auslöser den Text schon für Screenreader enthält (so bei Amount) */
  decorative?: boolean;
  id?: string;
  className?: string;
}
export declare function Tooltip(props: TooltipProps): React.ReactElement;

export type GlossaryKey = 'ASIN' | 'SPREAD' | 'BID' | 'ASK' | 'MARKET' | 'LIMIT' | 'OTC' | 'BOOK_VALUE' | 'NET_CASH' | 'CASH_FLOW' | 'RESERVES' | 'REPO' | 'SUBSCRIPTION_RIGHT' | 'FREE_FLOAT' | 'MARKET_MAKER' | 'MINER' | 'GOLD' | 'ABSTENTION';
export declare const GLOSSARY: Record<GlossaryKey, [string, string]>;
export interface TermProps {
  /** Eintrag aus GLOSSARY; alternativ title + definition */
  term?: GlossaryKey;
  title?: React.ReactNode;
  definition?: React.ReactNode;
  /** sichtbarer Text; Standard = Titel des Begriffs */
  children?: React.ReactNode;
  placement?: 'top' | 'bottom';
  width?: number | string;
  defaultOpen?: boolean;
  className?: string;
}
export declare function Term(props: TermProps): React.ReactElement;

export interface SkeletonProps {
  /** text = Zeile(n) · title · block (Diagramm) · circle (Avatar) · rows (Tabellenzeilen) */
  variant?: 'text' | 'title' | 'block' | 'circle' | 'rows';
  lines?: number;
  rows?: number;
  columns?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
}
export declare function Skeleton(props: SkeletonProps): React.ReactElement;
export interface LoadingProps { label?: string; rows?: number; columns?: number; children?: React.ReactNode; className?: string; }
export declare function Loading(props: LoadingProps): React.ReactElement;

export interface EmptyStateProps {
  title: React.ReactNode;
  /** ein Satz, was hier erscheinen wird */
  children?: React.ReactNode;
  /** höchstens eine Aktion, secondary */
  action?: React.ReactNode;
  /** Zeichen zwischen Linien, Standard „§“; false = keins */
  symbol?: React.ReactNode | false;
  compact?: boolean;
  as?: 'h2' | 'h3' | 'h4' | 'p';
  className?: string;
}
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;

export interface MenuItem {
  label?: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  href?: string;
  onSelect?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  /** Verlustfarbe – nur für Löschen/Stornieren */
  danger?: boolean;
  divider?: boolean;
  heading?: React.ReactNode;
}
export interface DropdownMenuProps {
  label: React.ReactNode;
  items: MenuItem[];
  onSelect?: (item: MenuItem, e: React.MouseEvent) => void;
  variant?: 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'end';
  defaultOpen?: boolean;
  id?: string;
  className?: string;
}
export declare function DropdownMenu(props: DropdownMenuProps): React.ReactElement;

export interface SheetProps {
  open: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** auto = unten bis 719 px, ab 720 px rechts */
  side?: 'auto' | 'bottom' | 'right';
  width?: number | string;
  /** im Elternelement statt über der Seite (Vorschauen) */
  inline?: boolean;
  id?: string;
  className?: string;
}
export declare function Sheet(props: SheetProps): React.ReactElement | null;

/** API: NotificationView (GET /v2/notifications) */
export interface NotificationView { id: string; subject?: string | { filledString?: string }; content?: string | { filledString?: string }; date?: number; readByReceiver?: boolean; }
export interface NotificationBellProps {
  count?: number; onClick?: React.MouseEventHandler<HTMLButtonElement>; expanded?: boolean; haspopup?: boolean; className?: string;
  /** anderes Symbol statt der Glocke, z. B. 'chat' für ungelesene Nachrichten */
  icon?: IconName;
  /** Name für Screenreader, Standard „Benachrichtigungen“ (ergänzt um „, 3 ungelesen“) */
  label?: string;
  /** Umschalter (z. B. Chat-Seitenleiste): aria-pressed, gedrückt wie geöffnet */
  pressed?: boolean;
  /** id des gesteuerten Bereichs (aria-controls) */
  controls?: string;
  /** Hinweis bei Hover, z. B. Tastenkürzel */
  title?: string;
}
export declare const NotificationBell: React.ForwardRefExoticComponent<NotificationBellProps & React.RefAttributes<HTMLButtonElement>>;
export interface NotificationListProps {
  items: NotificationView[];
  title?: React.ReactNode;
  onOpen?: (n: NotificationView) => void;
  onDelete?: (n: NotificationView) => void;
  onReadAll?: () => void;
  footer?: React.ReactNode;
  className?: string;
}
export declare function NotificationList(props: NotificationListProps): React.ReactElement;

/* ---------- Organisation (API: empire) & Portfolio ---------- */
export interface ProfitLossProps {
  /** Gewinn (+) oder Verlust (−) als Betrag */
  value: number;
  /** optional in Prozent, z. B. gegen den Einstand */
  percent?: number;
  currency?: string;
  compact?: boolean | 'auto' | number;
  suffix?: string;
  variant?: 'text' | 'tag';
  size?: 'sm' | 'md' | 'lg';
  /** Prozent unter den Betrag (für Tabellen) */
  stacked?: boolean;
  className?: string;
}
/** Buch- oder realisierter Gewinn/Verlust – kursgetrieben, daher gain/loss mit ▲▼ und Vorzeichen */
export declare function ProfitLoss(props: ProfitLossProps): React.ReactElement;

/** Position aus GET /api/v2/my/portfolio (positions[]) */
export interface PortfolioPosition {
  listing: Listing;
  type?: string;
  numberOfShares: number;
  committedShares?: number;
  currentBidPrice?: number; currentBidSize?: number;
  currentAskPrice?: number; currentAskSize?: number;
  lastPrice?: { value: number; date: number } | number;
  volume: number;
  averageBuyingPrice?: number;
  lastBuyingPrice?: number;
  lastPriceUpdate?: number;
}
export interface PortfolioView { securitiesAccountId?: string; cash: number; committedCash?: number; positions?: PortfolioPosition[]; }
export declare const VOLUME_GROUPS: { key: string; label: string; types: string[] | null; color: string }[];
export interface PortfolioSummaryProps {
  portfolio: PortfolioView;
  /** vorberechnete Volumen je Gruppe (STOCK, BOND, COIN, REPO, SYSTEM_REPO, OTHER), z. B. bei seitenweise geladenen Positionen */
  volumes?: Partial<Record<string, number>>;
  label?: React.ReactNode;
  currency?: string;
  /** Kurzform des Buchwerts, Standard 'auto' (ab 1 Mrd.) */
  compact?: boolean | 'auto' | number;
  change?: number; changeAmount?: number; changeSuffix?: string;
  aside?: React.ReactNode;
  as?: 'h2' | 'h3' | 'p';
  id?: string;
  className?: string;
}
export declare function PortfolioSummary(props: PortfolioSummaryProps): React.ReactElement;

export interface TradeIntent { action: 'BUY' | 'SELL'; position: PortfolioPosition; price?: number; numberOfShares?: number; }
export interface PositionTableProps {
  /** Handy: Standard 'auto' (Zeilen werden unter 600 px zu Karten) */
  stack?: 'auto' | 'never';
  positions: PortfolioPosition[];
  hrefFor?: (p: PortfolioPosition) => string;
  /** Menü „Handeln“: Verkaufen (freie Anteile, Geldkurs) / Nachkaufen (Briefkurs) → Order-Maske vorbelegen */
  onTrade?: (t: TradeIntent) => void;
  currency?: string;
  density?: 'sm' | 'md';
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  caption?: string;
  empty?: React.ReactNode;
  className?: string;
}
export declare function PositionTable(props: PositionTableProps): React.ReactElement;

/** SecurityOrderWithVolumeView (GET /api/v2/securityorders) – die genutzten Felder */
export interface SecurityOrderView {
  id: string; action: 'BUY' | 'SELL'; type: 'MARKET' | 'LIMIT' | 'QUOTE';
  numberOfShares: number; price?: number; volume?: number; securityIdentifier?: string; listing?: Listing;
  creationDate?: number; goodAfterDate?: number; goodTillDate?: number; hourlyChange?: number; nextHourlyChangeDate?: number;
  counterParty?: string; counterPartyName?: string; privateCounterParty?: boolean;
}
export interface OrderListProps {
  orders: SecurityOrderView[];
  hrefFor?: (o: SecurityOrderView) => string;
  onOpen?: (o: SecurityOrderView) => void;
  /** DELETE /api/securityorders/{orderId} – vorher bestätigen lassen */
  onDelete?: (o: SecurityOrderView) => void;
  currency?: string;
  density?: 'sm' | 'md';
  empty?: React.ReactNode;
  className?: string;
}
export declare function OrderList(props: OrderListProps): React.ReactElement;

/** SecurityOrderLogEntryView (GET /api/v2/securityorderlogs) */
export interface TradeLogEntry {
  id: string; date: number; securityIdentifier: string; numberOfShares: number; price: number; volume: number;
  buyerSecuritiesAccount?: string; buyerSecuritiesAccountName?: string;
  sellerSecuritiesAccount?: string; sellerSecuritiesAccountName?: string; sellerAverageBuyingPrice?: number;
}
export interface TradeLogProps {
  entries: TradeLogEntry[];
  /** eigenes Depot – bestimmt Kauf/Verkauf und Gegenpartei */
  securitiesAccountId: string;
  /** Namen zu ASINs (der Log liefert nur die ASIN) */
  names?: Record<string, string>;
  /** Wertpapierart je Eintrag (für % bei Anleihen/Repos); Standard: aus dem ASIN-Präfix */
  typeFor?: (e: TradeLogEntry) => string;
  hrefFor?: (e: TradeLogEntry) => string;
  currency?: string;
  density?: 'sm' | 'md';
  empty?: React.ReactNode;
  className?: string;
}
export declare function TradeLog(props: TradeLogProps): React.ReactElement;

/** TradeSummaryView (GET /api/v2/trades/stats/summary) */
export interface TradeSummaryView { totalTrades: number; winningTrades: number; losingTrades: number; breakEvenTrades: number; winRate: number; totalProfit: number; totalLoss: number; netProfitLoss: number; }
export declare function TradeStats(props: { summary: TradeSummaryView; periodLabel?: string; currency?: string; className?: string }): React.ReactElement;

export type SuggestionType = 'PROFIT_REALIZATION' | 'TRANSFER_PRIVATE_COINS' | 'UPGRADE_PRIVATE_MINER' | 'FOUND_COMPANY' | 'SPARE_COMPANY' | 'VOTING_POSSIBLE' | 'USER_ACHIEVEMENT' | 'CORPORATE_ACHIEVEMENT' | 'ALLIANCE_ACHIEVEMENT' | 'STOCK_BUY_RECOMMENDATION' | 'INCREASE_OWN_SHARES' | 'STOCK_DIVERSIFICATION' | 'COMPANY_TAKEOVER' | 'CROSS_HOLDINGS' | 'BECOME_MARKET_MAKER';
/** [Überschrift, Knopftext] je Vorschlagstyp */
export declare const SUGGESTION_TYPES: Record<SuggestionType, [string, string]>;
export interface Suggestion { type: SuggestionType; text: string | { filledString?: string }; actionData?: any; unit?: string; portfolioName?: string; actionLabel?: string; id?: string; }
export declare function SuggestionList(props: { suggestions: Suggestion[]; onAction?: (s: Suggestion) => void; className?: string }): React.ReactElement;

/** CompanyDevelopmentView (GET /api/v2/my/companydevelopment) */
export interface CompanyDevelopmentView {
  name: string; securityIdentifier: string; cash: number; cashFlow: number; bookValue: number; netCash: number; centralBankReserves: number;
  yesterdayCash?: number; yesterdayCashFlow?: number; yesterdayBookValue?: number; yesterdayNetCash?: number; yesterdayCentralBankReserves?: number;
}
export declare function CompanyDevelopment(props: { companies: CompanyDevelopmentView[]; hrefFor?: (c: CompanyDevelopmentView) => string; onFound?: () => void; currency?: string; density?: 'sm' | 'md'; empty?: React.ReactNode; className?: string }): React.ReactElement;

/** ListingShareView (GET /api/v2/my/companiesbyempireshare, /api/v2/my/takeoverpossibilities) */
export interface ListingShareView { listing: Listing; shareInPercent: number; }
export declare function ShareList(props: { items: ListingShareView[]; hrefFor?: (i: ListingShareView) => string; threshold?: number | false; emptyTitle?: React.ReactNode; emptyText?: React.ReactNode; className?: string }): React.ReactElement;

/* ---------- Weitere Wertpapierarten ---------- */
/** BondView / SystemBondView (GET /api/v2/bonds, /api/bonds/securityidentifier/{asin}) */
export interface BondView {
  id: string; name?: string; listing: Listing; issuer?: { name: string; securityIdentifier?: string; id?: string };
  interestRate: number; faceValue: number; volume: number; issueDate?: number; maturityDate: number;
  priceSpread?: PriceSpread; repurchaseListing?: Listing; numberOfBonds?: number;
}
export declare function BondFacts(props: { bond: BondView; issuerHref?: (issuer: NonNullable<BondView['issuer']>) => string; repoHref?: (l: Listing) => string; currency?: string; className?: string }): React.ReactElement;
export interface BondListProps { bonds: BondView[]; hrefFor?: (b: BondView) => string; currency?: string; density?: 'sm' | 'md'; now?: number; empty?: React.ReactNode; className?: string }
/** Anleihen nach Fälligkeit; Restlaufzeit fett, unter 1 Std. mit ◷ markiert */
export declare function BondList(props: BondListProps): React.ReactElement;

/** IndexRuleView */
export interface IndexRule { sortCriterion?: 'MARKET_CAP' | 'NET_CASH' | 'BOOK_VALUE'; topN?: number; assetClass?: 'STOCK' | 'BOND'; weightCapPercent?: number; minFreeFloatPercent?: number; maxSpreadPercent?: number; minNetCash?: number; requireTradedLast24h?: boolean }
/** IndexMemberValuesView */
export interface IndexMember { listing: Listing; shares: number; price: number; priceAdjustmentFactor?: number; capitalisation?: number; baseCapitalisation?: number; basePrice?: number; baseShares?: number; lastAdjustmentDate?: number }
/** IndexView (GET /api/v2/index/{asin}) */
export interface IndexView { name?: string; listing?: Listing; owner?: { username?: string; name?: string }; members?: IndexMember[]; membersCount?: number; rule?: IndexRule | null; chainingFactor?: number; baseValue?: number; nextChainingDate?: number }
export declare function IndexFacts(props: { index: IndexView; className?: string }): React.ReactElement;
export declare function IndexMembers(props: { members: IndexMember[]; hrefFor?: (m: IndexMember) => string; currency?: string; density?: 'sm' | 'md'; className?: string }): React.ReactElement;

/** WarrantView (GET /api/v2/warrants) */
export interface WarrantView { id: string; type: 'CALL' | 'PUT'; listing?: Listing; company?: { name: string; securityIdentifier?: string }; underlying?: Listing; subscriptionPeriodDate?: number; ratio?: number | string; underlyingValue?: number; underlyingCapValue?: number }
export declare function WarrantList(props: { warrants: WarrantView[]; /** IndexComparisonView: Hebel für Call/Put */ comparison?: { callLeverage?: number; putLeverage?: number; value?: number; yesterday?: number }; showUnderlying?: boolean; issuerHref?: (c: NonNullable<WarrantView['company']>) => string; density?: 'sm' | 'md'; empty?: React.ReactNode; className?: string }): React.ReactElement;

/** MinerView (GET /api/v2/my/miner) */
export interface MinerView { coinsPerHour: number; nextLevelCoinsPerHour?: number; nextLevelCosts?: number; maximumCapacity: number; storage: number; transferableCoins: number }
export interface MinerCardProps {
  miner: MinerView;
  /** aktueller Kurs von ACALPHCOIN für die €-Werte */
  coinPrice?: number;
  /** verfügbares Bargeld – sperrt „Ausbauen“, wenn es nicht reicht */
  cash?: number;
  /** PUT /api/v2/my/cointransfer */
  onTransfer?: () => void;
  /** PUT /api/v2/my/minerupgrade */
  onUpgrade?: () => void;
  /** Knopf „Übertragen“ bei vollem Speicher; Standard primary (ist dann die Hauptaktion) */
  transferVariant?: 'primary' | 'secondary';
  /** Amortisation in Stunden, wenn bekannt (Formel des Spiels noch offen) */
  paybackHours?: number;
  currency?: string;
  className?: string;
}
export declare function MinerCard(props: MinerCardProps): React.ReactElement;

/* ---------- Bank ---------- */
/** Betrag mit Vorzeichen, neutral (Geldflüsse, Periodenergebnis, Zinserträge) – ohne Gewinn-/Verlustfarbe */
export declare function SignedAmount(props: { value: number; currency?: string; compact?: boolean | 'auto' | number; className?: string }): React.ReactElement;

/** Bilanz (GET /api/v2/companies/{id}/balancesheets) */
export interface BalanceSheetView {
  date: number; periodStart?: number;
  cash?: number; stocksValue?: number; bondsValue?: number; buildingsValue?: number; otherAssetsValue?: number; centralBankReserves?: number; warrantCollateralValue?: number | null; totalAssets?: number;
  issuedBondsValue?: number; repurchaseObligations?: number; issuedWarrantsValue?: number | null; equity?: number; totalLiabilities?: number;
  periodResult?: number | null;
}
export interface BalanceSheetProps {
  /** alle Bilanzen, neueste zuerst – mit Auswahl des Stichtags */
  sheets?: BalanceSheetView[];
  sheet?: BalanceSheetView;
  selected?: number;
  onSelect?: (date: number) => void;
  currency?: string;
  compact?: boolean | 'auto' | number;
  className?: string;
}
export declare function BalanceSheet(props: BalanceSheetProps): React.ReactElement;

/** GET /api/centralbankreserves?companyId */
export interface CentralBankReserves { id?: string; cashHolding: number; maxCentralBankLoans?: number; interestRateBoost?: number; earnedBoostBonus?: number; coinsForNextBoost?: number; boostCoinPrice?: number; maxBoostMultiplier?: number }
export interface BankingPanelProps {
  /** GET /api/v2/companycaps/{companyId} */
  caps?: { bank?: boolean; bankReady?: boolean };
  /** GET /api/bankinglicense?companyId */
  license?: { startDate?: number } | null;
  reserves?: CentralBankReserves;
  /** reserveInterestRate aus GET /api/maininterestrate/latest, in % */
  reserveInterestRate?: number;
  /** Bargeld des Unternehmens */
  cash?: number;
  /** GET /api/v2/lastcentralbankreservespayment */
  lastPayment?: { paymentDate: number; paidInterest: number };
  nextPayment?: number;
  /** aufgenommene Zentralbankkredite (companyprofiles → companyCapabilities.takenCentralBankLoans); zeigt „genutzt von max.“ */
  takenLoans?: number;
  /** GET /api/v2/interesttenders */
  tender?: { bondListing: Listing; endDate: number };
  tenderHref?: (t: { bondListing: Listing }) => string;
  /** POST /api/bankinglicense?companyId */
  onRequestLicense?: () => void;
  /** PUT /api/centralbankreserves?companyId&cashAmount */
  onIncreaseReserves?: (cashAmount: number) => void;
  /** PUT /api/v2/centralbankreserves/{id}?increaseInterestRateBoost=true&multiplier */
  onBoost?: (multiplier: number) => void;
  /** welcher Knopf die Messing-Aktion ist (höchstens einer) */
  primaryAction?: 'reserves' | 'boost';
  currency?: string;
  className?: string;
}
export declare function BankingPanel(props: BankingPanelProps): React.ReactElement;

export interface BankAccountOption { id: string; name: string; cash: number }
export interface TransferFormProps {
  /** eigene Konten: privat und je Unternehmen (bankAccount.id) */
  accounts: BankAccountOption[];
  defaultFrom?: string;
  defaultTo?: string;
  /** PUT /api/v2/banktransfer/{senderBankAccountId}?receiverBankAccountId&cashAmount */
  onSubmit?: (t: { senderBankAccountId: string; receiverBankAccountId: string; cashAmount: number }) => void;
  onCancel?: () => void;
  submitVariant?: 'primary' | 'secondary';
  loading?: boolean;
  currency?: string;
  className?: string;
}
export declare function TransferForm(props: TransferFormProps): React.ReactElement;

/** CashTransferLogEntryView (GET /api/v2/cashtransferlogs/{bankAccountId}) */
export interface CashTransferLogEntry { id: string; date: number; amount: number; senderBankAccount?: string; receiverBankAccount?: string; message?: string | { filledString?: string } }
export declare function AccountStatement(props: { entries: CashTransferLogEntry[]; bankAccountId: string; currency?: string; density?: 'sm' | 'md'; empty?: React.ReactNode; className?: string }): React.ReactElement;

/* ---------- Rahmen ---------- */
export type IconName = 'markt' | 'organisation' | 'orders' | 'highscores' | 'community' | 'zeitung' | 'chat' | 'glocke' | 'suche' | 'portfolio' | 'bank' | 'coin' | 'anleihe' | 'index' | 'miner' | 'erfolg' | 'spieler' | 'allianz' | 'einstellungen' | 'abmelden' | 'plus' | 'schliessen' | 'haken' | 'extern' | 'uhr' | 'kalender' | 'merken' | 'filter' | 'aktualisieren' | 'info' | 'warnung' | 'ueberweisung' | 'menue';
/** SVG-Pfade je Icon (viewBox 0 0 20 20) */
export declare const ICONS: Record<IconName, string>;
export declare const ICON_LABELS: Record<IconName, string>;
export interface IconProps {
  name: IconName;
  /** 16 in Knöpfen und Tabellen · 20 Standard · 24 in der Navigation auf dem Handy */
  size?: number;
  strokeWidth?: number;
  /** nur für Icons ohne sichtbaren Text; sonst dekorativ (aria-hidden) */
  title?: string;
  className?: string;
}
export declare function Icon(props: IconProps): React.ReactElement | null;
export declare function Emblem(props: { size?: number; title?: string; className?: string }): React.ReactElement;
export interface WordmarkProps { name?: string; tagline?: string; size?: 'sm' | 'md' | 'lg'; emblem?: boolean; href?: string; 'aria-label'?: string; className?: string }
export declare function Wordmark(props: WordmarkProps): React.ReactElement;

export interface FooterLink { label: React.ReactNode; href: string; external?: boolean }
export interface AppFooterProps {
  brand?: React.ReactNode;
  name?: string;
  /** Hinweis, dass dies eine inoffizielle Oberfläche ist – Pflicht */
  note?: React.ReactNode;
  columns?: { title: React.ReactNode; links: FooterLink[] }[];
  /** kleine Zeile unten: Stand, Version … */
  meta?: React.ReactNode[];
  status?: { state?: 'ok' | 'slow' | 'down'; label: React.ReactNode };
  'aria-label'?: string;
  className?: string;
}
export declare function AppFooter(props: AppFooterProps): React.ReactElement;

export interface ProfileStat { label: React.ReactNode; value: React.ReactNode | number; rank?: number; sub?: React.ReactNode; currency?: string; unit?: string; decimals?: number; compact?: boolean | 'auto' | number }
export interface ProfileHeaderProps {
  kind?: 'user' | 'company' | 'alliance';
  kindLabel?: string;
  name: string;
  initials?: string;
  logoUrl?: string;
  eyebrow?: React.ReactNode[];
  meta?: React.ReactNode[];
  /** Merkmale wie Banklizenz, Market Maker; gold = Goldzugang (neutral, nie Messing) */
  tags?: { label: React.ReactNode; gold?: boolean; title?: string }[];
  actions?: React.ReactNode;
  /** 3–5 Kennzahlen; rank zeigt den Highscore-Platz als Medaille */
  stats?: ProfileStat[];
  tabs?: React.ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
}
export declare function ProfileHeader(props: ProfileHeaderProps): React.ReactElement;

/** CompanyEmploymentAgreementView */
export interface Employment { id: string; company: { name: string; securityIdentifier?: string }; startDate?: number; dailyWage: number }
export declare function EmploymentList(props: { employments: Employment[]; hrefFor?: (e: Employment) => string; currency?: string; density?: 'sm' | 'md'; empty?: React.ReactNode; className?: string }): React.ReactElement;

/* ---------- Handy ---------- */
export interface BottomNavItem { value: string; label: string; icon?: IconName | React.ReactNode; href?: string; badge?: number; active?: boolean }
export interface BottomNavProps { items: BottomNavItem[]; value?: string; onChange?: (value: string, e: React.MouseEvent) => void; /** Standard true: am unteren Rand fixiert */ fixed?: boolean; 'aria-label'?: string; className?: string }
/** Tab-Leiste für das Handy (unter 720 px), höchstens 5 Einträge */
export declare function BottomNav(props: BottomNavProps): React.ReactElement;
export interface MobileTopBarProps {
  title: React.ReactNode; eyebrow?: React.ReactNode;
  onBack?: () => void; backHref?: string; backText?: string; backLabel?: string;
  /** höchstens zwei Icon-Aktionen */
  actions?: { icon: IconName | React.ReactNode; label: string; onClick?: () => void; pressed?: boolean }[];
  sticky?: boolean; as?: 'h1' | 'h2'; className?: string;
}
export declare function MobileTopBar(props: MobileTopBarProps): React.ReactElement;
export interface TradeBarProps { listing: Listing; spread: PriceSpread; onTrade?: (t: { action: 'BUY' | 'SELL'; price?: number }) => void; fixed?: boolean; disabled?: boolean; currency?: string; className?: string }
/** Handelsleiste am unteren Rand der Wertpapierseite auf dem Handy – beide Seiten gleich, öffnet die Order-Maske */
export declare function TradeBar(props: TradeBarProps): React.ReactElement;

/* ---------- ETF, Immobilien, Allianz, Einstellungen ---------- */
/** EtfView (GET /api/v2/etfs/{asin}) */
export interface EtfView { name?: string; listing?: Listing; owner?: { username: string }; baseIndexName?: string; baseIndexAsin?: string; baseIndexEnded?: boolean; managementFeePercent?: number; managementFeeFrozen?: boolean; nextFeeChangeAt?: number; trackingDifferencePercent?: number; trackingDifferenceMonth?: string; frozen?: boolean; frozenAt?: number }
export declare function EtfFacts(props: { etf: EtfView; indexHref?: (e: EtfView) => string; className?: string }): React.ReactElement;
export interface EtfUnitsFormProps {
  defaultMode?: 'subscribe' | 'redeem';
  /** Anteilswert für die Schätzung */
  navPerUnit?: number;
  ownedUnits?: number;
  managementFeePercent?: number;
  frozen?: boolean;
  /** POST /api/v2/etfs/{asin}/subscriptions bzw. /redemptions ?units */
  onSubmit?: (r: { mode: 'subscribe' | 'redeem'; units: number }) => void;
  submitVariant?: 'primary' | 'secondary';
  loading?: boolean;
  className?: string;
}
export declare function EtfUnitsForm(props: EtfUnitsFormProps): React.ReactElement;
/** ListingMarketFilterResultView */
export interface RealEstateOffer { listing: Listing; price: { askPrice?: number; askSize?: number; bidPrice?: number } }
export declare function RealEstateList(props: { offers: RealEstateOffer[]; sort?: 'asc' | 'desc'; hrefFor?: (o: RealEstateOffer) => string; onBuy?: (o: RealEstateOffer) => void; currency?: string; className?: string }): React.ReactElement;
/** AllianceMembershipView */
export interface AllianceMembership { id: string; member: { username: string; myUser?: boolean }; role: 'MEMBER' | 'PRESS_OFFICER' | 'DEPUTY' | 'OWNER'; online?: boolean; dateJoined?: number }
export declare const ALLIANCE_ROLES: Record<AllianceMembership['role'], string>;
export declare function AllianceMembers(props: { members: AllianceMembership[]; hrefFor?: (m: AllianceMembership) => string; onRoleChange?: (m: AllianceMembership, role: AllianceMembership['role']) => void; onRemove?: (m: AllianceMembership) => void; className?: string }): React.ReactElement;
export declare function SettingsSection(props: { title: React.ReactNode; description?: React.ReactNode; danger?: boolean; id?: string; as?: 'h2' | 'h3'; children?: React.ReactNode; className?: string }): React.ReactElement;
export declare function SettingsRow(props: { label: React.ReactNode; description?: React.ReactNode; stacked?: boolean; labelId?: string; children?: React.ReactNode; className?: string }): React.ReactElement;

/* ---------- Markt ---------- */
export interface MarketStats { onlineUsers?: number; users?: number; companies?: number; listings?: number; marketCap?: number; /** numberOfTrades24h */ trades24h?: number; /** tradeVolume24h */ volume24h?: number }
/** Marktlage in einer Zeile (GET /api/v2/minimalstats) */
export declare function MarketPulse(props: { stats: MarketStats; className?: string }): React.ReactElement;
export interface MarketFilterValue { type?: string; search?: string; minPrice?: string | number; maxPrice?: string | number; withAsk?: boolean; withBid?: boolean; name?: string }
export interface ApiFilter { operator: 'WHERE' | 'AND' | 'NOT'; predicate: { field: string; operator: string; parameter?: string }; nextFilters: ApiFilter[] }
/** PriceSpreadListingViewFilter für POST /api/v2/filter/pricespreads */
export interface PriceSpreadListingViewFilter { name: string | null; listingFilter: ApiFilter | null; spreadFilter: ApiFilter | null }
export declare function buildMarketFilter(v: MarketFilterValue): PriceSpreadListingViewFilter;
export declare const MARKET_TYPES: { value: string; label: string }[];
export interface MarketFilterBarProps {
  value?: MarketFilterValue; defaultValue?: MarketFilterValue;
  onChange?: (v: MarketFilterValue, apiFilter: PriceSpreadListingViewFilter) => void;
  /** POST /api/v2/filter/pricespreads mit name → gespeicherter Filter */
  onSave?: (apiFilter: PriceSpreadListingViewFilter) => void;
  total?: number; className?: string;
}
export declare function MarketFilterBar(props: MarketFilterBarProps): React.ReactElement;
/** ListingMarketFilterResultView */
export interface MarketResult { listing: Listing; price: { bidPrice?: number; askPrice?: number; bidSize?: number; askSize?: number } }
export interface MarketResultColumn {
  key: string;
  label: React.ReactNode;
  /** Beschriftung in der Kartenansicht (stack) */
  mobileLabel?: string;
  type?: 'number' | 'text';
  sortable?: boolean;
  render?: (result: MarketResult) => React.ReactNode;
  sortValue?: (result: MarketResult) => number | string;
}
export declare function MarketResults(props: { results: MarketResult[]; hrefFor?: (r: any) => string; /** Standard Name aufsteigend; key: name · bid · ask · spread oder eine Zusatzspalte */ defaultSort?: { key: string; dir: 'asc' | 'desc' };
  /** Zusatzspalten hinter Spread, z. B. Rendite pro Tag bei Anleihen */
  extraColumns?: MarketResultColumn[]; stack?: 'auto' | 'never'; density?: 'sm' | 'md'; currency?: string; empty?: React.ReactNode; className?: string }): React.ReactElement;
export interface TickerItem { id: string; action?: 'BUY' | 'SELL'; listing: Listing; price: number; numberOfShares?: number; date: number }
/** Laufende Orders/Trades; neue Einträge oben, kurz hervorgehoben; Anhalten stoppt Aktualisierung und Ansage */
export declare function LiveTicker(props: { items: TickerItem[]; title?: string; max?: number; hrefFor?: (i: TickerItem) => string; currency?: string; className?: string }): React.ReactElement;

/* ---------- Emissionen ---------- */
export interface BondIssueFormProps {
  canIssueSystemBonds?: boolean; defaultKind?: 'bond' | 'system';
  /** Leitzins in % (Systemanleihe) */ mainRate?: number;
  /** Ø Anleihezins in % als Hinweis */ averageRate?: number;
  systemFaceValue?: number;
  /** POST /api/bonds?companyId&numberOfBonds&faceValue&interestRate&maturityDate · POST /api/systembonds?companyId&numberOfBonds */
  onSubmit?: (v: { kind: 'bond'; numberOfBonds: number; faceValue: number; interestRate: number; maturityDate: number } | { kind: 'system'; numberOfBonds: number }) => void;
  onCancel?: () => void; submitVariant?: 'primary' | 'secondary'; loading?: boolean; className?: string;
}
export declare function BondIssueForm(props: BondIssueFormProps): React.ReactElement;
export interface IndexBuilderProps {
  candidates: { name: string; securityIdentifier: string }[]; defaultMembers?: string[]; minMembers?: number;
  /** eigene ASIN nur mit Goldzugang */ gold?: boolean;
  /** POST /api/v2/indexes?companyId&name&members[]&customAsin */
  onSubmit?: (v: { name: string; members: string[]; customAsin?: string }) => void;
  onCancel?: () => void; submitVariant?: 'primary' | 'secondary'; loading?: boolean; className?: string;
}
export declare function IndexBuilder(props: IndexBuilderProps): React.ReactElement;
export interface EtfCreateFormProps {
  indexes: { name: string; securityIdentifier: string }[]; defaultIndex?: string; licensed?: boolean;
  /** POST /api/v2/etfs?companyId&name&baseIndexAsin&customAsin, danach …/management-fee?percent */
  onSubmit?: (v: { name: string; baseIndexAsin: string; managementFeePercent?: number }) => void;
  onCancel?: () => void; submitVariant?: 'primary' | 'secondary'; loading?: boolean; className?: string;
}
export declare function EtfCreateForm(props: EtfCreateFormProps): React.ReactElement;
export interface WarrantIssueFormProps {
  underlyings: { name: string; securityIdentifier: string }[]; defaultUnderlying?: string; defaultRatio?: string; cash?: number;
  /** POST /api/v2/warrants?companyId&type&underlyingAsin&cashDeposit&ratio */
  onSubmit?: (v: { type: 'CALL' | 'PUT'; underlyingAsin: string; cashDeposit: number; ratio: number }) => void;
  onCancel?: () => void; submitVariant?: 'primary' | 'secondary'; loading?: boolean; className?: string;
}
export declare function WarrantIssueForm(props: WarrantIssueFormProps): React.ReactElement;

/* ---------- Erfolge & Anmeldung ---------- */
export declare const ACHIEVEMENT_TITLES: Record<string, string>;
/** User-/Company-/AllianceAchievementView bzw. …ProgressView */
export interface AchievementItem { id?: string; type: string; title?: string; symbol?: string; description?: string | { filledString?: string }; coinReward?: number; achievedDate?: number; claimed?: boolean; progressInPercent?: number }
export interface AchievementBoardProps {
  achievements: AchievementItem[]; label?: string; openFirst?: boolean;
  /** PUT /api/v2/my/userachievementclaim/{id} (bzw. company…/alliance…) */ onClaim?: (a: AchievementItem) => void;
  /** PUT /api/v2/my/userachievementclaim */ onClaimAll?: () => void;
  claimVariant?: 'primary' | 'secondary'; className?: string;
}
export declare function AchievementBoard(props: AchievementBoardProps): React.ReactElement;
export interface AuthFormProps {
  mode?: 'login' | 'register';
  /** Anmelden: POST /user/token · Registrieren: POST /user/register */
  onSubmit?: (v: { username: string; password: string; emailAddress?: string }) => void;
  error?: React.ReactNode; loading?: boolean; brand?: React.ReactNode;
  switchHref?: string; onSwitch?: (e: React.MouseEvent) => void; resetHref?: string; termsHref?: string; className?: string;
}
export declare function AuthForm(props: AuthFormProps): React.ReactElement;

declare global {
  interface Window { Bankiersgruen: { Button: typeof Button; Card: typeof Card; PriceChange: typeof PriceChange; Sparkline: typeof Sparkline; StockRow: typeof StockRow; Input: typeof Input; Select: typeof Select; Textarea: typeof Textarea; SegmentedControl: typeof SegmentedControl; DataTable: typeof DataTable; AppHeader: typeof AppHeader; HeaderStat: typeof HeaderStat; Tabs: typeof Tabs; PlayerMenu: typeof PlayerMenu; RankBadge: typeof RankBadge; ProgressBar: typeof ProgressBar; Achievement: typeof Achievement; Toast: typeof Toast; ToastRegion: typeof ToastRegion; Dialog: typeof Dialog; SummaryList: typeof SummaryList; StockSearch: typeof StockSearch; StatusLabel: typeof StatusLabel; Banner: typeof Banner; StatTile: typeof StatTile; StatGroup: typeof StatGroup; PageHeader: typeof PageHeader; ChatThread: typeof ChatThread; ChatComposer: typeof ChatComposer; ConversationList: typeof ConversationList; UserPicker: typeof UserPicker; ChatWindow: typeof ChatWindow; TickerMention: typeof TickerMention; TradeShare: typeof TradeShare; Avatar: typeof Avatar; ForumCategoryList: typeof ForumCategoryList; ThreadList: typeof ThreadList; ForumPost: typeof ForumPost; ForumThread: typeof ForumThread; ForumEditor: typeof ForumEditor; Pagination: typeof Pagination; StockEmbed: typeof StockEmbed; HelpfulButton: typeof HelpfulButton; ForumText: typeof ForumText; OrderTicket: typeof OrderTicket; HighscoreTable: typeof HighscoreTable; NewsFeed: typeof NewsFeed; NewsItem: typeof NewsItem; ReactionBar: typeof ReactionBar; Countdown: typeof Countdown; Amount: typeof Amount; HIGHSCORE_TYPES: typeof HIGHSCORE_TYPES; LISTING_TYPES: typeof LISTING_TYPES; format: typeof format; SecurityHeader: typeof SecurityHeader; OrderBook: typeof OrderBook; PollCard: typeof PollCard; PollList: typeof PollList; VoteBar: typeof VoteBar; POLL_KINDS: typeof POLL_KINDS; CorporateActionForm: typeof CorporateActionForm; CORPORATE_ACTIONS: typeof CORPORATE_ACTIONS; CompanyFoundingForm: typeof CompanyFoundingForm; Checkbox: typeof Checkbox; Switch: typeof Switch; RadioGroup: typeof RadioGroup; Tooltip: typeof Tooltip; Term: typeof Term; GLOSSARY: typeof GLOSSARY; Skeleton: typeof Skeleton; Loading: typeof Loading; EmptyState: typeof EmptyState; DropdownMenu: typeof DropdownMenu; Sheet: typeof Sheet; NotificationBell: typeof NotificationBell; NotificationList: typeof NotificationList; ProfitLoss: typeof ProfitLoss; PortfolioSummary: typeof PortfolioSummary; PositionTable: typeof PositionTable; OrderList: typeof OrderList; TradeLog: typeof TradeLog; TradeStats: typeof TradeStats; SuggestionList: typeof SuggestionList; CompanyDevelopment: typeof CompanyDevelopment; ShareList: typeof ShareList; SUGGESTION_TYPES: typeof SUGGESTION_TYPES; VOLUME_GROUPS: typeof VOLUME_GROUPS; BondFacts: typeof BondFacts; BondList: typeof BondList; IndexFacts: typeof IndexFacts; IndexMembers: typeof IndexMembers; WarrantList: typeof WarrantList; MinerCard: typeof MinerCard; SignedAmount: typeof SignedAmount; BalanceSheet: typeof BalanceSheet; BankingPanel: typeof BankingPanel; TransferForm: typeof TransferForm; AccountStatement: typeof AccountStatement; Icon: typeof Icon; Emblem: typeof Emblem; Wordmark: typeof Wordmark; AppFooter: typeof AppFooter; ProfileHeader: typeof ProfileHeader; EmploymentList: typeof EmploymentList; ICONS: typeof ICONS; ICON_LABELS: typeof ICON_LABELS; BottomNav: typeof BottomNav; MobileTopBar: typeof MobileTopBar; TradeBar: typeof TradeBar; EtfFacts: typeof EtfFacts; EtfUnitsForm: typeof EtfUnitsForm; RealEstateList: typeof RealEstateList; AllianceMembers: typeof AllianceMembers; ALLIANCE_ROLES: typeof ALLIANCE_ROLES; SettingsSection: typeof SettingsSection; SettingsRow: typeof SettingsRow; MarketPulse: typeof MarketPulse; MarketFilterBar: typeof MarketFilterBar; MarketResults: typeof MarketResults; LiveTicker: typeof LiveTicker; BondIssueForm: typeof BondIssueForm; IndexBuilder: typeof IndexBuilder; EtfCreateForm: typeof EtfCreateForm; WarrantIssueForm: typeof WarrantIssueForm; AchievementBoard: typeof AchievementBoard; AuthForm: typeof AuthForm; buildMarketFilter: typeof buildMarketFilter; MARKET_TYPES: typeof MARKET_TYPES; ACHIEVEMENT_TITLES: typeof ACHIEVEMENT_TITLES } }
}
