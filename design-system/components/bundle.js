/* @ds-bundle: {"format":4,"namespace":"Bankiersgruen","components":[{"name":"Button"},{"name":"Card"},{"name":"PriceChange"},{"name":"Sparkline"},{"name":"StockRow"},{"name":"Input"},{"name":"Select"},{"name":"SegmentedControl"},{"name":"DataTable"},{"name":"AppHeader"},{"name":"Tabs"},{"name":"PlayerMenu"},{"name":"RankBadge"},{"name":"ProgressBar"},{"name":"Achievement"},{"name":"Toast"},{"name":"Dialog"},{"name":"SummaryList"},{"name":"StockSearch"},{"name":"StatusLabel"},{"name":"Banner"},{"name":"StatTile"},{"name":"PageHeader"},{"name":"ChatThread"},{"name":"ChatComposer"},{"name":"MentionMenu"},{"name":"AssetCard"},{"name":"ConversationList"},{"name":"ChatWindow"},{"name":"ForumCategoryList"},{"name":"ThreadList"},{"name":"ForumPost"},{"name":"ForumThread"},{"name":"ForumEditor"},{"name":"Pagination"},{"name":"OrderTicket"},{"name":"HighscoreTable"},{"name":"NewsFeed"},{"name":"Countdown"},{"name":"Amount"},{"name":"SecurityHeader"},{"name":"OrderBook"},{"name":"PollCard"},{"name":"PollList"},{"name":"CorporateActionForm"},{"name":"CompanyFoundingForm"},{"name":"Checkbox"},{"name":"Switch"},{"name":"RadioGroup"},{"name":"Tooltip"},{"name":"Term"},{"name":"Skeleton"},{"name":"Loading"},{"name":"EmptyState"},{"name":"DropdownMenu"},{"name":"Sheet"},{"name":"NotificationBell"},{"name":"NotificationList"},{"name":"ProfitLoss"},{"name":"PortfolioSummary"},{"name":"PositionTable"},{"name":"OrderList"},{"name":"TradeLog"},{"name":"TradeStats"},{"name":"SuggestionList"},{"name":"CompanyDevelopment"},{"name":"ShareList"},{"name":"BondFacts"},{"name":"BondList"},{"name":"IndexFacts"},{"name":"IndexMembers"},{"name":"WarrantList"},{"name":"MinerCard"},{"name":"SignedAmount"},{"name":"BalanceSheet"},{"name":"BankingPanel"},{"name":"TransferForm"},{"name":"AccountStatement"},{"name":"Icon"},{"name":"Emblem"},{"name":"Wordmark"},{"name":"AppFooter"},{"name":"ProfileHeader"},{"name":"EmploymentList"},{"name":"BottomNav"},{"name":"MobileTopBar"},{"name":"TradeBar"},{"name":"EtfFacts"},{"name":"EtfUnitsForm"},{"name":"RealEstateList"},{"name":"AllianceMembers"},{"name":"SettingsSection"},{"name":"SettingsRow"},{"name":"MarketPulse"},{"name":"MarketFilterBar"},{"name":"MarketResults"},{"name":"LiveTicker"},{"name":"BondIssueForm"},{"name":"IndexBuilder"},{"name":"EtfCreateForm"},{"name":"WarrantIssueForm"},{"name":"AchievementBoard"},{"name":"AuthForm"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(' ');
  }

  /* Button — Messing ist die einzige Aktionsfarbe: höchstens ein variant="primary" pro Bildschirm. */
  var Button = React.forwardRef(function Button(props, ref) {
    var variant = props.variant || 'secondary';
    var size = props.size || 'md';
    var loading = !!props.loading;
    var disabled = !!props.disabled || loading;
    var rest = {};
    for (var k in props) {
      if (['variant', 'size', 'loading', 'iconStart', 'iconEnd', 'fullWidth', 'className', 'children', 'disabled', 'type'].indexOf(k) === -1) rest[k] = props[k];
    }
    rest.ref = ref;
    rest.type = props.type || 'button';
    rest.disabled = disabled;
    if (loading) rest['aria-busy'] = 'true';
    rest.className = cx('bnk-btn', 'bnk-btn--' + variant, 'bnk-btn--' + size, props.fullWidth && 'bnk-btn--full', loading && 'is-loading', props.className);
    return h('button', rest,
      loading ? h('span', { className: 'bnk-btn__spinner', 'aria-hidden': 'true' }) : null,
      !loading && props.iconStart ? h('span', { className: 'bnk-btn__icon', 'aria-hidden': 'true' }, props.iconStart) : null,
      h('span', { className: 'bnk-btn__label' }, props.children),
      !loading && props.iconEnd ? h('span', { className: 'bnk-btn__icon', 'aria-hidden': 'true' }, props.iconEnd) : null
    );
  });
  Button.displayName = 'Button';


  /* Card — flache Fläche in bg-card. Karten gliedern Bereiche; Listen darin trennen mit Haarlinien statt Unterkarten. */
  var Card = React.forwardRef(function Card(props, ref) {
    var variant = props.variant || 'default';
    var interactive = !!(props.href || props.onClick);
    var rest = {};
    for (var k in props) {
      if (['variant', 'eyebrow', 'title', 'action', 'footer', 'flush', 'fill', 'as', 'titleAs', 'className', 'children'].indexOf(k) === -1) rest[k] = props[k];
    }
    rest.ref = ref;
    rest.className = cx('bnk-card', 'bnk-card--' + variant, interactive && 'bnk-card--interactive', props.flush && 'bnk-card--flush', props.fill && 'bnk-card--fill', props.className);
    var tag = props.as || (props.href ? 'a' : props.onClick ? 'div' : 'section');
    if (props.onClick && !props.href && tag !== 'button') {
      /* ganze Karte als Button: Tastatur wie ein echter Button */
      rest.role = rest.role || 'button';
      if (rest.tabIndex == null) rest.tabIndex = 0;
      var userKey = props.onKeyDown;
      rest.onKeyDown = function (e) {
        if (userKey) userKey(e);
        if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); props.onClick(e); }
      };
    }
    var hasHead = props.eyebrow || props.title || props.action;
    var head = hasHead ? h('header', { className: 'bnk-card__head' },
      h('div', { className: 'bnk-card__heading' },
        props.eyebrow ? h('div', { className: 'bnk-card__eyebrow' }, props.eyebrow) : null,
        props.title ? h(props.titleAs || 'h3', { className: 'bnk-card__title' }, props.title) : null
      ),
      props.action && !interactive ? h('div', { className: 'bnk-card__action' }, props.action) : null
    ) : null;
    return h(tag, rest,
      head,
      props.children != null ? h('div', { className: 'bnk-card__body' }, props.children) : null,
      props.footer ? h('footer', { className: 'bnk-card__foot' }, props.footer) : null
    );
  });
  Card.displayName = 'Card';

  /* Zahlen im deutschen Format, echtes Minuszeichen */
  function fmt(n, d) {
    return Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  /* Zahlen im Spiel reichen von 0,02 € bis über 3 Billiarden €. Kurzform: Mio., Mrd., Bio., Brd. */
  var SCALES = [[1e15, 'Brd.'], [1e12, 'Bio.'], [1e9, 'Mrd.'], [1e6, 'Mio.']];
  function compactParts(n, threshold) {
    var a = Math.abs(n);
    if (!(a >= threshold)) return null;
    for (var i = 0; i < SCALES.length; i++) {
      if (a >= SCALES[i][0]) {
        var v = a / SCALES[i][0], d = v >= 100 ? 0 : v >= 10 ? 1 : 2;
        return { value: v, d: d, unit: SCALES[i][1] };
      }
    }
    return null;
  }
  /* compact: true = ab 1 Mio. · 'auto' (Standard) = ab 1 Mrd. · Zahl = eigene Schwelle · false = nie */
  function compactThreshold(c) { return c === true ? 1e6 : (c === 'auto' || c == null) ? 1e9 : c === false ? Infinity : Number(c); }
  function money(n, cur, d, compact) {
    if (typeof n === 'string') return n;
    var sign = n < 0 ? '−' : '';
    var cp = compact ? compactParts(n, compactThreshold(compact)) : null;
    if (cp) return sign + fmt(cp.value, cp.d) + ' ' + cp.unit + (cur ? ' ' + cur : '');
    return sign + fmt(n, d == null ? 2 : d) + (cur ? ' ' + cur : '');
  }
  /* Kurs je Wertpapierart: Anleihen und Repos in Prozent vom Nennwert, sonst in Euro */
  var PERCENT_QUOTED = ['BOND', 'INTEREST_TENDER_BOND', 'REPO', 'SYSTEM_BOND', 'SYSTEM_REPO'];
  function isPercentQuoted(type) { return PERCENT_QUOTED.indexOf(String(type || '').toUpperCase()) !== -1; }
  function price(n, type, cur) {
    if (n == null || isNaN(n)) return '–';
    if (isPercentQuoted(type)) return fmt(n, 4) + ' %';
    /* Kurse unter 0,01 € mit zwei gültigen Ziffern (0,0034 €) statt „0,00 €“ */
    var a = Math.abs(Number(n));
    return money(Number(n), cur == null ? '€' : cur, a > 0 && a < 0.01 ? Math.min(8, Math.ceil(-Math.log10(a)) + 1) : 2);
  }
  function number(n, d, compact) {
    var cp = compact ? compactParts(n, compactThreshold(compact)) : null;
    if (cp) return (n < 0 ? '−' : '') + fmt(cp.value, cp.d) + '\u00a0' + cp.unit;
    return (n < 0 ? '−' : '') + fmt(n, d || 0);
  }
  function dateTime(ms, withTime) {
    if (ms == null) return '';
    var dt = new Date(ms), p = function (x) { return (x < 10 ? '0' : '') + x; };
    return dt.getDate() + '.' + (dt.getMonth() + 1) + '.' + dt.getFullYear() + (withTime === false ? '' : ', ' + p(dt.getHours()) + ':' + p(dt.getMinutes()));
  }

  /* Amount — Betrag; ab der Schwelle in Kurzform, der volle Wert steht im Tooltip (Blase, auch per Antippen) und für Screenreader. */
  function Amount(props) {
    var n = Number(props.value);
    var cur = props.currency == null ? '€' : props.currency;
    var d = props.decimals == null ? (cur ? 2 : 0) : props.decimals;
    var sign = props.signed ? (n > 0 ? '+' : n < 0 ? '−' : '± ') : (n < 0 ? '−' : '');
    var tail = (props.unit ? ' ' + props.unit : '') + (cur ? ' ' + cur : '');
    var full = sign + fmt(n, d) + tail;
    var cp = props.compact === false ? null : compactParts(n, compactThreshold(props.compact));
    if (!cp) return h('span', { className: cx('bnk-amt', props.className) }, full);
    /* Voller Wert als Tooltip-Blase (Hover, Antippen); Screenreader lesen ihn aus dem bnk-sr-Text, darum decorative. */
    return h(Tooltip, { content: full, decorative: true, delay: 120 },
      h('span', { className: cx('bnk-amt', 'is-compact', props.className), tabIndex: -1 },
        h('span', { 'aria-hidden': 'true' }, sign + fmt(cp.value, cp.d) + ' ' + cp.unit + tail), h('span', { className: 'bnk-sr' }, full)));
  }


  /* PriceChange — Kursveränderung mit Pfeil und Vorzeichen (Regel 3).
     variant "text" = Kurszettel für Listen und Tabellen, "tag" = Etikett für wichtige Einzelwerte. */
  var PriceChange = React.forwardRef(function PriceChange(props, ref) {
    var d = props.decimals == null ? 2 : props.decimals;
    var val = Number(props.value) || 0;
    var dir = Math.round(val * Math.pow(10, d)) === 0 ? 'flat' : val > 0 ? 'up' : 'down';
    var arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '±';
    var sign = dir === 'up' ? '+' : dir === 'down' ? '−' : '';
    var cur = props.currency == null ? '€' : props.currency;
    var pct = sign + fmt(val, d) + ' %';
    var main = pct;
    if (props.amount != null) {
      var amt = Number(props.amount);
      main = (dir === 'flat' ? '' : sign) + fmt(amt, 2) + ' ' + cur + ' (' + pct + ')';
    }
    var words = (dir === 'up' ? 'gestiegen um ' : dir === 'down' ? 'gefallen um ' : 'unverändert, ') +
      fmt(val, d) + ' Prozent' + (props.suffix ? ' ' + props.suffix : '');
    var rest = {};
    for (var k in props) {
      if (['value', 'amount', 'currency', 'decimals', 'variant', 'size', 'suffix', 'className'].indexOf(k) === -1) rest[k] = props[k];
    }
    rest.ref = ref;
    rest.className = cx('bnk-chg', 'bnk-chg--' + dir, 'bnk-chg--' + (props.variant || 'text'), 'bnk-chg--' + (props.size || 'md'), props.className);
    return h('span', rest,
      h('span', { className: 'bnk-chg__arrow', 'aria-hidden': 'true' }, arrow),
      h('span', { 'aria-hidden': 'true' }, main + (props.suffix ? ' ' + props.suffix : '')),
      h('span', { className: 'bnk-sr' }, words)
    );
  });
  PriceChange.displayName = 'PriceChange';

  /* Sparkline — Mini-Kursverlauf ohne Achsen, als SVG. Farbe folgt der Richtung im Zeitraum (Regel 2),
     Richtung steht zusätzlich immer als PriceChange daneben (Regel 3). */
  var Sparkline = React.forwardRef(function Sparkline(props, ref) {
    var data = (props.data || []).map(Number).filter(function (v) { return !isNaN(v); });
    var w = props.width || 80, hgt = props.height || 24, pad = 2;
    if (data.length < 2) return h('span', { ref: ref, className: cx('bnk-spark', props.className), style: { width: w, height: hgt } });
    var base = props.baseline != null ? Number(props.baseline) : null;
    var lo = Math.min.apply(null, data.concat(base != null ? [base] : []));
    var hi = Math.max.apply(null, data.concat(base != null ? [base] : []));
    if (hi === lo) { hi += 1; lo -= 1; }
    var X = function (i) { return pad + (i / (data.length - 1)) * (w - 2 * pad); };
    var Y = function (v) { return pad + (1 - (v - lo) / (hi - lo)) * (hgt - 2 * pad); };
    var d = data.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    var ref0 = base != null ? base : data[0];
    var last = data[data.length - 1];
    var dir = props.trend || (last > ref0 ? 'up' : last < ref0 ? 'down' : 'flat');
    var pct = ref0 ? ((last / ref0) - 1) * 100 : 0;
    var label = props['aria-label'] || ((props.label ? props.label + ': ' : 'Kursverlauf: ') + 'von ' + money(ref0, props.currency == null ? '€' : props.currency) +
      ' auf ' + money(last, props.currency == null ? '€' : props.currency) + ', ' + (pct >= 0 ? 'plus ' : 'minus ') + fmt(Math.abs(pct), 2) + ' Prozent');
    return h('svg', { ref: ref, className: cx('bnk-spark', 'bnk-spark--' + (props.variant === 'neutral' ? 'neutral' : dir), props.className),
        width: w, height: hgt, viewBox: '0 0 ' + w + ' ' + hgt, role: 'img', 'aria-label': label, focusable: 'false' },
      base != null ? h('line', { className: 'bnk-spark__base', x1: 0, x2: w, y1: Y(base).toFixed(1), y2: Y(base).toFixed(1) }) : null,
      h('path', { className: 'bnk-spark__line', d: d }),
      props.showEnd !== false ? h('circle', { className: 'bnk-spark__end', cx: X(data.length - 1).toFixed(1), cy: Y(last).toFixed(1), r: 2 }) : null);
  });
  Sparkline.displayName = 'Sparkline';

  /* StockRow — eine Zeile Aktie: Name, Ticker, optional Stückzahl/Positionswert, Kurs, Veränderung.
     Standard als <li> für eine .bnk-list in einer Card. */
  var StockRow = React.forwardRef(function StockRow(props, ref) {
    var cur = props.currency == null ? '€' : props.currency;
    var interactive = !!(props.href || props.onClick);
    var inner = [
      h('span', { key: 'id', className: 'bnk-srow__id' },
        h('span', { className: 'bnk-srow__name' }, props.name),
        h('span', { className: 'bnk-srow__meta' },
          props.ticker ? h('span', { className: 'bnk-srow__ticker' }, props.ticker) : null,
          props.meta ? h('span', { className: 'bnk-srow__extra' }, props.meta) : null)),
      props.value != null
        ? h('span', { key: 'val', className: 'bnk-srow__stack' },
            h('span', { className: 'bnk-srow__num' }, h(Amount, { value: props.value, currency: cur, compact: props.compact == null ? true : props.compact })),
            h('span', { className: 'bnk-srow__sub' }, 'Kurs ' + price(props.price, props.listingType, cur)))
        : h('span', { key: 'px', className: 'bnk-srow__num' }, price(props.price, props.listingType, cur)),
      h('span', { key: 'chg', className: 'bnk-srow__chg' }, h(PriceChange, { value: props.change, size: 'md' }))
    ];
    if (props.spark) inner.splice(1, 0, h('span', { key: 'sp', className: 'bnk-srow__spark' },
      h(Sparkline, { data: props.spark, baseline: props.sparkBaseline, width: 64, height: 22, label: typeof props.name === 'string' ? props.name : undefined })));
    var innerProps = { className: cx('bnk-srow', props.value != null && 'bnk-srow--value', props.spark && 'bnk-srow--spark', interactive && 'bnk-srow--interactive') };
    if (props.href) innerProps.href = props.href;
    if (props.onClick) innerProps.onClick = props.onClick;
    var innerTag = props.href ? 'a' : props.onClick ? 'button' : 'div';
    if (innerTag === 'button') innerProps.type = 'button';
    var outer = props.as || 'li';
    return h(outer, { ref: ref, className: cx('bnk-srow-item', props.className) }, h(innerTag, innerProps, inner));
  });
  StockRow.displayName = 'StockRow';

  /* ---------- Formulare ---------- */
  var uid = 0;
  function useFieldId(given) {
    var gen = React.useId ? React.useId() : null;
    var ref = React.useRef(null);
    if (!gen && ref.current == null) ref.current = 'bnk-f' + (++uid);
    return given || gen || ref.current;
  }
  function pick(props, drop) {
    var out = {};
    for (var k in props) if (drop.indexOf(k) === -1) out[k] = props[k];
    return out;
  }
  /* Rahmen um jedes Feld: Label, Hinweis, Fehler */
  function Field(p) {
    return h('div', { className: cx('bnk-field', p.error && 'is-invalid', p.disabled && 'is-disabled', p.fullWidth !== false && 'bnk-field--full', p.className) },
      p.label ? h('label', { className: 'bnk-field__label', htmlFor: p.id },
        p.label, p.optional ? h('span', { className: 'bnk-field__opt' }, ' (optional)') : null) : null,
      p.children,
      p.error
        ? h('div', { className: 'bnk-field__error', id: p.id + '-msg' }, h('span', { 'aria-hidden': 'true' }, '✕ '), p.error)
        : p.hint ? h('div', { className: 'bnk-field__hint', id: p.id + '-msg' }, p.hint) : null
    );
  }
  function parseDe(s) {
    if (s == null || s === '') return NaN;
    return parseFloat(String(s).replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace('−', '-'));
  }
  function decimalsOf(n) {
    var s = String(n); var i = s.indexOf('.');
    return i === -1 ? 0 : s.length - i - 1;
  }
  /* setzt den Wert wie ein Tippen – React onChange feuert, kontrolliert und unkontrolliert */
  function setNativeValue(el, value) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* Input — Textfeld; mit numeric für Stückzahl, Preise, Beträge (Monospace, rechtsbündig, deutsches Zahlenformat). */
  var Input = React.forwardRef(function Input(props, ref) {
    var id = useFieldId(props.id);
    var inner = React.useRef(null);
    var setRefs = function (el) {
      inner.current = el;
      if (typeof ref === 'function') ref(el); else if (ref) ref.current = el;
    };
    var step = props.step == null ? 1 : Number(props.step);
    function bump(dir) {
      var el = inner.current; if (!el || props.disabled || props.readOnly) return;
      var cur = parseDe(el.value); if (isNaN(cur)) cur = props.min != null ? Number(props.min) : 0;
      var next = cur + dir * step;
      if (props.min != null) next = Math.max(Number(props.min), next);
      if (props.max != null) next = Math.min(Number(props.max), next);
      var d = decimalsOf(step);
      setNativeValue(el, next.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }));
      el.focus();
    }
    var rest = pick(props, ['label', 'hint', 'error', 'optional', 'prefix', 'suffix', 'numeric', 'stepper', 'size', 'fullWidth', 'className', 'id', 'step', 'min', 'max']);
    rest.id = id;
    rest.ref = setRefs;
    rest.className = 'bnk-input__control';
    if (props.numeric) { rest.inputMode = rest.inputMode || 'decimal'; rest.autoComplete = rest.autoComplete || 'off'; }
    if (props.error) rest['aria-invalid'] = 'true';
    if (props.error || props.hint) rest['aria-describedby'] = id + '-msg';
    var stepBtn = function (dir, label) {
      return h('button', { type: 'button', tabIndex: -1, className: 'bnk-input__step', 'aria-label': label, disabled: props.disabled || props.readOnly,
        onMouseDown: function (e) { e.preventDefault(); }, onClick: function () { bump(dir); } }, dir < 0 ? '−' : '+');
    };
    if (props.stepper) {
      var userKey = props.onKeyDown;
      rest.onKeyDown = function (e) {
        if (userKey) userKey(e);
        if (e.defaultPrevented) return;
        if (e.key === 'ArrowUp') { e.preventDefault(); bump(1); }
        if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1); }
      };
    }
    return h(Field, { id: id, label: props.label, hint: props.hint, error: props.error, optional: props.optional, disabled: props.disabled, fullWidth: props.fullWidth, className: props.className },
      h('div', { className: cx('bnk-input', 'bnk-input--' + (props.size || 'md'), props.numeric && 'bnk-input--numeric', props.readOnly && 'is-readonly') },
        props.stepper ? stepBtn(-1, 'Verringern') : null,
        props.prefix ? h('span', { className: 'bnk-input__affix', 'aria-hidden': 'true' }, props.prefix) : null,
        h('input', rest),
        props.suffix ? h('span', { className: 'bnk-input__affix' }, props.suffix) : null,
        props.stepper ? stepBtn(1, 'Erhöhen') : null
      ));
  });
  Input.displayName = 'Input';

  /* Textarea — mehrzeiliges Feld im Stil von Input (Beschreibungen, Kommentare, Pressetexte).
     Mit maxLength zählt es die Zeichen; der Zähler wird ab 90 % sichtbar hervorgehoben. */
  var Textarea = React.forwardRef(function Textarea(props, ref) {
    var id = useFieldId(props.id);
    var controlled = props.value !== undefined;
    var lenSt = React.useState(String(props.defaultValue || '').length);
    var len = controlled ? String(props.value || '').length : lenSt[0];
    var rest = pick(props, ['label', 'hint', 'error', 'optional', 'size', 'fullWidth', 'className', 'id', 'counter']);
    rest.id = id; rest.ref = ref; rest.className = 'bnk-input__control bnk-textarea__control';
    rest.rows = props.rows || 4;
    if (props.error) rest['aria-invalid'] = 'true';
    if (props.error || props.hint) rest['aria-describedby'] = id + '-msg';
    var userChange = props.onChange;
    rest.onChange = function (e) { if (!controlled) lenSt[1](e.target.value.length); if (userChange) userChange(e); };
    var max = props.maxLength;
    var showCount = max != null && props.counter !== false;
    return h(Field, { id: id, label: props.label, hint: props.hint, error: props.error, optional: props.optional, disabled: props.disabled, fullWidth: props.fullWidth, className: props.className },
      h('div', { className: cx('bnk-input', 'bnk-input--textarea', props.readOnly && 'is-readonly') },
        h('textarea', rest),
        showCount ? h('span', { className: cx('bnk-textarea__count', len >= max * 0.9 && 'is-near'), 'aria-live': len >= max * 0.9 ? 'polite' : 'off' },
          fmt(len, 0) + ' / ' + fmt(max, 0)) : null));
  });
  Textarea.displayName = 'Textarea';

  /* Select — native Auswahl im Stil der Felder. options: [{ value, label, disabled }] oder <option>-Kinder. */
  var Select = React.forwardRef(function Select(props, ref) {
    var id = useFieldId(props.id);
    var rest = pick(props, ['label', 'hint', 'error', 'optional', 'options', 'placeholder', 'size', 'fullWidth', 'className', 'id', 'children']);
    rest.id = id; rest.ref = ref; rest.className = 'bnk-select__control';
    if (props.error) rest['aria-invalid'] = 'true';
    if (props.error || props.hint) rest['aria-describedby'] = id + '-msg';
    if (props.placeholder && rest.value === undefined && rest.defaultValue === undefined) rest.defaultValue = '';
    /* Platzhalter gedämpft anzeigen, solange nichts gewählt ist */
    var initial = rest.value !== undefined ? rest.value : rest.defaultValue;
    var emptySt = React.useState(initial === '' || initial == null);
    var isEmpty = rest.value !== undefined ? (rest.value === '' || rest.value == null) : emptySt[0];
    var userChange = props.onChange;
    rest.onChange = function (e) { emptySt[1](e.target.value === ''); if (userChange) userChange(e); };
    var opts = props.options ? props.options.map(function (o) {
      return h('option', { key: o.value, value: o.value, disabled: o.disabled }, o.label);
    }) : props.children;
    return h(Field, { id: id, label: props.label, hint: props.hint, error: props.error, optional: props.optional, disabled: props.disabled, fullWidth: props.fullWidth, className: props.className },
      h('div', { className: cx('bnk-select', 'bnk-select--' + (props.size || 'md'), props.placeholder && isEmpty && 'is-empty') },
        h('select', rest,
          props.placeholder ? h('option', { value: '', disabled: true }, props.placeholder) : null,
          opts),
        h('span', { className: 'bnk-select__chevron bnk-chev', 'aria-hidden': 'true' })
      ));
  });
  Select.displayName = 'Select';

  /* SegmentedControl — 2 bis 4 gleichrangige Optionen, eine ist gewählt (Radio-Gruppe, Pfeiltasten). */
  var SegmentedControl = React.forwardRef(function SegmentedControl(props, ref) {
    var options = props.options || [];
    var controlled = props.value !== undefined;
    var st = React.useState(props.defaultValue !== undefined ? props.defaultValue : (options[0] && options[0].value));
    var value = controlled ? props.value : st[0];
    var id = useFieldId(props.id);
    var btns = React.useRef([]);
    function choose(v, i) {
      if (!controlled) st[1](v);
      if (props.onChange) props.onChange(v);
      if (i != null && btns.current[i]) btns.current[i].focus();
    }
    function onKey(e, i) {
      var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var n = options.length, j = i;
      for (var t = 0; t < n; t++) { j = (j + dir + n) % n; if (!options[j].disabled) break; }
      choose(options[j].value, j);
    }
    return h('div', { className: cx('bnk-field', props.fullWidth !== false && 'bnk-field--full', props.className) },
      props.label ? h('div', { className: 'bnk-field__label', id: id + '-lbl' }, props.label) : null,
      h('div', { ref: ref, role: 'radiogroup', 'aria-labelledby': props.label ? id + '-lbl' : undefined, 'aria-label': props['aria-label'],
          className: cx('bnk-seg', 'bnk-seg--' + (props.size || 'md'), props.disabled && 'is-disabled') },
        options.map(function (o, i) {
          var on = o.value === value;
          return h('button', { key: o.value, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false',
            tabIndex: on ? 0 : -1, disabled: props.disabled || o.disabled,
            ref: function (el) { btns.current[i] = el; },
            className: cx('bnk-seg__opt', on && 'is-on'),
            onClick: function () { choose(o.value); }, onKeyDown: function (e) { onKey(e, i); } }, o.label);
        })));
  });
  SegmentedControl.displayName = 'SegmentedControl';

  /* DataTable — Kurstabelle im Zeitungssatz: Haarlinien, Zahlen rechtsbündig in Monospace, sortierbare Spalten. */
  function cellValue(col, row) {
    return typeof col.accessor === 'function' ? col.accessor(row) : row[col.key];
  }
  function sortValue(col, row) {
    if (col.sortValue) return col.sortValue(row);
    var v = cellValue(col, row);
    if (col.type === 'stock' && v && typeof v === 'object') return String(v.name);
    if (col.type === 'sparkline' && v && v.length) return (v[v.length - 1] / v[0]) - 1;
    return v;
  }
  function renderCell(col, row) {
    if (col.render) return col.render(row);
    var v = cellValue(col, row);
    if (v == null || v === '') return h('span', { className: 'bnk-table__empty-cell' }, '–');
    switch (col.type) {
      case 'stock':
        return h('span', { className: 'bnk-table__stock' },
          h('span', { className: 'bnk-table__name' }, v.name),
          v.ticker || v.meta ? h('span', { className: 'bnk-table__meta' },
            v.ticker ? h('span', { className: 'bnk-table__ticker' }, v.ticker) : null,
            v.meta ? h('span', null, v.meta) : null) : null);
      case 'currency': return h(Amount, { value: v, currency: col.currency == null ? '€' : col.currency, decimals: col.decimals, compact: col.compact == null ? true : col.compact });
      case 'price': return price(v, col.listingTypeKey ? row[col.listingTypeKey] : col.listingType, col.currency);
      case 'number': return h(Amount, { value: v, currency: '', decimals: col.decimals || 0, unit: col.unit, compact: col.compact == null ? true : col.compact });
      case 'percent': return (v < 0 ? '−' : '') + fmt(v, col.decimals == null ? 2 : col.decimals) + ' %';
      case 'sparkline':
        return h(Sparkline, { data: v, baseline: col.baselineKey ? row[col.baselineKey] : undefined, width: col.sparkWidth || 72, height: 22 });
      case 'change':
        return h(PriceChange, { value: v, amount: col.amountKey ? row[col.amountKey] : undefined, size: 'md' });
      default: return v;
    }
  }
  function isNum(col) { return ['currency', 'price', 'number', 'percent', 'change', 'sparkline'].indexOf(col.type) !== -1; }

  /* Beschriftung einer Spalte für die gestapelte Handy-Ansicht */
  function mLabel(col) {
    if (col.mobileLabel != null) return col.mobileLabel;
    if (typeof col.label === 'string') return col.label;
    function text(n) { if (n == null || n === false) return ''; if (typeof n === 'string' || typeof n === 'number') return String(n); if (Array.isArray(n)) return n.map(text).join('');
      if (n.props) { if (n.props.children != null) return text(n.props.children); if (n.props.title) return String(n.props.title); if (n.props.term && GLOSSARY[n.props.term]) return GLOSSARY[n.props.term][0]; } return ''; }
    return text(col.label);
  }
  var DataTable = React.forwardRef(function DataTable(props, ref) {
    var columns = props.columns || [];
    var rows = props.rows || [];
    var controlled = props.sort !== undefined;
    var st = React.useState(props.defaultSort || null);
    var sort = controlled ? props.sort : st[0];
    function setSort(s) { if (!controlled) st[1](s); if (props.onSortChange) props.onSortChange(s); }
    function toggle(col) {
      var first = col.defaultDir || (isNum(col) ? 'desc' : 'asc');
      if (!sort || sort.key !== col.key) return setSort({ key: col.key, dir: first });
      setSort({ key: col.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    }
    var sorted = rows;
    if (sort) {
      var sc = null;
      for (var i = 0; i < columns.length; i++) if (columns[i].key === sort.key) sc = columns[i];
      if (sc) {
        var mul = sort.dir === 'asc' ? 1 : -1;
        sorted = rows.slice().sort(function (a, b) {
          var x = sortValue(sc, a), y = sortValue(sc, b);
          if (x == null) return 1; if (y == null) return -1;
          if (typeof x === 'number' && typeof y === 'number') return (x - y) * mul;
          return String(x).localeCompare(String(y), 'de', { sensitivity: 'base' }) * mul;
        });
      }
    }
    var keyOf = function (row, i) { return props.rowKey ? (typeof props.rowKey === 'function' ? props.rowKey(row) : row[props.rowKey]) : i; };
    var clickable = !!(props.getRowHref || props.onRowClick);
    var head = h('thead', null, h('tr', null, columns.map(function (col) {
      var active = sort && sort.key === col.key;
      var align = col.align || (isNum(col) ? 'right' : 'left');
      var ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : (col.sortable ? 'none' : undefined);
      var label = col.sortable
        ? h('button', { type: 'button', className: cx('bnk-table__sort', active && 'is-active'), onClick: function () { toggle(col); } },
            h('span', null, col.label),
            h('span', { className: 'bnk-table__sort-ind', 'aria-hidden': 'true' }, active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'))
        : col.label;
      return h('th', { key: col.key, scope: 'col', 'aria-sort': ariaSort, style: col.width ? { width: col.width } : undefined,
        className: cx('bnk-table__th', 'is-' + align, col.sticky && 'is-sticky') }, label);
    })));
    var titleIdx = Math.max(0, columns.findIndex(function (c) { return c.mobile === 'title'; }));
    var body = h('tbody', null, sorted.length ? sorted.map(function (row, ri) {
      var href = props.getRowHref ? props.getRowHref(row) : null;
      return h('tr', { key: keyOf(row, ri), className: cx(clickable && 'is-clickable', props.isRowHighlighted && props.isRowHighlighted(row) && 'is-highlight'),
          onClick: props.onRowClick && !href ? function () { props.onRowClick(row); } : undefined },
        columns.map(function (col, ci) {
          var align = col.align || (isNum(col) ? 'right' : 'left');
          var content = renderCell(col, row);
          if (ci === 0 && clickable) {
            content = href
              ? h('a', { className: 'bnk-table__rowlink', href: href }, content)
              : h('button', { type: 'button', className: 'bnk-table__rowlink', onClick: function (e) { e.stopPropagation(); props.onRowClick(row); } }, content);
          }
          var Tag = ci === 0 ? 'th' : 'td';
          return h(Tag, { key: col.key, scope: ci === 0 ? 'row' : undefined, 'data-label': ci === titleIdx ? '' : mLabel(col),
            className: cx('bnk-table__td', 'is-' + align, isNum(col) && 'is-num', col.sticky && 'is-sticky', ci === 0 && 'is-first', ci === titleIdx && 'is-mtitle', col.mobileWide && 'is-mwide', col.action && 'is-action', col.mobile === false && 'is-mhide') }, content);
        }));
    }) : h('tr', null, h('td', { className: 'bnk-table__none', colSpan: columns.length }, props.empty || 'Keine Einträge.')));
    var foot = props.summary ? h('tfoot', null, h('tr', null, columns.map(function (col, ci) {
      var v = props.summary[col.key];
      var align = col.align || (isNum(col) ? 'right' : 'left');
      var content = v == null ? null : (ci === 0 || typeof v !== 'number' ? v : renderCell(col, props.summary));
      var Tag = ci === 0 ? 'th' : 'td';
      return h(Tag, { key: col.key, scope: ci === 0 ? 'row' : undefined, 'data-label': v == null || ci === 0 ? '' : mLabel(col),
        className: cx('bnk-table__td', 'is-' + align, isNum(col) && 'is-num', col.sticky && 'is-sticky', ci === 0 && 'is-first', ci === 0 && 'is-mtitle', v == null && 'is-empty', col.action && 'is-action') }, content);
    }))) : null;
    var sortable = columns.filter(function (c) { return c.sortable; });
    var ord = function (c) { return isNum(c) || /date|Date|^_/.test(c.key) || (!!c.sortValue && c.key !== 'name' && c.key !== 'company'); };
    var msort = props.stack === 'auto' && sortable.length && rows.length > 1 ? h('div', { className: 'bnk-table__msort' },
      h(Select, { label: 'Sortieren', size: 'sm', fullWidth: false, value: sort ? sort.key + ':' + sort.dir : '',
        placeholder: sort ? undefined : 'Sortierung wählen',
        onChange: function (e) { var v = e.target.value.split(':'); setSort({ key: v[0], dir: v[1] }); },
        options: sortable.reduce(function (a, c) { var l = mLabel(c) || c.key; return a.concat([{ value: c.key + ':desc', label: l + (ord(c) ? ' ↓ absteigend' : ' ↓ Z–A') }, { value: c.key + ':asc', label: l + (ord(c) ? ' ↑ aufsteigend' : ' ↑ A–Z') }]); }, []) })) : null;
    return h('div', { ref: ref, className: cx('bnk-table-wrap', props.stack === 'auto' && 'is-stack', props.className) },
      msort,
      h('table', { className: cx('bnk-table', 'bnk-table--' + (props.density || 'md')) },
        props.caption ? h('caption', { className: 'bnk-sr' }, props.caption) : null,
        head, body, foot));
  });
  DataTable.displayName = 'DataTable';

  /* ---------- Navigation ---------- */

  /* AppHeader — Kopfleiste wie der Kopf einer Zeitung: Wortmarke, Hauptnavigation, rechts Kontostand und Spieler.
     Hauptbereiche mit Unterpunkten (children) klappen per Klick senkrecht auf.
     Unter 1240px fällt die Datumszeile weg, unter 1080px die Kennzahlen, unter 720px klappt die Navigation in ein Menü. */
  function isActive(item) {
    if (item.active) return true;
    return !!(item.children && item.children.some(function (c) { return c.active; }));
  }
  var AppHeader = React.forwardRef(function AppHeader(props, ref) {
    var items = props.items || [];
    var collapse = props.collapse || 'auto';
    var openSt = React.useState(!!props.defaultMenuOpen);
    var open = openSt[0];
    var dropSt = React.useState(props.defaultOpenItem != null ? props.defaultOpenItem : null);
    var drop = dropSt[0];
    var accSt = React.useState(function () {
      for (var i = 0; i < items.length; i++) if (items[i].children && isActive(items[i])) return i;
      return null;
    });
    var base = useFieldId(props.id);
    var menuId = base + '-menu';
    var rootRef = React.useRef(null);
    var trigRefs = React.useRef([]);
    var setRoot = function (el) { rootRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; };

    /* Ausklapper schließen: Klick daneben, Escape */
    React.useEffect(function () {
      if (drop == null) return;
      function onDown(e) { if (!(e.target.closest && e.target.closest('.bnk-hdr__item.is-open'))) dropSt[1](null); }
      function onKey(e) { if (e.key === 'Escape') { var t = trigRefs.current[drop]; dropSt[1](null); if (t) t.focus(); } }
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [drop]);

    function linkEl(item, key, cls, extra) {
      var p = {
        key: key, href: item.href, className: cx(cls, item.active && 'is-active'),
        'aria-current': item.active ? 'page' : undefined,
        onClick: function (e) { if (props.onNavigate) props.onNavigate(item, e); dropSt[1](null); openSt[1](false); }
      };
      var content = [h('span', { key: 'l', className: 'bnk-hdr__lbl' }, item.label),
        item.badge != null ? h('span', { key: 'b', className: 'bnk-hdr__badge' }, item.badge) : null].concat(extra || []);
      return props.renderLink ? props.renderLink(item, p, content) : h('a', p, content);
    }
    function focusIn(panel, dir) {
      var links = panel ? panel.querySelectorAll('a,[href]') : [];
      if (!links.length) return;
      var idx = Array.prototype.indexOf.call(links, document.activeElement);
      var next = idx === -1 ? (dir > 0 ? 0 : links.length - 1) : Math.max(0, Math.min(links.length - 1, idx + dir));
      links[next].focus();
    }

    var nav = items.map(function (it, i) {
      if (!it.children || !it.children.length) return linkEl(it, 'i' + i, 'bnk-hdr__link');
      var isOpen = drop === i;
      var panelId = base + '-drop-' + i;
      return h('div', { key: 'i' + i, className: cx('bnk-hdr__item', isOpen && 'is-open') },
        h('button', { type: 'button', ref: function (el) { trigRefs.current[i] = el; },
            className: cx('bnk-hdr__link', 'bnk-hdr__trigger', isActive(it) && 'is-active'),
            'aria-expanded': isOpen ? 'true' : 'false', 'aria-controls': panelId,
            onClick: function () { dropSt[1](isOpen ? null : i); },
            onKeyDown: function (e) {
              if (e.key === 'ArrowDown') { e.preventDefault(); dropSt[1](i); setTimeout(function () { focusIn(document.getElementById(panelId), 1); }, 0); }
            } },
          h('span', { className: 'bnk-hdr__lbl' }, it.label),
          it.badge != null ? h('span', { className: 'bnk-hdr__badge' }, it.badge) : null,
          h('span', { className: 'bnk-chev', 'aria-hidden': 'true' })),
        h('div', { id: panelId, className: 'bnk-hdr__drop', hidden: !isOpen,
            onKeyDown: function (e) {
              if (e.key === 'ArrowDown') { e.preventDefault(); focusIn(e.currentTarget, 1); }
              if (e.key === 'ArrowUp') { e.preventDefault(); focusIn(e.currentTarget, -1); }
            } },
          it.children.map(function (c, j) {
            return linkEl(c, 'c' + j, 'bnk-hdr__sub', c.description ? [h('span', { key: 'd', className: 'bnk-hdr__desc' }, c.description)] : null);
          })));
    });

    var mobile = items.map(function (it, i) {
      if (!it.children || !it.children.length) return linkEl(it, 'm' + i, 'bnk-hdr__mitem');
      var ex = accSt[0] === i;
      var subId = base + '-acc-' + i;
      return h('div', { key: 'm' + i, className: cx('bnk-hdr__mgroup', ex && 'is-open') },
        h('button', { type: 'button', className: cx('bnk-hdr__mitem', 'bnk-hdr__mtrigger', isActive(it) && 'is-active'),
            'aria-expanded': ex ? 'true' : 'false', 'aria-controls': subId,
            onClick: function () { accSt[1](ex ? null : i); } },
          h('span', { className: 'bnk-hdr__lbl' }, it.label),
          h('span', { className: 'bnk-chev', 'aria-hidden': 'true' })),
        h('div', { id: subId, className: 'bnk-hdr__msub', hidden: !ex },
          it.children.map(function (c, j) { return linkEl(c, 's' + j, 'bnk-hdr__msubitem'); })));
    });

    var header = h('header', { ref: setRoot, className: cx('bnk-hdr', 'bnk-hdr--collapse-' + collapse, open && 'is-open', props.bottomNav && 'has-bnav', props.className) },
      h('div', { className: 'bnk-hdr__bar' },
        h('div', { className: 'bnk-hdr__brand' },
          props.brandHref ? h('a', { href: props.brandHref, className: 'bnk-hdr__wordmark' }, props.brand) : h('span', { className: 'bnk-hdr__wordmark' }, props.brand),
          props.dateline ? h('span', { className: 'bnk-hdr__dateline' }, props.dateline) : null),
        h('nav', { className: 'bnk-hdr__nav', 'aria-label': props.navLabel || 'Hauptnavigation' }, nav),
        h('div', { className: 'bnk-hdr__meta' }, props.meta),
        h('button', { type: 'button', className: 'bnk-hdr__toggle', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': menuId,
            onClick: function () { openSt[1](!open); } },
          h('span', { className: 'bnk-hdr__burger', 'aria-hidden': 'true' }, open ? '✕' : '≡'),
          h('span', null, 'Menü'))),
      h('nav', { id: menuId, className: 'bnk-hdr__menu', 'aria-label': (props.navLabel || 'Hauptnavigation') + ' (mobil)', hidden: !open },
        mobile,
        props.menuFooter ? h('div', { className: 'bnk-hdr__mfoot' }, props.menuFooter) : null));
    if (!props.bottomNav) return header;
    /* Mit bottomNav: unter 720 px Tab-Leiste unten statt Menü */
    return h(React.Fragment, null, header, h(BottomNav, Object.assign({ className: 'is-auto' }, props.bottomNav)));
  });
  AppHeader.displayName = 'AppHeader';

  /* HeaderStat — kleine Kennzahl für die Kopfleiste: Label über Wert (optional mit Kursveränderung). */
  function HeaderStat(props) {
    return h('div', { className: 'bnk-hdr__stat' },
      h('span', { className: 'bnk-hdr__stat-label' }, props.label),
      h('span', { className: 'bnk-hdr__stat-value' }, typeof props.value === 'number' ? h(Amount, { value: props.value, currency: props.currency, compact: props.compact }) : props.value,
        props.change != null ? h(PriceChange, { value: props.change, size: 'sm' }) : null));
  }

  /* Tabs — Reiter innerhalb einer Seite (z. B. Aktie: Übersicht · Chart · Kennzahlen · Nachrichten). */
  var Tabs = React.forwardRef(function Tabs(props, ref) {
    var items = props.items || [];
    var controlled = props.value !== undefined;
    var st = React.useState(props.defaultValue !== undefined ? props.defaultValue : (items[0] && items[0].value));
    var value = controlled ? props.value : st[0];
    var base = useFieldId(props.id);
    var btns = React.useRef([]);
    function choose(v, i, focus) {
      if (!controlled) st[1](v);
      if (props.onChange) props.onChange(v);
      if (focus && btns.current[i]) btns.current[i].focus();
    }
    function onKey(e, i) {
      var n = items.length, j, dir;
      if (e.key === 'ArrowRight') { j = i; dir = 1; }
      else if (e.key === 'ArrowLeft') { j = i; dir = -1; }
      else if (e.key === 'Home') { j = -1; dir = 1; }
      else if (e.key === 'End') { j = n; dir = -1; }
      else return;
      e.preventDefault();
      for (var t = 0; t < n; t++) { j = (j + dir + n) % n; if (!items[j].disabled) break; }
      choose(items[j].value, j, true);
    }
    var hasPanels = items.some(function (it) { return it.content !== undefined; });
    return h('div', { ref: ref, className: cx('bnk-tabs', 'bnk-tabs--' + (props.size || 'md'), props.className) },
      h('div', { role: 'tablist', 'aria-label': props['aria-label'], className: 'bnk-tabs__list' },
        items.map(function (it, i) {
          var on = it.value === value;
          return h('button', { key: it.value, type: 'button', role: 'tab', id: base + '-tab-' + i,
              'aria-selected': on ? 'true' : 'false', 'aria-controls': hasPanels ? base + '-panel-' + i : undefined,
              tabIndex: on ? 0 : -1, disabled: it.disabled,
              ref: function (el) { btns.current[i] = el; },
              className: cx('bnk-tabs__tab', on && 'is-on'),
              onClick: function () { choose(it.value, i); }, onKeyDown: function (e) { onKey(e, i); } },
            it.label,
            it.count != null ? h('span', { className: 'bnk-tabs__count' }, it.count) : null);
        })),
      hasPanels ? items.map(function (it, i) {
        return h('div', { key: it.value, role: 'tabpanel', id: base + '-panel-' + i, 'aria-labelledby': base + '-tab-' + i,
          hidden: it.value !== value, tabIndex: 0, className: 'bnk-tabs__panel' }, it.value === value ? it.content : null);
      }) : null);
  });
  Tabs.displayName = 'Tabs';

  /* PlayerMenu — Spieler-Kürzel rechts in der Kopfleiste; Klick klappt Profil, Erfolge, Einstellungen, Abmelden auf.
     variant "inline" zeigt dieselben Einträge offen, z. B. unten im mobilen Menü. */
  function initialsOf(name) {
    return String(name || '').split(/[\s_\-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }
  var PlayerMenu = React.forwardRef(function PlayerMenu(props, ref) {
    var items = props.items || [];
    var inline = props.variant === 'inline';
    var st = React.useState(!!props.defaultOpen);
    var open = inline || st[0];
    var id = useFieldId(props.id);
    var rootRef = React.useRef(null), trigRef = React.useRef(null), panelRef = React.useRef(null);
    var setRoot = function (el) { rootRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; };
    React.useEffect(function () {
      if (inline || !st[0]) return;
      function onDown(e) { if (rootRef.current && !rootRef.current.contains(e.target)) st[1](false); }
      function onKey(e) { if (e.key === 'Escape') { st[1](false); if (trigRef.current) trigRef.current.focus(); } }
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [st[0], inline]);
    function move(dir) {
      var links = panelRef.current ? panelRef.current.querySelectorAll('a,button') : [];
      if (!links.length) return;
      var i = Array.prototype.indexOf.call(links, document.activeElement);
      links[i === -1 ? (dir > 0 ? 0 : links.length - 1) : Math.max(0, Math.min(links.length - 1, i + dir))].focus();
    }
    var initials = props.initials || initialsOf(props.name);
    var avatar = h('span', { className: 'bnk-pm__avatar', 'aria-hidden': 'true' }, initials);
    var head = h('div', { className: 'bnk-pm__head' },
      inline ? avatar : null,
      h('div', { className: 'bnk-pm__who' },
        h('span', { className: 'bnk-pm__name' }, props.name),
        props.subtitle ? h('span', { className: 'bnk-pm__sub' }, props.subtitle) : null));
    var list = items.map(function (it, i) {
      if (it.divider) return h('div', { key: 'd' + i, className: 'bnk-pm__div', role: 'separator' });
      var p = { key: 'i' + i, className: 'bnk-pm__item',
        onClick: function (e) { if (it.onClick) it.onClick(e); if (props.onNavigate) props.onNavigate(it, e); if (!inline) st[1](false); } };
      var kids = [h('span', { key: 'l' }, it.label), it.badge != null ? h('span', { key: 'b', className: 'bnk-hdr__badge' }, it.badge) : null];
      return it.href ? h('a', Object.assign(p, { href: it.href }), kids) : h('button', Object.assign(p, { type: 'button' }), kids);
    });
    if (inline) return h('div', { ref: setRoot, className: cx('bnk-pm', 'bnk-pm--inline', props.className) }, head, h('div', { className: 'bnk-pm__list' }, list));
    return h('div', { ref: setRoot, className: cx('bnk-pm', open && 'is-open', props.className) },
      h('button', { type: 'button', ref: trigRef, className: 'bnk-pm__trigger', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': id + '-pm',
          'aria-label': 'Spieler-Menü: ' + (typeof props.name === 'string' ? props.name : ''),
          onClick: function () { st[1](!st[0]); },
          onKeyDown: function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); st[1](true); setTimeout(function () { move(1); }, 0); } } },
        avatar, h('span', { className: 'bnk-chev', 'aria-hidden': 'true' })),
      h('div', { id: id + '-pm', ref: panelRef, className: 'bnk-pm__panel', hidden: !open,
          onKeyDown: function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); } } },
        head, h('div', { className: 'bnk-pm__list' }, list)));
  });
  PlayerMenu.displayName = 'PlayerMenu';

  /* ---------- Spiel ---------- */

  /* RankBadge — Highscore-Platz als kleine Messing-Medaille, optional mit Kategorie daneben (Regel 5). */
  var RankBadge = React.forwardRef(function RankBadge(props, ref) {
    /* rank = Highscore-Platz · label = Text daneben (z. B. „Buchwert“) · symbol = Zeichen ohne Platz */
    var text = props.children || props.label;
    var inMedal = props.rank != null ? String(props.rank) : (props.symbol ? String(props.symbol) : (typeof text === 'string' ? text.charAt(0).toUpperCase() : ''));
    var label = props['aria-label'] || [props.rank != null ? 'Platz ' + props.rank : null, typeof text === 'string' ? text : null].filter(Boolean).join(', ');
    var numeric = props.rank != null;
    return h('span', { ref: ref, className: cx('bnk-rank', 'bnk-rank--' + (props.size || 'md'), props.className), title: props.title, 'aria-label': label || undefined, role: label ? 'img' : undefined },
      h('span', { className: cx('bnk-rank__medal', numeric ? 'is-num' : 'is-letter', inMedal.length > 2 && 'is-long'), 'aria-hidden': 'true' }, inMedal),
      text && props.showLabel !== false && props.showLeague !== false
        ? h('span', { className: 'bnk-rank__text', 'aria-hidden': 'true' }, text)
        : null);
  });
  RankBadge.displayName = 'RankBadge';

  /* ProgressBar — Fortschritt, z. B. Punkte bis zum nächsten Rang. reward = Messing, neutral = Textfarbe. */
  var ProgressBar = React.forwardRef(function ProgressBar(props, ref) {
    var max = props.max == null ? 100 : Number(props.max);
    var val = Math.max(0, Math.min(max, Number(props.value) || 0));
    var pct = max ? (val / max) * 100 : 0;
    var id = useFieldId(props.id);
    /* Prozent von 100 als „79 %“, sonst „7 / 9“ */
    var valueText = props.valueText != null ? props.valueText : props.unit === '%' && max === 100 ? fmt(val, 0) + ' %' : (fmt(val, 0) + ' / ' + fmt(max, 0) + (props.unit ? ' ' + props.unit : ''));
    return h('div', { ref: ref, className: cx('bnk-prog', 'bnk-prog--' + (props.variant || 'reward'), 'bnk-prog--' + (props.size || 'md'), props.className) },
      (props.label || props.showValue !== false) ? h('div', { className: 'bnk-prog__top' },
        props.label ? h('span', { className: 'bnk-prog__label', id: id + '-lbl' }, props.label) : h('span'),
        props.showValue !== false ? h('span', { className: 'bnk-prog__value' }, valueText) : null) : null,
      h('div', { className: 'bnk-prog__track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': val,
          'aria-valuetext': typeof valueText === 'string' ? valueText : undefined,
          'aria-labelledby': props.label ? id + '-lbl' : undefined, 'aria-label': props.label ? undefined : props['aria-label'] },
        h('div', { className: 'bnk-prog__fill', style: { width: pct + '%' } })),
      props.hint ? h('div', { className: 'bnk-prog__hint' }, props.hint) : null);
  });
  ProgressBar.displayName = 'ProgressBar';

  /* Achievement — Erfolg mit Medaille: freigeschaltet (Messing-getönt) oder gesperrt (mit Fortschritt). */
  var Achievement = React.forwardRef(function Achievement(props, ref) {
    var unlocked = !!props.unlocked;
    var symbol = props.symbol != null ? props.symbol : String(props.title || '').charAt(0);
    return h('div', { ref: ref, className: cx('bnk-ach', unlocked ? 'is-unlocked' : 'is-locked', props.className) },
      h('span', { className: 'bnk-ach__medal', 'aria-hidden': 'true' }, h('span', { className: 'bnk-ach__sym' }, symbol)),
      h('div', { className: 'bnk-ach__body' },
        h('div', { className: 'bnk-ach__top' },
          h('span', { className: 'bnk-ach__title' }, props.title),
          props.isNew ? h('span', { className: 'bnk-ach__new' }, 'Neu') : null),
        props.description ? h('div', { className: 'bnk-ach__desc' }, props.description) : null,
        unlocked
          ? (props.date ? h('div', { className: 'bnk-ach__meta' }, 'Erreicht am ' + props.date) : null)
          : (props.progress ? h(ProgressBar, { size: 'sm', value: props.progress.value, max: props.progress.max, unit: props.progress.unit, variant: 'neutral', 'aria-label': 'Fortschritt' }) : h('div', { className: 'bnk-ach__meta' }, 'Noch nicht erreicht')),
        h('span', { className: 'bnk-sr' }, unlocked ? 'Erfolg erreicht' : 'Erfolg noch nicht erreicht')));
  });
  Achievement.displayName = 'Achievement';

  /* Toast — kurze Meldung unten rechts: Order ausgeführt, Erfolg freigeschaltet, Fehler. */
  var Toast = React.forwardRef(function Toast(props, ref) {
    var variant = props.variant || 'info';
    React.useEffect(function () {
      if (!props.duration || !props.onClose) return;
      var t = setTimeout(props.onClose, props.duration);
      return function () { clearTimeout(t); };
    }, [props.duration, props.onClose]);
    var glyph = variant === 'error' ? '\u2715' : variant === 'reward' ? '' : '\u2713';
    return h('div', { ref: ref, role: variant === 'error' ? 'alert' : 'status', className: cx('bnk-toast', 'bnk-toast--' + variant, props.className) },
      h('span', { className: 'bnk-toast__icon', 'aria-hidden': 'true' }, props.icon || glyph),
      h('div', { className: 'bnk-toast__body' },
        props.title ? h('div', { className: 'bnk-toast__title' }, props.title) : null,
        props.children ? h('div', { className: 'bnk-toast__text' }, props.children) : null,
        props.action ? h('div', { className: 'bnk-toast__action' }, props.action) : null),
      props.onClose ? h('button', { type: 'button', className: 'bnk-toast__close', 'aria-label': 'Meldung schließen', onClick: props.onClose }, '✕') : null);
  });
  Toast.displayName = 'Toast';

  /* ToastRegion — Stapel für Toasts, unten rechts fixiert (inline für Vorschauen). */
  function ToastRegion(props) {
    return h('div', { className: cx('bnk-toasts', props.inline && 'bnk-toasts--inline', props.className), 'aria-live': 'polite', 'aria-relevant': 'additions' }, props.children);
  }

  /* ---------- Dialoge, Suche, Status, Hinweise ---------- */

  /* Dialog — modales Fenster, z. B. Order-Bestätigung oder „Order stornieren?“.
     Fokus bleibt im Dialog, Escape schließt, Fokus kehrt zum Auslöser zurück. */
  var Dialog = React.forwardRef(function Dialog(props, ref) {
    var id = useFieldId(props.id);
    var panelRef = React.useRef(null);
    var setPanel = function (el) { panelRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; };
    var open = !!props.open;
    var inline = !!props.inline;
    React.useEffect(function () {
      if (!open || inline) return;
      var prev = document.activeElement;
      var body = document.body, oldOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
      var panel = panelRef.current;
      var first = panel && (panel.querySelector('[data-autofocus]') || panel.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'));
      if (first) first.focus(); else if (panel) panel.focus();
      function onKey(e) {
        if (e.key === 'Escape' && props.onClose && props.dismissible !== false) { e.preventDefault(); props.onClose(); }
        if (e.key === 'Tab' && panel) {
          var f = panel.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])');
          if (!f.length) return;
          var a = f[0], z = f[f.length - 1];
          if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
          else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
        }
      }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); body.style.overflow = oldOverflow; if (prev && prev.focus) prev.focus(); };
    }, [open, inline]);
    if (!open && !inline) return null;
    var panel = h('div', { ref: setPanel, role: props.role || 'dialog', 'aria-modal': inline ? undefined : 'true', 'aria-labelledby': id + '-t',
        'aria-describedby': props.description ? id + '-d' : undefined, tabIndex: -1,
        className: cx('bnk-dlg', 'bnk-dlg--' + (props.size || 'md'), props.className) },
      h('div', { className: 'bnk-dlg__head' },
        h('div', null,
          props.eyebrow ? h('div', { className: 'bnk-dlg__eyebrow' }, props.eyebrow) : null,
          h('h2', { id: id + '-t', className: 'bnk-dlg__title' }, props.title)),
        props.onClose && props.dismissible !== false ? h('button', { type: 'button', className: 'bnk-dlg__close', 'aria-label': 'Schließen', onClick: props.onClose }, '✕') : null),
      props.description ? h('p', { id: id + '-d', className: 'bnk-dlg__desc' }, props.description) : null,
      props.children ? h('div', { className: 'bnk-dlg__body' }, props.children) : null,
      props.actions ? h('div', { className: 'bnk-dlg__foot' }, props.actions) : null);
    if (inline) return panel;
    var overlay = h('div', { className: 'bnk-dlg-overlay', onMouseDown: function (e) {
      if (e.target === e.currentTarget && props.onClose && props.dismissible !== false && props.closeOnOverlay !== false) props.onClose();
    } }, panel);
    return window.ReactDOM && window.ReactDOM.createPortal ? window.ReactDOM.createPortal(overlay, document.body) : overlay;
  });
  Dialog.displayName = 'Dialog';

  /* SummaryList — Zeilen aus Bezeichnung und Wert, z. B. die Order-Übersicht. total = Summenzeile. */
  function SummaryList(props) {
    var cur = props.currency == null ? '€' : props.currency;
    return h('dl', { className: cx('bnk-sum', props.className) }, (props.items || []).map(function (it, i) {
      var v = it.value;
      if (typeof v === 'number') v = h(Amount, { value: v, currency: it.currency != null ? it.currency : (it.unit ? '' : cur), decimals: it.decimals, unit: it.unit, compact: it.compact });
      return h('div', { key: i, className: cx('bnk-sum__row', it.total && 'is-total', it.muted && 'is-muted') },
        h('dt', null, it.label),
        h('dd', { className: cx(typeof it.value === 'number' && 'is-num') }, v));
    }));
  }

  /* StockSearch — Aktiensuche mit Vorschlägen (Combobox). Die Treffer liefert der Aufrufer. */
  var StockSearch = React.forwardRef(function StockSearch(props, ref) {
    var id = useFieldId(props.id);
    var results = props.results || [];
    var qSt = React.useState(props.defaultValue || '');
    var controlled = props.value !== undefined;
    var q = controlled ? props.value : qSt[0];
    var openSt = React.useState(!!props.defaultOpen);
    var actSt = React.useState(props.defaultOpen && results.length ? 0 : -1);
    var rootRef = React.useRef(null), inputRef = React.useRef(null);
    var setInput = function (el) { inputRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; };
    var open = openSt[0] && q.length > 0;
    React.useEffect(function () {
      if (!openSt[0]) return;
      function onDown(e) { if (rootRef.current && !rootRef.current.contains(e.target)) openSt[1](false); }
      document.addEventListener('mousedown', onDown);
      return function () { document.removeEventListener('mousedown', onDown); };
    }, [openSt[0]]);
    React.useEffect(function () {
      if (!props.shortcut) return;
      function onKey(e) {
        var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (e.key === props.shortcut && !typing) { e.preventDefault(); if (inputRef.current) inputRef.current.focus(); }
      }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); };
    }, [props.shortcut]);
    function setQ(v) { if (!controlled) qSt[1](v); if (props.onChange) props.onChange(v); openSt[1](true); actSt[1](v ? 0 : -1); }
    function pickItem(r) { if (props.onSelect) props.onSelect(r); openSt[1](false); }
    function onKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); openSt[1](true); actSt[1](Math.min(results.length - 1, actSt[0] + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); actSt[1](Math.max(0, actSt[0] - 1)); }
      else if (e.key === 'Enter') { if (open && results[actSt[0]]) { e.preventDefault(); pickItem(results[actSt[0]]); } }
      else if (e.key === 'Escape') { if (open) { e.preventDefault(); openSt[1](false); } else if (q) setQ(''); }
    }
    function mark(text) {
      var s = String(text), i = q ? s.toLowerCase().indexOf(q.toLowerCase()) : -1;
      if (i < 0) return s;
      return [s.slice(0, i), h('mark', { key: 'm', className: 'bnk-srch__hit' }, s.slice(i, i + q.length)), s.slice(i + q.length)];
    }
    var listId = id + '-list';
    var cur = props.currency == null ? '€' : props.currency;
    return h('div', { ref: rootRef, className: cx('bnk-srch', 'bnk-srch--' + (props.size || 'md'), props.align === 'end' && 'bnk-srch--end', open && 'is-open', props.className) },
      props.label ? h('label', { className: 'bnk-field__label', htmlFor: id }, props.label) : null,
      h('div', { className: 'bnk-input bnk-srch__box bnk-input--' + (props.size || 'md') },
        h('span', { className: 'bnk-srch__icon', 'aria-hidden': 'true' }),
        h('input', { ref: setInput, id: id, type: 'search', className: 'bnk-input__control', value: q, autoComplete: 'off', spellCheck: false,
          placeholder: props.placeholder || 'Aktie suchen – Name, Ticker, WKN',
          role: 'combobox', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': listId, 'aria-autocomplete': 'list',
          'aria-label': props.label ? undefined : (props['aria-label'] || 'Aktiensuche'),
          'aria-activedescendant': open && actSt[0] >= 0 && results[actSt[0]] ? id + '-o' + actSt[0] : undefined,
          onChange: function (e) { setQ(e.target.value); }, onFocus: function () { if (q) openSt[1](true); }, onKeyDown: onKey }),
        props.shortcut && !q ? h('kbd', { className: 'bnk-srch__kbd', 'aria-hidden': 'true' }, props.shortcut) : null),
      h('div', { className: 'bnk-srch__pop', hidden: !open },
        props.loading ? h('div', { className: 'bnk-srch__state' }, 'Suche läuft …')
        : results.length ? h('ul', { id: listId, role: 'listbox', className: 'bnk-srch__list', 'aria-label': 'Suchergebnisse' },
            results.map(function (r, i) {
              return h('li', { key: r.id || r.ticker || i, id: id + '-o' + i, role: 'option', 'aria-selected': i === actSt[0] ? 'true' : 'false',
                  className: cx('bnk-srch__opt', i === actSt[0] && 'is-active'),
                  onMouseDown: function (e) { e.preventDefault(); }, onMouseEnter: function () { actSt[1](i); }, onClick: function () { pickItem(r); } },
                h('span', { className: 'bnk-srch__id' },
                  h('span', { className: 'bnk-srch__name' }, mark(r.name)),
                  h('span', { className: 'bnk-srch__meta' }, h('span', { className: 'bnk-srch__ticker' }, mark(r.ticker || '')), r.meta ? h('span', null, r.meta) : null)),
                r.price != null ? h('span', { className: 'bnk-srch__price' }, price(r.price, r.listingType, cur)) : null,
                r.change != null ? h('span', { className: 'bnk-srch__chg' }, h(PriceChange, { value: r.change, size: 'sm' })) : null);
            }))
        : h('div', { className: 'bnk-srch__state', role: 'status' }, props.emptyText || ('Keine Aktie zu „' + q + '“ gefunden.')),
        props.footer && results.length ? h('div', { className: 'bnk-srch__foot' }, props.footer) : null),
      h('div', { className: 'bnk-sr', 'aria-live': 'polite' }, open && !props.loading ? (results.length + ' Treffer') : ''));
  });
  StockSearch.displayName = 'StockSearch';

  /* StatusLabel — Zustand einer Order in Versalien mit Form-Zeichen; neutral, nur „abgelehnt“ in Verlustfarbe. */
  var STATUS = {
    open: 'Offen', partial: 'Teilweise ausgeführt', filled: 'Ausgeführt',
    cancelled: 'Storniert', expired: 'Abgelaufen', rejected: 'Abgelehnt', pending: 'In Prüfung'
  };
  function StatusLabel(props) {
    var s = props.status || 'open';
    return h('span', { className: cx('bnk-status', 'bnk-status--' + s, props.className) },
      h('span', { className: 'bnk-status__mark', 'aria-hidden': 'true' }),
      h('span', null, props.children || STATUS[s] || s));
  }

  /* Banner — Hinweis, der auf der Seite stehen bleibt: Kapitalmaßnahme, Wartung, Erfolg, Fehler. */
  function Banner(props) {
    var v = props.variant || 'info';
    var glyph = v === 'error' ? '!' : v === 'reward' ? '' : 'i';
    return h('div', { role: v === 'error' ? 'alert' : 'status', className: cx('bnk-banner', 'bnk-banner--' + v, props.className) },
      h('span', { className: 'bnk-banner__icon', 'aria-hidden': 'true' }, props.icon || glyph),
      h('div', { className: 'bnk-banner__body' },
        props.title ? h('div', { className: 'bnk-banner__title' }, props.title) : null,
        props.children ? h('div', { className: 'bnk-banner__text' }, props.children) : null),
      props.action ? h('div', { className: 'bnk-banner__action' }, props.action) : null,
      props.onClose ? h('button', { type: 'button', className: 'bnk-banner__close', 'aria-label': 'Hinweis schließen', onClick: props.onClose }, '✕') : null);
  }

  /* ---------- Seiten ---------- */

  /* StatTile — Kennzahl: Label, großer Wert, Veränderung, optional Sparkline. StatGroup reiht Kacheln mit Haarlinien. */
  function StatTile(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var v = props.value;
    if (typeof v === 'number') {
      var d = props.decimals == null ? (props.unit ? 0 : 2) : props.decimals;
      v = h(Amount, { value: v, decimals: d, signed: props.signed, unit: props.unit, currency: props.unit ? '' : cur, compact: props.compact });
    }
    var lead = !!props.lead;
    return h('div', { className: cx('bnk-stat', lead && 'bnk-stat--lead', props.className) },
      h('div', { className: 'bnk-stat__label' }, props.label),
      h('div', { className: 'bnk-stat__main' },
        h('span', { className: 'bnk-stat__value' }, v),
        props.change != null ? h(PriceChange, { value: props.change, amount: props.changeAmount, suffix: props.changeSuffix,
          variant: props.changeVariant || (lead ? 'tag' : 'text'), size: lead ? 'lg' : 'md' }) : null),
      props.spark ? h('div', { className: 'bnk-stat__spark' },
        h(Sparkline, { data: props.spark, baseline: props.sparkBaseline, width: props.sparkWidth || (lead ? 200 : 120), height: lead ? 40 : 28, label: typeof props.label === 'string' ? props.label : undefined })) : null,
      props.hint ? h('div', { className: 'bnk-stat__hint' }, props.hint) : null);
  }
  function StatGroup(props) {
    return h('div', { className: cx('bnk-statgrp', props.className), style: props.columns ? { gridTemplateColumns: props.columns } : undefined, role: 'group', 'aria-label': props['aria-label'] }, props.children);
  }

  /* PageHeader — Seitenkopf wie eine Zeitungsseite: Rubrik, Überschrift mit Messing-Linie (Regel 6), Unterzeile, Aktionen, optional Reiter. */
  function PageHeader(props) {
    var size = props.size || 'lg';
    var Tag = props.as || 'h1';
    return h('header', { className: cx('bnk-ph', 'bnk-ph--' + size, props.tabs && 'has-tabs', props.className) },
      h('div', { className: 'bnk-ph__row' },
        h('div', { className: 'bnk-ph__text' },
          props.eyebrow ? h('div', { className: 'bnk-ph__eyebrow' }, props.eyebrow) : null,
          h(Tag, { className: 'bnk-ph__title' }, props.title),
          props.meta ? h('div', { className: 'bnk-ph__meta' }, props.meta) : null,
          props.description ? h('p', { className: 'bnk-ph__desc' }, props.description) : null),
        props.aside || props.actions ? h('div', { className: 'bnk-ph__side' },
          props.aside ? h('div', { className: 'bnk-ph__aside' }, props.aside) : null,
          props.actions ? h('div', { className: 'bnk-ph__actions' }, props.actions) : null) : null),
      props.tabs ? h('div', { className: 'bnk-ph__tabs' }, props.tabs) : null);
  }

  /* ---------- Chat ---------- */

  function Avatar(props) {
    var s = props.size || 32;
    return h('span', { className: cx('bnk-av', props.group && 'bnk-av--group', props.className), style: { width: s, height: s, fontSize: Math.round(s * 0.36) }, 'aria-hidden': 'true' },
      props.initials || initialsOf(props.name));
  }

  /* TickerMention — „#ACALPHCOIN“ im Chattext: ASIN in Monospace, Messing-Punktlinie, optional Tagesveränderung.
     prefix: „#“ (Standard im Chat) oder „$“ (alte Nachrichten, Forum). */
  function TickerMention(props) {
    var info = props.info || {};
    var content = [h('span', { key: 't', className: 'bnk-tick__sym' }, (props.prefix == null ? '$' : props.prefix) + props.ticker)];
    if (info.change != null) content.push(h(PriceChange, { key: 'c', value: info.change, size: 'sm' }));
    var p = { className: 'bnk-tick', title: info.name ? info.name : undefined };
    return info.href ? h('a', Object.assign(p, { href: info.href }), content) : h('span', p, content);
  }
  /* Chat-Kürzel: #ASIN verlinkt, !ASIN hängt zusätzlich eine Karte an, $TICKER (alt) verlinkt.
     # und ! brauchen die volle ASIN (10 Zeichen), davor kein Wortzeichen – „#1“, „#Top“ oder „Super!“ bleiben Text. */
  var CHAT_TOKEN = /((?<![\w$#!])(?:\$[A-Z][A-Z0-9]{1,9}|[#!][A-Z][A-Z0-9]{9})\b)/g;
  var CHAT_EMBED = /(?<![\w$#!])!([A-Z][A-Z0-9]{9})\b/g;
  var CHAT_EMBED_EDGES = /^(?:\s*![A-Z][A-Z0-9]{9}\b)+|(?:(?<![\w$#!])![A-Z][A-Z0-9]{9}\b\s*)+$/g;
  /* Links im Chattext: nur http(s), Satzzeichen am Ende gehören nicht dazu; öffnen in neuem Tab. */
  var CHAT_URL = /(https?:\/\/[^\s<]*[^\s<.,;:!?)"'»“])/i;
  function renderChatText(text, tickers) {
    if (typeof text !== 'string') return text;
    return text.split(CHAT_URL).map(function (u, j) {
      if (j % 2) return h('a', { key: 'u' + j, href: u, className: 'bnk-chat__link', target: '_blank', rel: 'noopener noreferrer nofollow' }, u);
      return u.split(CHAT_TOKEN).map(function (p, i) {
        if (i % 2 === 0) return p;
        var t = p.slice(1);
        return h(TickerMention, { key: j + '-' + i, ticker: t, prefix: p.charAt(0) === '$' ? '$' : '#', info: tickers && tickers[t] });
      });
    });
  }
  /* ASINs der !-Karten einer Nachricht, ohne Doppelte, höchstens drei. */
  function chatEmbeds(text) {
    var out = [];
    if (typeof text !== 'string') return out;
    text.replace(CHAT_EMBED, function (m, a) { if (out.indexOf(a) < 0 && out.length < 3) out.push(a); return m; });
    return out;
  }

  /* TradeShare — geteilter Trade als Anhang in einer Nachricht. */
  function TradeShare(props) {
    var cur = props.currency == null ? '€' : props.currency;
    return h('div', { className: 'bnk-trade' },
      h('div', { className: 'bnk-trade__top' },
        h('span', { className: 'bnk-trade__kind' }, (props.side === 'sell' ? 'Verkauf' : 'Kauf') + (props.status ? ' · ' + props.status : '')),
        props.change != null ? h(PriceChange, { value: props.change, size: 'sm', suffix: props.changeSuffix || 'seitdem' }) : null),
      h('div', { className: 'bnk-trade__main' },
        h('span', { className: 'bnk-trade__name' }, props.name),
        h('span', { className: 'bnk-trade__fig' }, fmt(props.qty, 0) + ' × ' + props.ticker + ' zu ' + price(props.price, props.listingType, cur))));
  }

  /* ChatThread — Nachrichtenverlauf mit Sprechblasen: eigene rechts, andere links; Tagestrenner, Systemzeilen, Tippanzeige. */
  function sameGroup(a, b) {
    return a && b && !a.system && !b.system && !a.day && !b.day && a.own === b.own && (a.own || (a.author && b.author && a.author.name === b.author.name));
  }
  var ChatThread = React.forwardRef(function ChatThread(props, ref) {
    var msgs = props.messages || [];
    var endRef = React.useRef(null);
    var stick = React.useRef(true);
    function scroller() {
      var el = endRef.current && endRef.current.parentElement;
      while (el && el !== document.body) { var o = getComputedStyle(el).overflowY; if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return el; el = el.parentElement; }
      return null;
    }
    React.useLayoutEffect(function () {
      if (props.autoScroll === false) return;
      var s = scroller(); if (s && stick.current) s.scrollTop = s.scrollHeight;
    }, [msgs.length, !!props.typing]);
    React.useEffect(function () {
      var s = scroller(); if (!s) return;
      function on() { stick.current = s.scrollHeight - s.scrollTop - s.clientHeight < 48; }
      s.addEventListener('scroll', on); return function () { s.removeEventListener('scroll', on); };
    }, []);
    var showNames = props.showNames !== false;
    var items = msgs.map(function (m, i) {
      if (m.day) return h('div', { key: m.id || 'd' + i, className: 'bnk-chat__day', role: 'separator' }, h('span', null, m.day));
      if (m.system) return h('div', { key: m.id || 's' + i, className: 'bnk-chat__sys' }, renderChatText(m.system, props.tickers));
      var first = !sameGroup(msgs[i - 1], m), last = !sameGroup(m, msgs[i + 1]);
      var a = m.author || {};
      // !ASIN: Karte unter der Blase; besteht die Nachricht nur aus Karten, entfällt die Blase.
      var embeds = props.renderEmbed ? chatEmbeds(m.text) : [];
      // Karten am Anfang oder Ende stehen nicht noch einmal im Text; mitten im Satz bleiben sie Erwähnung.
      var text = embeds.length ? m.text.replace(CHAT_EMBED_EDGES, '').trim() : m.text;
      var bare = embeds.length > 0 && !text;
      return h('div', { key: m.id || i, className: cx('bnk-msg', m.own ? 'bnk-msg--own' : 'bnk-msg--other', first && 'is-first', last && 'is-last') },
        !m.own ? h('div', { className: 'bnk-msg__av' }, last ? h(Avatar, { name: a.name, initials: a.initials, size: 28 }) : null) : null,
        h('div', { className: 'bnk-msg__col' },
          first && (m.own || !showNames) ? h('span', { className: 'bnk-sr' }, m.own ? 'Du:' : (a.name || '') + ':') : null,
          !m.own && first && showNames ? h('div', { className: 'bnk-msg__name' }, h('span', null, a.name), a.badge || null) : null,
          m.text != null && !bare ? h('div', { className: 'bnk-msg__bubble' }, renderChatText(text, props.tickers)) : null,
          embeds.length ? h('div', { className: 'bnk-msg__att bnk-msg__embeds' }, embeds.map(function (a) { return h(React.Fragment, { key: a }, props.renderEmbed(a)); })) : null,
          m.trade ? h('div', { className: 'bnk-msg__att' }, h(TradeShare, m.trade)) : null,
          last ? h('div', { className: 'bnk-msg__meta' },
            h('time', null, m.time),
            m.own && m.status ? h('span', null, ' · ' + m.status) : null) : null));
    });
    return h('div', { ref: ref, className: cx('bnk-chat', props.className), role: 'log', 'aria-live': 'polite', 'aria-label': props['aria-label'] || 'Nachrichten' },
      items,
      props.typing ? h('div', { className: 'bnk-chat__typing' }, h('span', { className: 'bnk-chat__dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), props.typing) : null,
      h('div', { ref: endRef }));
  });
  ChatThread.displayName = 'ChatThread';

  /* ChatComposer — Eingabe unten: wächst mit, Enter sendet, Umschalt+Enter für neue Zeile. */
  var ChatComposer = React.forwardRef(function ChatComposer(props, ref) {
    var st = React.useState(props.defaultValue || '');
    var controlled = props.value !== undefined;
    var val = controlled ? props.value : st[0];
    var taRef = React.useRef(null);
    var id = useFieldId(props.id);
    var max = props.maxLength || 500;
    var setTa = function (el) { taRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; };
    React.useEffect(function () {
      var el = taRef.current; if (!el) return;
      el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }, [val]);
    function set(v) { if (!controlled) st[1](v); if (props.onChange) props.onChange(v); }
    function send() {
      var t = val.trim(); if (!t || props.disabled) return;
      if (props.onSend) props.onSend(t);
      set('');
    }
    var left = max - val.length;
    return h('div', { className: cx('bnk-comp', props.disabled && 'is-disabled', props.className) },
      props.popup ? h('div', { className: 'bnk-comp__pop' }, props.popup) : null,
      h('label', { htmlFor: id, className: 'bnk-sr' }, props.label || 'Nachricht schreiben'),
      h('div', { className: 'bnk-comp__box' },
        props.actions ? h('div', { className: 'bnk-comp__tools' }, props.actions) : null,
        h('textarea', Object.assign({ 'aria-describedby': id + '-hint' }, props.inputProps, { ref: setTa, id: id, rows: 1, className: 'bnk-comp__ta', value: val, maxLength: max, disabled: props.disabled,
          placeholder: props.placeholder || 'Nachricht … (# Wertpapier, ! Karte)',
          onChange: function (e) { set(e.target.value); },
          onKeyDown: function (e) {
            // Erst der Aufrufer (z. B. Vorschlagsliste: Enter wählt aus) – verhindert er, sendet Enter nicht.
            if (props.onKeyDown) props.onKeyDown(e);
            if (e.defaultPrevented) return;
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
          } })),
        h(Button, { variant: props.sendVariant || 'primary', size: 'sm', onClick: send, disabled: !val.trim() || props.disabled, className: 'bnk-comp__send' }, props.sendLabel || 'Senden')),
      h('div', { className: 'bnk-comp__hint', id: id + '-hint' },
        h('span', null, props.hint || 'Enter senden · Umschalt+Enter neue Zeile'),
        left <= 50 ? h('span', { className: cx('bnk-comp__count', left <= 0 && 'is-over') }, left) : null));
  });
  ChatComposer.displayName = 'ChatComposer';

  /* MentionMenu — Vorschläge beim Tippen von #/! im ChatComposer: Wertpapiere mit Name, ASIN · Art und Kurs.
     Steuert nichts selbst: active, onPick und onActive kommen vom Aufrufer (Pfeiltasten im Feld). */
  function MentionMenu(props) {
    var items = props.items || [];
    var id = props.id || 'bnk-mention';
    var cur = props.currency == null ? '€' : props.currency;
    return h('div', { className: cx('bnk-mention', props.className) },
      h('div', { className: 'bnk-mention__head' },
        h('span', null, props.mode === 'embed' ? 'Karte anhängen' : 'Wertpapier verlinken'),
        h('span', { className: 'bnk-mention__keys', 'aria-hidden': 'true' }, '↑↓ wählen · Enter · Esc')),
      items.length ? h('ul', { id: id, className: 'bnk-mention__list', role: 'listbox', 'aria-label': props.mode === 'embed' ? 'Karte anhängen' : 'Wertpapier verlinken' },
        items.map(function (it, i) {
          return h('li', { key: it.asin, id: id + '-o' + i, role: 'option', 'aria-selected': i === props.active ? 'true' : 'false',
              className: cx('bnk-mention__opt', i === props.active && 'is-active'),
              // mousedown: das Feld behält den Fokus
              onMouseDown: function (e) { e.preventDefault(); },
              onMouseEnter: function () { if (props.onActive) props.onActive(i); },
              onClick: function () { if (props.onPick) props.onPick(it); } },
            h('span', { className: 'bnk-mention__id' },
              h('span', { className: 'bnk-mention__name' }, it.name || it.asin),
              h('span', { className: 'bnk-mention__meta' },
                h('span', { className: 'bnk-mention__asin' }, it.asin),
                it.listingType && LISTING_TYPES[it.listingType] ? h('span', null, LISTING_TYPES[it.listingType]) : it.meta ? h('span', null, it.meta) : null)),
            it.price != null ? h('span', { className: 'bnk-mention__price' }, price(it.price, it.listingType, cur)) : null);
        }))
        : h('div', { className: 'bnk-mention__state', role: 'status' }, props.loading ? 'Suche …' : props.emptyText || 'Nichts gefunden.'));
  }

  /* AssetCard — Wertpapier als kleine Karte im Chat (!ASIN): Name, ASIN · Art, Kurs mit Veränderung,
     Kursverlauf als Sparkline über die volle Breite, bis zu drei Eckdaten. */
  function AssetCard(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var type = props.listingType && LISTING_TYPES[props.listingType];
    var cls = cx('bnk-acard', props.loading && 'is-loading', props.className);
    if (props.error) {
      return h('div', { className: cx(cls, 'is-error') },
        h('div', { className: 'bnk-acard__head' },
          h('span', { className: 'bnk-acard__id' }, h('span', { className: 'bnk-acard__asin' }, props.asin)),
          h('span', { className: 'bnk-acard__note' }, props.error)));
    }
    if (props.loading) {
      return h('div', { className: cls, 'aria-busy': 'true', 'aria-label': (props.asin || 'Wertpapier') + ' wird geladen' },
        h('div', { className: 'bnk-acard__head' },
          h('span', { className: 'bnk-acard__id' }, h(Skeleton, { variant: 'text', width: '70%' }), h('span', { className: 'bnk-acard__asin' }, props.asin)),
          h(Skeleton, { variant: 'text', width: 72 })),
        h(Skeleton, { variant: 'block', height: 56, className: 'bnk-acard__chart' }),
        h('div', { className: 'bnk-acard__facts' }, h(Skeleton, { variant: 'text', width: '100%' })));
    }
    var spark = (props.spark || []).filter(function (v) { return v != null && !isNaN(v); });
    var facts = (props.facts || []).slice(0, 3);
    var inner = [
      h('div', { key: 'h', className: 'bnk-acard__head' },
        h('span', { className: 'bnk-acard__id' },
          h('span', { className: 'bnk-acard__name' }, props.name || props.asin),
          h('span', { className: 'bnk-acard__meta' }, h('span', { className: 'bnk-acard__asin' }, props.asin), type ? h('span', null, type) : null)),
        h('span', { className: 'bnk-acard__px' },
          h('span', { className: 'bnk-acard__price' }, props.price != null ? price(props.price, props.listingType, cur) : '–'),
          props.change != null ? h(PriceChange, { value: props.change, size: 'sm', suffix: props.changeSuffix }) : null)),
      h('div', { key: 'c', className: 'bnk-acard__chart' },
        spark.length > 1
          ? h(Sparkline, { data: spark, width: 320, height: 56, label: props.name, currency: props.listingType && /BOND|REPO/.test(props.listingType) ? '%' : cur })
          : h('span', { className: 'bnk-acard__nochart' }, 'Kein Kursverlauf'),
        props.period ? h('span', { className: 'bnk-acard__period' }, props.period) : null),
      facts.length ? h('dl', { key: 'f', className: 'bnk-acard__facts' }, facts.map(function (f, i) {
        return h('div', { key: i }, h('dt', null, f.label), h('dd', null, f.value));
      })) : null
    ];
    return props.href ? h('a', { className: cls, href: props.href }, inner) : h('div', { className: cls }, inner);
  }

  /* UserPicker — Spieler per Namen suchen und auswählen; gewählte als Chips mit ✕. Sucht nicht selbst: onSearch liefert den Text, results die Treffer. */
  function UserPicker(props) {
    var value = props.value || [];
    var qSt = React.useState('');
    var q = qSt[0];
    var id = useFieldId(props.id);
    var min = props.minChars == null ? 2 : props.minChars;
    var taken = {};
    value.forEach(function (u) { taken[u.id] = true; });
    (props.exclude || []).forEach(function (n) { taken['name:' + n] = true; });
    var hits = (props.results || []).filter(function (u) { return !taken[u.id] && !taken['name:' + u.username]; }).slice(0, props.max || 8);
    function setQ(v) { qSt[1](v); if (props.onSearch) props.onSearch(v); }
    function pick(u) { if (props.onChange) props.onChange(value.concat([u])); setQ(''); }
    function drop(u) { if (props.onChange) props.onChange(value.filter(function (x) { return x.id !== u.id; })); }
    var searching = q.trim().length >= min;
    return h('div', { className: cx('bnk-upick', props.className) },
      h(Input, { id: id, label: props.label, placeholder: props.placeholder || 'Spielername suchen', value: q, autoComplete: 'off',
        hint: q.trim().length > 0 && !searching ? 'Mindestens ' + min + ' Zeichen eingeben.' : props.hint,
        onChange: function (e) { setQ(e.target.value); },
        onKeyDown: function (e) { if (e.key === 'Enter' && hits.length) { e.preventDefault(); pick(hits[0]); } } }),
      value.length ? h('ul', { className: 'bnk-upick__chips', 'aria-label': 'Ausgewählt' }, value.map(function (u) {
        return h('li', { key: u.id },
          h(Avatar, { name: u.username, size: 20 }),
          h('span', null, u.username),
          h('button', { type: 'button', 'aria-label': u.username + ' entfernen', onClick: function () { drop(u); } }, '×'));
      })) : null,
      searching ? h('ul', { className: 'bnk-upick__results', 'aria-live': 'polite', 'aria-label': 'Treffer' },
        props.loading && !hits.length ? h('li', { className: 'bnk-upick__note' }, 'Suche …')
          : hits.length ? hits.map(function (u) {
            return h('li', { key: u.id }, h('button', { type: 'button', onClick: function () { pick(u); } },
              h(Avatar, { name: u.username, size: 28 }), h('span', null, u.username),
              u.meta ? h('small', null, u.meta) : null));
          })
          : h('li', { className: 'bnk-upick__note' }, props.emptyText || 'Niemand gefunden.')) : null);
  }

  /* ConversationList — Liste der Unterhaltungen, gruppiert (Direkt, Gruppen, Öffentlich). */
  function ConversationList(props) {
    var groups = props.groups || [{ items: props.items || [] }];
    return h('nav', { className: cx('bnk-convs', props.className), 'aria-label': props['aria-label'] || 'Unterhaltungen' },
      groups.map(function (g, gi) {
        return h('div', { key: gi, className: 'bnk-convs__grp' },
          g.label ? h('div', { className: 'bnk-convs__label' }, g.label) : null,
          h('ul', { className: 'bnk-convs__list' }, (g.items || []).map(function (c, i) {
            var p = { className: cx('bnk-conv', c.active && 'is-active', c.unread && 'is-unread'), 'aria-current': c.active ? 'true' : undefined,
              onClick: function (e) { if (props.onSelect) { e.preventDefault(); props.onSelect(c); } } };
            var body = [
              h('span', { key: 'av', className: 'bnk-conv__av' }, h(Avatar, { name: c.name, initials: c.initials || (c.kind === 'group' ? '#' : (c.kind === 'public' || c.kind === 'market') ? '№' : undefined), group: c.kind && c.kind !== 'direct', size: 36 }),
                c.online ? h('span', { className: 'bnk-conv__online', 'aria-label': 'online' }) : null),
              h('span', { key: 'tx', className: 'bnk-conv__text' },
                h('span', { className: 'bnk-conv__top' }, h('span', { className: 'bnk-conv__name' }, c.name), h('span', { className: 'bnk-conv__time' }, c.time)),
                h('span', { className: 'bnk-conv__bottom' }, h('span', { className: 'bnk-conv__prev' }, c.preview),
                  c.unread ? h('span', { className: 'bnk-conv__unread', 'aria-label': c.unread + ' ungelesen' }, c.unread) : null))
            ];
            return h('li', { key: c.id || i }, c.href ? h('a', Object.assign(p, { href: c.href }), body) : h('button', Object.assign(p, { type: 'button' }), body));
          })));
      }));
  }

  /* ChatWindow — Rahmen: links Unterhaltungen, rechts Kopf, Verlauf und Eingabe. Unter 720px nur eine Spalte. */
  function ChatWindow(props) {
    return h('section', { className: cx('bnk-chatwin', props.className), style: props.height ? { height: props.height } : undefined },
      h('div', { className: cx('bnk-chatwin__grid', props.list && 'has-list', props.mobileShowList && 'show-list') },
      props.list ? h('div', { className: 'bnk-chatwin__side' }, props.list) : null,
      h('div', { className: 'bnk-chatwin__main' },
        h('header', { className: 'bnk-chatwin__head' },
          props.onBack ? h('button', { type: 'button', className: 'bnk-chatwin__back', onClick: props.onBack, 'aria-label': 'Zurück zu den Unterhaltungen' }, h('span', { className: 'bnk-chev', 'aria-hidden': 'true' })) : null,
          h('div', { className: 'bnk-chatwin__title' },
            h('h2', null, props.title),
            props.subtitle ? h('div', { className: 'bnk-chatwin__sub' }, props.subtitle) : null),
          props.actions ? h('div', { className: 'bnk-chatwin__actions' }, props.actions) : null),
        props.notice ? h('div', { className: 'bnk-chatwin__notice' }, props.notice) : null,
        h('div', { className: 'bnk-chatwin__scroll' }, props.children),
        props.composer ? h('div', { className: 'bnk-chatwin__foot' }, props.composer) : null)));
  }


  /* ---------- Forum ---------- */

  /* Einfaches Forum-Markup: **fett**, *kursiv*, ## Überschrift, > Zitat, - Liste, 1. Liste, [Text](https://…), https://…,
     ![Bild](https://…), $TICKER, #ASIN. Absätze durch Leerzeile. Kein HTML – Links und Bilder nur mit http(s) bzw. „/…“ (intern). */
  function forumHref(u) { return /^https?:\/\/[^\s"'<>]+$/i.test(u) || /^\/(?!\/)[^\s"'<>]*$/.test(u) ? u : null; }
  function forumLink(href, children, key) {
    var ext = /^https?:/i.test(href);
    return h('a', { key: key, href: href, className: 'bnk-fbody__link', target: ext ? '_blank' : undefined, rel: ext ? 'noopener noreferrer' : undefined }, children);
  }
  function forumInline(text, tickers, keyBase) {
    var out = [], re = /(!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s<]*[^\s<.,;:!?)"'»“]|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\$[A-Z][A-Z0-9]{1,9}\b|(?<![\w$#!])#[A-Z][A-Z0-9]{9}\b)/g, last = 0, m, k = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      var t = m[0], key = keyBase + '-' + (k++), lm, href;
      if (t.charAt(0) === '$' || t.charAt(0) === '#') out.push(h(TickerMention, { key: key, ticker: t.slice(1), prefix: t.charAt(0), info: tickers && tickers[t.slice(1)] }));
      else if ((lm = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t))) {
        href = forumHref(lm[2]);
        out.push(href ? h('img', { key: key, src: href, alt: lm[1], loading: 'lazy', className: 'bnk-fbody__img' }) : t);
      } else if ((lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t))) {
        href = forumHref(lm[2]);
        out.push(href ? forumLink(href, forumInline(lm[1], tickers, key), key) : t);
      } else if (/^https?:/i.test(t)) out.push(forumLink(t, t, key));
      else if (t.slice(0, 2) === '**') out.push(h('strong', { key: key }, forumInline(t.slice(2, -2), tickers, key)));
      else out.push(h('em', { key: key }, forumInline(t.slice(1, -1), tickers, key)));
      last = m.index + t.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  function forumLineKind(l) {
    return /^>\s?/.test(l) ? 'q' : /^[-•]\s+/.test(l) ? 'ul' : /^\d+[.)]\s+/.test(l) ? 'ol' : /^#{1,3}\s+/.test(l) ? 'h' : 'p';
  }
  function renderForumText(text, tickers) {
    if (typeof text !== 'string') return text;
    /* Zeilen gleicher Art bilden einen Block; Leerzeile beendet ihn, eine Überschrift steht immer allein. */
    var groups = [], cur = null;
    text.replace(/\r/g, '').split('\n').forEach(function (l) {
      if (!l.trim()) { cur = null; return; }
      var kind = forumLineKind(l);
      if (!cur || cur.kind !== kind || kind === 'h') groups.push(cur = { kind: kind, lines: [] });
      cur.lines.push(l);
    });
    return groups.map(function (g, i) {
      var lines = g.lines;
      if (g.kind === 'q') {
        return h('blockquote', { key: i, className: 'bnk-fbody__quote' },
          h('p', null, forumInline(lines.map(function (l) { return l.replace(/^>\s?/, ''); }).join(' '), tickers, 'q' + i)));
      }
      if (g.kind === 'ul' || g.kind === 'ol') {
        return h(g.kind, { key: i }, lines.map(function (l, j) { return h('li', { key: j }, forumInline(l.replace(/^([-•]|\d+[.)])\s+/, ''), tickers, 'l' + i + '-' + j)); }));
      }
      if (g.kind === 'h') {
        return h(/^###/.test(lines[0]) ? 'h4' : 'h3', { key: i, className: 'bnk-fbody__h' }, forumInline(lines[0].replace(/^#{1,3}\s+/, ''), tickers, 'h' + i));
      }
      var parts = [];
      lines.forEach(function (l, j) { if (j) parts.push(h('br', { key: 'br' + j })); parts.push.apply(parts, forumInline(l, tickers, 'p' + i + '-' + j)); });
      return h('p', { key: i }, parts);
    });
  }
  function ForumText(props) {
    return h('div', { className: cx('bnk-fbody', props.className) }, renderForumText(props.text, props.tickers));
  }

  /* StockEmbed — Aktie als Karte im Beitrag: Name, Ticker, Kurs, Veränderung, Sparkline. */
  function StockEmbed(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var inner = [
      h('span', { key: 'id', className: 'bnk-sembed__id' },
        h('span', { className: 'bnk-sembed__name' }, props.name),
        h('span', { className: 'bnk-sembed__ticker' }, props.ticker + (props.period ? ' · ' + props.period : ''))),
      props.spark ? h(Sparkline, { key: 's', data: props.spark, width: 112, height: 32, label: props.name }) : null,
      h('span', { key: 'p', className: 'bnk-sembed__px' },
        h('span', { className: 'bnk-sembed__price' }, price(props.price, props.listingType, cur)),
        props.change != null ? h(PriceChange, { value: props.change, size: 'sm' }) : null)
    ];
    return props.href ? h('a', { className: 'bnk-sembed', href: props.href }, inner) : h('div', { className: 'bnk-sembed' }, inner);
  }

  /* ForumCategoryList — Startseite des Forums: Bereiche mit Themen-/Beitragszahl und letztem Beitrag. */
  function ForumCategoryList(props) {
    var cats = props.categories || [];
    return h('div', { className: cx('bnk-fcats', props.className) },
      h('div', { className: 'bnk-fcats__head', 'aria-hidden': 'true' },
        h('span', null, props.label || 'Bereich'), h('span', { className: 'bnk-fcats__num' }, 'Themen'), h('span', { className: 'bnk-fcats__num' }, 'Beiträge'), h('span', null, 'Letzter Beitrag')),
      h('ul', { className: 'bnk-fcats__list', 'aria-label': props['aria-label'] || 'Forenbereiche' },
        cats.map(function (c, i) {
          var nameProps = { className: 'bnk-fcat__name' };
          var name = c.href ? h('a', Object.assign(nameProps, { href: c.href, onClick: props.onSelect ? function (e) { props.onSelect(c, e); } : undefined }), c.name)
            : h('button', Object.assign(nameProps, { type: 'button', onClick: function (e) { if (props.onSelect) props.onSelect(c, e); } }), c.name);
          return h('li', { key: c.id || i, className: cx('bnk-fcat', c.unread && 'is-unread') },
            h(Avatar, { initials: c.initials || String(c.name).charAt(0), group: true, size: 36, className: 'bnk-fcat__mark' }),
            h('div', { className: 'bnk-fcat__main' },
              h('div', { className: 'bnk-fcat__title' }, name,
                c.unread ? h('span', { className: 'bnk-fcat__new' }, h('span', { className: 'bnk-fcat__dot', 'aria-hidden': 'true' }), c.unread === true ? 'Neu' : fmt(c.unread, 0) + ' neu') : null),
              c.description ? h('div', { className: 'bnk-fcat__desc' }, c.description) : null,
              h('div', { className: 'bnk-fcat__counts-inline' }, fmt(c.threads || 0, 0) + ' Themen · ' + fmt(c.posts || 0, 0) + ' Beiträge')),
            h('span', { className: 'bnk-fcat__num' }, h('span', { className: 'bnk-sr' }, 'Themen: '), fmt(c.threads || 0, 0)),
            h('span', { className: 'bnk-fcat__num' }, h('span', { className: 'bnk-sr' }, 'Beiträge: '), fmt(c.posts || 0, 0)),
            c.last ? h('div', { className: 'bnk-fcat__last' },
              c.last.href ? h('a', { href: c.last.href, className: 'bnk-fcat__lastlink' }, c.last.title) : h('span', { className: 'bnk-fcat__lastlink' }, c.last.title),
              h('span', { className: 'bnk-fcat__lastmeta' }, [c.last.author, c.last.time].filter(Boolean).join(' · '))) : h('div', { className: 'bnk-fcat__last' }));
        })));
  }

  /* ThreadList — Themen einer Kategorie: Titel, Autor, Aktien, Antworten, Aufrufe, letzte Antwort. Angepinnte zuerst. */
  function ThreadFlag(props) {
    return h('span', { className: cx('bnk-tflag', 'bnk-tflag--' + props.kind) }, h('span', { className: 'bnk-tflag__mark', 'aria-hidden': 'true' }), props.children);
  }
  function ThreadList(props) {
    var threads = props.threads || [];
    var pinned = threads.filter(function (t) { return t.pinned; }), rest = threads.filter(function (t) { return !t.pinned; });
    function row(t, i) {
      var tp = { className: 'bnk-thread__title' };
      var title = t.href ? h('a', Object.assign(tp, { href: t.href, onClick: props.onSelect ? function (e) { props.onSelect(t, e); } : undefined }), t.title)
        : h('button', Object.assign(tp, { type: 'button', onClick: function (e) { if (props.onSelect) props.onSelect(t, e); } }), t.title);
      var a = t.author || {};
      return h('li', { key: t.id || i, className: cx('bnk-thread', t.unread && 'is-unread', t.locked && 'is-locked') },
        h('div', { className: 'bnk-thread__main' },
          (t.pinned || t.locked) ? h('div', { className: 'bnk-thread__flags' },
            t.pinned ? h(ThreadFlag, { kind: 'pinned' }, 'Angepinnt') : null,
            t.locked ? h(ThreadFlag, { kind: 'locked' }, 'Geschlossen') : null) : null,
          h('div', { className: 'bnk-thread__titlerow' }, title,
            t.unread ? h('span', { className: 'bnk-thread__new' }, t.unread === true ? 'Neu' : fmt(t.unread, 0) + ' neu') : null),
          h('div', { className: 'bnk-thread__meta' },
            h('span', null, 'von ', h('span', { className: 'bnk-thread__author' }, a.name || a), t.time ? ' · ' + t.time : ''),
            (t.tickers || []).length ? h('span', { className: 'bnk-thread__ticks' }, t.tickers.map(function (k) {
              return h(TickerMention, { key: k, ticker: k, info: props.tickers && props.tickers[k] ? { name: props.tickers[k].name, href: props.tickers[k].href } : null });
            })) : null,
            h('span', { className: 'bnk-thread__counts-inline' }, fmt(t.replies || 0, 0) + ' Antworten'))),
        h('span', { className: 'bnk-thread__num' }, h('span', { className: 'bnk-sr' }, 'Antworten: '), fmt(t.replies || 0, 0)),
        h('span', { className: 'bnk-thread__num bnk-thread__num--muted' }, h('span', { className: 'bnk-sr' }, 'Aufrufe: '), fmt(t.views || 0, 0)),
        h('div', { className: 'bnk-thread__last' }, t.last ? [
          h('span', { key: 'a', className: 'bnk-thread__lastauthor' }, t.last.author),
          h('span', { key: 't', className: 'bnk-thread__lasttime' }, t.last.time)] : null));
    }
    return h('div', { className: cx('bnk-threads', props.className) },
      h('div', { className: 'bnk-threads__head', 'aria-hidden': 'true' },
        h('span', null, 'Thema'), h('span', { className: 'bnk-thread__num' }, 'Antworten'), h('span', { className: 'bnk-thread__num' }, 'Aufrufe'), h('span', null, 'Letzte Antwort')),
      h('ul', { className: 'bnk-threads__list', 'aria-label': props['aria-label'] || 'Themen' },
        pinned.map(row),
        pinned.length && rest.length ? h('li', { key: 'sep', className: 'bnk-threads__sep', role: 'presentation' }) : null,
        rest.map(row)),
      !threads.length ? h('div', { className: 'bnk-threads__empty' }, props.emptyText || 'Noch keine Themen. Starte das erste.') : null);
  }

  /* ForumPost — Beitrag im Zeitungsstil: Autorzeile oben, Text, Zitat, eingebettete Aktien/Trades, Aktionen. */
  function HelpfulButton(props) {
    var ctl = props.active !== undefined;
    var st = React.useState(!!props.defaultActive);
    var on = ctl ? !!props.active : st[0];
    var base = props.count || 0;
    var count = base + (!ctl && on && !props.defaultActive ? 1 : 0) - (!ctl && !on && props.defaultActive ? 1 : 0);
    return h('button', { type: 'button', className: cx('bnk-helpful', on && 'is-on'), 'aria-pressed': on ? 'true' : 'false', disabled: props.disabled,
        onClick: function () { if (!ctl) st[1](!on); if (props.onToggle) props.onToggle(!on); } },
      h('span', { className: 'bnk-helpful__mark', 'aria-hidden': 'true' }),
      h('span', null, 'Hilfreich'),
      count ? h('span', { className: 'bnk-helpful__count' }, h('span', { className: 'bnk-sr' }, ', '), fmt(count, 0)) : null);
  }
  var ForumPost = React.forwardRef(function ForumPost(props, ref) {
    var a = props.author || {};
    var id = useFieldId(props.id);
    var metaBits = [a.alliance || null, a.posts != null ? fmt(a.posts, 0) + ' Beiträge' : null].filter(Boolean);
    return h('article', { ref: ref, id: props.id, className: cx('bnk-post', props.op && 'is-op', props.hidden && 'is-hidden', props.className), 'aria-labelledby': id + '-a' },
      h('header', { className: 'bnk-post__head' },
        h(Avatar, { name: a.name, initials: a.initials, size: 36 }),
        h('div', { className: 'bnk-post__who' },
          h('div', { className: 'bnk-post__nameRow' },
            a.href ? h('a', { id: id + '-a', href: a.href, className: 'bnk-post__name' }, a.name) : h('span', { id: id + '-a', className: 'bnk-post__name' }, a.name),
            a.rank != null ? h(RankBadge, { rank: a.rank, size: 'sm', showLeague: false }) : null,
            props.op ? h('span', { className: 'bnk-post__role' }, 'Themenstarter') : null,
            a.role ? h('span', { className: 'bnk-post__role' }, a.role) : null),
          metaBits.length ? h('div', { className: 'bnk-post__meta' }, metaBits.join(' · ')) : null),
        h('div', { className: 'bnk-post__when' },
          props.time ? h('span', null, props.time) : null,
          props.number != null ? (props.permalink ? h('a', { href: props.permalink, className: 'bnk-post__num', 'aria-label': 'Link zu Beitrag ' + props.number }, '#' + props.number)
            : h('span', { className: 'bnk-post__num' }, '#' + props.number)) : null)),
      h('div', { className: 'bnk-post__body' },
        props.quote ? h('blockquote', { className: 'bnk-fbody__quote bnk-post__quote' },
          h('div', { className: 'bnk-post__quoteBy' }, (props.quote.author || 'Jemand') + ' schrieb' + (props.quote.number != null ? ' in #' + props.quote.number : '') + ':'),
          h('p', null, forumInline(String(props.quote.text || ''), props.tickers, 'qq'))) : null,
        props.children != null ? h('div', { className: 'bnk-fbody' }, props.children) : h(ForumText, { text: props.text, tickers: props.tickers }),
        (props.stocks || []).length || props.trade ? h('div', { className: 'bnk-post__embeds' },
          (props.stocks || []).map(function (s, i) { return h(StockEmbed, Object.assign({ key: 's' + i }, s)); }),
          props.trade ? h(TradeShare, props.trade) : null) : null,
        props.edited ? h('div', { className: 'bnk-post__edited' }, 'Bearbeitet ' + props.edited) : null),
      props.actions !== false ? h('footer', { className: 'bnk-post__foot' },
        props.helpful ? h(HelpfulButton, props.helpful) : null,
        props.onQuote ? h(Button, { variant: 'ghost', size: 'sm', onClick: props.onQuote }, 'Zitieren') : null,
        props.onReply ? h(Button, { variant: 'ghost', size: 'sm', onClick: props.onReply }, 'Antworten') : null,
        props.actions) : null);
  });
  ForumPost.displayName = 'ForumPost';

  /* Pagination — Seiten 1 … n, aktuelle Seite mit Messing-Linie wie ein Reiter. */
  function pageList(page, pages) {
    if (pages <= 7) return Array.apply(null, Array(pages)).map(function (_, i) { return i + 1; });
    var set = [1, pages, page - 1, page, page + 1].filter(function (p) { return p >= 1 && p <= pages; });
    if (page <= 3) set.push(2, 3, 4);
    if (page >= pages - 2) set.push(pages - 1, pages - 2, pages - 3);
    set = set.filter(function (p, i, a) { return a.indexOf(p) === i; }).sort(function (a, b) { return a - b; });
    var out = [];
    set.forEach(function (p, i) { if (i && p - set[i - 1] > 1) out.push('…' + p); out.push(p); });
    return out;
  }
  function Pagination(props) {
    var page = props.page || 1, pages = Math.max(1, props.pages || 1);
    function item(p, label, extra) {
      var disabled = p < 1 || p > pages;
      var common = { className: cx('bnk-pag__btn', extra) };
      if (disabled) return h('span', Object.assign(common, { 'aria-disabled': 'true', className: cx('bnk-pag__btn', extra, 'is-disabled') }), label);
      var on = function (e) { if (props.onChange) { if (!props.hrefFor) e.preventDefault(); props.onChange(p); } };
      return props.hrefFor ? h('a', Object.assign(common, { href: props.hrefFor(p), onClick: on }), label)
        : h('button', Object.assign(common, { type: 'button', onClick: on }), label);
    }
    return h('nav', { className: cx('bnk-pag', props.className), 'aria-label': props['aria-label'] || 'Seiten' },
      item(page - 1, [h('span', { key: 'c', className: 'bnk-chev bnk-pag__prev', 'aria-hidden': 'true' }), h('span', { key: 't', className: 'bnk-pag__word' }, 'Zurück')], 'bnk-pag__step'),
      h('ul', { className: 'bnk-pag__list' }, pageList(page, pages).map(function (p) {
        if (typeof p === 'string') return h('li', { key: p, className: 'bnk-pag__gap', 'aria-hidden': 'true' }, '…');
        var cur = p === page;
        return h('li', { key: p }, cur ? h('span', { className: 'bnk-pag__btn is-current', 'aria-current': 'page' }, h('span', { className: 'bnk-sr' }, 'Seite '), p)
          : item(p, [h('span', { key: 's', className: 'bnk-sr' }, 'Seite '), String(p)]));
      })),
      item(page + 1, [h('span', { key: 't', className: 'bnk-pag__word' }, 'Weiter'), h('span', { key: 'c', className: 'bnk-chev bnk-pag__next', 'aria-hidden': 'true' })], 'bnk-pag__step'),
      props.total ? h('span', { className: 'bnk-pag__total' }, props.total) : null);
  }

  /* ForumThread — Ansicht eines Themas: Kopf wie eine Zeitungsseite, Beiträge mit Haarlinien, Seiten, Antwortfeld. */
  function ForumThread(props) {
    var kids = React.Children.toArray(props.children);
    return h('section', { className: cx('bnk-fthread', props.className), 'aria-label': typeof props.title === 'string' ? props.title : undefined },
      h(PageHeader, { eyebrow: props.eyebrow, title: props.title, meta: props.meta, actions: props.actions, size: 'md', as: props.as || 'h1' }),
      props.notice || null,
      props.pagination ? h('div', { className: 'bnk-fthread__pag is-top' }, props.pagination) : null,
      h('ol', { className: 'bnk-fthread__posts' }, kids.map(function (k, i) { return h('li', { key: k.key || i }, k); })),
      props.pagination ? h('div', { className: 'bnk-fthread__pag' }, props.pagination) : null,
      props.locked ? h('div', { className: 'bnk-fthread__locked' }, h(ThreadFlag, { kind: 'locked' }, 'Geschlossen'), h('span', null, typeof props.locked === 'string' ? props.locked : 'Dieses Thema ist geschlossen. Antworten sind nicht mehr möglich.'))
        : props.reply ? h('div', { className: 'bnk-fthread__reply' }, props.reply) : null);
  }

  /* ForumEditor — neues Thema oder Antwort: Titel, Bereich, Text mit einfacher Formatierung, Vorschau. */
  var ForumEditor = React.forwardRef(function ForumEditor(props, ref) {
    var isThread = (props.mode || 'thread') === 'thread';
    var titleSt = React.useState(props.defaultTitle || '');
    var catSt = React.useState(props.defaultCategory || '');
    var bodySt = React.useState(props.defaultValue || '');
    var tabSt = React.useState(props.defaultTab || 'write');
    var ta = React.useRef(null);
    var id = useFieldId(props.id);
    var maxTitle = props.maxTitle || 120, maxBody = props.maxLength || 10000;
    var body = bodySt[0], title = titleSt[0];
    React.useImperativeHandle(ref, function () { return { focus: function () { if (ta.current) ta.current.focus(); },
      insertQuote: function (author, text) { var q = '> ' + (author ? '**' + author + ':** ' : '') + String(text).split('\n').join('\n> '); bodySt[1](function (b) { return (b ? b.replace(/\s*$/, '') + '\n\n' : '') + q + '\n\n'; }); tabSt[1]('write'); } }; });
    function wrap(before, after, placeholder) {
      var el = ta.current; if (!el) return;
      var s = el.selectionStart, e = el.selectionEnd, sel = body.slice(s, e) || placeholder;
      var next = body.slice(0, s) + before + sel + after + body.slice(e);
      bodySt[1](next);
      requestAnimationFrame(function () { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); });
    }
    function prefix(p, placeholder) {
      var el = ta.current; if (!el) return;
      var s = el.selectionStart, e = el.selectionEnd;
      var ls = body.lastIndexOf('\n', s - 1) + 1, le = body.indexOf('\n', e); if (le < 0) le = body.length;
      var sel = body.slice(ls, le) || placeholder;
      var block = sel.split('\n').map(function (l) { return l.indexOf(p) === 0 ? l : p + l; }).join('\n');
      var pre = body.slice(0, ls), post = body.slice(le);
      if (pre && !/\n\n$/.test(pre)) pre = pre.replace(/\n?$/, '\n\n');
      if (post && !/^\n\n/.test(post)) post = post.replace(/^\n?/, '\n\n');
      bodySt[1](pre + block + post);
      requestAnimationFrame(function () { el.focus(); var at = pre.length + block.length; el.setSelectionRange(at, at); });
    }
    var tools = [
      { k: 'b', label: 'Fett', glyph: h('strong', null, 'F'), run: function () { wrap('**', '**', 'fetter Text'); } },
      { k: 'i', label: 'Kursiv', glyph: h('em', null, 'K'), run: function () { wrap('*', '*', 'kursiver Text'); } },
      { k: 'h', label: 'Zwischenüberschrift', glyph: h('strong', null, 'H'), run: function () { prefix('## ', 'Zwischenüberschrift'); } },
      { k: 'q', label: 'Zitat', glyph: '„“', run: function () { prefix('> ', 'Zitat'); } },
      { k: 'l', label: 'Liste', glyph: '•', run: function () { prefix('- ', 'Punkt'); } },
      { k: 'n', label: 'Nummerierte Liste', glyph: '1.', run: function () { prefix('1. ', 'Punkt'); } },
      { k: 'a', label: 'Link', glyph: '↗', run: function () { wrap('[', '](https://)', 'Linktext'); } },
      { k: 't', label: 'Aktie erwähnen', glyph: '$', run: function () { wrap('$', '', 'HRD'); } }
    ];
    var canSend = body.trim() && (!isThread || (title.trim() && (catSt[0] || !props.categories)));
    function submit(e) {
      if (e) e.preventDefault();
      if (!canSend || props.disabled) return;
      if (props.onSubmit) props.onSubmit({ title: title.trim(), category: catSt[0], body: body.trim() });
    }
    var tab = tabSt[0];
    return h('form', { className: cx('bnk-feditor', 'bnk-feditor--' + (isThread ? 'thread' : 'reply'), props.className), onSubmit: submit, noValidate: true },
      props.heading ? h('div', { className: 'bnk-feditor__heading' }, props.heading) : null,
      isThread ? h('div', { className: 'bnk-feditor__fields' },
        h(Input, { label: 'Titel', value: title, maxLength: maxTitle, placeholder: props.titlePlaceholder || 'Worum geht es?', onChange: function (e) { titleSt[1](e.target.value); },
          hint: title.length > maxTitle - 20 ? 'Noch ' + (maxTitle - title.length) + ' Zeichen' : undefined }),
        props.categories ? h(Select, { label: 'Bereich', value: catSt[0], placeholder: 'Bereich wählen', options: props.categories, onChange: function (e) { catSt[1](e.target.value); } }) : null) : null,
      h('div', { className: 'bnk-feditor__box' },
        h('div', { className: 'bnk-feditor__bar' },
          h('div', { role: 'tablist', 'aria-label': 'Ansicht', className: 'bnk-feditor__tabs' },
            [['write', 'Schreiben'], ['preview', 'Vorschau']].map(function (t) {
              return h('button', { key: t[0], type: 'button', role: 'tab', 'aria-selected': tab === t[0] ? 'true' : 'false', id: id + '-t-' + t[0], 'aria-controls': id + '-p',
                className: cx('bnk-feditor__tab', tab === t[0] && 'is-on'), onClick: function () { tabSt[1](t[0]); } }, t[1]);
            })),
          tab === 'write' ? h('div', { className: 'bnk-feditor__tools', role: 'toolbar', 'aria-label': 'Formatierung', 'aria-controls': id + '-ta' },
            tools.map(function (t) { return h('button', { key: t.k, type: 'button', className: 'bnk-feditor__tool', title: t.label, 'aria-label': t.label, onClick: t.run, disabled: props.disabled }, t.glyph); })) : null),
        h('div', { id: id + '-p', role: 'tabpanel', 'aria-labelledby': id + '-t-' + tab, className: 'bnk-feditor__panel' },
          tab === 'write'
            ? h('textarea', { ref: ta, id: id + '-ta', className: 'bnk-feditor__ta', value: body, maxLength: maxBody, disabled: props.disabled,
                'aria-label': isThread ? 'Beitrag' : 'Antwort', 'aria-describedby': id + '-hint',
                placeholder: props.placeholder || (isThread ? 'Deine Einschätzung, deine Frage, deine Strategie …' : 'Deine Antwort …'),
                style: { minHeight: props.rows ? props.rows * 24 + 24 : (isThread ? 200 : 120) },
                onChange: function (e) { bodySt[1](e.target.value); },
                onKeyDown: function (e) {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e);
                  if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'i')) { e.preventDefault(); (e.key === 'b' ? tools[0] : tools[1]).run(); }
                } })
            : h('div', { className: 'bnk-feditor__preview' },
                body.trim() ? h(ForumText, { text: body, tickers: props.tickers }) : h('p', { className: 'bnk-feditor__empty' }, 'Noch nichts zu sehen.')))),
      h('div', { className: 'bnk-feditor__foot' },
        h('span', { id: id + '-hint', className: 'bnk-feditor__hint' }, props.hint || '**fett**  *kursiv*  ## Überschrift  > Zitat  - Liste  [Text](https://…)  $HRD'),
        h('div', { className: 'bnk-feditor__actions' },
          props.onCancel ? h(Button, { onClick: props.onCancel }, props.cancelLabel || 'Abbrechen') : null,
          h(Button, { type: 'submit', variant: props.submitVariant || 'primary', disabled: !canSend || props.disabled, loading: props.loading },
            props.submitLabel || (isThread ? 'Thema veröffentlichen' : 'Antworten')))));
  });
  ForumEditor.displayName = 'ForumEditor';


  /* ---------- Spielkern: Zeit, Order, Highscores, Zeitung ---------- */

  /* useNow — aktuelle Zeit, tickt im angegebenen Takt (ms). */
  function useNow(every) {
    var st = React.useState(function () { return Date.now(); });
    React.useEffect(function () {
      var t = setInterval(function () { st[1](Date.now()); }, every || 1000);
      return function () { clearInterval(t); };
    }, [every]);
    return st[0];
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* Restzeit als Text: „6 T 04:12:33“, „1:24:05“, „04:12“ */
  function formatLeft(ms, opts) {
    opts = opts || {};
    if (ms <= 0) return opts.zero || '0:00:00';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    if (opts.short) return d ? d + ' T ' + hh + ' h' : hh ? hh + ':' + pad2(mm) + ' h' : mm + ' Min.';
    return (d ? d + ' T ' : '') + (d ? pad2(hh) : hh) + ':' + pad2(mm) + ':' + pad2(ss);
  }
  function wordsLeft(ms) {
    if (ms <= 0) return 'abgelaufen';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60);
    return [d ? d + (d === 1 ? ' Tag' : ' Tage') : null, hh ? hh + (hh === 1 ? ' Stunde' : ' Stunden') : null, !d && mm ? mm + (mm === 1 ? ' Minute' : ' Minuten') : null].filter(Boolean).join(', ') || 'unter einer Minute';
  }

  /* Countdown — Restzeit: Zeichnungsfrist, Order-Gültigkeit, nächste Limit-Änderung. */
  function Countdown(props) {
    var to = props.to instanceof Date ? props.to.getTime() : Number(props.to);
    var now = useNow(props.interval || 1000);
    var left = to - now;
    var ended = left <= 0;
    var fired = React.useRef(false);
    React.useEffect(function () { if (ended && !fired.current) { fired.current = true; if (props.onEnd) props.onEnd(); } }, [ended]);
    var text = ended ? (props.endedText || 'Beendet') : formatLeft(left, { short: props.short });
    var label = (props.label ? props.label + ': ' : '') + (ended ? (props.endedText || 'beendet') : 'noch ' + wordsLeft(left));
    if ((props.variant || 'inline') === 'inline') {
      return h('span', { className: cx('bnk-cd', 'bnk-cd--inline', ended && 'is-ended', props.className), role: 'timer', 'aria-label': label },
        props.label ? h('span', { className: 'bnk-cd__label', 'aria-hidden': 'true' }, props.label) : null,
        h('span', { className: 'bnk-cd__value', 'aria-hidden': 'true' }, text));
    }
    return h('div', { className: cx('bnk-cd', 'bnk-cd--tile', ended && 'is-ended', props.className), role: 'timer', 'aria-label': label },
      props.label ? h('div', { className: 'bnk-cd__label', 'aria-hidden': 'true' }, props.label) : null,
      h('div', { className: 'bnk-cd__value', 'aria-hidden': 'true' }, text),
      props.hint ? h('div', { className: 'bnk-cd__hint' }, props.hint) : null);
  }

  /* ---------- Order-Maske (API: POST /securityorders) ---------- */

  function toNum(v) { var n = typeof v === 'number' ? v : parseDe(v); return isNaN(n) ? NaN : n; }
  function apiNum(n) { return n == null || isNaN(n) ? undefined : String(Math.round(n * 1e6) / 1e6); }
  function lastOf(spread) { var l = spread && spread.lastPrice; return l == null ? null : typeof l === 'number' ? l : l.value; }
  function toLocalInput(ms) { if (!ms) return ''; var d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
  function fromLocalInput(s) { return s ? new Date(s).getTime() : undefined; }
  var ORDER_PARAM_LABEL = { OWNER: 'Portfolio', LISTING: 'Wertpapier', NUMBER_OF_SHARES: 'Anteile', PRICE: 'Limit', TYPE: 'Ordertyp', ACTION: 'Aktion', HOURLY_CHANGE: 'Stündliche Änderung', GOOD_AFTER_DATE: 'Gültig ab', GOOD_TILL_DATE: 'Gültig bis' };
  function messageText(msg) {
    if (!msg) return '';
    if (typeof msg === 'string') return msg;
    return msg.filledString || msg.message || msg.text || msg.messageKey || JSON.stringify(msg);
  }

  var OrderTicket = React.forwardRef(function OrderTicket(props, ref) {
    var listing = props.listing || {};
    var spread = props.spread || {};
    var accounts = props.accounts || [];
    var cur = props.currency == null ? '€' : props.currency;
    var pct = isPercentQuoted(listing.type);
    var face = pct ? (props.faceValue || 1) : 1;
    var accSt = React.useState(props.defaultAccountId || (accounts[0] && accounts[0].id) || '');
    var actSt = React.useState(props.defaultAction || 'BUY');
    var typeSt = React.useState(props.defaultType || 'MARKET');
    var modeSt = React.useState('shares');
    var qtySt = React.useState(props.defaultShares != null ? String(props.defaultShares) : '');
    var amtSt = React.useState('');
    var limSt = React.useState(props.defaultPrice != null ? fmt(props.defaultPrice, pct ? 4 : 2) : '');
    var moreSt = React.useState(false);
    var hcSt = React.useState(''), gadSt = React.useState(''), gtdSt = React.useState(''), cpSt = React.useState('');
    var stepSt = React.useState('edit');
    var checkSt = React.useState(props.check || null);
    var busySt = React.useState(false);
    var touched = React.useState(false);
    var confirmRef = React.useRef(null);
    var accountId = props.accountId || accSt[0];
    var account = accounts.filter(function (a) { return a.id === accountId; })[0] || accounts[0] || {};
    var action = props.action || actSt[0], type = typeSt[0], step = stepSt[0];
    React.useEffect(function () { if (step === 'review' && confirmRef.current) confirmRef.current.focus(); }, [step]);
    React.useEffect(function () { if (props.check !== undefined) checkSt[1](props.check); }, [props.check]);
    var cash = Number(account.cash != null ? account.cash : props.cash) || 0;
    var pos = props.position || {};
    var held = Number(pos.numberOfShares) || 0;
    var ask = spread.askPrice, bid = spread.bidPrice, last = lastOf(spread);
    var lim = toNum(limSt[0]);
    var px = type === 'LIMIT' ? lim : (action === 'BUY' ? (ask != null ? ask : last) : (bid != null ? bid : last));
    var unitValue = px > 0 ? px * (pct ? face / 100 : 1) : 0;
    var qty = modeSt[0] === 'amount' ? (unitValue ? Math.floor(toNum(amtSt[0]) / unitValue) : NaN) : toNum(qtySt[0]);
    var vol = qty > 0 && unitValue ? Math.round(qty * unitValue * 100) / 100 : 0;
    var maxBuy = unitValue ? Math.floor(cash / unitValue) : 0;
    var max = action === 'BUY' ? maxBuy : held;
    var check = checkSt[0];
    var concerning = (check && check.checkResult && check.checkResult.concerningParams) || [];
    var errQty = null, errLim = null;
    if (qtySt[0] !== '' || amtSt[0] !== '' || touched[0]) {
      if (!(qty > 0) || Math.floor(qty) !== qty) errQty = modeSt[0] === 'amount' ? 'Der Betrag reicht für keinen Anteil.' : 'Bitte eine ganze Zahl ab 1 eingeben.';
      else if (action === 'BUY' && vol > cash) errQty = 'Nicht genug Bargeld – höchstens ' + fmt(maxBuy, 0) + ' Anteile.';
      else if (action === 'SELL' && qty > held) errQty = held ? 'Im Portfolio sind nur ' + fmt(held, 0) + ' Anteile.' : 'Dieses Portfolio hält keine Anteile.';
    }
    if (type === 'LIMIT' && (limSt[0] !== '' || touched[0]) && !(lim > 0)) errLim = 'Bitte ein Limit eingeben.';
    if (!errQty && concerning.indexOf('NUMBER_OF_SHARES') !== -1) errQty = 'Von der Prüfung beanstandet.';
    if (!errLim && concerning.indexOf('PRICE') !== -1) errLim = 'Von der Prüfung beanstandet.';
    var valid = qty > 0 && Math.floor(qty) === qty && !errQty && (type === 'MARKET' || lim > 0) && !errLim && listing.securityIdentifier;
    var params = {
      owner: account.id, securityIdentifier: listing.securityIdentifier, action: action, type: type,
      price: type === 'LIMIT' ? apiNum(lim) : undefined, numberOfShares: qty > 0 ? qty : undefined,
      hourlyChange: type === 'LIMIT' && hcSt[0] !== '' ? apiNum(toNum(hcSt[0])) : undefined,
      goodAfterDate: fromLocalInput(gadSt[0]), goodTillDate: fromLocalInput(gtdSt[0]),
      counterparty: cpSt[0] || undefined
    };
    var verb = action === 'BUY' ? 'Kaufen' : 'Verkaufen';
    function reset() { checkSt[1](null); }
    function review(e) {
      if (e) e.preventDefault(); touched[1](true);
      if (!valid) return;
      if (props.confirm === false) { if (props.onSubmit) props.onSubmit(params); return; }
      if (props.onCheck) {
        busySt[1](true);
        Promise.resolve(props.onCheck(Object.assign({ checkOrderOnly: true }, params))).then(function (res) {
          busySt[1](false); checkSt[1](res || null);
          if (!res || !res.checkResult || !res.checkResult.failed) stepSt[1]('review');
        }, function () { busySt[1](false); });
      } else stepSt[1]('review');
    }
    React.useImperativeHandle(ref, function () { return { reset: function () { qtySt[1](''); amtSt[1](''); limSt[1](''); stepSt[1]('edit'); touched[1](false); checkSt[1](null); } }; });

    var failed = check && check.checkResult && check.checkResult.failed;
    var checkBanner = failed ? h(Banner, { variant: 'error', title: 'Order nicht möglich' },
      messageText(check.checkResult.msg) + (concerning.length ? ' (' + concerning.map(function (c) { return ORDER_PARAM_LABEL[c] || c; }).join(', ') + ')' : '')) : null;

    var head = h('div', { className: 'bnk-ot__head' },
      h('div', { className: 'bnk-ot__id' },
        h('span', { className: 'bnk-ot__name' }, listing.name || 'Wertpapier wählen'),
        listing.securityIdentifier ? h('span', { className: 'bnk-ot__ticker' }, [listing.securityIdentifier, LISTING_TYPES[listing.type]].filter(Boolean).join(' · ')) : null),
      last != null ? h('div', { className: 'bnk-ot__px' },
        h('span', { className: 'bnk-ot__price' }, price(last, listing.type, cur)),
        props.change != null ? h(PriceChange, { value: props.change, size: 'sm', suffix: props.changeSuffix }) : null) : null,
      bid != null || ask != null ? h('dl', { className: 'bnk-ot__quote' },
        h('div', null, h('dt', null, 'Geld'), h('dd', null, price(bid, listing.type, ''), spread.bidSize != null ? h('small', null, ' (' + number(spread.bidSize, 0, true) + ')') : null)),
        h('div', null, h('dt', null, 'Brief'), h('dd', null, price(ask, listing.type, ''), spread.askSize != null ? h('small', null, ' (' + number(spread.askSize, 0, true) + ')') : null)),
        spread.spreadPercent != null ? h('div', null, h('dt', null, 'Spread'), h('dd', null, fmt(spread.spreadPercent, 2) + ' %')) : null) : null);

    if (step === 'review') {
      var validityText = [params.goodAfterDate ? 'ab ' + dateTime(params.goodAfterDate) : null, params.goodTillDate ? 'bis ' + dateTime(params.goodTillDate) : null].filter(Boolean).join(' · ');
      return h('div', { className: cx('bnk-ot', 'is-review', props.className) },
        head,
        h('div', { className: 'bnk-ot__reviewTitle', role: 'heading', 'aria-level': 3 }, 'Order prüfen'),
        h(SummaryList, { items: [
          accounts.length > 1 ? { label: 'Portfolio', value: account.name } : null,
          { label: 'Auftrag', value: verb + ' · ' + (type === 'LIMIT' ? 'Limit' : 'Market') },
          { label: 'Anteile', value: qty, currency: '', decimals: 0 },
          type === 'LIMIT' ? { label: 'Limit', value: price(lim, listing.type, cur) } : null,
          check && check.executionPrice != null ? { label: 'Ausführungskurs (geprüft)', value: price(check.executionPrice, listing.type, cur) } : { label: 'Kurs (geschätzt)', value: price(px, listing.type, cur) },
          params.hourlyChange ? { label: 'Stündliche Änderung', value: fmt(toNum(hcSt[0]), 2) + ' ' + cur } : null,
          validityText ? { label: 'Gültigkeit', value: validityText } : null,
          params.counterparty ? { label: 'Gegenpartei (OTC)', value: params.counterparty } : null,
          { label: action === 'BUY' ? 'Volumen' : 'Erlös', value: check && check.executionVolume != null ? check.executionVolume : vol, currency: cur, total: true },
          { label: 'Bargeld danach', value: action === 'BUY' ? cash - vol : cash + vol, currency: cur, muted: true }
        ].filter(Boolean) }),
        pos.averageBuyingPrice && action === 'SELL' && px > 0 ? h('div', { className: 'bnk-ot__pl' }, h('span', null, 'Ergebnis (geschätzt)'),
          h(PriceChange, { value: (px / pos.averageBuyingPrice - 1) * 100, amount: (px - pos.averageBuyingPrice) * qty * (pct ? face / 100 : 1) })) : null,
        h('div', { className: 'bnk-ot__actions' },
          h(Button, { onClick: function () { stepSt[1]('edit'); } }, 'Ändern'),
          h(Button, { ref: confirmRef, variant: props.submitVariant || 'primary', loading: props.loading,
            onClick: function () { if (props.onSubmit) props.onSubmit(params); } }, props.loading ? 'Order wird gesendet' : verb + ' bestätigen')));
    }

    var chips = [['Geld', bid], ['Letzter', last], ['Brief', ask]].filter(function (c) { return c[1] != null; });
    return h('form', { className: cx('bnk-ot', props.className), onSubmit: review, noValidate: true, 'aria-label': 'Order' + (listing.name ? ' ' + listing.name : '') },
      head,
      !listing.securityIdentifier && props.listingPicker ? props.listingPicker : null,
      accounts.length > 1 ? h(Select, { label: 'Portfolio', value: accountId, onChange: function (e) { accSt[1](e.target.value); reset(); if (props.onAccountChange) props.onAccountChange(e.target.value); },
        options: accounts.map(function (a) { return { value: a.id, label: a.name + (a.privateAccount ? ' (privat)' : '') }; }) }) : null,
      props.action ? null : h(SegmentedControl, { 'aria-label': 'Aktion', value: action, size: 'lg', onChange: function (v) { actSt[1](v); reset(); },
        options: [{ value: 'BUY', label: 'Kaufen' }, { value: 'SELL', label: 'Verkaufen' }] }),
      h(SegmentedControl, { label: 'Ordertyp', value: type, size: 'sm', onChange: function (v) { typeSt[1](v); reset(); },
        options: [{ value: 'MARKET', label: 'Market' }, { value: 'LIMIT', label: 'Limit' }] }),
      type === 'LIMIT' ? h('div', { className: 'bnk-ot__lim' },
        h(Input, { label: action === 'BUY' ? 'Limit (höchstens)' : 'Limit (mindestens)', numeric: true, suffix: pct ? '%' : cur, value: limSt[0],
          placeholder: px > 0 ? fmt(px, pct ? 4 : 2) : '', error: errLim, onChange: function (e) { limSt[1](e.target.value); reset(); } }),
        chips.length ? h('div', { className: 'bnk-ot__chips', role: 'group', 'aria-label': 'Limit übernehmen' }, chips.map(function (c) {
          return h('button', { key: c[0], type: 'button', className: 'bnk-ot__chip', onClick: function () { limSt[1](fmt(c[1], pct ? 4 : 2)); reset(); } },
            h('span', null, c[0]), h('b', null, price(c[1], listing.type, '')));
        })) : null) : null,
      h('div', { className: 'bnk-ot__qtyhead' },
        h('span', { className: 'bnk-field__label' }, modeSt[0] === 'amount' ? 'Geldbetrag' : 'Anteile'),
        h('button', { type: 'button', className: 'bnk-ot__switch', onClick: function () { modeSt[1](modeSt[0] === 'amount' ? 'shares' : 'amount'); reset(); } },
          modeSt[0] === 'amount' ? 'Anteile eingeben' : 'Betrag eingeben')),
      h('div', { className: 'bnk-ot__qty' },
        modeSt[0] === 'amount'
          ? h(Input, { 'aria-label': 'Geldbetrag', numeric: true, suffix: cur, value: amtSt[0], placeholder: '0,00', error: errQty,
              hint: !errQty ? (qty > 0 ? '= ' + fmt(qty, 0) + ' Anteile' : 'Wird in ganze Anteile umgerechnet') : undefined,
              onChange: function (e) { amtSt[1](e.target.value); reset(); } })
          : h(Input, { 'aria-label': 'Anteile', numeric: true, stepper: true, min: 1, step: 1, value: qtySt[0], placeholder: '0', error: errQty,
              hint: !errQty ? (action === 'BUY' ? 'Höchstens ' + number(maxBuy, 0, true) + ' Anteile' : 'Im Portfolio: ' + number(held, 0, true) + ' Anteile') : undefined,
              onChange: function (e) { qtySt[1](e.target.value); reset(); } }),
        h(Button, { variant: 'ghost', size: 'sm', className: 'bnk-ot__max', disabled: !max, onClick: function () { modeSt[1]('shares'); qtySt[1](String(max)); reset(); } }, 'Max')),
      h('button', { type: 'button', className: 'bnk-ot__more', 'aria-expanded': moreSt[0] ? 'true' : 'false', onClick: function () { moreSt[1](!moreSt[0]); } },
        h('span', { className: 'bnk-chev', 'aria-hidden': 'true' }), 'Weitere Optionen',
        (hcSt[0] || gadSt[0] || gtdSt[0] || cpSt[0]) ? h('span', { className: 'bnk-ot__moreN' }, 'aktiv') : null),
      moreSt[0] ? h('div', { className: 'bnk-ot__adv' },
        type === 'LIMIT' ? h(Input, { label: 'Stündliche Änderung', optional: true, numeric: true, suffix: cur + ' / h', value: hcSt[0], placeholder: '0,00',
          hint: 'Verschiebt das Limit jede Stunde um diesen Betrag.', onChange: function (e) { hcSt[1](e.target.value); reset(); } }) : null,
        h('div', { className: 'bnk-ot__dates' },
          h(Input, { label: 'Gültig ab', optional: true, type: 'datetime-local', value: gadSt[0], disabled: !props.premium, onChange: function (e) { gadSt[1](e.target.value); reset(); } }),
          h(Input, { label: 'Gültig bis', optional: true, type: 'datetime-local', value: gtdSt[0], disabled: !props.premium, onChange: function (e) { gtdSt[1](e.target.value); reset(); } })),
        !props.premium ? h('p', { className: 'bnk-ot__gold' }, h('span', { className: 'bnk-gold' }, 'Gold'), ' Zeitgesteuerte Orders gibt es mit dem Goldzugang.') : null,
        h(Input, { label: 'Gegenpartei (OTC)', optional: true, value: cpSt[0], placeholder: 'Portfolio der Gegenpartei',
          hint: 'Nur diese Gegenpartei kann die Order ausführen.', onChange: function (e) { cpSt[1](e.target.value); reset(); } })) : null,
      h(SummaryList, { className: 'bnk-ot__sum', items: [
        { label: type === 'LIMIT' ? 'Limit' : (action === 'BUY' ? 'Kurs (Brief)' : 'Kurs (Geld)'), value: px > 0 ? price(px, listing.type, cur) : '–' },
        { label: action === 'BUY' ? 'Volumen (geschätzt)' : 'Erlös (geschätzt)', value: vol || '–', currency: cur, total: true }
      ] }),
      h('div', { className: 'bnk-ot__cash' },
        h('span', null, 'Bargeld'), h(Amount, { value: cash, currency: cur, compact: true, className: 'bnk-ot__cashv' }),
        vol && !errQty ? h('span', { className: 'bnk-ot__after' }, '→ ', h(Amount, { value: action === 'BUY' ? cash - vol : cash + vol, currency: cur, compact: true })) : null),
      checkBanner,
      h(Button, { type: 'submit', variant: props.submitVariant || 'primary', size: 'lg', fullWidth: true, disabled: props.disabled || !listing.securityIdentifier, loading: busySt[0] },
        props.confirm === false ? verb : busySt[0] ? 'Wird geprüft' : 'Order prüfen'));
  });
  OrderTicket.displayName = 'OrderTicket';

  var LISTING_TYPES = { STOCK: 'Aktie', BOND: 'Anleihe', INTEREST_TENDER_BOND: 'Zinstender-Anleihe', REPO: 'Repo', SYSTEM_BOND: 'Systemanleihe', SYSTEM_REPO: 'Zentralbank-Repo',
    COIN: 'Coin', INDEX: 'Index', ETF: 'Fonds', WARRANT: 'Optionsschein', BUILDING: 'Immobilie', OTHER: 'Sonstiges' };

  /* ---------- Highscores (API: /v2/userhighscores · companyhighscores · alliancehighscores) ---------- */

  var HIGHSCORE_TYPES = {
    BOOK_VALUE: { label: 'Buchwert', description: 'Letzter Buchwert', format: 'money' },
    NET_CASH: { label: 'Net Cash', description: 'Letzter Net Cash', format: 'money' },
    RESERVES: { label: 'Zentralbankreserven', description: 'Letzte Zentralbankreserven', format: 'money' },
    CASH_FLOW: { label: 'Cashflow', description: 'Letzter Cashflow', format: 'money', signed: true },
    TRADES: { label: 'Trades', description: 'Anzahl der Trades in den letzten zehn Tagen', format: 'count' },
    ACHIEVEMENTS: { label: 'Erfolge', description: 'Prozentzahl der erreichten Erfolge', format: 'percent' },
    BUILDING: { label: 'Immobilien', description: 'Größe aller Immobilien im Portfolio', format: 'count' },
    MINER: { label: 'Miner', description: 'Anzahl der stündlich produzierten Coins', format: 'coins' },
    CHAT_MESSAGES: { label: 'Chatnachrichten', description: 'Gesendete Chatnachrichten der letzten 7 Tage', format: 'count' },
    ONLINE_TIME: { label: 'Online-Zeit', description: 'Online-Minuten', format: 'minutes' }
  };
  function highscoreValue(type, v) {
    var t = HIGHSCORE_TYPES[type] || { format: 'count' };
    if (v == null) return '–';
    switch (t.format) {
      case 'money': return h(Amount, { value: v, compact: true, signed: t.signed });
      case 'percent': return fmt(v, v % 1 ? 2 : 0) + ' %';
      case 'coins': return h(Amount, { value: v, currency: '', decimals: 2, unit: 'Coins/h', compact: true });
      case 'minutes': return h(Amount, { value: v, currency: '', decimals: 0, unit: 'Min.', compact: true });
      default: return h(Amount, { value: v, currency: '', decimals: 0, compact: true });
    }
  }
  function entityOf(e) { return e.user || e.company || e.alliance || e.entity || {}; }
  function HighscoreTable(props) {
    var entries = props.entries || [];
    var type = props.type || 'BOOK_VALUE';
    var kind = props.kind || (entries[0] && (entries[0].company ? 'company' : entries[0].alliance ? 'alliance' : 'user')) || 'user';
    var offset = props.offset || 0;
    var rows = [];
    entries.forEach(function (e, i) {
      var rank = e.rank != null ? e.rank : offset + i + 1;
      var prev = rows.length ? rows[rows.length - 1].rank : null;
      if (prev != null && rank - prev > 1) rows.push({ gap: true, key: 'gap' + i });
      rows.push({ e: e, rank: rank, key: (entityOf(e).id || '') + rank });
    });
    function nameOf(ent) { return ent.username || ent.name || ''; }
    return h('div', { className: cx('bnk-hs', props.className) },
      h('div', { className: 'bnk-hs__head', 'aria-hidden': 'true' },
        h('span', null, 'Platz'), h('span', { className: 'bnk-hs__r' }, 'Vortag'), h('span', null, kind === 'company' ? 'Unternehmen' : kind === 'alliance' ? 'Allianz' : 'Nutzer'),
        h('span', { className: 'bnk-hs__r' }, props.valueLabel || (HIGHSCORE_TYPES[type] || {}).label || 'Wert')),
      h('ol', { className: 'bnk-hs__list', 'aria-label': props['aria-label'] || ('Highscore ' + ((HIGHSCORE_TYPES[type] || {}).label || '')) }, rows.map(function (r) {
        if (r.gap) return h('li', { key: r.key, className: 'bnk-hs__gap', 'aria-hidden': 'true' }, '…');
        var e = r.e, ent = entityOf(e), name = nameOf(ent);
        var own = props.ownId != null ? ent.id === props.ownId : (ent.myUser || e.own);
        var move = e.historyPosition ? e.historyPosition - r.rank : null;
        var href = props.hrefFor ? props.hrefFor(ent, kind) : null;
        var sub = kind === 'company' ? ent.securityIdentifier : kind === 'alliance' ? null : (ent.userCapabilities && ent.userCapabilities.achievementTotal ? Math.round(100 * ent.userCapabilities.achievementCount / ent.userCapabilities.achievementTotal) + ' % Erfolge' : null);
        return h('li', { key: r.key, className: cx('bnk-hs__row', own && 'is-own'), 'aria-current': own ? 'true' : undefined },
          h('span', { className: 'bnk-hs__rank' }, r.rank <= 3 ? h(RankBadge, { rank: r.rank, size: 'sm' }) : h('span', { className: 'bnk-hs__num' }, fmt(r.rank, 0) + '.')),
          h('span', { className: 'bnk-hs__move' }, move == null ? h('span', { className: 'bnk-hs__moveT is-new' }, 'neu')
            : move === 0 ? h('span', { className: 'bnk-hs__moveT is-flat', 'aria-label': 'unverändert' }, '–')
            : h('span', { className: 'bnk-hs__moveT' }, (move > 0 ? '↑ ' : '↓ ') + Math.abs(move), h('span', { className: 'bnk-sr' }, move > 0 ? ' Plätze gewonnen' : ' Plätze verloren'))),
          h('span', { className: 'bnk-hs__who' },
            ent.logoUrl ? h('img', { className: 'bnk-hs__logo', src: ent.logoUrl, alt: '' }) : h(Avatar, { name: name, size: 28, group: kind !== 'user' }),
            h('span', { className: 'bnk-hs__id' },
              href ? h('a', { href: href, className: 'bnk-hs__name' }, name) : h('span', { className: 'bnk-hs__name' }, name),
              own ? h('span', { className: 'bnk-hs__you' }, kind === 'user' ? 'Du' : 'Deins') : null,
              sub ? h('span', { className: 'bnk-hs__sub' }, sub) : null)),
          h('span', { className: 'bnk-hs__value' }, highscoreValue(type, e.value)));
      })),
      !entries.length ? h('div', { className: 'bnk-hs__empty' }, props.emptyText || 'Noch keine Einträge.') : null);
  }

  /* ---------- Zeitung (API: /v2/news · PostView) ---------- */

  function plainText(s) { return String(s || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_>`~]+/g, '').replace(/\s+/g, ' ').trim(); }
  function teaserOf(s, n) { var t = plainText(s); return t.length > n ? t.slice(0, t.lastIndexOf(' ', n) > n * 0.6 ? t.lastIndexOf(' ', n) : n) + ' …' : t; }
  function ReactionBar(props) {
    var mine = props.myReaction || null;
    function btn(kind, label, count, glyph) {
      var on = mine === kind;
      return h('button', { type: 'button', className: cx('bnk-react', on && 'is-on'), 'aria-pressed': on ? 'true' : 'false', disabled: props.disabled,
          onClick: function () { if (props.onReact) props.onReact(on ? null : kind); } },
        h('span', { className: 'bnk-react__glyph', 'aria-hidden': 'true' }, glyph), h('span', { className: 'bnk-sr' }, label + ': '), h('span', { className: 'bnk-react__n' }, fmt(count || 0, 0)));
    }
    return h('div', { className: cx('bnk-reactbar', props.className), role: 'group', 'aria-label': 'Bewertung' },
      btn('LIKE', 'Gefällt', props.likes, '+'),
      btn('DISLIKE', 'Gefällt nicht', props.dislikes, '−'),
      props.comments != null ? h(props.onComments ? 'button' : 'span', { type: props.onComments ? 'button' : undefined, className: 'bnk-react bnk-react--comments', onClick: props.onComments },
        h('span', null, fmt(props.comments, 0) + (props.comments === 1 ? ' Kommentar' : ' Kommentare'))) : null);
  }
  /* Kurzzeit für Listen: heute „10:05“, dieses Jahr „9.9.“, sonst „9.9.25“ */
  function briefTime(ms) {
    if (ms == null) return '';
    var d = new Date(ms), now = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
    if (d.toDateString() === now.toDateString()) return p(d.getHours()) + ':' + p(d.getMinutes());
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + (d.getFullYear() === now.getFullYear() ? '' : String(d.getFullYear()).slice(2));
  }
  function NewsItem(props) {
    var p = props.post || props;
    var v = props.variant || 'default';
    var Tag = props.as || (v === 'lead' ? 'h2' : 'h3');
    var pub = p.company ? p.company.name : p.alliance ? p.alliance.name : null;
    var author = p.author ? (p.author.username || p.author) : null;
    var title = props.href ? h('a', { href: props.href, className: 'bnk-news__link', onClick: props.onOpen }, p.title) : p.title;
    var when = p.dateCreated ? dateTime(p.dateCreated) : props.time;
    var locale = p.locale ? String(p.locale).slice(0, 2).toUpperCase() : null;
    if (v === 'brief') {
      return h('article', { className: cx('bnk-news', 'bnk-news--brief', props.className) },
        h('time', { className: 'bnk-news__time', dateTime: p.dateCreated ? new Date(p.dateCreated).toISOString() : undefined }, props.shortTime || briefTime(p.dateCreated) || (when || '').split(', ').pop()),
        h('div', { className: 'bnk-news__briefBody' },
          h(Tag, { className: 'bnk-news__title' }, title),
          h('span', { className: 'bnk-news__briefMeta' }, [pub || author, p.numberOfComments ? fmt(p.numberOfComments, 0) + ' Komm.' : null].filter(Boolean).join(' · '))));
    }
    var tags = (p.hashTags || []).map(function (t) { return t.tag || t; });
    return h('article', { className: cx('bnk-news', 'bnk-news--' + v, props.className), lang: p.locale ? String(p.locale).slice(0, 2) : undefined },
      h('div', { className: 'bnk-news__kicker' },
        pub ? (props.publisherHref && props.publisherHref(p) ? h('a', { className: 'bnk-news__rubric', href: props.publisherHref(p) }, pub) : h('span', { className: 'bnk-news__rubric' }, pub)) : h('span', { className: 'bnk-news__rubric' }, props.rubric || 'Leserbeitrag'),
        when ? h('time', { dateTime: p.dateCreated ? new Date(p.dateCreated).toISOString() : undefined }, when) : null,
        locale ? h('span', { className: 'bnk-news__lang', title: 'Sprache' }, locale) : null),
      h(Tag, { className: 'bnk-news__title' }, title),
      author ? h('div', { className: 'bnk-news__byline' }, 'von ', props.authorHref ? h('a', { className: 'bnk-news__author', href: props.authorHref(author, p) }, author) : h('span', { className: 'bnk-news__author' }, author), p.dateEdited ? ' · bearbeitet ' + dateTime(p.dateEdited) : '') : null,
      p.content ? h('p', { className: 'bnk-news__teaser' }, teaserOf(p.content, v === 'lead' ? 320 : 180)) : null,
      h('div', { className: 'bnk-news__foot' },
        p.listing ? h(TickerMention, { ticker: p.listing.securityIdentifier, info: Object.assign({ name: p.listing.name }, props.tickerInfo && props.tickerInfo[p.listing.securityIdentifier]) }) : null,
        tags.length ? h('span', { className: 'bnk-news__tags' }, tags.map(function (t) { return props.tagHref ? h('a', { key: t, href: props.tagHref(t) }, '#' + t) : h('span', { key: t }, '#' + t); })) : null,
        h(ReactionBar, { likes: p.numberOfLikes, dislikes: p.numberOfDislikes, comments: p.numberOfComments, myReaction: props.myReaction,
          onReact: props.onReact ? function (k) { props.onReact(p, k); } : null, onComments: props.onComments ? function () { props.onComments(p); } : null, className: 'bnk-news__react' })));
  }
  function NewsFeed(props) {
    var items = props.items || [];
    var brief = props.variant === 'brief';
    var pass = function (it) { return { tickerInfo: props.tickerInfo, onReact: props.onReact, onComments: props.onComments, tagHref: props.tagHref, authorHref: props.authorHref, publisherHref: props.publisherHref,
      href: props.hrefFor ? props.hrefFor(it.post || it) : it.href, myReaction: props.reactions ? props.reactions[(it.post || it).id] : it.myReaction }; };
    return h('section', { className: cx('bnk-feed', props.className), 'aria-label': typeof props.title === 'string' ? props.title : 'Zeitung' },
      props.title ? h('div', { className: 'bnk-feed__head' }, h('h2', { className: 'bnk-feed__title' }, props.title), props.action || null) : null,
      props.lead ? h(NewsItem, Object.assign({ variant: 'lead', post: props.lead }, pass(props.lead))) : null,
      h('ul', { className: cx('bnk-feed__list', brief && 'is-brief') }, items.map(function (it, i) {
        return h('li', { key: (it.post || it).id || i }, h(NewsItem, Object.assign({ variant: brief ? 'brief' : 'default', post: it.post || it }, pass(it))));
      })),
      props.footer ? h('div', { className: 'bnk-feed__foot' }, props.footer) : null);
  }


  /* ---------- Wertpapierseite ---------- */

  /* SecurityHeader — Kopf der Wertpapierseite: Kennung, Name mit Messing-Linie, Kurs, Geld/Brief mit Schnellaktion, Eckdaten. */
  function SecurityHeader(props) {
    var l = props.listing || {};
    var s = props.spread || {};
    var cur = props.currency == null ? '€' : props.currency;
    var last = lastOf(s);
    var lastDate = s.lastPrice && s.lastPrice.date;
    var company = props.company || null;
    var ceo = company && company.ceo;
    var achieved = company && company.achievementTotal ? Math.round(1000 * company.achievementCount / company.achievementTotal) / 10 : null;
    var eyebrow = [l.securityIdentifier, LISTING_TYPES[l.type] || l.type, l.startDate ? 'notiert seit ' + dateTime(l.startDate, false) : null, l.endDate ? 'fällig ' + dateTime(l.endDate, false) : null].filter(Boolean);
    var Tag = props.as || 'h1';
    function side(label, px, size, btn) {
      return h('div', { className: 'bnk-sech__q' },
        h('span', { className: 'bnk-sech__qlabel' }, label),
        h('span', { className: 'bnk-sech__qval' }, px != null ? price(px, l.type, cur) : '–',
          size != null ? h('small', null, ' (' + number(size, 0, true) + ')') : null),
        btn);
    }
    var facts = (props.facts || []).filter(Boolean);
    return h('header', { className: cx('bnk-sech', props.compact && 'bnk-sech--compact', props.className) },
      h('div', { className: 'bnk-sech__top' },
        h('div', { className: 'bnk-sech__id' },
          company && company.logoUrl ? h('img', { className: 'bnk-sech__logo', src: company.logoUrl, alt: '' }) : null,
          h('div', { className: 'bnk-sech__names' },
            h('div', { className: 'bnk-sech__eyebrow' }, eyebrow.map(function (e, i) { return h('span', { key: i }, e); }),
              achieved != null ? h('span', { title: 'Erreichte Erfolge des Unternehmens' }, fmt(achieved, achieved % 1 ? 1 : 0) + ' % Erfolge') : null),
            h(Tag, { className: 'bnk-sech__title' }, l.name))),
        h('div', { className: 'bnk-sech__px' },
          h('span', { className: 'bnk-sech__price' }, last != null ? price(last, l.type, cur) : '–'),
          props.change != null ? h(PriceChange, { value: props.change, amount: props.changeAmount, variant: 'tag', size: 'lg', suffix: props.changeSuffix, currency: isPercentQuoted(l.type) ? 'Pp.' : cur }) : null,
          lastDate ? h('time', { className: 'bnk-sech__time', dateTime: new Date(lastDate).toISOString() }, 'Letzter Trade ' + dateTime(lastDate)) : null)),
      h('div', { className: 'bnk-sech__quote' },
        side('Geld', s.bidPrice, s.bidSize, props.onSell ? h(Button, { size: 'sm', onClick: function () { props.onSell(s.bidPrice); }, disabled: s.bidPrice == null && !props.tradeWithoutQuote }, 'Verkaufen') : null),
        h('div', { className: 'bnk-sech__q bnk-sech__q--spread' },
          h('span', { className: 'bnk-sech__qlabel' }, 'Spread'),
          h('span', { className: 'bnk-sech__qval' }, s.spreadAbs != null ? price(s.spreadAbs, l.type, cur) : '–',
            s.spreadPercent != null ? h('small', null, ' (' + fmt(s.spreadPercent, 2) + ' %)') : null)),
        side('Brief', s.askPrice, s.askSize, props.onBuy ? h(Button, { size: 'sm', onClick: function () { props.onBuy(s.askPrice); }, disabled: s.askPrice == null && !props.tradeWithoutQuote }, 'Kaufen') : null),
        props.actions ? h('div', { className: 'bnk-sech__actions' }, props.actions) : null,
        facts.length ? h('dl', { className: 'bnk-sech__facts' }, facts.map(function (f, i) {
          var v = f.value;
          if (typeof v === 'number') v = h(Amount, { value: v, currency: f.currency != null ? f.currency : (f.unit ? '' : cur), unit: f.unit, decimals: f.decimals, compact: f.compact == null ? true : f.compact });
          return h('div', { key: i, className: 'bnk-sech__fact' }, h('dt', null, f.label), h('dd', null, v, f.sub ? h('small', null, f.sub) : null));
        })) : null),
      props.notice ? h('div', { className: 'bnk-sech__notice' }, props.notice) : null,
      props.tabs ? h('div', { className: 'bnk-sech__tabs' }, props.tabs) : null);
  }

  /* OrderBook — Orderbuch als Leiter: Angebot oben (teuerstes zuerst), Spread in der Mitte, Nachfrage unten. */
  function OrderBook(props) {
    var l = props.listing || {};
    var cur = props.currency == null ? '€' : props.currency;
    var limit = props.depth || 8;
    var allSt = React.useState(false);
    /* API: GET /orderbook/{asin} → { sellEntries: [{ priceLimit, size }], buyEntries: [...], maxSellSize, maxBuySize } */
    var ob = props.orderbook || {};
    var norm = function (e) { return { price: e.price != null ? e.price : e.priceLimit, numberOfShares: e.numberOfShares != null ? e.numberOfShares : e.size, marketMaker: e.marketMaker, own: e.own }; };
    var asks = (props.asks || ob.sellEntries || []).map(norm).sort(function (a, b) { return a.price - b.price; });
    var bids = (props.bids || ob.buyEntries || []).map(norm).sort(function (a, b) { return b.price - a.price; });
    var showAll = allSt[0];
    var asksShown = showAll ? asks : asks.slice(0, limit);
    var bidsShown = showAll ? bids : bids.slice(0, limit);
    var maxSize = Math.max.apply(null, asks.concat(bids).map(function (r) { return r.numberOfShares || 0; }).concat([1]));
    var logMax = Math.log10(maxSize + 1);
    var sum = function (arr) { return arr.reduce(function (a, r) { return a + (r.numberOfShares || 0); }, 0); };
    var bestAsk = asks[0], bestBid = bids[0];
    var spreadAbs = bestAsk && bestBid ? bestAsk.price - bestBid.price : null;
    function row(r, sideKey) {
      var w = Math.max(3, Math.round(100 * Math.log10((r.numberOfShares || 0) + 1) / logMax));
      var label = (sideKey === 'ask' ? 'Angebot: ' : 'Nachfrage: ') + number(r.numberOfShares, 0) + ' Anteile zu ' + price(r.price, l.type, cur);
      var marks = [r.marketMaker ? h('span', { key: 'mm', className: 'bnk-ob__mark', title: 'Market Maker' }, 'MM') : null,
        r.own ? h('span', { key: 'own', className: 'bnk-ob__mark is-own' }, 'Deine') : null].filter(Boolean);
      var cells = [
        h('span', { key: 'b', className: 'bnk-ob__cell bnk-ob__cell--bid' }, sideKey === 'bid' ? [h('span', { key: 'bar', className: 'bnk-ob__bar', style: { width: w + '%' } }), marks, h('span', { key: 'n', className: 'bnk-ob__n' }, number(r.numberOfShares, 0, true))] : null),
        h('span', { key: 'p', className: 'bnk-ob__price' }, price(r.price, l.type, '')),
        h('span', { key: 'a', className: 'bnk-ob__cell bnk-ob__cell--ask' }, sideKey === 'ask' ? [h('span', { key: 'bar', className: 'bnk-ob__bar', style: { width: w + '%' } }), h('span', { key: 'n', className: 'bnk-ob__n' }, number(r.numberOfShares, 0, true)), marks] : null)
      ];
      var common = { key: sideKey + r.price, className: cx('bnk-ob__row', 'is-' + sideKey, r.own && 'is-own') };
      return props.onSelect
        ? h('li', common, h('button', { type: 'button', className: 'bnk-ob__btn', 'aria-label': label + (sideKey === 'ask' ? ' – kaufen' : ' – verkaufen'),
            onClick: function () { props.onSelect({ side: sideKey === 'ask' ? 'BUY' : 'SELL', price: r.price, numberOfShares: r.numberOfShares }); } }, cells))
        : h('li', Object.assign(common, { 'aria-label': label }), h('div', { className: 'bnk-ob__btn', 'aria-hidden': 'true' }, cells));
    }
    var more = asks.length > limit || bids.length > limit;
    return h('section', { className: cx('bnk-ob', props.className), 'aria-label': props['aria-label'] || 'Orderbuch' },
      h('div', { className: 'bnk-ob__head', 'aria-hidden': 'true' },
        h('span', null, 'Nachfrage'), h('span', { className: 'bnk-ob__c' }, 'Preis' + (isPercentQuoted(l.type) ? ' (%)' : ' (' + cur + ')')), h('span', { className: 'bnk-ob__r' }, 'Angebot')),
      h('ol', { className: 'bnk-ob__list is-asks', 'aria-label': 'Angebot' }, asksShown.slice().reverse().map(function (r) { return row(r, 'ask'); })),
      h('div', { className: 'bnk-ob__spread' },
        h('span', null, 'Spread ', h('b', null, spreadAbs != null ? price(spreadAbs, l.type, cur) : '–'),
          spreadAbs != null && bestBid.price ? ' · ' + fmt(spreadAbs / bestAsk.price * 100, 2) + ' %' : ''),
        props.lastPrice != null ? h('span', null, 'Letzter ', h('b', null, price(props.lastPrice, l.type, cur))) : null),
      h('ol', { className: 'bnk-ob__list is-bids', 'aria-label': 'Nachfrage' }, bidsShown.map(function (r) { return row(r, 'bid'); })),
      h('div', { className: 'bnk-ob__foot' },
        h('span', null, 'Nachfrage ', h(Amount, { value: sum(bids), currency: '', compact: true }), ' Anteile · ', bids.length, ' Stufen'),
        h('span', null, 'Angebot ', h(Amount, { value: sum(asks), currency: '', compact: true }), ' Anteile · ', asks.length, ' Stufen'),
        more ? h('button', { type: 'button', className: 'bnk-ob__more', onClick: function () { allSt[1](!showAll); } }, showAll ? 'Weniger zeigen' : 'Alle Stufen zeigen') : null));
  }


  /* ---------- Unternehmen, Kapitalmaßnahmen, Abstimmungen ---------- */

  /* Art einer Abstimmung aus den Feldern der API ableiten (AbstractPollView + Unterklassen). */
  function pollKind(p) {
    if (p.kind) return p.kind;
    if (p.capitalIncreaseType) return 'CAPITAL_INCREASE';
    if (p.acquiringCompany) return 'MERGER';
    if (p.dailyWage != null) return 'EMPLOY_CEO';
    if (p.name != null && p.company) return 'CHANGE_NAME';
    if (p.numberOfShares != null && p.price != null) return 'CAPITAL_REDUCTION';
    if (p.maximalCashVolume != null) return 'DIVIDEND_PAYMENT';
    return 'OTHER';
  }
  var POLL_KINDS = {
    CAPITAL_INCREASE: 'Kapitalerhöhung', CAPITAL_REDUCTION: 'Kapitalherabsetzung', DIVIDEND_PAYMENT: 'Gewinnausschüttung',
    MERGER: 'Fusion', CHANGE_NAME: 'Namenswechsel', CASH_OUT: 'Depotabverkauf', LIQUIDATION: 'Liquidation', EMPLOY_CEO: 'CEO einstellen', OTHER: 'Abstimmung'
  };
  function pollTally(p) {
    var yes = 0, no = 0, mineVoted = 0, mine = 0, myType = null;
    (p.votes || []).forEach(function (v) { if (v.type === 'YES') yes += v.voices; else no += v.voices; if (v.voter && v.voter.myUser) { mineVoted += v.voices; myType = v.type; } });
    (p.group || []).forEach(function (g) { if (g.groupMember && g.groupMember.myUser) mine += g.numberOfVoices; });
    var total = p.totalNumberOfVoices || yes + no;
    return { yes: yes, no: no, open: Math.max(0, total - yes - no), total: total, mine: mine, mineVoted: mineVoted, mineLeft: Math.max(0, mine - mineVoted), myType: myType };
  }

  /* VoteBar — Ja / Nein / noch offen als gestapelter Balken; Ja Tintenblau, Nein Kupfer, offen neutral. */
  function VoteBar(props) {
    var t = props.tally;
    var pct = function (n) { return t.total ? n / t.total * 100 : 0; };
    return h('div', { className: 'bnk-vbar' },
      h('div', { className: 'bnk-vbar__track', role: 'img', 'aria-label': 'Ja ' + fmt(pct(t.yes), 1) + ' %, Nein ' + fmt(pct(t.no), 1) + ' %, noch offen ' + fmt(pct(t.open), 1) + ' %' },
        h('span', { className: 'bnk-vbar__yes', style: { width: pct(t.yes) + '%' } }),
        h('span', { className: 'bnk-vbar__no', style: { width: pct(t.no) + '%' } }),
        props.threshold ? h('span', { className: 'bnk-vbar__mark', style: { left: props.threshold + '%' }, title: 'Mehrheit' }) : null),
      h('div', { className: 'bnk-vbar__legend', 'aria-hidden': 'true' },
        h('span', { className: 'bnk-vbar__key is-yes' }, 'Ja ', h('b', null, fmt(pct(t.yes), 1) + ' %')),
        h('span', { className: 'bnk-vbar__key is-no' }, 'Nein ', h('b', null, fmt(pct(t.no), 1) + ' %')),
        h('span', { className: 'bnk-vbar__key is-open' }, 'offen ', h('b', null, fmt(pct(t.open), 1) + ' %')),
        h('span', { className: 'bnk-vbar__total' }, number(t.total, 0, true) + ' Stimmen')));
  }

  /* PollCard — eine Abstimmung: Antrag, Eckdaten je Art, Stand der Stimmen, eigene Stimmabgabe. */
  function PollCard(props) {
    var p = props.poll || {};
    var cur = props.currency == null ? '€' : props.currency;
    var kind = pollKind(p);
    var t = pollTally(p);
    var now = props.now || Date.now();
    var running = p.endDate == null || now < p.endDate;
    var yesShare = t.yes + t.no ? t.yes / (t.yes + t.no) * 100 : 0;
    var accepted = p.approvalVotesPercentage != null ? p.approvalVotesPercentage > 50 : yesShare > 50;
    var status = running ? 'running' : accepted ? 'accepted' : 'rejected';
    var vSt = React.useState(String(t.mineLeft || ''));
    var voices = toNum(vSt[0]);
    var co = p.company || {};
    var link = function (ent, kindOf) { if (!ent) return null; var n = ent.name || ent.username; var href = props.hrefFor ? props.hrefFor(ent, kindOf) : null; return href ? h('a', { href: href }, n) : n; };
    var facts = [
      p.company ? { label: 'Unternehmen', value: h('span', null, link(co, 'company'), co.securityIdentifier ? h('small', null, ' ' + co.securityIdentifier) : null) } : null,
      kind === 'CAPITAL_INCREASE' ? { label: 'Bezugsrechte', value: p.capitalIncreaseType === 'WITHOUT_SUBSCRIPTION_RIGHTS' ? 'ohne' : 'mit' + (p.subscriptionFraction ? ' · 1:' + fmt(p.subscriptionFraction, 0) : '') } : null,
      p.price != null ? { label: 'Preis je Anteil', value: p.price, currency: cur } : null,
      p.numberOfShares != null ? { label: 'Anteile', value: p.numberOfShares, currency: '', decimals: 0, compact: true } : null,
      p.minimalCashVolume != null ? { label: 'Mindestvolumen', value: p.minimalCashVolume, currency: cur, compact: true } : null,
      p.maximalCashVolume != null ? { label: 'Höchstvolumen', value: p.maximalCashVolume, currency: cur, compact: true } : null,
      p.acquiringCompany ? { label: 'Übernehmende AG', value: link(p.acquiringCompany, 'company') } : null,
      p.name != null && kind === 'CHANGE_NAME' ? { label: 'Neuer Name', value: p.name } : null,
      p.dailyWage != null ? { label: 'Gehaltsforderung', value: money(p.dailyWage, cur, 2, true) + ' / Tag' } : null,
      { label: p.applicant ? 'Bewerber' : 'Beantragt von', value: link(p.applicant || p.pollInitiator, 'user') },
      { label: 'Enthaltungen', value: p.abstentionRule === 'COUNTS_AS_APPROVAL' ? 'zählen als Ja' : 'zählen als Nein' },
      { label: running ? 'Endet' : 'Endete', value: p.endDate ? dateTime(p.endDate) : '–' },
      p.resultExpireDate ? { label: 'Ergebnis gültig bis', value: dateTime(p.resultExpireDate), muted: true } : null
    ].filter(Boolean);
    var statusText = { running: 'Läuft', accepted: 'Angenommen', rejected: 'Abgelehnt' }[status];
    return h('article', { className: cx('bnk-poll', 'is-' + status, p.harmless && 'is-harmless', props.className), 'aria-labelledby': 'poll-' + p.id },
      h('header', { className: 'bnk-poll__head' },
        h('div', { className: 'bnk-poll__kicker' },
          h('span', { className: cx('bnk-poll__status', 'is-' + status) }, h('span', { className: 'bnk-poll__dot', 'aria-hidden': 'true' }), statusText),
          p.harmless ? h('span', { className: 'bnk-poll__tag' }, 'harmlos') : null,
          running && p.endDate ? h(Countdown, { to: p.endDate, short: true, label: 'noch' }) : null),
        h('h3', { className: 'bnk-poll__title', id: 'poll-' + p.id }, props.title || POLL_KINDS[kind] + (co.name ? ' · ' + co.name : '')),
        p.motion && props.showMotion !== false ? h('p', { className: 'bnk-poll__motion' }, p.motion) : null),
      h(SummaryList, { className: 'bnk-poll__facts', items: facts }),
      h(VoteBar, { tally: t, threshold: props.threshold || 50 }),
      t.mine ? h('div', { className: 'bnk-poll__me' },
        t.mineVoted ? h('p', { className: 'bnk-poll__voted' }, 'Du hast mit ', h('b', null, number(t.mineVoted, 0, true)), ' Stimmen ', h('b', null, t.myType === 'YES' ? 'Ja' : 'Nein'), ' gestimmt.',
          t.mineLeft ? ' ' + number(t.mineLeft, 0, true) + ' Stimmen sind noch frei.' : '') : null,
        running && t.mineLeft ? h('div', { className: 'bnk-poll__vote' },
          h(Input, { label: 'Deine Stimmen', numeric: true, size: 'sm', value: vSt[0], max: t.mineLeft, onChange: function (e) { vSt[1](e.target.value); },
            hint: 'Höchstens ' + fmt(t.mineLeft, 0), error: voices > t.mineLeft ? 'Du hast nur ' + fmt(t.mineLeft, 0) + ' Stimmen.' : null }),
          h('div', { className: 'bnk-poll__btns' },
            h(Button, { size: 'sm', disabled: !(voices > 0) || voices > t.mineLeft, onClick: function () { if (props.onVote) props.onVote(p, 'YES', voices); } }, 'Ja'),
            h(Button, { size: 'sm', disabled: !(voices > 0) || voices > t.mineLeft, onClick: function () { if (props.onVote) props.onVote(p, 'NO', voices); } }, 'Nein'))) : null) : null,
      (props.onExecute && status === 'accepted') || props.onDelete ? h('footer', { className: 'bnk-poll__foot' },
        props.onExecute && status === 'accepted' ? h(Button, { size: 'sm', onClick: function () { props.onExecute(p); } }, 'Ergebnis ausführen') : null,
        props.onDelete ? h(Button, { variant: 'ghost', size: 'sm', onClick: function () { props.onDelete(p); } }, 'Abstimmung löschen') : null) : null);
  }

  /* PollList — Abstimmungen mit Filter (API votingStatus) und Sammelabstimmung für harmlose Anträge. */
  function PollList(props) {
    var filters = [
      { value: 'NOT_VOTED', label: 'Offen' }, { value: 'PARTIALLY_VOTED', label: 'Teilweise' }, { value: 'VOTED', label: 'Abgestimmt' }, { value: 'INITIATED', label: 'Von mir beantragt' }
    ].map(function (f) { return { value: f.value, label: f.label, count: props.counts ? props.counts[f.value] : undefined }; });
    var fSt = React.useState(props.defaultFilter || 'NOT_VOTED');
    var filter = props.filter || fSt[0];
    var confirmSt = React.useState(null);
    var polls = props.polls || [];
    return h('section', { className: cx('bnk-polls', props.className), 'aria-label': 'Abstimmungen' },
      h('div', { className: 'bnk-polls__bar' },
        h(Tabs, { 'aria-label': 'Filter', size: 'sm', value: filter, items: filters, onChange: function (v) { fSt[1](v); if (props.onFilterChange) props.onFilterChange(v); } }),
        props.onVoteAll && (props.polls || []).length ? h('div', { className: 'bnk-polls__bulk', role: 'group', 'aria-label': 'Sammelabstimmung' },
          h('span', { className: 'bnk-polls__bulkLabel' }, 'Allen harmlosen'),
          h(Button, { size: 'sm', onClick: function () { props.onVoteAll('YES', true); } }, 'Ja'),
          h(Button, { size: 'sm', onClick: function () { props.onVoteAll('NO', true); } }, 'Nein'),
          h(Button, { variant: 'ghost', size: 'sm', onClick: function () { confirmSt[1]('menu'); } }, 'Alle …')) : null),
      confirmSt[0] ? h(Dialog, { open: true, title: 'Über alle offenen Abstimmungen entscheiden?', onClose: function () { confirmSt[1](null); },
          description: 'Das gilt auch für Kapitalerhöhungen, Fusionen und Liquidationen. Deine Stimmen lassen sich danach nicht zurücknehmen.',
          actions: [h(Button, { key: 'c', onClick: function () { confirmSt[1](null); } }, 'Abbrechen'),
            h(Button, { key: 'n', onClick: function () { confirmSt[1](null); props.onVoteAll('NO', false); } }, 'Alle mit Nein'),
            h(Button, { key: 'y', onClick: function () { confirmSt[1](null); props.onVoteAll('YES', false); } }, 'Alle mit Ja')] }) : null,
      polls.length ? h('div', { className: 'bnk-polls__list' }, polls.map(function (p) {
        return h(PollCard, Object.assign({ key: p.id, poll: p }, props.cardProps || {}, { onVote: props.onVote, onExecute: props.onExecute, onDelete: props.onDelete, hrefFor: props.hrefFor }));
      })) : h('div', { className: 'bnk-polls__empty' }, props.emptyText || 'Keine Abstimmungen in dieser Ansicht.'));
  }

  /* CorporateActionForm — CEO startet eine Kapitalmaßnahme; jede startet eine Abstimmung der Aktionäre. */
  var CORPORATE_ACTIONS = [
    { value: 'CAPITAL_INCREASE', label: 'Kapitalerhöhung', endpoint: '/v2/capitalincreasepolls' },
    { value: 'CAPITAL_REDUCTION', label: 'Kapitalherabsetzung', endpoint: '/v2/capitalreductionpolls' },
    { value: 'DIVIDEND_PAYMENT', label: 'Gewinnausschüttung', endpoint: '/v2/dividendpaymentpolls' },
    { value: 'MERGER', label: 'Fusion', endpoint: '/v2/mergerpolls' },
    { value: 'CHANGE_NAME', label: 'Namenswechsel', endpoint: '/v2/changecompanynamepolls' },
    { value: 'CASH_OUT', label: 'Depotabverkauf', endpoint: '/v2/cashoutpolls' },
    { value: 'LIQUIDATION', label: 'Liquidation', endpoint: '/v2/liquidationpolls' }
  ];
  var CorporateActionForm = React.forwardRef(function CorporateActionForm(props, ref) {
    var c = props.company || {};
    var cur = props.currency == null ? '€' : props.currency;
    var aSt = React.useState(props.defaultAction || 'CAPITAL_INCREASE');
    var f = { type: React.useState('WITH_SUBSCRIPTION_RIGHTS'), price: React.useState(props.lastPrice != null ? fmt(props.lastPrice, 2) : ''), vol: React.useState(''), shares: React.useState(''), acq: React.useState(''), name: React.useState(''), confirm: React.useState('') };
    var touched = React.useState(false);
    var action = aSt[0];
    var def = CORPORATE_ACTIONS.filter(function (a) { return a.value === action; })[0];
    var price = toNum(f.price[0]), vol = toNum(f.vol[0]), shares = toNum(f.shares[0]);
    var err = {};
    if (action === 'CAPITAL_INCREASE') { if (!(price > 0)) err.price = 'Bitte einen Preis eingeben.'; if (!(vol > 0)) err.vol = 'Bitte ein Mindestvolumen eingeben.'; }
    if (action === 'CAPITAL_REDUCTION') { if (!(price > 0)) err.price = 'Bitte einen Preis eingeben.'; if (!(shares > 0) || Math.floor(shares) !== shares) err.shares = 'Bitte eine ganze Zahl eingeben.'; else if (props.outstandingShares && shares >= props.outstandingShares) err.shares = 'Mehr als ausgegeben.'; }
    if (action === 'DIVIDEND_PAYMENT' || action === 'MERGER') { if (!(vol > 0)) err.vol = 'Bitte ein Höchstvolumen eingeben.'; else if (props.cash != null && vol > props.cash) err.vol = 'Mehr als das Bargeld der AG (' + money(props.cash, cur, 2, true) + ').'; }
    if (action === 'MERGER' && !f.acq[0] && !props.acquiringCompanyId) err.acq = 'Bitte die übernehmende AG wählen.';
    if (action === 'CHANGE_NAME' && f.name[0].trim().length < 3) err.name = 'Mindestens 3 Zeichen.';
    if (action === 'LIQUIDATION' && f.confirm[0].trim() !== c.name) err.confirm = 'Zur Bestätigung den Namen der AG genau eintippen.';
    var valid = !Object.keys(err).length;
    var show = function (k) { return touched[0] ? err[k] : null; };
    function params() {
      var p = { companyId: c.id };
      if (action === 'CAPITAL_INCREASE') { p.capitalIncreaseType = f.type[0]; p.price = apiNum(price); p.minimalCashVolume = apiNum(vol); }
      if (action === 'CAPITAL_REDUCTION') { p.price = apiNum(price); p.numberOfShares = shares; }
      if (action === 'DIVIDEND_PAYMENT') p.maximalCashVolume = apiNum(vol);
      if (action === 'MERGER') { p.acquiringCompanyId = props.acquiringCompanyId || f.acq[0]; p.maximalCashVolume = apiNum(vol); }
      if (action === 'CHANGE_NAME') p.newName = f.name[0].trim();
      return p;
    }
    function submit(e) { if (e) e.preventDefault(); touched[1](true); if (!valid) return; if (props.onSubmit) props.onSubmit({ action: action, endpoint: def.endpoint, params: params() }); }
    var numIn = function (key, label, suffix, hint, errKey) {
      return h(Input, { label: label, numeric: true, suffix: suffix, value: f[key][0], onChange: function (e) { f[key][1](e.target.value); }, hint: hint, error: show(errKey || key) });
    };
    var newShares = action === 'CAPITAL_INCREASE' && price > 0 && vol > 0 ? Math.floor(vol / price) : null;
    var body;
    switch (action) {
      case 'CAPITAL_INCREASE':
        body = [h(SegmentedControl, { key: 't', label: 'Bezugsrechte', value: f.type[0], onChange: f.type[1], size: 'sm',
            options: [{ value: 'WITH_SUBSCRIPTION_RIGHTS', label: 'Mit Bezugsrecht' }, { value: 'WITHOUT_SUBSCRIPTION_RIGHTS', label: 'Ohne' }] }),
          h('div', { key: 'r', className: 'bnk-caf__row' },
            numIn('price', 'Preis je neuer Anteil', cur, props.lastPrice != null ? 'Letzter Kurs ' + money(props.lastPrice, cur) : null),
            numIn('vol', 'Mindestvolumen', cur, newShares ? '≈ ' + number(newShares, 0, true) + ' neue Anteile' : 'Kommt weniger zusammen, scheitert die Erhöhung.'))];
        break;
      case 'CAPITAL_REDUCTION':
        body = [h('div', { key: 'r', className: 'bnk-caf__row' },
          numIn('shares', 'Anteile zurückkaufen', 'Stk.', props.outstandingShares ? 'Ausgegeben: ' + number(props.outstandingShares, 0, true) : null),
          numIn('price', 'Preis je Anteil', cur, shares > 0 && price > 0 ? 'Höchstens ' + money(shares * price, cur, 2, true) : null))];
        break;
      case 'DIVIDEND_PAYMENT':
        body = [numIn('vol', 'Höchstvolumen', cur, props.cash != null ? 'Bargeld der AG: ' + money(props.cash, cur, 2, true) + ' · wird anteilig an alle Aktionäre verteilt' : null)];
        break;
      case 'MERGER':
        body = [props.acquiringPicker || h(Input, { key: 'acq', label: 'Übernehmende AG', placeholder: 'ASIN oder Name', value: f.acq[0], onChange: function (e) { f.acq[1](e.target.value); }, error: show('acq') }),
          numIn('vol', 'Höchstvolumen', cur, 'Barabfindung für die Aktionäre')];
        break;
      case 'CHANGE_NAME':
        body = [h(Input, { key: 'n', label: 'Neuer Name', value: f.name[0], placeholder: c.name, onChange: function (e) { f.name[1](e.target.value); }, error: show('name') })];
        break;
      case 'CASH_OUT':
        body = [h('p', { key: 'p', className: 'bnk-caf__note' }, 'Das Portfolio der AG wird vollständig zum Marktpreis verkauft. Der Erlös bleibt als Bargeld in der AG.')];
        break;
      case 'LIQUIDATION':
        body = [h(Banner, { key: 'b', variant: 'error', title: 'Nicht umkehrbar' }, 'Die AG wird aufgelöst, das Vermögen an die Aktionäre verteilt und die Aktie vom Handel genommen.'),
          h(Input, { key: 'c', label: 'Name zur Bestätigung', placeholder: c.name, value: f.confirm[0], onChange: function (e) { f.confirm[1](e.target.value); }, error: show('confirm') })];
        break;
    }
    return h('form', { ref: ref, className: cx('bnk-caf', props.className), onSubmit: submit, noValidate: true, 'aria-label': 'Kapitalmaßnahme für ' + (c.name || '') },
      props.heading !== false ? h('div', { className: 'bnk-caf__head' },
        h('div', { className: 'bnk-caf__title' }, props.heading || 'Maßnahme beantragen'),
        h('div', { className: 'bnk-caf__sub' }, [c.name, c.securityIdentifier].filter(Boolean).join(' · '))) : null,
      h(Select, { label: 'Maßnahme', value: action, onChange: function (e) { aSt[1](e.target.value); touched[1](false); }, options: CORPORATE_ACTIONS.map(function (a) { return { value: a.value, label: a.label }; }) }),
      body,
      h('p', { className: 'bnk-caf__hint' }, 'Die Maßnahme startet eine Abstimmung der Aktionäre. Erst wenn sie angenommen ist, wird sie ausgeführt.'),
      h('div', { className: 'bnk-caf__actions' },
        props.onCancel ? h(Button, { onClick: props.onCancel }, 'Abbrechen') : null,
        h(Button, { type: 'submit', variant: action === 'LIQUIDATION' ? 'danger' : (props.submitVariant || 'primary'), loading: props.loading }, action === 'LIQUIDATION' ? 'Liquidation zur Abstimmung stellen' : 'Abstimmung starten')));
  });
  CorporateActionForm.displayName = 'CorporateActionForm';

  /* CompanyFoundingForm — neue AG gründen (API: POST /companies). */
  function CompanyFoundingForm(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var nSt = React.useState(''), cSt = React.useState(''), aSt = React.useState(''), sSt = React.useState('');
    var touched = React.useState(false);
    var cash = toNum(cSt[0]), sh = toNum(sSt[0]);
    var asin = aSt[0].toUpperCase();
    var err = {};
    if (nSt[0].trim().length < 3) err.name = 'Mindestens 3 Zeichen.';
    if (!(cash > 0)) err.cash = 'Bitte eine Einlage eingeben.';
    else if (props.minDeposit && cash < props.minDeposit) err.cash = 'Mindestens ' + money(props.minDeposit, cur) + '.';
    else if (props.cash != null && cash > props.cash) err.cash = 'Nicht genug Bargeld (' + money(props.cash, cur, 2, true) + ').';
    if (asin && !/^[A-Z0-9]{10}$/.test(asin)) err.asin = 'Genau 10 Zeichen, nur A–Z und 0–9.';
    if (sSt[0] && (!(sh > 0) || Math.floor(sh) !== sh)) err.shares = 'Bitte eine ganze Zahl.';
    var show = function (k) { return touched[0] || (k === 'asin' && asin) ? err[k] : null; };
    function submit(e) {
      e.preventDefault(); touched[1](true);
      if (Object.keys(err).length) return;
      var p = { name: nSt[0].trim(), cashDeposit: apiNum(cash) };
      if (props.premium && asin) p.customAsin = asin;
      if (props.premium && sh > 0) p.customNumberOfShares = sh;
      if (props.onSubmit) props.onSubmit(p);
    }
    return h('form', { className: cx('bnk-caf', 'bnk-found', props.className), onSubmit: submit, noValidate: true, 'aria-label': 'Unternehmen gründen' },
      h('div', { className: 'bnk-caf__head' }, h('div', { className: 'bnk-caf__title' }, props.heading || 'Unternehmen gründen'),
        h('div', { className: 'bnk-caf__sub' }, 'Du wirst CEO, die Einlage wird zum Bargeld der AG.')),
      h(Input, { label: 'Name', value: nSt[0], placeholder: 'z. B. Hanse Beteiligungs AG', onChange: function (e) { nSt[1](e.target.value); }, error: show('name') }),
      h(Input, { label: 'Einlage', numeric: true, suffix: cur, value: cSt[0], onChange: function (e) { cSt[1](e.target.value); }, error: show('cash'),
        hint: props.cash != null ? 'Dein Bargeld: ' + money(props.cash, cur, 2, true) : null }),
      h('div', { className: 'bnk-caf__row' },
        h(Input, { label: 'Eigene ASIN', optional: true, value: aSt[0], placeholder: 'STHANSEBET', maxLength: 10, disabled: !props.premium, onChange: function (e) { aSt[1](e.target.value.toUpperCase()); }, error: show('asin') }),
        h(Input, { label: 'Anzahl Anteile', optional: true, numeric: true, value: sSt[0], disabled: !props.premium, onChange: function (e) { sSt[1](e.target.value); }, error: show('shares') })),
      !props.premium ? h('p', { className: 'bnk-ot__gold' }, h('span', { className: 'bnk-gold' }, 'Gold'), ' Eigene ASIN und Anteilszahl gibt es mit dem Goldzugang.') : null,
      h('div', { className: 'bnk-caf__actions' },
        props.onCancel ? h(Button, { onClick: props.onCancel }, 'Abbrechen') : null,
        h(Button, { type: 'submit', variant: props.submitVariant || 'primary', loading: props.loading }, 'Unternehmen gründen')));
  }


  /* ---------- Grundbausteine: Auswahl, Hilfe, Zustände, Menüs, Benachrichtigungen ---------- */

  /* Checkbox — native Checkbox, gezeichnet: Haken in bg-page auf text-primary. Kein Messing, kein Grün. */
  var Checkbox = React.forwardRef(function Checkbox(props, ref) {
    var id = useFieldId(props.id);
    var inner = React.useRef(null);
    React.useEffect(function () { if (inner.current) inner.current.indeterminate = !!props.indeterminate; }, [props.indeterminate]);
    var rest = pick(props, ['label', 'hint', 'error', 'indeterminate', 'className', 'id', 'size']);
    rest.id = id; rest.type = 'checkbox'; rest.className = 'bnk-check__input';
    rest.ref = function (el) { inner.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; };
    if (props.hint || props.error) rest['aria-describedby'] = id + '-msg';
    if (props.error) rest['aria-invalid'] = 'true';
    return h('div', { className: cx('bnk-check', props.disabled && 'is-disabled', props.error && 'is-invalid', props.className) },
      h('input', rest),
      h('label', { htmlFor: id, className: 'bnk-check__label' },
        h('span', { className: 'bnk-check__box', 'aria-hidden': 'true' }),
        h('span', { className: 'bnk-check__text' }, props.label)),
      props.error ? h('div', { id: id + '-msg', className: 'bnk-check__msg is-error' }, h('span', { 'aria-hidden': 'true' }, '✕ '), props.error)
        : props.hint ? h('div', { id: id + '-msg', className: 'bnk-check__msg' }, props.hint) : null);
  });
  Checkbox.displayName = 'Checkbox';

  /* Switch — sofort wirksame Einstellung (role="switch"). An = Schiene text-primary, Aus = eingelassen. */
  var Switch = React.forwardRef(function Switch(props, ref) {
    var id = useFieldId(props.id);
    var ctl = props.checked !== undefined;
    var st = React.useState(!!props.defaultChecked);
    var on = ctl ? !!props.checked : st[0];
    function toggle() { if (props.disabled) return; if (!ctl) st[1](!on); if (props.onChange) props.onChange(!on); }
    return h('div', { className: cx('bnk-switch', props.disabled && 'is-disabled', props.className) },
      h('button', { ref: ref, id: id, type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false', disabled: props.disabled,
          'aria-describedby': props.hint ? id + '-msg' : undefined, 'aria-labelledby': id + '-l', className: 'bnk-switch__btn', onClick: toggle },
        h('span', { className: 'bnk-switch__track', 'aria-hidden': 'true' }, h('span', { className: 'bnk-switch__knob' })),
        h('span', { id: id + '-l', className: 'bnk-switch__label' }, props.label),
        props.showState !== false ? h('span', { className: 'bnk-switch__state', 'aria-hidden': 'true' }, on ? (props.onText || 'An') : (props.offText || 'Aus')) : null),
      props.hint ? h('div', { id: id + '-msg', className: 'bnk-switch__hint' }, props.hint) : null);
  });
  Switch.displayName = 'Switch';

  /* RadioGroup — eine Wahl aus 2–6 Optionen mit Erklärung; für 2–4 kurze Optionen lieber SegmentedControl. */
  function RadioGroup(props) {
    var name = useFieldId(props.name);
    var ctl = props.value !== undefined;
    var st = React.useState(props.defaultValue !== undefined ? props.defaultValue : null);
    var value = ctl ? props.value : st[0];
    return h('fieldset', { className: cx('bnk-radio', props.inline && 'is-inline', props.error && 'is-invalid', props.className), disabled: props.disabled, 'aria-describedby': props.error || props.hint ? name + '-msg' : undefined },
      props.label ? h('legend', { className: 'bnk-field__label' }, props.label) : null,
      h('div', { className: 'bnk-radio__opts' }, (props.options || []).map(function (o) {
        var oid = name + '-' + o.value;
        return h('div', { key: o.value, className: cx('bnk-radio__opt', o.disabled && 'is-disabled') },
          h('input', { type: 'radio', id: oid, name: name, value: o.value, checked: value === o.value, disabled: o.disabled, className: 'bnk-radio__input',
            onChange: function () { if (!ctl) st[1](o.value); if (props.onChange) props.onChange(o.value); } }),
          h('label', { htmlFor: oid, className: 'bnk-radio__label' },
            h('span', { className: 'bnk-radio__dot', 'aria-hidden': 'true' }),
            h('span', { className: 'bnk-radio__text' }, h('span', { className: 'bnk-radio__title' }, o.label),
              o.description ? h('span', { className: 'bnk-radio__desc' }, o.description) : null)));
      })),
      props.error ? h('div', { id: name + '-msg', className: 'bnk-check__msg is-error' }, h('span', { 'aria-hidden': 'true' }, '✕ '), props.error)
        : props.hint ? h('div', { id: name + '-msg', className: 'bnk-check__msg' }, props.hint) : null);
  }

  /* Tooltip — kurze Erklärung bei Hover, Fokus und Antippen, Escape schließt. Nur Text, nichts Anklickbares darin.
     Die Blase hängt per Portal an document.body und steht fest (position: fixed) am Auslöser – so schneiden
     scrollende Tabellen und Karten (overflow) sie nicht ab. Beim Scrollen oder Größenwechsel schließt sie. */
  function Tooltip(props) {
    var id = useFieldId(props.id);
    var st = React.useState(false);
    var wrap = React.useRef(null);
    var bubble = React.useRef(null);
    var timer = React.useRef(null);
    var open = st[0];
    function show() { clearTimeout(timer.current); timer.current = setTimeout(function () { st[1](true); }, props.delay == null ? 250 : props.delay); }
    function hide() { clearTimeout(timer.current); st[1](false); }
    React.useEffect(function () { if (props.defaultOpen) st[1](true); return function () { clearTimeout(timer.current); }; }, []);
    React.useLayoutEffect(function () {
      var b = bubble.current, w = wrap.current;
      if (!open || !b || !w) return;
      var r = w.getBoundingClientRect(), bw = b.offsetWidth, bh = b.offsetHeight, vw = document.documentElement.clientWidth, gap = 8;
      var place = props.placement || (r.top - bh - gap < gap && r.bottom + bh + gap <= window.innerHeight ? 'bottom' : 'top');
      var left = Math.max(gap, Math.min(r.left + r.width / 2 - bw / 2, vw - bw - gap));
      b.style.left = left + 'px';
      b.style.top = (place === 'top' ? r.top - bh - gap : r.bottom + gap) + 'px';
      b.style.setProperty('--tip-arrow', Math.max(10, Math.min(r.left + r.width / 2 - left, bw - 10)) + 'px');
      b.className = cx('bnk-tip__bubble', 'is-' + place, 'is-open');
    }, [open, props.placement]);
    React.useEffect(function () {
      if (!open) return;
      function key(e) { if (e.key === 'Escape') hide(); }
      document.addEventListener('keydown', key);
      window.addEventListener('scroll', hide, true);
      window.addEventListener('resize', hide);
      return function () { document.removeEventListener('keydown', key); window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide); };
    }, [open]);
    var child = React.Children.only(props.children);
    var trigger = React.cloneElement(child, {
      'aria-describedby': props.decorative ? child.props['aria-describedby'] : cx(child.props['aria-describedby'], id) || undefined,
      onMouseEnter: function (e) { show(); if (child.props.onMouseEnter) child.props.onMouseEnter(e); },
      onMouseLeave: function (e) { hide(); if (child.props.onMouseLeave) child.props.onMouseLeave(e); },
      onFocus: function (e) { show(); if (child.props.onFocus) child.props.onFocus(e); },
      onBlur: function (e) { hide(); if (child.props.onBlur) child.props.onBlur(e); }
    });
    var bub = h('span', { ref: bubble, id: id, role: props.decorative ? undefined : 'tooltip', 'aria-hidden': props.decorative ? 'true' : undefined,
        className: cx('bnk-tip__bubble', 'is-' + (props.placement || 'top'), open && 'is-open'), style: props.width ? { width: props.width } : undefined },
      props.title ? h('span', { className: 'bnk-tip__title' }, props.title) : null, props.content);
    var portal = window.ReactDOM && window.ReactDOM.createPortal && typeof document !== 'undefined';
    return h('span', { ref: wrap, className: cx('bnk-tip', props.className) }, trigger,
      portal ? window.ReactDOM.createPortal(bub, document.body) : bub);
  }

  /* Term — Fachbegriff mit gepunkteter Unterstreichung und Erklärung im Tooltip. */
  var GLOSSARY = {
    ASIN: ['ASIN', 'Kennung eines Wertpapiers im Spiel, 10 Zeichen. Die ersten Buchstaben zeigen die Art: ST Aktie, BO Anleihe, AC Coin, ID Index.'],
    SPREAD: ['Spread', 'Abstand zwischen dem höchsten Kaufgebot (Geld) und dem niedrigsten Verkaufsangebot (Brief).'],
    BID: ['Geld', 'Der höchste Preis, zu dem gerade jemand kaufen will. Wer sofort verkauft, bekommt ungefähr diesen Preis.'],
    ASK: ['Brief', 'Der niedrigste Preis, zu dem gerade jemand verkaufen will. Wer sofort kauft, zahlt ungefähr diesen Preis.'],
    MARKET: ['Market-Order', 'Wird sofort zum besten verfügbaren Preis ausgeführt. Schnell, aber der Preis steht vorher nicht fest.'],
    LIMIT: ['Limit-Order', 'Wird nur zum angegebenen Preis oder besser ausgeführt. Kann offen bleiben, bis sich jemand findet.'],
    OTC: ['OTC-Order', 'Außerbörslich: Nur die angegebene Gegenpartei kann die Order ausführen.'],
    BOOK_VALUE: ['Buchwert', 'Wert eines Portfolios bzw. Unternehmens aus Bargeld und Wertpapieren zum aktuellen Kurs.'],
    NET_CASH: ['Net Cash', 'Bargeld abzüglich Verbindlichkeiten wie Zentralbankkredite und Repos.'],
    CASH_FLOW: ['Cashflow', 'Veränderung des Bargelds im letzten Zeitraum.'],
    RESERVES: ['Zentralbankreserven', 'Guthaben einer Bank bei der Zentralbank. Wird verzinst und begrenzt, wie viel Kredit die Bank aufnehmen kann.'],
    REPO: ['Repo', 'Kurzfristiges Geschäft: Wertpapier gegen Geld, mit fester Rückkaufvereinbarung. Wird wie eine Anleihe in % notiert.'],
    SUBSCRIPTION_RIGHT: ['Bezugsrecht', 'Bei einer Kapitalerhöhung dürfen bestehende Aktionäre zuerst neue Aktien zeichnen – im angegebenen Verhältnis zu ihrem Bestand.'],
    FREE_FLOAT: ['Streubesitz', 'Anteil der Aktien, der nicht bei großen Einzelaktionären liegt.'],
    MARKET_MAKER: ['Market Maker', 'Ein Unternehmen, das für eine Aktie dauerhaft Kauf- und Verkaufsangebote stellt und so für Handel sorgt.'],
    MINER: ['Miner', 'Erzeugt stündlich AlphaCoins. Ein Upgrade erhöht Leistung und Speicher; volle Speicher erzeugen nichts mehr.'],
    GOLD: ['Goldzugang', 'Bezahlter Komfort, z. B. zeitgesteuerte Orders und eigene ASINs. Kein Vorteil im Spielergebnis.'],
    ABSTENTION: ['Enthaltung', 'Nicht abgegebene Stimmen. Je nach Antrag zählen sie am Ende als Ja oder als Nein.']
  };
  function Term(props) {
    var g = props.term ? GLOSSARY[props.term] : null;
    var title = props.title || (g && g[0]);
    var text = props.definition || (g && g[1]);
    return h(Tooltip, { title: title, content: text, placement: props.placement, defaultOpen: props.defaultOpen, width: props.width || 280 },
      h('span', { className: cx('bnk-term', props.className), tabIndex: 0 }, props.children || title));
  }

  /* Skeleton — Platzhalter beim Laden: flache Flächen in bg-raised, ruhiges Pulsieren (bei reduzierter Bewegung starr). */
  function Skeleton(props) {
    var v = props.variant || 'text';
    if (v === 'text') {
      var lines = props.lines || 1;
      return h('span', { className: cx('bnk-skel-group', props.className), 'aria-hidden': 'true' }, Array.apply(null, Array(lines)).map(function (_, i) {
        return h('span', { key: i, className: 'bnk-skel bnk-skel--text', style: { width: i === lines - 1 && lines > 1 ? '60%' : (props.width || '100%') } });
      }));
    }
    if (v === 'rows') {
      var n = props.rows || 5, cols = props.columns || 4;
      return h('div', { className: cx('bnk-skel-rows', props.className), 'aria-hidden': 'true' }, Array.apply(null, Array(n)).map(function (_, i) {
        return h('div', { key: i, className: 'bnk-skel-row', style: { gridTemplateColumns: 'minmax(0, 2fr) ' + Array(cols).join('minmax(0, 1fr) ') } },
          h('span', { className: 'bnk-skel-stack' }, h('span', { className: 'bnk-skel bnk-skel--text', style: { width: (55 + (i * 17) % 35) + '%' } }), h('span', { className: 'bnk-skel bnk-skel--text is-small', style: { width: '30%' } })),
          Array.apply(null, Array(cols - 1)).map(function (_, j) { return h('span', { key: j, className: 'bnk-skel bnk-skel--text is-num', style: { width: (40 + ((i + j) * 13) % 45) + '%' } }); }));
      }));
    }
    return h('span', { className: cx('bnk-skel', 'bnk-skel--' + v, props.className), 'aria-hidden': 'true', style: { width: props.width, height: props.height } });
  }
  /* Loading — Bereich lädt: Skeleton für Sehende, Statusmeldung für Screenreader. */
  function Loading(props) {
    return h('div', { className: cx('bnk-loading', props.className), role: 'status', 'aria-live': 'polite', 'aria-busy': 'true' },
      h('span', { className: 'bnk-sr' }, props.label || 'Wird geladen …'),
      props.children || h(Skeleton, { variant: 'rows', rows: props.rows || 4, columns: props.columns || 3 }));
  }

  /* EmptyState — leere Liste: kurze Überschrift, ein Satz, höchstens eine Aktion. */
  function EmptyState(props) {
    var Tag = props.as || 'h3';
    return h('div', { className: cx('bnk-empty', props.compact && 'is-compact', props.className) },
      props.symbol !== false ? h('span', { className: 'bnk-empty__mark', 'aria-hidden': 'true' }, props.symbol || '§') : null,
      h(Tag, { className: 'bnk-empty__title' }, props.title),
      props.children ? h('p', { className: 'bnk-empty__text' }, props.children) : null,
      props.action ? h('div', { className: 'bnk-empty__action' }, props.action) : null);
  }

  /* DropdownMenu — Knopf mit aufklappender Aktionsliste (role="menu"), Pfeiltasten, Escape, Klick daneben. */
  function DropdownMenu(props) {
    var id = useFieldId(props.id);
    var st = React.useState(!!props.defaultOpen);
    var open = st[0];
    var wrap = React.useRef(null), btn = React.useRef(null), itemsRef = React.useRef([]);
    var items = (props.items || []);
    function close(focusBtn) { st[1](false); if (focusBtn && btn.current) btn.current.focus(); }
    function focusAt(i) { var els = itemsRef.current.filter(Boolean); if (!els.length) return; var n = (i + els.length) % els.length; els[n].focus(); }
    React.useEffect(function () {
      if (!open) return;
      function down(e) { if (wrap.current && !wrap.current.contains(e.target)) close(false); }
      document.addEventListener('mousedown', down); return function () { document.removeEventListener('mousedown', down); };
    }, [open]);
    function onKey(e) {
      var els = itemsRef.current.filter(Boolean), i = els.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(i + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(i - 1); }
      else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
      else if (e.key === 'End') { e.preventDefault(); focusAt(els.length - 1); }
      else if (e.key === 'Tab') close(false);
    }
    itemsRef.current = [];
    var k = 0;
    return h('div', { ref: wrap, className: cx('bnk-menu', 'is-' + (props.align || 'start'), props.className), onKeyDown: open ? onKey : undefined },
      h(Button, { ref: btn, variant: props.variant || 'secondary', size: props.size || 'sm', 'aria-haspopup': 'menu', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': id,
          iconEnd: h('span', { className: cx('bnk-chev', open && 'is-open') }),
          onClick: function () { st[1](!open); if (!open) setTimeout(function () { focusAt(0); }, 0); },
          onKeyDown: function (e) { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); st[1](true); setTimeout(function () { focusAt(0); }, 0); } } }, props.label),
      h('div', { id: id, role: 'menu', className: 'bnk-menu__list', hidden: !open, 'aria-label': typeof props.label === 'string' ? props.label : undefined },
        items.map(function (it, i) {
          if (it.divider) return h('div', { key: 'd' + i, role: 'separator', className: 'bnk-menu__sep' });
          if (it.heading) return h('div', { key: 'h' + i, className: 'bnk-menu__heading', role: 'presentation' }, it.heading);
          var idx = k++;
          var p = { key: i, role: 'menuitem', tabIndex: -1, className: cx('bnk-menu__item', it.danger && 'is-danger'), 'aria-disabled': it.disabled ? 'true' : undefined,
            ref: function (el) { itemsRef.current[idx] = el; },
            onClick: function (e) { if (it.disabled) { e.preventDefault(); return; } if (it.onSelect) it.onSelect(e); if (props.onSelect) props.onSelect(it, e); close(true); } };
          var inner = [h('span', { key: 'l', className: 'bnk-menu__label' }, it.label), it.description ? h('span', { key: 'd', className: 'bnk-menu__desc' }, it.description) : null,
            it.meta ? h('span', { key: 'm', className: 'bnk-menu__meta' }, it.meta) : null];
          return it.href && !it.disabled ? h('a', Object.assign(p, { href: it.href }), inner) : h('button', Object.assign(p, { type: 'button' }), inner);
        })));
  }

  /* Sheet — Fläche, die unten (Handy) oder rechts (Desktop) hereinkommt, z. B. für die Order-Maske. Fokus bleibt darin. */
  function Sheet(props) {
    var id = useFieldId(props.id);
    var panel = React.useRef(null);
    var side = props.side || 'auto';
    React.useEffect(function () {
      if (!props.open) return;
      var prev = document.activeElement, body = document.body, old = body.style.overflow;
      if (!props.inline) body.style.overflow = 'hidden';
      var p = panel.current;
      var first = p && (p.querySelector('[data-autofocus]') || p.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'));
      if (first) first.focus();
      function key(e) {
        if (e.key === 'Escape' && props.onClose) { e.preventDefault(); props.onClose(); }
        if (e.key === 'Tab' && p) {
          var f = [].slice.call(p.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'));
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      }
      document.addEventListener('keydown', key);
      return function () { document.removeEventListener('keydown', key); body.style.overflow = old; if (prev && prev.focus) prev.focus(); };
    }, [props.open]);
    if (!props.open) return null;
    return h('div', { className: cx('bnk-sheet', 'is-' + side, props.inline && 'is-inline', props.className) },
      h('div', { className: 'bnk-sheet__scrim', onClick: props.onClose, 'aria-hidden': 'true' }),
      h('div', { ref: panel, role: 'dialog', 'aria-modal': props.inline ? undefined : 'true', 'aria-labelledby': id + '-t', className: 'bnk-sheet__panel', style: props.width ? { width: props.width } : undefined },
        h('div', { className: 'bnk-sheet__grip', 'aria-hidden': 'true' }),
        h('div', { className: 'bnk-sheet__head' },
          h('h2', { id: id + '-t', className: 'bnk-sheet__title' }, props.title),
          props.onClose ? h('button', { type: 'button', className: 'bnk-sheet__close', onClick: props.onClose, 'aria-label': 'Schließen' }, '✕') : null),
        h('div', { className: 'bnk-sheet__body' }, props.children),
        props.footer ? h('div', { className: 'bnk-sheet__foot' }, props.footer) : null));
  }

  /* NotificationBell + NotificationList — Benachrichtigungen (API: /v2/notifications, NotificationView). */
  var NotificationBell = React.forwardRef(function NotificationBell(props, ref) {
    var n = props.count || 0;
    var label = props.label || 'Benachrichtigungen';
    return h('button', { ref: ref, type: 'button', className: cx('bnk-bell', props.className), onClick: props.onClick, title: props.title,
        'aria-label': label + (n ? ', ' + n + ' ungelesen' : ''), 'aria-expanded': props.expanded != null ? String(!!props.expanded) : undefined,
        'aria-pressed': props.pressed != null ? String(!!props.pressed) : undefined, 'aria-controls': props.controls, 'aria-haspopup': props.haspopup ? 'dialog' : undefined },
      props.icon ? h(Icon, { name: props.icon, size: 20, className: 'bnk-bell__icon' }) :
      h('svg', { className: 'bnk-bell__icon', 'aria-hidden': 'true', viewBox: '0 0 20 20', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13z' }), h('path', { d: 'M8.5 17.5a1.6 1.6 0 0 0 3 0' })),
      n ? h('span', { className: 'bnk-bell__count', 'aria-hidden': 'true' }, n > 99 ? '99+' : n) : null);
  });
  NotificationBell.displayName = 'NotificationBell';
  function NotificationList(props) {
    var items = props.items || [];
    var unread = items.filter(function (i) { return !i.readByReceiver; }).length;
    return h('section', { className: cx('bnk-notes', props.className), 'aria-label': 'Benachrichtigungen' },
      h('div', { className: 'bnk-notes__head' },
        h('h2', { className: 'bnk-notes__title' }, props.title || 'Benachrichtigungen'),
        unread > 0 && props.onReadAll ? h(Button, { variant: 'ghost', size: 'sm', onClick: props.onReadAll }, 'Alle gelesen') : null),
      items.length ? h('ul', { className: 'bnk-notes__list' }, items.map(function (n) {
        var subj = messageText(n.subject), body = messageText(n.content);
        var inner = [h('span', { key: 'dot', className: 'bnk-notes__dot', 'aria-hidden': 'true' }),
          h('span', { key: 'm', className: 'bnk-notes__main' },
            h('span', { className: 'bnk-notes__subj' }, subj, !n.readByReceiver ? h('span', { className: 'bnk-sr' }, ' (ungelesen)') : null),
            body ? h('span', { className: 'bnk-notes__body' }, body) : null,
            h('time', { className: 'bnk-notes__time', dateTime: n.date ? new Date(n.date).toISOString() : undefined }, n.date ? dateTime(n.date) : '')),
          props.onDelete ? h('button', { key: 'x', type: 'button', className: 'bnk-notes__del', 'aria-label': 'Benachrichtigung löschen', onClick: function (e) { e.stopPropagation(); props.onDelete(n); } }, '✕') : null];
        return h('li', { key: n.id, className: cx('bnk-notes__item', !n.readByReceiver && 'is-unread') },
          props.onOpen ? h('button', { type: 'button', className: 'bnk-notes__btn', onClick: function () { props.onOpen(n); } }, inner.slice(0, 2)) : h('div', { className: 'bnk-notes__btn' }, inner.slice(0, 2)),
          inner[2]);
      })) : h(EmptyState, { compact: true, title: 'Keine Benachrichtigungen', symbol: false }, 'Ausgeführte Orders, Abstimmungen und Nachrichten erscheinen hier.'),
      props.footer ? h('div', { className: 'bnk-notes__foot' }, props.footer) : null);
  }


  /* ---------- Organisation (API: empire) & Portfolio ---------- */

  /* ProfitLoss — Gewinn/Verlust als Betrag (Kurzform ab 1 Mio.), optional mit Prozent. Kursgetrieben, daher gain/loss mit ▲▼. */
  function ProfitLoss(props) {
    var v = Number(props.value) || 0;
    var cur = props.currency == null ? '€' : props.currency;
    var dir = Math.round(v * 100) === 0 ? 'flat' : v > 0 ? 'up' : 'down';
    var arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '±';
    var sign = dir === 'up' ? '+' : dir === 'down' ? '−' : '';
    var full = sign + money(Math.abs(v), cur, 2);
    var short = sign + money(Math.abs(v), cur, 2, props.compact == null ? true : props.compact);
    var pct = props.percent != null && isFinite(props.percent) ? (props.percent > 0 ? '+' : props.percent < 0 ? '−' : '') + fmt(props.percent, 2) + ' %' : null;
    var words = (dir === 'up' ? 'Gewinn ' : dir === 'down' ? 'Verlust ' : 'ausgeglichen ') + money(Math.abs(v), cur, 2) + (pct ? ', ' + pct : '') + (props.suffix ? ' ' + props.suffix : '');
    return h('span', { className: cx('bnk-chg', 'bnk-chg--' + dir, 'bnk-chg--' + (props.variant || 'text'), 'bnk-chg--' + (props.size || 'md'), 'bnk-pl', props.className), title: short !== full ? full : undefined },
      h('span', { className: 'bnk-chg__arrow', 'aria-hidden': 'true' }, arrow),
      h('span', { 'aria-hidden': 'true', className: props.stacked ? 'bnk-pl__stack' : undefined }, short, pct ? (props.stacked ? h('small', null, pct) : ' (' + pct + ')') : null, props.suffix ? h('span', { className: 'bnk-chg__suffix' }, ' ' + props.suffix) : null),
      h('span', { className: 'bnk-sr' }, words));
  }

  var VOLUME_GROUPS = [
    { key: 'STOCK', label: 'Aktien', types: ['STOCK'], color: 'var(--chart-1)' },
    { key: 'BOND', label: 'Anleihen', types: ['BOND', 'INTEREST_TENDER_BOND', 'SYSTEM_BOND'], color: 'var(--chart-2)' },
    { key: 'COIN', label: 'Coins', types: ['COIN'], color: 'var(--chart-3)' },
    { key: 'REPO', label: 'Repos', types: ['REPO'], color: 'var(--chart-4)' },
    { key: 'SYSTEM_REPO', label: 'Repos (Zentralbank)', types: ['SYSTEM_REPO'], color: 'var(--chart-5)' },
    { key: 'OTHER', label: 'Sonstige', types: null, color: 'var(--line-strong)' }
  ];
  function positionType(p) { return p.type || (p.listing && p.listing.type) || 'OTHER'; }
  function volumesByGroup(positions) {
    var out = {};
    VOLUME_GROUPS.forEach(function (g) { out[g.key] = 0; });
    (positions || []).forEach(function (p) {
      var t = positionType(p), g = null;
      for (var i = 0; i < VOLUME_GROUPS.length; i++) if (VOLUME_GROUPS[i].types && VOLUME_GROUPS[i].types.indexOf(t) !== -1) g = VOLUME_GROUPS[i];
      out[(g || VOLUME_GROUPS[VOLUME_GROUPS.length - 1]).key] += Number(p.volume) || 0;
    });
    return out;
  }

  /* PortfolioSummary — Buchwert und Zusammensetzung eines Portfolios (API: /v2/my/portfolio bzw. /portfolios/{id}). */
  function PortfolioSummary(props) {
    var p = props.portfolio || {};
    var cur = props.currency == null ? '€' : props.currency;
    var vols = props.volumes || volumesByGroup(p.positions);
    var cash = Number(p.cash) || 0, committed = Number(p.committedCash) || 0, free = cash - committed;
    var secVal = 0; for (var k in vols) secVal += vols[k];
    var book = cash + secVal;
    var parts = [
      { key: 'FREE', label: 'Verfügbares Bargeld', value: free, color: 'var(--text-secondary)' },
      { key: 'COMMITTED', label: 'Bargeld in Orders', value: committed, color: 'var(--text-secondary)', hatch: true }
    ].concat(VOLUME_GROUPS.map(function (g) { return { key: g.key, label: g.label, value: vols[g.key] || 0, color: g.color }; }))
      .filter(function (x) { return x.value !== 0 || x.key === 'FREE'; });
    var total = parts.reduce(function (a, x) { return a + Math.abs(x.value); }, 0) || 1;
    var Tag = props.as || 'h2';
    var hotSt = React.useState(null), hot = hotSt[0], setHot = hotSt[1];
    return h('section', { className: cx('bnk-psum', props.className), 'aria-labelledby': props.id ? props.id + '-t' : undefined },
      h('div', { className: 'bnk-psum__head' },
        h('div', null,
          h('div', { className: 'bnk-psum__label' }, props.label || 'Buchwert'),
          h(Tag, { id: props.id ? props.id + '-t' : undefined, className: 'bnk-psum__value' }, h(Amount, { value: book, currency: cur, compact: props.compact == null ? 'auto' : props.compact }))),
        props.change != null ? h(PriceChange, { value: props.change, amount: props.changeAmount, variant: 'tag', size: 'lg', suffix: props.changeSuffix }) : null,
        props.aside ? h('div', { className: 'bnk-psum__aside' }, props.aside) : null),
      h(Tooltip, { className: 'bnk-psum__tip', decorative: true, delay: 80, width: 280, title: 'Zusammensetzung',
          content: h('span', { className: 'bnk-psum__tiplist' }, parts.map(function (x) {
            var q = Math.abs(x.value) / total * 100;
            return h('span', { key: x.key, className: cx('bnk-psum__tiprow', hot === x.key && 'is-hot') },
              h('span', { className: cx('bnk-psum__sw', x.hatch && 'is-hatch'), style: { background: x.hatch ? undefined : x.color, color: x.color }, 'aria-hidden': 'true' }),
              h('span', { className: 'bnk-psum__tiplabel' }, x.key === 'FREE' ? 'Bargeld frei' : x.key === 'COMMITTED' ? 'In Orders' : x.label),
              h('span', { className: 'bnk-psum__tipval' }, money(x.value, cur, 2, true)),
              h('span', { className: 'bnk-psum__tippct' }, q > 0 && q < 0.1 ? '< 0,1 %' : fmt(q, 1) + ' %'));
          })) },
        h('div', { className: 'bnk-psum__bar', role: 'img', tabIndex: 0, onMouseLeave: function () { setHot(null); }, 'aria-label': 'Zusammensetzung: ' + parts.map(function (x) { return x.label + ' ' + fmt(Math.abs(x.value) / total * 100, 1) + ' %'; }).join(', ') },
          parts.map(function (x) {
            var w = Math.abs(x.value) / total * 100;
            return w > 0 ? h('span', { key: x.key, onMouseEnter: function () { setHot(x.key); }, className: cx('bnk-psum__seg', x.hatch && 'is-hatch', x.value < 0 && 'is-neg', hot === x.key && 'is-hot'), style: { width: w + '%', background: x.hatch ? undefined : x.color, color: x.color } }) : null;
          }))),
      h('dl', { className: 'bnk-psum__list' },
        h('div', { className: 'bnk-psum__row is-sub' }, h('dt', null, 'Bargeld'), h('dd', null, h(Amount, { value: cash, currency: cur, compact: true }))),
        parts.map(function (x) {
          return h('div', { key: x.key, className: cx('bnk-psum__row', (x.key === 'FREE' || x.key === 'COMMITTED') && 'is-indent') },
            h('dt', null, h('span', { className: cx('bnk-psum__sw', x.hatch && 'is-hatch'), style: { background: x.hatch ? undefined : x.color, color: x.color }, 'aria-hidden': 'true' }), x.label),
            h('dd', null, h(Amount, { value: x.value, currency: cur, compact: true }), h('small', null, (function (q) { return q > 0 && q < 0.1 ? '< 0,1 %' : fmt(q, 1) + ' %'; })(Math.abs(x.value) / total * 100))));
        }),
        h('div', { className: 'bnk-psum__row is-sub' }, h('dt', null, 'Wertpapiere'), h('dd', null, h(Amount, { value: secVal, currency: cur, compact: true })))));
  }

  /* PositionTable — Positionen eines Portfolios mit Geld/Brief, Einstand und Buch-G/V (Geldkurs gegen Einstand). */
  function PositionTable(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var rows = (props.positions || []).map(function (p) {
      var l = p.listing || {}, type = positionType(p);
      var avg = Number(p.averageBuyingPrice) || 0, bid = p.currentBidPrice, n = Number(p.numberOfShares) || 0;
      var mark = bid != null ? bid : (p.lastPrice && p.lastPrice.value);
      var pl = null;
      if (avg > 0 && mark) pl = isPercentQuoted(type) ? (Number(p.volume) || 0) * (1 - avg / mark) : (mark - avg) * n;
      return { p: p, id: l.securityIdentifier, name: l.name, type: type, shares: n, committed: Number(p.committedShares) || 0,
        bid: bid, ask: p.currentAskPrice, last: p.lastPrice ? (typeof p.lastPrice === 'number' ? p.lastPrice : p.lastPrice.value) : null, lastDate: p.lastPrice && p.lastPrice.date,
        volume: Number(p.volume) || 0, avg: avg, pl: pl, plPct: avg > 0 && mark != null ? (mark / avg - 1) * 100 : null };
    });
    var cols = [
      { key: 'name', label: 'Wertpapier', sortable: true, sticky: true, render: function (r) {
        var nm = props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(r.p) }, r.name) : r.name;
        return h('span', { className: 'bnk-table__stock' }, h('span', { className: 'bnk-table__name' }, nm),
          h('span', { className: 'bnk-table__meta' }, h('span', { className: 'bnk-table__ticker' }, r.id), h('span', null, LISTING_TYPES[r.type] || r.type)));
      } },
      { key: 'shares', label: 'Anteile', type: 'number', sortable: true, render: function (r) {
        return h('span', { className: 'bnk-pos__stack' }, number(r.shares, 0, true), r.committed ? h('small', null, number(r.committed, 0, true) + ' in Orders') : null);
      } },
      { key: 'bid', label: h(Term, { term: 'BID' }), type: 'number', render: function (r) { return quote(r, r.bid, r.p.currentBidSize); } },
      { key: 'ask', label: h(Term, { term: 'ASK' }), type: 'number', render: function (r) { return quote(r, r.ask, r.p.currentAskSize); } },
      { key: 'avg', label: 'Einstand', type: 'number', render: function (r) { return r.avg > 0 ? price(r.avg, r.type, cur) : h('span', { className: 'bnk-pos__none', title: 'Kein Kaufpreis, z. B. geschürft oder geschenkt' }, '–'); } },
      { key: 'volume', label: 'Volumen', type: 'number', sortable: true, render: function (r) { return h(Amount, { value: r.volume, currency: cur, compact: true }); } },
      { key: 'pl', label: 'G/V', type: 'number', sortable: true, sortValue: function (r) { return r.pl == null ? -Infinity : r.pl; }, render: function (r) {
        return r.pl == null ? h('span', { className: 'bnk-pos__none' }, '–') : h(ProfitLoss, { value: r.pl, percent: r.plPct, currency: cur, size: 'sm', stacked: true });
      } }
    ];
    if (props.onTrade) cols.push({ key: 'act', label: h('span', { className: 'bnk-sr' }, 'Handeln'), mobileLabel: '', action: true, align: 'right', render: function (r) {
      var free = r.shares - r.committed;
      var items = [
        { label: 'Verkaufen', meta: r.bid != null ? price(r.bid, r.type, cur) : null, description: free ? number(free, 0, true) + ' freie Anteile zum Geldkurs' : 'Alle Anteile liegen in Orders', disabled: !free || r.bid == null,
          onSelect: function () { props.onTrade({ action: 'SELL', position: r.p, price: r.bid, numberOfShares: free }); } },
        { label: 'Nachkaufen', meta: r.ask != null ? price(r.ask, r.type, cur) : null, description: 'zum Briefkurs', disabled: r.ask == null,
          onSelect: function () { props.onTrade({ action: 'BUY', position: r.p, price: r.ask }); } }
      ];
      if (props.hrefFor) items.push({ divider: true }, { label: 'Zum Wertpapier', href: props.hrefFor(r.p) });
      return h(DropdownMenu, { label: 'Handeln', variant: 'ghost', align: 'end', items: items });
    } });
    function quote(r, px, size) {
      if (px == null) return h('span', { className: 'bnk-pos__none' }, '–');
      return h('span', { className: 'bnk-pos__stack' }, price(px, r.type, cur), size != null ? h('small', null, number(size, 0, true) + ' Stk.') : null);
    }
    var sumVol = rows.reduce(function (a, r) { return a + r.volume; }, 0);
    var sumPl = rows.reduce(function (a, r) { return a + (r.pl || 0); }, 0);
    return h(DataTable, { className: cx('bnk-pos', props.className), stack: props.stack || 'auto', columns: cols, rows: rows, rowKey: 'id', density: props.density || 'sm',
      defaultSort: props.defaultSort || { key: 'volume', dir: 'desc' }, caption: props.caption || 'Positionen',
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Noch keine Wertpapiere' }, 'Gekaufte Aktien, Anleihen und Coins erscheinen hier.'),
      summary: rows.length > 1 ? { name: 'Gesamt', volume: h(Amount, { value: sumVol, currency: cur, compact: true }), pl: h(ProfitLoss, { value: sumPl, currency: cur, size: 'sm' }) } : undefined });
  }

  /* OrderList — offene Orders (API: GET /v2/securityorders?securitiesAccountId) mit Menü je Order. */
  function OrderList(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var TYPE = { MARKET: 'Market', LIMIT: 'Limit', QUOTE: 'Quote' };
    var rows = (props.orders || []).map(function (o) { return Object.assign({ _type: (o.listing && o.listing.type) || 'STOCK' }, o); });
    var cols = [
      { key: 'action', label: 'Aktion', width: 96, mobileLabel: '', render: function (o) {
        return h('span', { className: cx('bnk-side', o.action === 'SELL' ? 'is-sell' : 'is-buy') }, o.action === 'SELL' ? 'Verkauf' : 'Kauf');
      } },
      { key: 'security', label: 'Wertpapier', mobile: 'title', render: function (o) {
        var l = o.listing || {};
        var nm = props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(o) }, l.name || o.securityIdentifier) : (l.name || o.securityIdentifier);
        return h('span', { className: 'bnk-table__stock' }, h('span', { className: 'bnk-table__name' }, nm),
          h('span', { className: 'bnk-table__meta' }, h('span', { className: 'bnk-table__ticker' }, l.securityIdentifier || o.securityIdentifier),
            h('span', null, TYPE[o.type] || o.type), o.counterParty || o.counterPartyName ? h('span', null, 'OTC: ' + (o.counterPartyName || 'Gegenpartei')) : null));
      } },
      { key: 'numberOfShares', label: 'Anteile', type: 'number', sortable: true, render: function (o) { return number(o.numberOfShares, 0, true); } },
      { key: 'price', label: 'Limit', type: 'number', render: function (o) {
        if (o.type === 'MARKET' || o.price == null) return h('span', { className: 'bnk-pos__none' }, 'Market');
        return h('span', { className: 'bnk-pos__stack' }, price(o.price, o._type, cur),
          o.hourlyChange ? h('small', { title: o.nextHourlyChangeDate ? 'Nächste Änderung ' + dateTime(o.nextHourlyChangeDate) : undefined }, (o.hourlyChange > 0 ? '+' : '−') + fmt(o.hourlyChange, 2) + ' %/Std.') : null);
      } },
      { key: 'volume', label: 'Volumen', type: 'number', sortable: true, render: function (o) { return o.volume != null ? h(Amount, { value: o.volume, currency: cur, compact: true }) : '–'; } },
      { key: 'goodTillDate', label: 'Gültig', sortable: true, sortValue: function (o) { return o.goodTillDate || Infinity; }, render: function (o) {
        return h('span', { className: 'bnk-pos__stack is-left' },
          o.goodTillDate ? 'bis ' + dateTime(o.goodTillDate) : 'unbefristet',
          o.goodAfterDate && o.goodAfterDate > Date.now() ? h('small', null, 'ab ' + dateTime(o.goodAfterDate)) : h('small', null, 'seit ' + dateTime(o.creationDate)));
      } }
    ];
    if (props.onDelete || props.onOpen) cols.push({ key: 'menu', label: h('span', { className: 'bnk-sr' }, 'Aktionen'), mobileLabel: '', action: true, align: 'right', render: function (o) {
      var items = [];
      if (props.onOpen) items.push({ label: 'Zum Wertpapier', onSelect: function () { props.onOpen(o); } });
      if (props.onDelete) { if (items.length) items.push({ divider: true }); items.push({ label: 'Order löschen', danger: true, onSelect: function () { props.onDelete(o); } }); }
      return h(DropdownMenu, { label: h('span', { className: 'bnk-sr' }, 'Order ' + (o.listing && o.listing.name || o.securityIdentifier)), variant: 'ghost', align: 'end', items: items });
    } });
    return h(DataTable, { className: cx('bnk-orders', props.className), stack: props.stack || 'auto', columns: cols, rows: rows, rowKey: 'id', density: props.density || 'sm',
      defaultSort: { key: 'goodTillDate', dir: 'asc' }, caption: 'Offene Orders',
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Keine offenen Orders' }, 'Limit-Orders, die noch nicht ausgeführt wurden, stehen hier.') });
  }

  /* TradeLog — ausgeführte Trades (API: GET /v2/securityorderlogs?securitiesAccountId). Seite aus Sicht des eigenen Portfolios. */
  function TradeLog(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var me = props.securitiesAccountId;
    var names = props.names || {};
    function typeOf(e) { if (props.typeFor) return props.typeFor(e); var a = String(e.securityIdentifier || ''); return a.indexOf('BO') === 0 ? 'BOND' : a.indexOf('AC') === 0 ? 'COIN' : 'STOCK'; }
    var rows = (props.entries || []).map(function (e) {
      var sell = me ? e.sellerSecuritiesAccount === me : !!e.sell;
      var t = typeOf(e);
      var pl = sell && e.sellerAverageBuyingPrice ? (isPercentQuoted(t) ? e.volume - e.volume * e.sellerAverageBuyingPrice / e.price : (e.price - e.sellerAverageBuyingPrice) * e.numberOfShares) : null;
      return Object.assign({ _sell: sell, _type: t, _pl: pl, _plPct: pl != null ? (e.price / e.sellerAverageBuyingPrice - 1) * 100 : null }, e);
    });
    var cols = [
      { key: 'date', label: 'Zeit', sortable: true, defaultDir: 'desc', render: function (e) { return h('time', { className: 'bnk-trades__time', dateTime: new Date(e.date).toISOString() }, dateTime(e.date)); } },
      { key: 'side', label: 'Aktion', render: function (e) { return h('span', { className: cx('bnk-side', e._sell ? 'is-sell' : 'is-buy') }, e._sell ? 'Verkauf' : 'Kauf'); } },
      { key: 'securityIdentifier', label: 'Wertpapier', mobile: 'title', render: function (e) {
        var nm = names[e.securityIdentifier];
        var inner = nm ? h('span', { className: 'bnk-table__stock' }, h('span', { className: 'bnk-table__name' }, nm), h('span', { className: 'bnk-table__meta' }, h('span', { className: 'bnk-table__ticker' }, e.securityIdentifier)))
          : h('span', { className: 'bnk-table__ticker' }, e.securityIdentifier);
        return props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(e) }, inner) : inner;
      } },
      { key: 'numberOfShares', label: 'Anteile', type: 'number', render: function (e) { return number(e.numberOfShares, 0, true); } },
      { key: 'price', label: 'Kurs', type: 'number', render: function (e) { return price(e.price, e._type, cur); } },
      { key: 'volume', label: 'Volumen', type: 'number', sortable: true, render: function (e) { return h(Amount, { value: e.volume, currency: cur, compact: true }); } },
      { key: 'party', label: 'Gegenpartei', render: function (e) { return h('span', { className: 'bnk-trades__party' }, (e._sell ? e.buyerSecuritiesAccountName : e.sellerSecuritiesAccountName) || '–'); } },
      { key: '_pl', label: 'Ergebnis', type: 'number', sortable: true, sortValue: function (e) { return e._pl == null ? -Infinity : e._pl; }, render: function (e) {
        return e._pl == null ? h('span', { className: 'bnk-pos__none', title: e._sell ? 'Kein Einstand bekannt' : 'Nur Verkäufe haben ein Ergebnis' }, '–') : h(ProfitLoss, { value: e._pl, percent: e._plPct, currency: cur, size: 'sm', stacked: true });
      } }
    ];
    return h(DataTable, { className: cx('bnk-trades', props.className), stack: props.stack || 'auto', columns: cols, rows: rows, rowKey: 'id', density: props.density || 'sm',
      defaultSort: { key: 'date', dir: 'desc' }, caption: 'Ausgeführte Trades',
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Noch keine Trades' }, 'Ausgeführte Käufe und Verkäufe erscheinen hier.') });
  }

  /* TradeStats — Auswertung der Trades (API: GET /v2/trades/stats/summary → TradeSummaryView). */
  function TradeStats(props) {
    var s = props.summary || {};
    var cur = props.currency == null ? '€' : props.currency;
    var total = s.totalTrades || 0;
    var w = s.winningTrades || 0, l = s.losingTrades || 0, e = s.breakEvenTrades || 0;
    var rate = s.winRate != null ? (s.winRate <= 1 ? s.winRate * 100 : s.winRate) : (total ? w / total * 100 : 0);
    function seg(n, cls, label) { return n ? h('span', { className: 'bnk-tstats__seg ' + cls, style: { width: (n / (w + l + e) * 100) + '%' }, title: label + ': ' + number(n, 0) }) : null; }
    return h('div', { className: cx('bnk-tstats', props.className) },
      h('dl', { className: 'bnk-tstats__grid' },
        h('div', { className: 'bnk-tstats__item is-lead' }, h('dt', null, 'Ergebnis', props.periodLabel ? ' · ' + props.periodLabel : ''), h('dd', null, h(ProfitLoss, { value: s.netProfitLoss || 0, currency: cur, size: 'lg', variant: 'tag' }))),
        h('div', { className: 'bnk-tstats__item' }, h('dt', null, 'Trades'), h('dd', null, number(total, 0, true))),
        h('div', { className: 'bnk-tstats__item' }, h('dt', null, 'Trefferquote'), h('dd', null, fmt(rate, 1) + ' %')),
        h('div', { className: 'bnk-tstats__item' }, h('dt', null, 'Gewinne'), h('dd', null, h(Amount, { value: s.totalProfit || 0, currency: cur, compact: true }))),
        h('div', { className: 'bnk-tstats__item' }, h('dt', null, 'Verluste'), h('dd', null, h(Amount, { value: Math.abs(s.totalLoss || 0), currency: cur, compact: true })))),
      total ? h('div', { className: 'bnk-tstats__split' },
        h('div', { className: 'bnk-tstats__bar', 'aria-hidden': 'true' }, seg(w, 'is-win', 'Gewonnen'), seg(e, 'is-even', 'Ausgeglichen'), seg(l, 'is-loss', 'Verloren')),
        h('p', { className: 'bnk-tstats__legend' },
          h('span', null, h('b', { className: 'bnk-chg--up' }, '▲ '), number(w, 0), ' gewonnen'),
          h('span', null, '± ', number(e, 0), ' ausgeglichen'),
          h('span', null, h('b', { className: 'bnk-chg--down' }, '▼ '), number(l, 0), ' verloren'))) : null);
  }

  /* SuggestionList — Vorschläge des Spiels (API: GET /v2/suggestions). */
  var SUGGESTION_TYPES = {
    PROFIT_REALIZATION: ['Gewinn mitnehmen', 'Verkaufen'], TRANSFER_PRIVATE_COINS: ['Coins übertragen', 'Übertragen'], UPGRADE_PRIVATE_MINER: ['Miner ausbauen', 'Ausbauen'],
    FOUND_COMPANY: ['Unternehmen gründen', 'Gründen'], SPARE_COMPANY: ['Spare-AG holen', 'Als CEO bewerben'], VOTING_POSSIBLE: ['Abstimmung offen', 'Abstimmen'],
    USER_ACHIEVEMENT: ['Erfolg abholen', 'Abholen'], CORPORATE_ACHIEVEMENT: ['Unternehmenserfolg abholen', 'Abholen'], ALLIANCE_ACHIEVEMENT: ['Allianzerfolg abholen', 'Abholen'],
    STOCK_BUY_RECOMMENDATION: ['Kaufgelegenheit', 'Ansehen'], INCREASE_OWN_SHARES: ['Eigene Anteile erhöhen', 'Kaufen'], STOCK_DIVERSIFICATION: ['Streuen', 'Ansehen'],
    COMPANY_TAKEOVER: ['Übernahme möglich', 'Ansehen'], CROSS_HOLDINGS: ['Überkreuzbeteiligung', 'Ansehen'], BECOME_MARKET_MAKER: ['Market Maker werden', 'Ansehen']
  };
  function SuggestionList(props) {
    var items = props.suggestions || [];
    if (!items.length) return h(EmptyState, { compact: true, symbol: false, title: 'Keine Vorschläge' }, 'Das Spiel schlägt hier nächste Schritte vor, z. B. Gewinne mitnehmen oder abstimmen.');
    return h('ul', { className: cx('bnk-sugg', props.className) }, items.map(function (s, i) {
      var t = SUGGESTION_TYPES[s.type] || [s.type, 'Ansehen'];
      var reward = /ACHIEVEMENT$/.test(s.type || '');
      return h('li', { key: s.id || i, className: cx('bnk-sugg__item', reward && 'is-reward') },
        h('div', { className: 'bnk-sugg__main' },
          h('span', { className: 'bnk-sugg__type' }, reward ? h('span', { className: 'bnk-sugg__medal', 'aria-hidden': 'true' }) : null, t[0], s.portfolioName ? ' · ' + s.portfolioName : ''),
          h('span', { className: 'bnk-sugg__text' }, messageText(s.text))),
        props.onAction ? h(Button, { size: 'sm', onClick: function () { props.onAction(s); } }, s.actionLabel || t[1]) : null);
    }));
  }

  /* CompanyDevelopment — eigene Unternehmen mit Veränderung zum Vortag (API: GET /v2/my/companydevelopment). */
  function CompanyDevelopment(props) {
    var cur = props.currency == null ? '€' : props.currency;
    function delta(now, before) {
      if (before == null || now == null) return null;
      var d = now - before; if (Math.round(d * 100) === 0) return h('small', { className: 'bnk-dev__d' }, '± 0');
      return h('small', { className: 'bnk-dev__d', title: 'Vortag: ' + money(before, cur, 2) }, h('span', { 'aria-hidden': 'true' }, d > 0 ? '↑ ' : '↓ '), (d > 0 ? '+' : '−') + money(Math.abs(d), cur, 2, true),
        h('span', { className: 'bnk-sr' }, ' zum Vortag'));
    }
    function col(key, label, yKey, term) {
      return { key: key, label: term ? h(Term, { term: term }, label) : label, type: 'number', sortable: true, render: function (c) {
        return h('span', { className: 'bnk-pos__stack' }, h(Amount, { value: c[key] || 0, currency: cur, compact: true }), delta(c[key], c[yKey]));
      } };
    }
    return h(DataTable, { className: cx('bnk-dev', props.className), stack: props.stack || 'auto', rows: props.companies || [], rowKey: 'securityIdentifier', density: props.density,
      defaultSort: { key: 'bookValue', dir: 'desc' }, caption: 'Unternehmensentwicklung',
      columns: [
        { key: 'name', label: 'Unternehmen', sortable: true, sticky: true, render: function (c) {
          var nm = props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(c) }, c.name) : c.name;
          return h('span', { className: 'bnk-table__stock' }, h('span', { className: 'bnk-table__name' }, nm), h('span', { className: 'bnk-table__meta' }, h('span', { className: 'bnk-table__ticker' }, c.securityIdentifier)));
        } },
        col('bookValue', 'Buchwert', 'yesterdayBookValue', 'BOOK_VALUE'), col('cash', 'Bargeld', 'yesterdayCash'), col('cashFlow', 'Cashflow', 'yesterdayCashFlow', 'CASH_FLOW'),
        col('netCash', 'Net Cash', 'yesterdayNetCash', 'NET_CASH'), col('centralBankReserves', 'ZB-Reserven', 'yesterdayCentralBankReserves', 'RESERVES')
      ],
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Keine eigenen Unternehmen', action: props.onFound ? h(Button, { size: 'sm', onClick: props.onFound }, 'Unternehmen gründen') : null }, 'Als CEO geführte Unternehmen erscheinen hier.') });
  }

  /* ShareList — Beteiligungen in Prozent mit Markierung bei 50 % (API: /v2/my/companiesbyempireshare, /v2/my/takeoverpossibilities). */
  function ShareList(props) {
    var items = props.items || [];
    var mark = props.threshold == null ? 50 : props.threshold;
    if (!items.length) return h(EmptyState, { compact: true, symbol: false, title: props.emptyTitle || 'Keine Beteiligungen' }, props.emptyText || null);
    return h('ul', { className: cx('bnk-shares', props.className) }, items.map(function (it, i) {
      var l = it.listing || {}, pct = Number(it.shareInPercent) || 0;
      var nm = props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(it) }, l.name) : l.name;
      return h('li', { key: l.securityIdentifier || i, className: 'bnk-shares__item' },
        h('span', { className: 'bnk-shares__name' }, nm, h('span', { className: 'bnk-table__ticker' }, l.securityIdentifier)),
        h('span', { className: 'bnk-shares__pct' }, fmt(pct, pct < 10 ? 2 : 1) + ' %'),
        h('span', { className: 'bnk-shares__track', 'aria-hidden': 'true' },
          h('span', { className: 'bnk-shares__fill', style: { width: Math.min(100, pct) + '%' } }),
          mark ? h('span', { className: 'bnk-shares__mark', style: { left: mark + '%' }, title: 'Mehrheit ' + mark + ' %' }) : null));
    }));
  }


  /* ---------- Weitere Wertpapierarten: Anleihen, Indizes, Optionsscheine, AlphaCoins ---------- */

  function nameCell(name, asin, meta, href) {
    var nm = href ? h('a', { className: 'bnk-pos__link', href: href }, name) : name;
    return h('span', { className: 'bnk-table__stock' }, h('span', { className: 'bnk-table__name' }, nm),
      h('span', { className: 'bnk-table__meta' }, asin ? h('span', { className: 'bnk-table__ticker' }, asin) : null, meta ? h('span', null, meta) : null));
  }
  function pct(n, d) { return n == null || isNaN(n) ? '–' : (n < 0 ? '−' : '') + fmt(n, d == null ? 2 : d) + ' %'; }
  /* Restlaufzeit kurz: „3 Std. 12 Min.“, „2 T. 4 Std.“, „fällig“ */
  function remaining(ms, now) {
    var d = ms - (now || Date.now());
    if (d <= 0) return 'fällig';
    var m = Math.floor(d / 60000), hh = Math.floor(m / 60), dd = Math.floor(hh / 24);
    if (dd >= 1) return dd + ' T.' + (hh % 24 ? ' ' + (hh % 24) + ' Std.' : '');
    if (hh >= 1) return hh + ' Std.' + (m % 60 ? ' ' + (m % 60) + ' Min.' : '');
    return Math.max(1, m) + ' Min.';
  }

  /* BondFacts — Eckdaten einer Anleihe (API: BondView). */
  function BondFacts(props) {
    var b = props.bond || {};
    var cur = props.currency == null ? '€' : props.currency;
    var l = b.listing || {};
    var items = [
      { label: 'Emittent', value: b.issuer ? (props.issuerHref ? h('a', { className: 'bnk-pos__link', href: props.issuerHref(b.issuer) }, b.issuer.name) : b.issuer.name) : '–' },
      { label: h(Term, { title: 'Zins', definition: 'Zinssatz auf den Nennwert für die ganze Laufzeit, gezahlt bei Fälligkeit – kein Jahreszins. Vergleichbar wird er erst pro Tag.' }, 'Zins bis Fälligkeit'), value: pct(b.interestRate, 4) },
      { label: 'Nennwert je Stück', value: b.faceValue, currency: cur },
      { label: 'Ausgegebene Stücke', value: b.numberOfBonds != null ? b.numberOfBonds : (b.faceValue ? Math.round((b.volume || 0) / b.faceValue) : 0), currency: '', decimals: 0, compact: true },
      { label: 'Volumen (Nennwert)', value: b.volume || 0, currency: cur, compact: true },
      { label: 'Ausgabe', value: b.issueDate ? dateTime(b.issueDate) : '–' },
      { label: 'Fälligkeit', value: b.maturityDate ? h('span', { className: 'bnk-bond__due' }, dateTime(b.maturityDate), h('small', null, b.maturityDate > Date.now() ? 'in ' + remaining(b.maturityDate) : 'fällig')) : '–' }
    ];
    if (b.repurchaseListing) items.push({ label: h(Term, { term: 'REPO' }, 'Repo darauf'), value: props.repoHref ? h('a', { className: 'bnk-pos__link', href: props.repoHref(b.repurchaseListing) }, b.repurchaseListing.securityIdentifier) : b.repurchaseListing.securityIdentifier });
    return h(SummaryList, { className: cx('bnk-bond', props.className), items: items, currency: cur });
  }

  /* BondList — Anleihen am Markt, nach Fälligkeit (API: GET /v2/bonds). */
  function BondList(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var now = props.now || Date.now();
    var rows = (props.bonds || []).map(function (b) {
      var s = b.priceSpread || {};
      return Object.assign({ _asin: b.listing && b.listing.securityIdentifier, _bid: s.bidPrice, _ask: s.askPrice, _last: s.lastPrice && (typeof s.lastPrice === 'number' ? s.lastPrice : s.lastPrice.value) }, b);
    });
    return h(DataTable, { className: cx('bnk-bonds', props.className), stack: props.stack || 'auto', rows: rows, rowKey: 'id', density: props.density || 'sm', caption: 'Anleihen',
      defaultSort: { key: 'maturityDate', dir: 'asc' },
      columns: [
        { key: 'name', label: 'Anleihe', sortable: true, render: function (b) { return nameCell(b.issuer ? b.issuer.name : b.name, b._asin, LISTING_TYPES[b.listing && b.listing.type] || 'Anleihe', props.hrefFor ? props.hrefFor(b) : null); } },
        { key: 'interestRate', label: 'Zins', type: 'number', sortable: true, render: function (b) { return pct(b.interestRate, 4); } },
        { key: 'maturityDate', label: 'Fällig', sortable: true, defaultDir: 'asc', align: 'right', render: function (b) {
          return h('span', { className: 'bnk-pos__stack' }, h('span', { className: cx('bnk-bonds__rest', b.maturityDate - now < 3600e3 && 'is-soon') }, remaining(b.maturityDate, now)), h('small', null, dateTime(b.maturityDate)));
        } },
        { key: '_bid', label: h(Term, { term: 'BID' }), type: 'number', render: function (b) { return b._bid ? price(b._bid, 'BOND') : h('span', { className: 'bnk-pos__none' }, '–'); } },
        { key: '_ask', label: h(Term, { term: 'ASK' }), type: 'number', render: function (b) { return b._ask ? price(b._ask, 'BOND') : h('span', { className: 'bnk-pos__none' }, '–'); } },
        { key: 'volume', label: 'Volumen', type: 'number', sortable: true, render: function (b) { return h(Amount, { value: b.volume || 0, currency: cur, compact: true }); } }
      ],
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Keine Anleihen' }, 'Ausgegebene Anleihen erscheinen hier, die bald fälligen zuerst.') });
  }

  /* IndexFacts — Eckdaten eines Index (API: GET /v2/index/{asin}). */
  function IndexFacts(props) {
    var x = props.index || {};
    var r = x.rule;
    var CRIT = { MARKET_CAP: 'Marktkapitalisierung', NET_CASH: 'Net Cash', BOOK_VALUE: 'Buchwert' };
    var ruleText = r ? ['Top ' + (r.topN || '–') + ' ' + (r.assetClass === 'BOND' ? 'Anleihen' : 'Aktien') + ' nach ' + (CRIT[r.sortCriterion] || r.sortCriterion),
      r.weightCapPercent ? 'höchstens ' + pct(r.weightCapPercent, 0) + ' je Wert' : null,
      r.minFreeFloatPercent ? 'Streubesitz ≥ ' + pct(r.minFreeFloatPercent, 0) : null,
      r.maxSpreadPercent ? 'Spread ≤ ' + pct(r.maxSpreadPercent, 1) : null,
      r.minNetCash ? 'Net Cash ≥ ' + money(r.minNetCash, '€', 0, true) : null,
      r.requireTradedLast24h ? 'in 24 Std. gehandelt' : null].filter(Boolean).join(' · ') : null;
    var items = [
      { label: 'Betreiber', value: x.owner ? (x.owner.username || x.owner.name) : '–' },
      { label: 'Zusammensetzung', value: r ? h('span', { className: 'bnk-idx__rule' }, 'Nach Regel', h('small', null, ruleText)) : 'Feste Auswahl' },
      { label: 'Mitglieder', value: x.membersCount != null ? x.membersCount : (x.members ? x.members.length : 0), currency: '', decimals: 0 },
      { label: 'Basiswert', value: x.baseValue != null ? fmt(x.baseValue, 0) + ' Pkt.' : '–' },
      { label: h(Term, { title: 'Verkettungsfaktor', definition: 'Gleicht Sprünge aus, wenn sich die Zusammensetzung ändert, damit der Indexstand vergleichbar bleibt.' }, 'Verkettungsfaktor'), value: x.chainingFactor != null ? fmt(x.chainingFactor, 4) : '–' },
      { label: 'Nächste Verkettung', value: x.nextChainingDate ? dateTime(x.nextChainingDate) : '–' }
    ];
    return h(SummaryList, { className: cx('bnk-idx', props.className), items: items });
  }

  /* IndexMembers — Mitglieder mit Gewichtung (Kapitalisierung im Streubesitz). */
  function IndexMembers(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var rows = (props.members || []).map(function (m) {
      var cap = m.capitalisation != null ? m.capitalisation : (m.shares || 0) * (m.price || 0) * (m.priceAdjustmentFactor || 1);
      return Object.assign({ _cap: cap }, m);
    });
    var total = rows.reduce(function (a, r) { return a + r._cap; }, 0) || 1;
    var max = rows.reduce(function (a, r) { return Math.max(a, r._cap); }, 0) || 1;
    return h(DataTable, { className: cx('bnk-idxm', props.className), stack: props.stack || 'auto', rows: rows, rowKey: function (r) { return r.listing && r.listing.securityIdentifier; }, density: props.density || 'sm',
      caption: 'Index-Mitglieder', defaultSort: { key: '_cap', dir: 'desc' },
      columns: [
        { key: 'name', label: 'Wertpapier', sortable: true, sortValue: function (r) { return r.listing && r.listing.name; }, render: function (r) { var l = r.listing || {}; return nameCell(l.name, l.securityIdentifier, null, props.hrefFor ? props.hrefFor(r) : null); } },
        { key: 'shares', label: 'Anteile', type: 'number', sortable: true, render: function (r) { return number(r.shares || 0, 0, true); } },
        { key: 'price', label: 'Kurs', type: 'number', render: function (r) { return price(r.price, 'STOCK', cur); } },
        { key: 'priceAdjustmentFactor', mobile: false, mobileLabel: 'Faktor', label: h(Term, { title: 'Kursanpassungsfaktor', definition: 'Korrigiert den Kurs nach Kapitalmaßnahmen wie Splits, damit der Index nicht springt.' }, 'Faktor'), type: 'number', render: function (r) { var f = r.priceAdjustmentFactor == null ? 1 : r.priceAdjustmentFactor; return fmt(f, f % 1 ? 4 : 0); } },
        { key: '_cap', label: 'Kapitalisierung', mobileLabel: 'Marktkap.', type: 'number', sortable: true, render: function (r) { return h(Amount, { value: r._cap, currency: cur, compact: true }); } },
        { key: 'weight', label: 'Gewicht', type: 'number', width: 160, sortable: true, sortValue: function (r) { return r._cap; }, render: function (r) {
          var w = r._cap / total * 100;
          return h('span', { className: 'bnk-idxm__w' }, h('span', { className: 'bnk-idxm__bar', 'aria-hidden': 'true' }, h('span', { style: { width: Math.max(1, r._cap / max * 100) + '%' } })), w < 0.01 ? '< 0,01 %' : pct(w, 2));
        } }
      ] });
  }

  /* WarrantList — Optionsscheine auf einen Basiswert (API: GET /v2/warrants). */
  function WarrantList(props) {
    var rows = props.warrants || [];
    var cols = [
      { key: 'subscriptionPeriodDate', label: 'Zeichnung bis', sortable: true, render: function (w) { var d = w.subscriptionPeriodDate; return d ? h('span', { className: 'bnk-pos__stack is-left' }, dateTime(d), h('small', null, d > Date.now() ? 'noch ' + remaining(d) : 'beendet')) : '–'; } },
      { key: 'type', label: 'Typ', render: function (w) { return h('span', { className: 'bnk-wt__type' }, w.type === 'PUT' ? 'Put' : 'Call'); } },
      { key: 'underlyingValue', label: 'Referenzkurs', type: 'number', mobileWide: true, render: function (w) { return w.underlyingValue != null ? fmt(w.underlyingValue, 2) : '–'; } },
      { key: 'underlyingCapValue', label: 'Cap', type: 'number', mobileWide: true, render: function (w) { return w.underlyingCapValue != null ? fmt(w.underlyingCapValue, 2) : '–'; } },
      { key: 'ratio', label: 'Bezugsverhältnis', type: 'number', render: function (w) { return w.ratio == null ? '–' : typeof w.ratio === 'number' ? '1:' + fmt(w.ratio, 0) : w.ratio; } },
      { key: 'company', label: 'Emittent', mobile: 'title', render: function (w) { var i = w.company || {}; return nameCell(i.name, i.securityIdentifier, null, props.issuerHref ? props.issuerHref(i) : null); } }
    ];
    if (props.showUnderlying) cols.unshift({ key: 'underlying', label: 'Basiswert', render: function (w) { var u = w.underlying || {}; return nameCell(u.name, u.securityIdentifier); } });
    var cmp = props.comparison;
    var table = h(DataTable, { className: cx('bnk-wt', props.className), stack: props.stack || 'auto', rows: rows, rowKey: 'id', density: props.density || 'sm', caption: 'Optionsscheine',
      defaultSort: { key: 'subscriptionPeriodDate', dir: 'asc' }, columns: cols,
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Keine Optionsscheine' }, 'Auf diesen Basiswert wurden noch keine Optionsscheine ausgegeben.') });
    if (!cmp) return table;
    return h('div', { className: 'bnk-wt-wrap' },
      h('p', { className: 'bnk-wt__lev' }, h('span', null, h(Term, { title: 'Hebel', definition: 'Um wie viel sich der Optionsschein ungefähr stärker bewegt als der Basiswert.' }, 'Hebel')),
        h('span', null, 'Call ', h('b', null, cmp.callLeverage != null ? fmt(cmp.callLeverage, 1) + '×' : '–')), h('span', null, 'Put ', h('b', null, cmp.putLeverage != null ? fmt(cmp.putLeverage, 1) + '×' : '–')),
        cmp.value != null ? h('span', null, 'Basiswert ', h('b', null, fmt(cmp.value, 2))) : null),
      table);
  }

  /* MinerCard — AlphaCoin-Miner: Leistung, Speicher, Übertragen, Ausbau (API: GET /v2/my/miner, PUT /v2/my/cointransfer, PUT /v2/my/minerupgrade). */
  function MinerCard(props) {
    var m = props.miner || {};
    var cur = props.currency == null ? '€' : props.currency;
    var coin = props.coinPrice;
    var stored = Number(m.storage) || 0, cap = Number(m.maximumCapacity) || 0;
    var full = cap > 0 && stored >= cap - 1e-9;
    var hoursLeft = !full && m.coinsPerHour ? (cap - stored) / m.coinsPerHour : null;
    var gain = m.nextLevelCoinsPerHour != null && m.coinsPerHour != null ? m.nextLevelCoinsPerHour - m.coinsPerHour : null;
    function coins(n, d) { return fmt(n, d == null ? 2 : d) + ' AC'; }
    return h('div', { className: cx('bnk-miner', full && 'is-full', props.className) },
      h('dl', { className: 'bnk-miner__stats' },
        h('div', null, h('dt', null, 'Leistung'), h('dd', null, coins(m.coinsPerHour || 0), h('small', null, '/Std.')),
          coin ? h('p', { className: 'bnk-miner__sub' }, '≈ ', money((m.coinsPerHour || 0) * coin, cur, 2, true), ' je Stunde') : null),
        h('div', null, h('dt', null, 'Übertragbar'), h('dd', null, number(m.transferableCoins || 0, 0), h('small', null, ' AC')),
          coin ? h('p', { className: 'bnk-miner__sub' }, '≈ ', money((m.transferableCoins || 0) * coin, cur, 2, true)) : null)),
      h(ProgressBar, { label: 'Speicher', value: stored, max: cap || 1, variant: 'neutral', valueText: fmt(stored, 1) + ' / ' + fmt(cap, 1) + ' AC',
        hint: full ? h('span', { className: 'bnk-miner__warn' }, h('span', { 'aria-hidden': 'true' }, '! '), 'Speicher voll – der Miner erzeugt nichts, bis du Coins überträgst.')
          : hoursLeft != null ? 'Voll in ' + remaining(Date.now() + hoursLeft * 3600e3) : null }),
      h('div', { className: 'bnk-miner__actions' },
        props.onTransfer ? h(Button, { variant: full ? (props.transferVariant || 'primary') : 'secondary', disabled: !(m.transferableCoins > 0), onClick: props.onTransfer },
          'Coins ins Portfolio übertragen') : null),
      m.nextLevelCosts != null ? h('div', { className: 'bnk-miner__up' },
        h('div', { className: 'bnk-miner__uptext' },
          h('span', { className: 'bnk-miner__uplabel' }, 'Nächste Ausbaustufe'),
          h('span', null, coins(m.coinsPerHour || 0), ' → ', h('b', null, coins(m.nextLevelCoinsPerHour || 0)), ' /Std.', gain != null ? h('small', null, ' (+' + fmt(gain, 2) + ')') : null),
          h('span', { className: 'bnk-miner__cost' }, 'Kosten ', h(Amount, { value: m.nextLevelCosts, currency: cur, compact: true }),
            props.paybackHours != null ? ' · rechnet sich nach ca. ' + fmt(props.paybackHours, 1) + ' Std.' : null)),
        props.onUpgrade ? h(Button, { size: 'sm', onClick: props.onUpgrade, disabled: props.cash != null && props.cash < m.nextLevelCosts,
          title: props.cash != null && props.cash < m.nextLevelCosts ? 'Nicht genug Bargeld' : undefined }, 'Ausbauen') : null) : null);
  }


  /* ---------- Bank: Bilanz, Banklizenz & Zentralbank, Überweisung, Kontoauszug ---------- */

  /* Neutraler Betrag mit Vorzeichen (Geldflüsse, Periodenergebnis) – keine Kursbewegung, daher ohne Farbe und ohne ▲▼. */
  function SignedAmount(props) {
    var v = Number(props.value) || 0;
    var sign = v > 0 ? '+' : v < 0 ? '−' : '± ';
    var cur = props.currency == null ? '€' : props.currency;
    var full = sign + money(Math.abs(v), cur, 2);
    var short = sign + money(Math.abs(v), cur, 2, props.compact == null ? true : props.compact);
    return h('span', { className: cx('bnk-samt', props.className), title: short !== full ? full : undefined },
      h('span', { 'aria-hidden': short !== full ? 'true' : undefined }, short), short !== full ? h('span', { className: 'bnk-sr' }, full) : null);
  }

  /* BalanceSheet — Bilanz eines Unternehmens (API: GET /v2/companies/{id}/balancesheets). */
  var BALANCE_ASSETS = [['cash', 'Bargeld'], ['stocksValue', 'Aktien'], ['bondsValue', 'Anleihen'], ['buildingsValue', 'Immobilien'], ['otherAssetsValue', 'Sonstige Vermögenswerte'], ['centralBankReserves', 'Zentralbankreserven'], ['warrantCollateralValue', 'Sicherheiten für Optionsscheine']];
  var BALANCE_LIABILITIES = [['issuedBondsValue', 'Begebene Anleihen'], ['repurchaseObligations', 'Rückkaufverpflichtungen'], ['issuedWarrantsValue', 'Begebene Optionsscheine'], ['equity', 'Eigenkapital']];
  function BalanceSheet(props) {
    var list = props.sheets || (props.sheet ? [props.sheet] : []);
    var ctl = props.selected !== undefined;
    var st = React.useState(null);
    var selDate = ctl ? props.selected : st[0];
    var s = null;
    for (var i = 0; i < list.length; i++) if (list[i].date === selDate) s = list[i];
    s = s || list[0];
    var cur = props.currency == null ? '€' : props.currency;
    if (!s) return h(EmptyState, { compact: true, symbol: false, title: 'Noch keine Bilanz' }, 'Die erste Bilanz entsteht zum nächsten Stichtag.');
    var totalL = s.totalLiabilities != null ? s.totalLiabilities + (s.equity || 0) : BALANCE_LIABILITIES.reduce(function (a, r) { return a + (s[r[0]] || 0); }, 0);
    var totalA = s.totalAssets != null ? s.totalAssets : BALANCE_ASSETS.reduce(function (a, r) { return a + (s[r[0]] || 0); }, 0);
    function side(title, rows, total, totalLabel) {
      var shown = rows.filter(function (r) { return s[r[0]] != null; });
      return h('div', { className: 'bnk-bs__side' },
        h('h4', { className: 'bnk-bs__title' }, title),
        h('dl', { className: 'bnk-bs__list' },
          shown.map(function (r) {
            var v = s[r[0]] || 0;
            return h('div', { key: r[0], className: cx('bnk-bs__row', r[0] === 'equity' && 'is-equity') },
              h('dt', null, r[1]),
              h('dd', null, h(Amount, { value: v, currency: cur, compact: props.compact == null ? true : props.compact }),
                h('small', null, total ? (function (q) { return q > 0 && q < 0.1 ? '< 0,1 %' : fmt(q, 1) + ' %'; })(Math.abs(v) / Math.abs(total) * 100) : '')));
          }),
          h('div', { className: 'bnk-bs__row is-total' }, h('dt', null, totalLabel), h('dd', null, h(Amount, { value: total, currency: cur, compact: props.compact == null ? true : props.compact }), h('small', null, '')))));
    }
    var select = list.length > 1 ? h(Select, { label: 'Stichtag', size: 'sm', fullWidth: false, value: String(s.date),
      onChange: function (e) { var d = Number(e.target.value); if (!ctl) st[1](d); if (props.onSelect) props.onSelect(d); },
      options: list.map(function (x) { return { value: String(x.date), label: dateTime(x.date) }; }) }) : null;
    return h('section', { className: cx('bnk-bs', props.className), 'aria-label': 'Bilanz' },
      h('div', { className: 'bnk-bs__head' },
        h('p', { className: 'bnk-bs__period' }, 'Zeitraum ', h('span', { className: 'bnk-bs__dates' }, (s.periodStart ? dateTime(s.periodStart) + ' – ' : '') + dateTime(s.date))),
        select),
      h('div', { className: 'bnk-bs__cols' },
        side('Aktiva', BALANCE_ASSETS, totalA, 'Summe Aktiva'),
        side('Passiva', BALANCE_LIABILITIES, totalL, 'Summe Passiva')),
      s.periodResult != null ? h('p', { className: 'bnk-bs__result' }, h('span', null, 'Periodenergebnis'), h(SignedAmount, { value: s.periodResult, currency: cur })) : null);
  }

  /* BankingPanel — Banklizenz, Zentralbankreserven und Coin-Boost eines Unternehmens (Seite „Bankgeschäfte“). */
  var BANK_LICENSE_MIN_CASH = 5e6;
  function BankingPanel(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var caps = props.caps || {};
    var lic = props.license;
    var r = props.reserves || {};
    var rate = props.reserveInterestRate;
    var cash = props.cash;
    var amtSt = React.useState(''), multSt = React.useState(1);
    var hasLicense = !!(caps.bank || (lic && lic.startDate));
    if (!hasLicense) {
      var ready = caps.bankReady || (cash != null && cash >= BANK_LICENSE_MIN_CASH);
      return h('div', { className: cx('bnk-bank', props.className) },
        h('div', { className: 'bnk-bank__lic' },
          h('span', { className: 'bnk-bank__label' }, 'Banklizenz'),
          h('span', { className: 'bnk-bank__state' }, ready ? 'Möglich' : 'Keine'),
          h('p', { className: 'bnk-bank__text' }, 'Mit Banklizenz kann das Unternehmen Zentralbankreserven halten, Kredite bei der Zentralbank aufnehmen und Systemanleihen begeben.')),
        !ready && cash != null ? h(ProgressBar, { label: 'Bargeld für die Lizenz', value: Math.min(cash, BANK_LICENSE_MIN_CASH), max: BANK_LICENSE_MIN_CASH, variant: 'neutral',
          valueText: money(cash, cur, 2, true) + ' / ' + money(BANK_LICENSE_MIN_CASH, cur, 0, true), hint: 'Es fehlen ' + money(BANK_LICENSE_MIN_CASH - cash, cur, 2) + '.' }) : null,
        props.onRequestLicense ? h('div', null, h(Button, { variant: ready ? 'primary' : 'secondary', disabled: !ready, onClick: props.onRequestLicense }, 'Banklizenz beantragen')) : null);
    }
    var holding = Number(r.cashHolding) || 0;
    var boost = Number(r.interestRateBoost) || 0;
    var perDay = rate != null ? holding * (rate + boost) / 100 : null;
    var amt = toNum(amtSt[0]);
    var amtErr = amtSt[0] && (isNaN(amt) || amt <= 0) ? 'Bitte einen Betrag über 0 eingeben.' : amtSt[0] && cash != null && amt > cash ? 'Nicht genug Bargeld – höchstens ' + money(cash, cur, 2) + '.' : null;
    var mult = Math.max(1, Math.min(Number(multSt[0]) || 1, r.maxBoostMultiplier || 999));
    return h('div', { className: cx('bnk-bank', props.className) },
      h('dl', { className: 'bnk-bank__kpis' },
        h('div', null, h('dt', null, h(Term, { term: 'RESERVES' }, 'Zentralbankreserven')), h('dd', null, h(Amount, { value: holding, currency: cur, compact: 'auto' }))),
        h('div', null, h('dt', null, 'Zins auf Reserven'), h('dd', null, rate != null ? fmt(rate + boost, 2) + ' %' : '–',
          h('small', null, rate != null ? fmt(rate, 2) + ' % Reservezins + ' + fmt(boost, 2) + ' % Boost' : ''))),
        h('div', null, h('dt', null, 'Zinsertrag je Tag'), h('dd', null, perDay != null ? h(SignedAmount, { value: perDay, currency: cur }) : '–',
          h('small', null, props.nextPayment ? 'nächste Zahlung ' + dateTime(props.nextPayment) : ''))),
        props.takenLoans != null
          ? h('div', null, h('dt', null, 'Zentralbankkredite'), h('dd', null, h(Amount, { value: props.takenLoans, currency: cur, compact: 'auto' }),
              h('small', null, 'genutzt von ', h(Amount, { value: r.maxCentralBankLoans || 0, currency: cur, compact: 'auto' }),
                r.maxCentralBankLoans ? ' (' + fmt(Math.min(100, props.takenLoans / r.maxCentralBankLoans * 100), 0) + ' %)' : '')))
          : h('div', null, h('dt', null, 'Max. Zentralbankkredite'), h('dd', null, h(Amount, { value: r.maxCentralBankLoans || 0, currency: cur, compact: 'auto' })))),
      h('p', { className: 'bnk-bank__since' }, 'Banklizenz seit ', lic && lic.startDate ? dateTime(lic.startDate) : '–',
        props.lastPayment ? h('span', null, ' · letzte Zinszahlung der Zentralbank an alle Banken ', h(SignedAmount, { value: props.lastPayment.paidInterest, currency: cur }), ' am ', dateTime(props.lastPayment.paymentDate)) : null),
      h('div', { className: 'bnk-bank__forms' },
        props.onIncreaseReserves ? h('form', { className: 'bnk-bank__form', onSubmit: function (e) { e.preventDefault(); if (!amtErr && amt > 0) props.onIncreaseReserves(amt); } },
          h('h4', { className: 'bnk-bank__h' }, 'Reserven erhöhen'),
          h(Input, { label: 'Betrag', numeric: true, suffix: cur, value: amtSt[0], onChange: function (e) { amtSt[1](e.target.value); }, error: amtErr,
            hint: cash != null ? 'Verfügbar ' + money(cash, cur, 2) : undefined }),
          h(Button, { type: 'submit', variant: props.primaryAction === 'reserves' ? 'primary' : 'secondary', disabled: !(amt > 0) || !!amtErr }, 'Reserven erhöhen')) : null,
        props.onBoost && r.coinsForNextBoost ? h('form', { className: 'bnk-bank__form', onSubmit: function (e) { e.preventDefault(); props.onBoost(mult); } },
          h('h4', { className: 'bnk-bank__h' }, 'Zins-Boost mit AlphaCoins'),
          h('p', { className: 'bnk-bank__text' }, number(r.coinsForNextBoost, 0), ' AC je +0,01 % auf 24 Std.',
            r.earnedBoostBonus ? h('span', null, ' · bisher erhalten ', h(SignedAmount, { value: r.earnedBoostBonus, currency: cur })) : null),
          h(Input, { label: 'Stufen', numeric: true, stepper: true, min: 1, max: r.maxBoostMultiplier || undefined, step: 1, value: String(mult), onChange: function (e) { multSt[1](e.target.value); },
            suffix: '× 0,01 %', hint: 'Kostet ' + number(mult * r.coinsForNextBoost, 0) + ' AC' + (r.maxBoostMultiplier ? ' · höchstens ' + r.maxBoostMultiplier + ' Stufen' : '') }),
          h(Button, { type: 'submit', variant: props.primaryAction === 'boost' ? 'primary' : 'secondary' }, 'Boost kaufen')) : null),
      props.tender ? h('p', { className: 'bnk-bank__tender' }, h('span', { className: 'bnk-bank__label' }, 'Zinstender'), ' ',
        props.tenderHref ? h('a', { className: 'bnk-pos__link', href: props.tenderHref(props.tender) }, props.tender.bondListing.name) : props.tender.bondListing.name,
        ' · endet ', dateTime(props.tender.endDate)) : null);
  }

  /* TransferForm — Überweisung zwischen eigenen Konten (API: PUT /v2/banktransfer/{senderBankAccountId}?receiverBankAccountId&cashAmount). */
  function TransferForm(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var accts = props.accounts || [];
    var fromSt = React.useState(props.defaultFrom || (accts[0] && accts[0].id) || '');
    var toSt = React.useState(props.defaultTo || (accts[1] && accts[1].id) || '');
    var amtSt = React.useState(''), noteSt = React.useState(false);
    var from = null, to = null;
    accts.forEach(function (a) { if (a.id === fromSt[0]) from = a; if (a.id === toSt[0]) to = a; });
    var amt = toNum(amtSt[0]);
    var err = !amtSt[0] ? null : isNaN(amt) || amt <= 0 ? 'Bitte einen Betrag über 0 eingeben.' : from && amt > from.cash ? 'Nicht genug Bargeld – höchstens ' + money(from.cash, cur, 2) + '.' : null;
    var same = fromSt[0] && fromSt[0] === toSt[0];
    var ok = from && to && !same && amt > 0 && !err;
    function opt(a) { return { value: a.id, label: a.name + ' · ' + money(a.cash, cur, 2, true) }; }
    return h('form', { className: cx('bnk-xfer', props.className), onSubmit: function (e) { e.preventDefault(); if (ok) props.onSubmit && props.onSubmit({ senderBankAccountId: from.id, receiverBankAccountId: to.id, cashAmount: amt }); } },
      h('div', { className: 'bnk-xfer__grid' },
        h(Select, { label: 'Von', value: fromSt[0], onChange: function (e) { fromSt[1](e.target.value); }, options: accts.map(opt) }),
        h('button', { type: 'button', className: 'bnk-xfer__swap', 'aria-label': 'Konten tauschen', onClick: function () { var f = fromSt[0]; fromSt[1](toSt[0]); toSt[1](f); } }, '⇄'),
        h(Select, { label: 'An', value: toSt[0], onChange: function (e) { toSt[1](e.target.value); }, options: accts.map(opt), error: same ? 'Absender und Empfänger sind gleich.' : undefined })),
      h(Input, { label: 'Betrag', numeric: true, suffix: cur, value: amtSt[0], onChange: function (e) { amtSt[1](e.target.value); }, error: err,
        hint: from ? 'Verfügbar ' + money(from.cash, cur, 2) : undefined }),
      from ? h('div', { className: 'bnk-xfer__quick', role: 'group', 'aria-label': 'Schnellauswahl' },
        [0.25, 0.5, 1].map(function (q) { return h(Button, { key: q, size: 'sm', variant: 'ghost', onClick: function () { amtSt[1](fmt(Math.floor(from.cash * q * 100) / 100, 2)); } }, q === 1 ? 'Alles' : fmt(q * 100, 0) + ' %'); })) : null,
      ok ? h('p', { className: 'bnk-xfer__sum' }, h(Amount, { value: amt, currency: cur, compact: false }), ' von ', h('b', null, from.name), ' an ', h('b', null, to.name), '.') : null,
      h('div', { className: 'bnk-xfer__actions' },
        props.onCancel ? h(Button, { onClick: props.onCancel }, 'Abbrechen') : null,
        h(Button, { type: 'submit', variant: props.submitVariant || 'primary', disabled: !ok, loading: props.loading }, 'Überweisen')));
  }

  /* AccountStatement — Kontoauszug (API: GET /v2/cashtransferlogs/{bankAccountId}). Ein- und Ausgänge neutral mit Vorzeichen. */
  function AccountStatement(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var me = props.bankAccountId;
    var rows = (props.entries || []).map(function (e) {
      var out = me ? e.senderBankAccount === me && e.receiverBankAccount !== me : e.amount < 0;
      return Object.assign({ _v: out ? -Math.abs(e.amount) : Math.abs(e.amount) }, e);
    });
    return h(DataTable, { className: cx('bnk-stmt', props.className), stack: props.stack || 'auto', rows: rows, rowKey: 'id', density: props.density || 'sm', caption: 'Kontoauszug',
      defaultSort: { key: 'date', dir: 'desc' },
      columns: [
        { key: 'date', label: 'Zeit', sortable: true, defaultDir: 'desc', width: 150, render: function (e) { return h('time', { className: 'bnk-trades__time', dateTime: new Date(e.date).toISOString() }, dateTime(e.date)); } },
        { key: 'message', label: 'Vorgang', mobile: 'title', render: function (e) { return h('span', { className: 'bnk-stmt__msg' }, messageText(e.message) || (e._v < 0 ? 'Ausgang' : 'Eingang')); } },
        { key: '_v', label: 'Betrag', type: 'number', sortable: true, render: function (e) { return h(SignedAmount, { value: e._v, currency: cur, className: e._v < 0 ? 'is-out' : 'is-in' }); } }
      ],
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Keine Buchungen' }, 'Überweisungen, Gehälter, Zinsen und Ausschüttungen erscheinen hier.') });
  }


  /* ---------- Rahmen: Wortmarke, Icons, Fußzeile, Profile ---------- */

  /* Icons — eigener Satz, 20er-Raster, Linie 1,5, runde Enden, keine Füllung. Nie für Kursrichtung (dafür ▲▼). */
  var ICONS = {
    markt: 'M3 17h14M3.5 14l4-5 3 3 3.5-5.5 2.5 3',
    organisation: 'M8 3h4v3H8zM3 14h4v3H3zM13 14h4v3h-4zM10 6v4M5 14v-4h10v4',
    orders: 'M5 3h7l3 3v11H5zM12 3v3h3M8 9h4.5M8 12h4.5M8 15h2.5',
    highscores: 'M2 17h16M4 17v-5h4v5M8 17V7h4v10M12 17v-7h4v7',
    community: 'M3 4h10v7H8l-3 3v-3H3zM13 7h4v7h-2v2.5L12.5 14H9v-1',
    zeitung: 'M3 4h11v11.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 15.5zM14 7h3v8.5a1.5 1.5 0 0 1-3 0M5.5 7h6M5.5 10h6M5.5 13h4',
    chat: 'M3 4h14v9H9l-4 3.5V13H3z',
    glocke: 'M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13zM8.5 17.5a1.6 1.6 0 0 0 3 0',
    suche: 'M13.5 13.5L17 17M14 9A5 5 0 1 1 4 9a5 5 0 0 1 10 0z',
    portfolio: 'M10 3a7 7 0 1 0 7 7h-7zM12.5 1.8A7 7 0 0 1 18.2 7.5H12.5z',
    bank: 'M2.5 7.5L10 3l7.5 4.5M4 7.5h12M5 9.5v5.5M8.5 9.5v5.5M11.5 9.5v5.5M15 9.5v5.5M3 17h14',
    coin: 'M4 6.5C4 5.1 6.7 4 10 4s6 1.1 6 2.5S13.3 9 10 9 4 7.9 4 6.5zM4 6.5v7c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-7M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5',
    anleihe: 'M4 3h12v14H4zM7 6.5h6M7 9h6M7 11.5h2.5M12.5 15a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z',
    index: 'M3 17h14M5 14.5V10M8.5 14.5V6M12 14.5V8.5M15.5 14.5V4.5',
    miner: 'M5 3.5c4.6.2 11.3 6.9 11.5 11.5M12.6 7.4L3.5 16.5',
    erfolg: 'M6 3h8v4a4 4 0 0 1-8 0zM6 4.5H3.5V6A3 3 0 0 0 6.5 9M14 4.5h2.5V6a3 3 0 0 1-3 3M10 11v3M7 17h6M8 14h4v3',
    spieler: 'M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM4 17c0-3.3 2.7-5 6-5s6 1.7 6 5',
    allianz: 'M10 3l6 2v5c0 3.5-2.6 6-6 7-3.4-1-6-3.5-6-7V5z',
    einstellungen: 'M4 6h7M15 6h1M13 4v4M4 14h2M10 14h6M8 12v4',
    abmelden: 'M8 4H4v12h4M12 7l3 3-3 3M15 10H8',
    plus: 'M10 4v12M4 10h12',
    schliessen: 'M5 5l10 10M15 5L5 15',
    haken: 'M4 10.5l4 4 8-9',
    extern: 'M11 4h5v5M16 4l-7 7M14 12v4H4V6h4',
    uhr: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM10 6v4l3 2',
    kalender: 'M3 5h14v12H3zM3 8.5h14M7 3v4M13 3v4',
    merken: 'M10 3l2.2 4.5 4.8.7-3.5 3.4.8 4.9L10 14.2l-4.3 2.3.8-4.9L3 8.2l4.8-.7z',
    filter: 'M3 4h14l-5.5 6.5V16l-3-1.5v-4z',
    aktualisieren: 'M16 10a6 6 0 1 1-1.8-4.3M16 3v4h-4',
    info: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM10 9v5M10 6.5v.01',
    warnung: 'M10 3l8 14H2zM10 8v4M10 14.5v.01',
    ueberweisung: 'M4 7h11M12 4l3 3-3 3M16 13H5M8 10l-3 3 3 3',
    menue: 'M3 6h14M3 10h14M3 14h14'
  };
  var ICON_LABELS = { markt: 'Markt', organisation: 'Organisation', orders: 'Orders', highscores: 'Highscores', community: 'Community', zeitung: 'Zeitung', chat: 'Chat', glocke: 'Benachrichtigungen',
    suche: 'Suche', portfolio: 'Portfolio', bank: 'Bank', coin: 'AlphaCoins', anleihe: 'Anleihe', index: 'Index', miner: 'Miner', erfolg: 'Erfolge', spieler: 'Spieler', allianz: 'Allianz',
    einstellungen: 'Einstellungen', abmelden: 'Abmelden', plus: 'Hinzufügen', schliessen: 'Schließen', haken: 'Erledigt', extern: 'Externer Link', uhr: 'Zeit', kalender: 'Datum',
    merken: 'Merken', filter: 'Filter', aktualisieren: 'Aktualisieren', info: 'Hinweis', warnung: 'Warnung', ueberweisung: 'Überweisung', menue: 'Menü' };
  function Icon(props) {
    var d = ICONS[props.name];
    var size = props.size || 20;
    if (!d) return null;
    var label = props.title;
    return h('svg', { className: cx('bnk-icon', props.className), width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor',
        strokeWidth: props.strokeWidth || 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', focusable: 'false',
        role: label ? 'img' : undefined, 'aria-hidden': label ? undefined : 'true', 'aria-label': label || undefined },
      h('path', { d: d }));
  }

  /* Emblem & Wortmarke — Siegel mit α (eigene Zeichnung) und Name in der Serifenschrift. */
  function Emblem(props) {
    var s = props.size || 28;
    return h('svg', { className: cx('bnk-emblem', props.className), width: s, height: s, viewBox: '0 0 32 32', 'aria-hidden': props.title ? undefined : 'true', role: props.title ? 'img' : undefined, 'aria-label': props.title },
      h('circle', { cx: 16, cy: 16, r: 14.5, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }),
      h('circle', { cx: 16, cy: 16, r: 11.5, fill: 'none', stroke: 'currentColor', strokeWidth: 0.6, opacity: 0.7 }),
      h('path', { d: 'M21.2 11.2c-.9 3.6-2.1 7.4-3.2 9.3-.8 1.3-1.9 1.9-3.3 1.9-2.4 0-3.9-2-3.9-4.7 0-3.4 2.1-6.5 4.8-6.5 2.3 0 3.1 2.4 3.9 5.4.7 2.6 1.3 5.4 2.9 5.4',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }));
  }
  function Wordmark(props) {
    var size = props.size || 'md';
    var inner = [
      props.emblem !== false ? h(Emblem, { key: 'e', size: size === 'lg' ? 40 : size === 'sm' ? 22 : 28 }) : null,
      h('span', { key: 't', className: 'bnk-wm__text' }, h('span', { className: 'bnk-wm__name' }, props.name || 'Alpha-Trader'),
        props.tagline ? h('span', { className: 'bnk-wm__tag' }, props.tagline) : null)
    ];
    var cls = cx('bnk-wm', 'bnk-wm--' + size, props.className);
    return props.href ? h('a', { className: cls, href: props.href, 'aria-label': props['aria-label'] }, inner) : h('span', { className: cls }, inner);
  }

  /* AppFooter — Fußzeile im Stil eines Impressums („Kolophon“). */
  function AppFooter(props) {
    var cols = props.columns || [];
    return h('footer', { className: cx('bnk-foot', props.className) },
      h('div', { className: 'bnk-foot__top' },
        h('div', { className: 'bnk-foot__brand' }, props.brand || h(Wordmark, { size: 'sm', name: props.name }), props.note ? h('p', { className: 'bnk-foot__note' }, props.note) : null),
        cols.length ? h('nav', { className: 'bnk-foot__cols', 'aria-label': props['aria-label'] || 'Fußzeile' }, cols.map(function (c, i) {
          return h('div', { key: i, className: 'bnk-foot__col' }, h('h2', { className: 'bnk-foot__h' }, c.title),
            h('ul', null, (c.links || []).map(function (l, j) {
              return h('li', { key: j }, h('a', { href: l.href, className: 'bnk-foot__link', target: l.external ? '_blank' : undefined, rel: l.external ? 'noopener noreferrer' : undefined },
                l.label, l.external ? h(Icon, { name: 'extern', size: 14, className: 'bnk-foot__ext' }) : null, l.external ? h('span', { className: 'bnk-sr' }, ' (öffnet neues Fenster)') : null));
            })));
        })) : null),
      h('div', { className: 'bnk-foot__bottom' },
        (props.meta || []).map(function (m, i) { return h('span', { key: i }, m); }),
        props.status ? h('span', { className: cx('bnk-foot__status', 'is-' + (props.status.state || 'ok')) }, h('span', { className: 'bnk-foot__dot', 'aria-hidden': 'true' }), props.status.label) : null));
  }

  /* ProfileHeader — Kopf für Spieler-, Unternehmens- und Allianzprofile. */
  function ProfileHeader(props) {
    var Tag = props.as || 'h1';
    var pic = props.logoUrl ? h('img', { className: 'bnk-prof__logo', src: props.logoUrl, alt: '' })
      : h(Avatar, { name: props.name, initials: props.initials, size: 64, group: props.kind === 'alliance' });
    return h('header', { className: cx('bnk-prof', props.className) },
      h('div', { className: 'bnk-prof__main' },
        pic,
        h('div', { className: 'bnk-prof__id' },
          h('div', { className: 'bnk-prof__eyebrow' }, [props.kindLabel || ({ user: 'Spieler', company: 'Unternehmen', alliance: 'Allianz' })[props.kind || 'user']].concat(props.eyebrow || []).filter(Boolean).map(function (e, i) { return h('span', { key: i }, e); })),
          h(Tag, { className: 'bnk-prof__name' }, props.name),
          props.meta && props.meta.length ? h('p', { className: 'bnk-prof__meta' }, props.meta.map(function (m, i) { return h('span', { key: i }, m); })) : null,
          props.tags && props.tags.length ? h('ul', { className: 'bnk-prof__tags', 'aria-label': 'Merkmale' }, props.tags.map(function (t, i) {
            return h('li', { key: i, className: cx('bnk-prof__tag', t.gold && 'bnk-gold'), title: t.title }, t.label);
          })) : null),
        props.actions ? h('div', { className: 'bnk-prof__actions' }, props.actions) : null),
      props.stats && props.stats.length ? h('dl', { className: 'bnk-prof__stats' }, props.stats.map(function (s, i) {
        var v = s.value;
        if (typeof v === 'number') v = h(Amount, { value: v, currency: s.currency != null ? s.currency : (s.unit ? '' : '€'), unit: s.unit, decimals: s.decimals, compact: s.compact == null ? 'auto' : s.compact });
        return h('div', { key: i, className: 'bnk-prof__stat' }, h('dt', null, s.label), h('dd', null, s.rank != null ? h(RankBadge, { rank: s.rank, showLabel: false }) : null, h('span', null, v), s.sub ? h('small', null, s.sub) : null));
      })) : null,
      props.tabs ? h('div', { className: 'bnk-prof__tabs' }, props.tabs) : null);
  }

  /* EmploymentList — Anstellungen als CEO (API: CompanyEmploymentAgreementView). */
  function EmploymentList(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var rows = props.employments || [];
    var total = rows.reduce(function (a, e) { return a + (Number(e.dailyWage) || 0); }, 0);
    return h(DataTable, { className: cx('bnk-emp', props.className), stack: props.stack || 'auto', rows: rows, rowKey: 'id', density: props.density || 'sm', caption: 'Anstellungen',
      defaultSort: { key: 'dailyWage', dir: 'desc' },
      columns: [
        { key: 'company', label: 'Unternehmen', sortable: true, sortValue: function (e) { return e.company && e.company.name; }, render: function (e) {
          var c = e.company || {};
          return h('span', { className: 'bnk-table__stock' }, h('span', { className: 'bnk-table__name' }, props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(e) }, c.name) : c.name),
            h('span', { className: 'bnk-table__meta' }, h('span', { className: 'bnk-table__ticker' }, c.securityIdentifier)));
        } },
        { key: 'startDate', label: 'CEO seit', sortable: true, render: function (e) { return e.startDate ? dateTime(e.startDate) : '–'; } },
        { key: 'dailyWage', label: 'Gehalt je Tag', type: 'number', sortable: true, render: function (e) { return h(Amount, { value: e.dailyWage || 0, currency: cur, compact: true }); } }
      ],
      summary: rows.length > 1 ? { company: 'Gesamt je Tag', dailyWage: h(Amount, { value: total, currency: cur, compact: true }) } : undefined,
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Keine Anstellungen' }, 'Wer als CEO ein Unternehmen führt, bekommt hier sein tägliches Gehalt.') });
  }


  /* ---------- Handy: Tab-Leiste, Kopfzeile für Unterseiten, Handelsleiste ---------- */

  /* BottomNav — Tab-Leiste am unteren Rand (unter 720 px statt der Hauptnavigation). Höchstens 5 Einträge. */
  function BottomNav(props) {
    var items = (props.items || []).slice(0, 5);
    return h('nav', { className: cx('bnk-bnav', props.fixed !== false && 'is-fixed', props.className), 'aria-label': props['aria-label'] || 'Hauptnavigation' },
      h('ul', { className: 'bnk-bnav__list' }, items.map(function (it, i) {
        var active = props.value != null ? props.value === it.value : !!it.active;
        var inner = [
          h('span', { key: 'i', className: 'bnk-bnav__icon' }, it.icon ? (typeof it.icon === 'string' ? h(Icon, { name: it.icon, size: 22 }) : it.icon) : null,
            it.badge ? h('span', { className: 'bnk-bnav__badge', 'aria-hidden': 'true' }, it.badge > 99 ? '99+' : it.badge) : null),
          h('span', { key: 'l', className: 'bnk-bnav__label' }, it.label),
          it.badge ? h('span', { key: 's', className: 'bnk-sr' }, ', ' + it.badge + ' neu') : null
        ];
        var p = { className: cx('bnk-bnav__item', active && 'is-active'), 'aria-current': active ? 'page' : undefined,
          onClick: function (e) { if (props.onChange) { if (!it.href) e.preventDefault(); props.onChange(it.value, e); } } };
        return h('li', { key: it.value || i }, it.href ? h('a', Object.assign(p, { href: it.href }), inner) : h('button', Object.assign(p, { type: 'button' }), inner));
      })));
  }

  /* MobileTopBar — kompakte Kopfzeile für Unterseiten auf dem Handy: Zurück, Titel, bis zu zwei Icon-Aktionen. */
  function MobileTopBar(props) {
    return h('header', { className: cx('bnk-mtop', props.sticky !== false && 'is-sticky', props.className) },
      props.onBack || props.backHref ? (props.backHref
        ? h('a', { className: 'bnk-mtop__back', href: props.backHref, 'aria-label': props.backLabel || 'Zurück' }, h('span', { className: 'bnk-chev bnk-mtop__chev', 'aria-hidden': 'true' }), props.backText ? h('span', null, props.backText) : null)
        : h('button', { type: 'button', className: 'bnk-mtop__back', onClick: props.onBack, 'aria-label': props.backLabel || 'Zurück' }, h('span', { className: 'bnk-chev bnk-mtop__chev', 'aria-hidden': 'true' }), props.backText ? h('span', null, props.backText) : null))
        : h('span', { className: 'bnk-mtop__spacer' }),
      h('div', { className: 'bnk-mtop__title' },
        props.eyebrow ? h('span', { className: 'bnk-mtop__eyebrow' }, props.eyebrow) : null,
        h(props.as || 'h1', { className: 'bnk-mtop__h' }, props.title)),
      h('div', { className: 'bnk-mtop__actions' }, (props.actions || []).slice(0, 2).map(function (a, i) {
        return h('button', { key: i, type: 'button', className: 'bnk-mtop__act', onClick: a.onClick, 'aria-label': a.label, 'aria-pressed': a.pressed != null ? String(!!a.pressed) : undefined },
          typeof a.icon === 'string' ? h(Icon, { name: a.icon, size: 22 }) : a.icon);
      })));
  }

  /* TradeBar — Handelsleiste am unteren Rand der Wertpapierseite auf dem Handy: Geld/Brief und zwei Knöpfe, die die Order-Maske (Sheet) öffnen. */
  function TradeBar(props) {
    var s = props.spread || {};
    var l = props.listing || {};
    var cur = props.currency == null ? '€' : props.currency;
    function side(label, px, size, act, text) {
      var open = px == null && props.tradeWithoutQuote;
      return h('button', { type: 'button', className: cx('bnk-tbar__btn', 'is-' + act.toLowerCase()), disabled: (px == null && !open) || props.disabled,
          onClick: function () { if (props.onTrade) props.onTrade({ action: act, price: px }); } },
        h('span', { className: cx('bnk-tbar__verb', 'bnk-side', act === 'BUY' ? 'is-buy' : 'is-sell') }, text),
        h('span', { className: 'bnk-tbar__px' }, px != null ? price(px, l.type, cur) : '–'),
        h('span', { className: 'bnk-tbar__lbl' }, open ? 'Kein ' + label + ' · mit Limit' : label + (size != null ? ' · ' + number(size, 0, true) + ' Stk.' : '')));
    }
    return h('div', { className: cx('bnk-tbar', props.fixed !== false && 'is-fixed', props.className), role: 'region', 'aria-label': 'Handeln: ' + (l.name || l.securityIdentifier || '') },
      side('Geld', s.bidPrice, s.bidSize, 'SELL', 'Verkaufen'),
      side('Brief', s.askPrice, s.askSize, 'BUY', 'Kaufen'));
  }


  /* ---------- ETF, Immobilien, Allianz, Einstellungen ---------- */

  /* EtfFacts — Eckdaten eines Fonds (API: GET /v2/etfs/{asin} → EtfView). */
  function EtfFacts(props) {
    var e = props.etf || {};
    var items = [
      { label: 'Bildet ab', value: e.baseIndexName ? (props.indexHref ? h('a', { className: 'bnk-pos__link', href: props.indexHref(e) }, e.baseIndexName) : e.baseIndexName) : (e.baseIndexAsin || '–') },
      { label: 'Anbieter', value: e.owner ? e.owner.username : '–' },
      { label: h(Term, { title: 'Verwaltungsgebühr', definition: 'Jährliche Gebühr in Prozent des Fondsvermögens, die der Anbieter einbehält.' }, 'Verwaltungsgebühr p. a.'),
        value: h('span', { className: 'bnk-bond__due' }, e.managementFeePercent != null ? fmt(e.managementFeePercent, 2) + ' %' : '–',
          e.nextFeeChangeAt ? h('small', null, 'Änderung möglich ab ' + dateTime(e.nextFeeChangeAt)) : e.managementFeeFrozen ? h('small', null, 'festgeschrieben') : null) },
      { label: h(Term, { title: 'Tracking-Differenz', definition: 'Abweichung der Fondsentwicklung vom Index im letzten Monat. Nahe 0 heißt: der Fonds bildet den Index gut ab.' }, 'Tracking-Differenz'),
        value: e.trackingDifferencePercent != null ? (e.trackingDifferencePercent > 0 ? '+' : e.trackingDifferencePercent < 0 ? '−' : '± ') + fmt(e.trackingDifferencePercent, 2) + ' %' + (e.trackingDifferenceMonth ? ' (' + e.trackingDifferenceMonth + ')' : '') : '–' }
    ];
    return h('div', { className: cx('bnk-etf', props.className) },
      e.frozen || e.baseIndexEnded ? h(Banner, { variant: 'info', title: e.baseIndexEnded ? 'Index beendet' : 'Fonds eingefroren' },
        e.baseIndexEnded ? 'Der abgebildete Index wird nicht mehr berechnet. Anteile können zurückgegeben werden.' : 'Seit ' + (e.frozenAt ? dateTime(e.frozenAt) : '–') + ' werden keine neuen Anteile ausgegeben.') : null,
      h(SummaryList, { items: items }));
  }

  /* EtfUnitsForm — Fondsanteile zeichnen oder zurückgeben (API: POST /v2/etfs/{asin}/subscriptions | redemptions?units). */
  function EtfUnitsForm(props) {
    var modeSt = React.useState(props.defaultMode || 'subscribe');
    var unitsSt = React.useState('');
    var mode = modeSt[0];
    var u = toNum(unitsSt[0]);
    var max = mode === 'redeem' ? props.ownedUnits : null;
    var err = !unitsSt[0] ? null : isNaN(u) || u <= 0 || u % 1 ? 'Bitte eine ganze Zahl über 0 eingeben.' : max != null && u > max ? 'Du hältst nur ' + number(max, 0) + ' Anteile.' : null;
    var est = props.navPerUnit && u > 0 && !err ? u * props.navPerUnit : null;
    var disabled = props.frozen && mode === 'subscribe';
    return h('form', { className: cx('bnk-etfform', props.className), onSubmit: function (e) { e.preventDefault(); if (!err && u > 0 && props.onSubmit) props.onSubmit({ mode: mode, units: u }); } },
      h(SegmentedControl, { 'aria-label': 'Vorgang', value: mode, onChange: modeSt[1], options: [{ value: 'subscribe', label: 'Zeichnen' }, { value: 'redeem', label: 'Zurückgeben' }] }),
      disabled ? h('p', { className: 'bnk-bank__text' }, 'Der Fonds ist eingefroren – es werden keine neuen Anteile ausgegeben.') : null,
      h(Input, { label: 'Anteile', numeric: true, stepper: true, min: 1, step: 1, suffix: 'Stk.', value: unitsSt[0], onChange: function (e) { unitsSt[1](e.target.value); }, error: err, disabled: disabled,
        hint: max != null ? 'Im Bestand: ' + number(max, 0) + ' Anteile' : props.navPerUnit ? 'Anteilswert ca. ' + money(props.navPerUnit, '€', 2) : undefined }),
      est != null ? h('p', { className: 'bnk-xfer__sum' }, mode === 'redeem' ? 'Du erhältst ca. ' : 'Kostet ca. ', h(Amount, { value: est, currency: '€', compact: true }), props.managementFeePercent != null && mode === 'subscribe' ? ' · laufende Gebühr ' + fmt(props.managementFeePercent, 2) + ' % p. a.' : '') : null,
      h('div', { className: 'bnk-xfer__actions' }, h(Button, { type: 'submit', variant: props.submitVariant || 'primary', disabled: disabled || !(u > 0) || !!err, loading: props.loading }, mode === 'redeem' ? 'Anteile zurückgeben' : 'Anteile zeichnen')));
  }

  /* RealEstateList — Immobilien am Markt (API: POST /v2/filter/pricespreads mit Filter type = BUILDING, askSize > 0). */
  function RealEstateList(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var items = (props.offers || []).slice().sort(function (a, b) { return ((a.price || {}).askPrice || 0) - ((b.price || {}).askPrice || 0); });
    if (props.sort === 'desc') items.reverse();
    if (!items.length) return h(EmptyState, { compact: true, symbol: false, title: 'Keine Immobilien im Angebot' }, 'Sobald jemand ein Gebäude zum Verkauf stellt, erscheint es hier.');
    return h('ul', { className: cx('bnk-estate', props.className) }, items.map(function (o, i) {
      var l = o.listing || {}, p = o.price || {};
      return h('li', { key: l.securityIdentifier || i, className: 'bnk-estate__item' },
        h('span', { className: 'bnk-estate__icon', 'aria-hidden': 'true' }, h(Icon, { name: 'bank', size: 24 })),
        h('span', { className: 'bnk-estate__main' },
          h('span', { className: 'bnk-estate__name' }, props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(o) }, l.name) : l.name),
          h('span', { className: 'bnk-table__meta' }, h('span', { className: 'bnk-table__ticker' }, l.securityIdentifier), p.askSize != null ? h('span', null, number(p.askSize, 0) + ' im Angebot') : null)),
        h('span', { className: 'bnk-estate__px' }, h('span', { className: 'bnk-estate__lbl' }, 'Brief'), p.askPrice != null ? h(Amount, { value: p.askPrice, currency: cur, compact: 'auto' }) : '–'),
        props.onBuy ? h(Button, { size: 'sm', onClick: function () { props.onBuy(o); }, 'aria-label': 'Kaufen: ' + l.name }, 'Kaufen') : null);
    }));
  }

  /* AllianceMembers — Mitglieder einer Allianz mit Rolle und Online-Punkt (API: GET /v2/alliancememberships?allianceId). */
  var ALLIANCE_ROLES = { OWNER: 'Gründer', DEPUTY: 'Stellvertretung', PRESS_OFFICER: 'Pressesprecher', MEMBER: 'Mitglied' };
  function AllianceMembers(props) {
    var order = { OWNER: 0, DEPUTY: 1, PRESS_OFFICER: 2, MEMBER: 3 };
    var ms = (props.members || []).slice().sort(function (a, b) { return (order[a.role] - order[b.role]) || (b.online - a.online) || String(a.member && a.member.username).localeCompare(String(b.member && b.member.username), 'de'); });
    return h('ul', { className: cx('bnk-amem', props.className) }, ms.map(function (m, i) {
      var u = m.member || {};
      var canManage = props.onRoleChange && m.role !== 'OWNER';
      return h('li', { key: m.id || i, className: 'bnk-amem__item' },
        h('span', { className: 'bnk-amem__av' }, h(Avatar, { name: u.username, size: 36 }), m.online ? h('span', { className: 'bnk-amem__on', title: 'online' }) : null),
        h('span', { className: 'bnk-amem__main' },
          h('span', { className: 'bnk-amem__name' }, props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(m) }, u.username) : u.username, u.myUser ? h('span', { className: 'bnk-prof__tag' }, 'Du') : null),
          h('span', { className: 'bnk-amem__meta' }, ALLIANCE_ROLES[m.role] || m.role, m.dateJoined ? ' · seit ' + dateTime(m.dateJoined, false) : '', m.online ? h('span', { className: 'bnk-sr' }, ' · online') : null)),
        canManage ? h(DropdownMenu, { label: h('span', { className: 'bnk-sr' }, 'Mitglied ' + u.username), variant: 'ghost', align: 'end', items: [
          { heading: u.username },
          { label: 'Zur Stellvertretung machen', disabled: m.role === 'DEPUTY', onSelect: function () { props.onRoleChange(m, 'DEPUTY'); } },
          { label: 'Zum Pressesprecher machen', disabled: m.role === 'PRESS_OFFICER', onSelect: function () { props.onRoleChange(m, 'PRESS_OFFICER'); } },
          { label: 'Einfaches Mitglied', disabled: m.role === 'MEMBER', onSelect: function () { props.onRoleChange(m, 'MEMBER'); } },
          props.onRemove ? { divider: true } : null,
          props.onRemove ? { label: 'Aus der Allianz entfernen', danger: true, onSelect: function () { props.onRemove(m); } } : null].filter(Boolean) }) : null);
    }));
  }

  /* SettingsSection & SettingsRow — Einstellungsseite in Abschnitten: Bezeichnung links, Bedienelement rechts, auf dem Handy untereinander. */
  function SettingsSection(props) {
    return h('section', { className: cx('bnk-set', props.danger && 'is-danger', props.className), 'aria-labelledby': props.id ? props.id + '-t' : undefined },
      h('div', { className: 'bnk-set__head' },
        h(props.as || 'h2', { id: props.id ? props.id + '-t' : undefined, className: 'bnk-set__title' }, props.title),
        props.description ? h('p', { className: 'bnk-set__desc' }, props.description) : null),
      h('div', { className: 'bnk-set__rows' }, props.children));
  }
  function SettingsRow(props) {
    return h('div', { className: cx('bnk-set__row', props.stacked && 'is-stacked', props.className) },
      h('div', { className: 'bnk-set__label' }, h('span', { className: 'bnk-set__name', id: props.labelId }, props.label), props.description ? h('span', { className: 'bnk-set__hint' }, props.description) : null),
      h('div', { className: 'bnk-set__control' }, props.children));
  }


  /* ---------- Markt: Lage, Filter, Ergebnisse, Live-Ticker ---------- */

  /* MarketPulse — Marktlage in einer Zeile (API: GET /api/v2/minimalstats bzw. /ats/onlineusers). */
  function MarketPulse(props) {
    var s = props.stats || {};
    var items = [
      { k: 'online', label: 'online', v: s.onlineUsers },
      { k: 'users', label: 'Spieler', v: s.users },
      { k: 'companies', label: 'Unternehmen', v: s.companies },
      { k: 'listings', label: 'Wertpapiere', v: s.listings },
      { k: 'cap', label: 'Marktkap.', v: s.marketCap, money: true },
      { k: 'trades', label: 'Trades 24 h', v: s.trades24h },
      { k: 'volume', label: 'Umsatz 24 h', v: s.volume24h, money: true }
    ].filter(function (i) { return i.v != null; });
    return h('dl', { className: cx('bnk-pulse', props.className), 'aria-label': 'Marktlage' }, items.map(function (i) {
      return h('div', { key: i.k, className: cx('bnk-pulse__item', 'is-' + i.k) },
        h('dt', null, i.k === 'online' ? h('span', { className: 'bnk-pulse__dot', 'aria-hidden': 'true' }) : null, i.label),
        h('dd', null, i.money ? h(Amount, { value: i.v, currency: '€', compact: true }) : number(i.v, 0)));
    }));
  }

  /* Marktfilter (API: POST /api/v2/filter/pricespreads mit PriceSpreadListingViewFilter) */
  var MARKET_TYPES = [
    { value: '', label: 'Alle' }, { value: 'STOCK', label: 'Aktien' }, { value: 'BOND', label: 'Anleihen' }, { value: 'REPO', label: 'Repos' },
    { value: 'COIN', label: 'Coins' }, { value: 'ETF', label: 'Fonds' }, { value: 'INDEX', label: 'Indizes' }, { value: 'WARRANT', label: 'Optionsscheine' }, { value: 'BUILDING', label: 'Immobilien' }
  ];
  function chainFilter(preds) {
    if (!preds.length) return null;
    var f = { operator: 'WHERE', predicate: preds[0], nextFilters: [] }, cur = f;
    for (var i = 1; i < preds.length; i++) { var n = { operator: 'AND', predicate: preds[i], nextFilters: [] }; cur.nextFilters.push(n); cur = n; }
    return f;
  }
  function buildMarketFilter(v) {
    v = v || {};
    var lp = [], sp = [];
    if (v.type) lp.push({ field: 'type', operator: 'EQUAL', parameter: v.type });
    if (v.search) lp.push({ field: 'name', operator: 'CONTAINS', parameter: v.search });
    if (v.minPrice != null && v.minPrice !== '') sp.push({ field: 'askPrice', operator: 'GREATER_THAN_OR_EQUAL', parameter: String(v.minPrice) });
    if (v.maxPrice != null && v.maxPrice !== '') sp.push({ field: 'askPrice', operator: 'LESS_THAN_OR_EQUAL', parameter: String(v.maxPrice) });
    if (v.withAsk) sp.push({ field: 'askSize', operator: 'GREATER_THAN', parameter: '0' });
    if (v.withBid) sp.push({ field: 'bidSize', operator: 'GREATER_THAN', parameter: '0' });
    return { name: v.name || null, listingFilter: chainFilter(lp), spreadFilter: chainFilter(sp) };
  }
  function MarketFilterBar(props) {
    var ctl = props.value !== undefined;
    var st = React.useState(props.defaultValue || { type: '', search: '', withAsk: false, withBid: false });
    var v = ctl ? props.value : st[0];
    var moreSt = React.useState(false);
    function set(k, x) { var n = Object.assign({}, v); n[k] = x; if (!ctl) st[1](n); if (props.onChange) props.onChange(n, buildMarketFilter(n)); }
    var active = [v.minPrice, v.maxPrice].filter(function (x) { return x != null && x !== ''; }).length + (v.withAsk ? 1 : 0) + (v.withBid ? 1 : 0);
    return h('div', { className: cx('bnk-mfilter', props.className), role: 'search' },
      h('div', { className: 'bnk-mfilter__row' },
        h('div', { className: 'bnk-mfilter__search' }, h(Input, { label: 'Suche', value: v.search || '', placeholder: 'Name oder ASIN', onChange: function (e) { set('search', e.target.value); } })),
        h('div', { className: 'bnk-mfilter__type' }, h(Select, { label: 'Wertpapierart', value: v.type || '', onChange: function (e) { set('type', e.target.value); }, options: MARKET_TYPES })),
        h(Button, { variant: 'ghost', size: 'sm', className: 'bnk-mfilter__more', 'aria-expanded': moreSt[0] ? 'true' : 'false', onClick: function () { moreSt[1](!moreSt[0]); },
          iconStart: h(Icon, { name: 'filter', size: 16 }) }, 'Weitere Filter' + (active ? ' (' + active + ')' : ''))),
      moreSt[0] ? h('div', { className: 'bnk-mfilter__row is-more' },
        h(Input, { label: 'Brief ab', numeric: true, suffix: '€', value: v.minPrice || '', onChange: function (e) { set('minPrice', e.target.value); } }),
        h(Input, { label: 'Brief bis', numeric: true, suffix: '€', value: v.maxPrice || '', onChange: function (e) { set('maxPrice', e.target.value); } }),
        h('div', { className: 'bnk-mfilter__checks' },
          h(Checkbox, { label: 'Nur mit Angebot', checked: !!v.withAsk, onChange: function (e) { set('withAsk', e.target.checked); } }),
          h(Checkbox, { label: 'Nur mit Nachfrage', checked: !!v.withBid, onChange: function (e) { set('withBid', e.target.checked); } })),
        props.onSave ? h(Button, { size: 'sm', onClick: function () { props.onSave(buildMarketFilter(v)); } }, 'Filter speichern') : null) : null,
      h('p', { className: 'bnk-mfilter__total', 'aria-live': 'polite' }, props.total != null ? number(props.total, 0) + ' Treffer' : '\u00a0'));
  }
  /* MarketResults — Ergebnisliste des Marktfilters (ListingMarketFilterResultView). */
  function MarketResults(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var rows = (props.results || []).map(function (r) { var l = r.listing || {}, p = r.price || {}; return { result: r, id: l.securityIdentifier, l: l, p: p, name: l.name, bid: p.bidPrice, ask: p.askPrice, bidSize: p.bidSize, askSize: p.askSize, spread: p.bidPrice && p.askPrice ? (p.askPrice / p.bidPrice - 1) * 100 : null }; });
    function px(r, v, size) { return v == null ? h('span', { className: 'bnk-pos__none' }, '–') : h('span', { className: 'bnk-pos__stack' }, !isPercentQuoted(r.l.type) && Math.abs(v) >= 1e6 ? h(Amount, { value: v, currency: cur, compact: true }) : price(v, r.l.type, cur), size != null ? h('small', null, number(size, 0, true) + ' Stk.') : null); }
    return h(DataTable, { className: cx('bnk-mres', props.className), stack: props.stack || 'auto', rows: rows, rowKey: 'id', density: props.density || 'sm', caption: 'Wertpapiere',
      defaultSort: props.defaultSort || { key: 'name', dir: 'asc' }, getRowHref: props.hrefFor ? function (r) { return props.hrefFor(r); } : undefined,
      columns: [
        { key: 'name', label: 'Wertpapier', sortable: true, render: function (r) { return h('span', { className: 'bnk-table__stock' }, h('span', { className: 'bnk-table__name' }, r.name),
          h('span', { className: 'bnk-table__meta' }, h('span', { className: 'bnk-table__ticker' }, r.id), h('span', null, LISTING_TYPES[r.l.type] || r.l.type))); } },
        { key: 'bid', label: h(Term, { term: 'BID' }), mobileLabel: 'Geld', type: 'number', sortable: true, render: function (r) { return px(r, r.bid, r.bidSize); } },
        { key: 'ask', label: h(Term, { term: 'ASK' }), mobileLabel: 'Brief', type: 'number', sortable: true, render: function (r) { return px(r, r.ask, r.askSize); } },
        { key: 'spread', label: h(Term, { term: 'SPREAD' }), mobileLabel: 'Spread', type: 'number', sortable: true, sortValue: function (r) { return r.spread == null ? Infinity : r.spread; }, render: function (r) { return r.spread == null ? h('span', { className: 'bnk-pos__none' }, '–') : fmt(r.spread, 2) + ' %'; } }
      ].concat((props.extraColumns || []).map(function (c) {
        /* Zusatzspalten der App (z. B. Rendite pro Tag bei Anleihen): render/sortValue bekommen das Original-Ergebnis */
        return Object.assign({}, c, {
          render: c.render ? function (row) { return c.render(row.result); } : undefined,
          sortValue: c.sortValue ? function (row) { return c.sortValue(row.result); } : undefined
        });
      })),
      empty: props.empty || h(EmptyState, { compact: true, symbol: false, title: 'Keine Treffer' }, 'Filter lockern oder nach Name bzw. ASIN suchen.') });
  }

  /* LiveTicker — laufende Orders und Trades (API: WebSocket bzw. /api/marketstatistics, /ats/tradenews). Neue Einträge oben, kurz hervorgehoben. */
  function LiveTicker(props) {
    var cur = props.currency == null ? '€' : props.currency;
    var items = (props.items || []).slice(0, props.max || 12);
    var pausedSt = React.useState(false);
    var shown = React.useRef(items);
    if (!pausedSt[0]) shown.current = items;
    var seen = React.useRef({});
    var fresh = {};
    shown.current.forEach(function (it) { if (!seen.current[it.id]) fresh[it.id] = true; });
    React.useEffect(function () { shown.current.forEach(function (it) { seen.current[it.id] = true; }); });
    return h('section', { className: cx('bnk-ticker', props.className), 'aria-label': props.title || 'Live-Ticker' },
      h('div', { className: 'bnk-ticker__head' },
        h('h3', { className: 'bnk-ticker__title' }, h('span', { className: cx('bnk-ticker__live', pausedSt[0] && 'is-paused'), 'aria-hidden': 'true' }), props.title || 'Live'),
        h(Button, { variant: 'ghost', size: 'sm', 'aria-pressed': pausedSt[0] ? 'true' : 'false', onClick: function () { pausedSt[1](!pausedSt[0]); } }, pausedSt[0] ? 'Fortsetzen' : 'Anhalten')),
      h('ol', { className: 'bnk-ticker__list', 'aria-live': pausedSt[0] ? 'off' : 'polite', 'aria-relevant': 'additions' }, shown.current.map(function (it) {
        var l = it.listing || {};
        return h('li', { key: it.id, className: cx('bnk-ticker__item', fresh[it.id] && 'is-new') },
          it.action ? h('span', { className: cx('bnk-side', it.action === 'SELL' ? 'is-sell' : 'is-buy') }, it.action === 'SELL' ? 'Verkauf' : 'Kauf') : h('span', { className: 'bnk-ticker__kind' }, 'Trade'),
          h('span', { className: 'bnk-ticker__name' }, props.hrefFor ? h('a', { className: 'bnk-pos__link', href: props.hrefFor(it) }, l.name || l.securityIdentifier) : (l.name || l.securityIdentifier),
            h('span', { className: 'bnk-table__ticker' }, l.securityIdentifier)),
          h('span', { className: 'bnk-ticker__num' }, it.numberOfShares != null ? number(it.numberOfShares, 0, true) + ' × ' : '', price(it.price, l.type, cur)),
          h('time', { className: 'bnk-ticker__time', dateTime: new Date(it.date).toISOString() }, new Date(it.date).toLocaleTimeString('de-DE')));
      })));
  }

  /* ---------- Emissionen (als CEO): Anleihe, Index, Fonds, Optionsschein ---------- */
  function IssueSummary(props) { return h('p', { className: 'bnk-xfer__sum' }, props.children); }
  function FormActions(props) {
    return h('div', { className: 'bnk-xfer__actions' },
      props.onCancel ? h(Button, { onClick: props.onCancel }, 'Abbrechen') : null,
      h(Button, { type: 'submit', variant: props.variant || 'primary', disabled: props.disabled, loading: props.loading }, props.label));
  }

  /* BondIssueForm — Anleihe begeben (POST /api/bonds) oder Systemanleihe an die Zentralbank (POST /api/systembonds). */
  function BondIssueForm(props) {
    var kindSt = React.useState(props.defaultKind || 'bond');
    var nSt = React.useState(''), faceSt = React.useState('1.000'), rateSt = React.useState(''), dueSt = React.useState(toLocalInput(Date.now() + 24 * 3600e3));
    var kind = kindSt[0];
    var n = toNum(nSt[0]), face = toNum(faceSt[0]), rate = toNum(rateSt[0]), due = fromLocalInput(dueSt[0]);
    var sys = kind === 'system';
    var errN = nSt[0] && (!(n > 0) || n % 1) ? 'Bitte eine ganze Zahl über 0.' : null;
    var errRate = !sys && rateSt[0] && !(rate >= 0) ? 'Bitte einen Zinssatz eingeben.' : null;
    var errDue = !sys && due && due <= Date.now() ? 'Die Fälligkeit muss in der Zukunft liegen.' : null;
    var vol = n > 0 ? n * (sys ? (props.systemFaceValue || 1000) : face) : null;
    var ok = n > 0 && !errN && (sys || (face > 0 && rate >= 0 && due > Date.now()));
    var days = due ? (due - Date.now()) / 864e5 : 0;
    var interest = vol && !sys && rate >= 0 && days > 0 ? vol * rate / 100 * days / 365 : null;
    return h('form', { className: cx('bnk-issue', props.className), onSubmit: function (e) { e.preventDefault(); if (!ok || !props.onSubmit) return;
        props.onSubmit(sys ? { kind: 'system', numberOfBonds: n } : { kind: 'bond', numberOfBonds: n, faceValue: face, interestRate: rate, maturityDate: due }); } },
      props.canIssueSystemBonds ? h(RadioGroup, { label: 'Art', value: kind, onChange: kindSt[1], options: [
        { value: 'bond', label: 'Eigene Anleihe', description: 'Zins, Nennwert und Fälligkeit legst du fest. Käufer finden sich am Markt.' },
        { value: 'system', label: 'Systemanleihe', description: 'Die Zentralbank kauft zum aktuellen Leitzins' + (props.mainRate != null ? ' (' + fmt(props.mainRate, 2) + ' %)' : '') + '. Nur mit Banklizenz.' }] }) : null,
      h('div', { className: 'bnk-issue__grid' },
        h(Input, { label: 'Stücke', numeric: true, stepper: true, min: 1, step: 1, value: nSt[0], onChange: function (e) { nSt[1](e.target.value); }, error: errN }),
        !sys ? h(Input, { label: 'Nennwert je Stück', numeric: true, suffix: '€', value: faceSt[0], onChange: function (e) { faceSt[1](e.target.value); } }) : null,
        !sys ? h(Input, { label: 'Zins bis Fälligkeit', hint: 'für die ganze Laufzeit, gezahlt bei Fälligkeit', numeric: true, suffix: '%', value: rateSt[0], onChange: function (e) { rateSt[1](e.target.value); }, error: errRate,
          hint: props.averageRate != null ? 'Markt-Durchschnitt ' + fmt(props.averageRate, 4) + ' %' : undefined }) : null,
        !sys ? h(Input, { label: 'Fällig am', type: 'datetime-local', value: dueSt[0], onChange: function (e) { dueSt[1](e.target.value); }, error: errDue }) : null),
      vol ? h(IssueSummary, null, 'Volumen ', h(Amount, { value: vol, currency: '€', compact: true }),
        interest != null ? h('span', null, ' · Zinsen bis Fälligkeit ca. ', h(Amount, { value: interest, currency: '€', compact: true })) : null,
        ' · fließt dem Unternehmen zu, sobald die Stücke verkauft sind.') : null,
      h(FormActions, { label: sys ? 'Systemanleihe begeben' : 'Anleihe begeben', disabled: !ok, loading: props.loading, onCancel: props.onCancel, variant: props.submitVariant }));
  }

  /* IndexBuilder — eigenen Index anlegen (POST /api/v2/indexes?companyId&name&members[]&customAsin). */
  function IndexBuilder(props) {
    var nameSt = React.useState(''), asinSt = React.useState(''), memSt = React.useState(props.defaultMembers || []);
    var q = React.useState('');
    var members = memSt[0];
    var cands = (props.candidates || []).filter(function (c) { var t = q[0].toLowerCase(); return (!t || (c.name + ' ' + c.securityIdentifier).toLowerCase().indexOf(t) !== -1) && members.indexOf(c.securityIdentifier) === -1; }).slice(0, 6);
    var byAsin = {}; (props.candidates || []).forEach(function (c) { byAsin[c.securityIdentifier] = c; });
    var asinErr = asinSt[0] && !/^ID[A-Z0-9]{8}$/.test(asinSt[0].toUpperCase()) ? 'Eigene ASIN: „ID“ und 8 Zeichen, z. B. IDHANSEALL.' : null;
    var ok = nameSt[0].trim().length >= 2 && members.length >= (props.minMembers || 2) && !asinErr;
    return h('form', { className: cx('bnk-issue', props.className), onSubmit: function (e) { e.preventDefault(); if (ok && props.onSubmit) props.onSubmit({ name: nameSt[0].trim(), members: members, customAsin: asinSt[0] ? asinSt[0].toUpperCase() : undefined }); } },
      h('div', { className: 'bnk-issue__grid' },
        h(Input, { label: 'Name des Index', value: nameSt[0], onChange: function (e) { nameSt[1](e.target.value); }, placeholder: 'z. B. Hanse 10' }),
        h(Input, { label: 'Eigene ASIN', optional: true, value: asinSt[0], onChange: function (e) { asinSt[1](e.target.value); }, error: asinErr, hint: props.gold === false ? 'Nur mit Goldzugang' : undefined, disabled: props.gold === false })),
      h('div', { className: 'bnk-ibuild' },
        h('div', { className: 'bnk-ibuild__col' },
          h(Input, { label: 'Wertpapier hinzufügen', value: q[0], onChange: function (e) { q[1](e.target.value); }, placeholder: 'Name oder ASIN' }),
          h('ul', { className: 'bnk-ibuild__list' }, cands.map(function (c) {
            return h('li', { key: c.securityIdentifier }, h('button', { type: 'button', className: 'bnk-ibuild__pick', onClick: function () { memSt[1](members.concat([c.securityIdentifier])); } },
              h(Icon, { name: 'plus', size: 16 }), h('span', null, c.name), h('span', { className: 'bnk-table__ticker' }, c.securityIdentifier)));
          }))),
        h('div', { className: 'bnk-ibuild__col' },
          h('div', { className: 'bnk-field__label' }, 'Mitglieder (' + members.length + ')'),
          members.length ? h('ol', { className: 'bnk-ibuild__list is-chosen' }, members.map(function (a, i) {
            var c = byAsin[a] || { name: a, securityIdentifier: a };
            return h('li', { key: a }, h('span', { className: 'bnk-ibuild__n' }, (i + 1) + '.'), h('span', null, c.name), h('span', { className: 'bnk-table__ticker' }, a),
              h('button', { type: 'button', className: 'bnk-notes__del', style: { opacity: 1 }, 'aria-label': 'Entfernen: ' + c.name, onClick: function () { memSt[1](members.filter(function (x) { return x !== a; })); } }, '✕'));
          })) : h('p', { className: 'bnk-bank__text' }, 'Noch keine Mitglieder. Mindestens ' + (props.minMembers || 2) + '.'))),
      h(FormActions, { label: 'Index anlegen', disabled: !ok, loading: props.loading, onCancel: props.onCancel, variant: props.submitVariant }));
  }

  /* EtfCreateForm — Fonds auflegen (POST /api/v2/etfs?companyId&name&baseIndexAsin&customAsin), nur mit Banklizenz. */
  function EtfCreateForm(props) {
    var nameSt = React.useState(''), idxSt = React.useState(props.defaultIndex || ''), feeSt = React.useState('');
    var fee = toNum(feeSt[0]);
    var ok = nameSt[0].trim().length >= 2 && idxSt[0];
    return h('form', { className: cx('bnk-issue', props.className), onSubmit: function (e) { e.preventDefault(); if (ok && props.onSubmit) props.onSubmit({ name: nameSt[0].trim(), baseIndexAsin: idxSt[0], managementFeePercent: fee >= 0 ? fee : undefined }); } },
      props.licensed === false ? h(Banner, { title: 'Banklizenz nötig' }, 'Fonds können nur Unternehmen mit Banklizenz auflegen.') : null,
      h('div', { className: 'bnk-issue__grid' },
        h(Input, { label: 'Name des Fonds', value: nameSt[0], onChange: function (e) { nameSt[1](e.target.value); }, placeholder: 'z. B. ATSX Tracker', disabled: props.licensed === false }),
        h(Select, { label: 'Bildet ab', value: idxSt[0], placeholder: 'Index wählen', onChange: function (e) { idxSt[1](e.target.value); }, options: (props.indexes || []).map(function (i) { return { value: i.securityIdentifier, label: i.name + ' (' + i.securityIdentifier + ')' }; }), disabled: props.licensed === false }),
        h(Input, { label: 'Verwaltungsgebühr p. a.', optional: true, numeric: true, suffix: '%', value: feeSt[0], onChange: function (e) { feeSt[1](e.target.value); }, hint: 'Später nur in Abständen änderbar.', disabled: props.licensed === false })),
      h(FormActions, { label: 'Fonds auflegen', disabled: !ok || props.licensed === false, loading: props.loading, onCancel: props.onCancel, variant: props.submitVariant }));
  }

  /* WarrantIssueForm — Optionsschein begeben (POST /api/v2/warrants?companyId&type&underlyingAsin&cashDeposit&ratio). */
  function WarrantIssueForm(props) {
    var typeSt = React.useState('CALL'), undSt = React.useState(props.defaultUnderlying || ''), cashSt = React.useState(''), ratioSt = React.useState(props.defaultRatio || '1000');
    var cash = toNum(cashSt[0]), ratio = toNum(ratioSt[0]);
    var err = cashSt[0] && !(cash > 0) ? 'Bitte einen Betrag über 0.' : props.cash != null && cash > props.cash ? 'Nicht genug Bargeld – höchstens ' + money(props.cash, '€', 2) + '.' : null;
    var ok = undSt[0] && cash > 0 && !err && ratio > 0;
    return h('form', { className: cx('bnk-issue', props.className), onSubmit: function (e) { e.preventDefault(); if (ok && props.onSubmit) props.onSubmit({ type: typeSt[0], underlyingAsin: undSt[0], cashDeposit: cash, ratio: ratio }); } },
      h(SegmentedControl, { label: 'Typ', value: typeSt[0], onChange: typeSt[1], options: [{ value: 'CALL', label: 'Call' }, { value: 'PUT', label: 'Put' }] }),
      h('p', { className: 'bnk-bank__text' }, typeSt[0] === 'CALL' ? 'Gewinnt, wenn der Basiswert steigt – bis zum Cap.' : 'Gewinnt, wenn der Basiswert fällt.'),
      h('div', { className: 'bnk-issue__grid' },
        h(Select, { label: 'Basiswert', value: undSt[0], placeholder: 'Index oder Aktie wählen', onChange: function (e) { undSt[1](e.target.value); }, options: (props.underlyings || []).map(function (u) { return { value: u.securityIdentifier, label: u.name + ' (' + u.securityIdentifier + ')' }; }) }),
        h(Input, { label: 'Sicherheit (Bargeld)', numeric: true, suffix: '€', value: cashSt[0], onChange: function (e) { cashSt[1](e.target.value); }, error: err, hint: 'Wird hinterlegt und steht in der Bilanz als Sicherheit.' }),
        h(Input, { label: 'Bezugsverhältnis 1 :', numeric: true, value: ratioSt[0], onChange: function (e) { ratioSt[1](e.target.value); } })),
      h(FormActions, { label: typeSt[0] === 'CALL' ? 'Call begeben' : 'Put begeben', disabled: !ok, loading: props.loading, onCancel: props.onCancel, variant: props.submitVariant }));
  }

  /* ---------- Erfolge ---------- */
  var ACHIEVEMENT_TITLES = {
    FIRST_ALPHA_COIN_TRANSFERED: 'Erster Coin', FIRST_ORDER_PLACED: 'Erste Order', FIVE_TRADES_A_DAY: 'Fünf am Tag', HUNDRED_TRADES_A_WEEK: 'Hundert in der Woche', FIRST_THOUSAND_TRADES: 'Tausend Trades',
    TOP_HALF_USER_HIGHSCORE: 'Obere Hälfte', TOP_TEN_PERCENT_USER_HIGHSCORE: 'Oberes Zehntel', BEST_IN_USER_HIGHSCORE: 'Spitze', WRITE_FIRST_MESSAGE_BOARD_POSTING: 'Erster Beitrag',
    WRITE_FIRST_NEWS_POSTING: 'Erste Meldung', WRITE_NEWS_POSTINGS_ONCE_A_WEEK: 'Wochenkolumne', BANKER: 'Bankier', LEVEL1_ONLINE: 'Stufe 1 online', LEVEL2_ONLINE: 'Stufe 2 online', LEVEL3_ONLINE: 'Stufe 3 online',
    LEVEL4_ONLINE: 'Stufe 4 online', LEVEL5_ONLINE: 'Stufe 5 online', LEVEL6_ONLINE: 'Stufe 6 online', ONLINE_HOUR: 'Eine Stunde dabei', CONFIRM_EMAIL: 'E-Mail bestätigt',
    TOP_HALF_COMPANY_HIGHSCORE: 'Obere Hälfte', TOP_TEN_PERCENT_COMPANY_HIGHSCORE: 'Oberes Zehntel', BEST_IN_COMPANY_HIGHSCORE: 'Spitze', ATSX_MEMBER: 'Im ATSX', BANK_LICENSE: 'Banklizenz', BUILDING_OWNER: 'Grundbesitz',
    TOP_HALF_ALLIANCE_HIGHSCORE: 'Obere Hälfte', TOP_TEN_PERCENT_ALLIANCE_HIGHSCORE: 'Oberes Zehntel', BEST_IN_ALLIANCE_HIGHSCORE: 'Beste Allianz'
  };
  /* AchievementBoard — alle Erfolge einer Art: abholbare zuerst, dann erreichte, dann offene mit Fortschritt. */
  function AchievementBoard(props) {
    var list = (props.achievements || []).map(function (a) { return Object.assign({ _state: a.achievedDate && !a.claimed ? 'claim' : a.achievedDate ? 'done' : 'open' }, a); });
    var order = { claim: 0, done: 2, open: 1 };
    if (props.openFirst === false) order = { claim: 0, done: 1, open: 2 };
    list.sort(function (a, b) { return order[a._state] - order[b._state]; });
    var claimable = list.filter(function (a) { return a._state === 'claim'; });
    var coins = claimable.reduce(function (s, a) { return s + (a.coinReward || 0); }, 0);
    var done = list.filter(function (a) { return a._state !== 'open'; }).length;
    return h('div', { className: cx('bnk-achb', props.className) },
      h('div', { className: 'bnk-achb__head' },
        h(ProgressBar, { label: props.label || 'Erfolge', value: done, max: list.length || 1, variant: 'reward', valueText: done + ' / ' + list.length }),
        claimable.length && props.onClaimAll ? h(Button, { variant: props.claimVariant || 'primary', onClick: props.onClaimAll }, claimable.length + ' abholen · ' + number(coins, 0) + ' AlphaCoins') : null),
      h('div', { className: 'bnk-achb__grid' }, list.map(function (a, i) {
        var title = a.title || ACHIEVEMENT_TITLES[a.type] || a.type;
        var sym = a.symbol || title.charAt(0);
        var reward = a.coinReward ? ' · ' + number(a.coinReward, 0) + (a.coinReward === 1 ? ' AlphaCoin' : ' AlphaCoins') : '';
        return h('div', { key: a.id || a.type || i, className: cx('bnk-achb__cell', a._state === 'claim' && props.onClaim && 'has-claim') },
          h(Achievement, { title: title, symbol: sym, description: (messageText(a.description) || '') + reward, unlocked: a._state !== 'open', isNew: a._state === 'claim',
            date: a.achievedDate ? dateTime(a.achievedDate, false) : undefined,
            progress: a._state === 'open' && a.progressInPercent != null ? { value: Math.round(a.progressInPercent), max: 100, unit: '%' } : undefined }),
          a._state === 'claim' && props.onClaim ? h(Button, { size: 'sm', className: 'bnk-achb__claim', onClick: function () { props.onClaim(a); } }, 'Abholen') : null);
      })));
  }

  /* ---------- Anmelden & Registrieren ---------- */
  function AuthForm(props) {
    var mode = props.mode || 'login';
    var uSt = React.useState(''), pSt = React.useState(''), eSt = React.useState(''), aSt = React.useState(false), showSt = React.useState(false);
    var reg = mode === 'register';
    var pwShort = reg && pSt[0] && pSt[0].length < 8 ? 'Mindestens 8 Zeichen.' : null;
    var nameBad = reg && uSt[0] && !/^[A-Za-z0-9_\-.]{3,20}$/.test(uSt[0]) ? '3–20 Zeichen: Buchstaben, Ziffern, _ - .' : null;
    var ok = uSt[0] && pSt[0] && (!reg || (eSt[0] && aSt[0] && !pwShort && !nameBad));
    return h('form', { className: cx('bnk-auth', props.className), noValidate: true, onSubmit: function (e) { e.preventDefault(); if (ok && props.onSubmit) props.onSubmit(reg ? { username: uSt[0], password: pSt[0], emailAddress: eSt[0] } : { username: uSt[0], password: pSt[0] }); } },
      h('div', { className: 'bnk-auth__brand' }, props.brand || h(Wordmark, { size: 'lg' })),
      h('h1', { className: 'bnk-auth__title' }, reg ? 'Konto anlegen' : 'Anmelden'),
      props.error ? h(Banner, { variant: 'error', title: reg ? 'Registrierung fehlgeschlagen' : 'Anmeldung fehlgeschlagen' }, props.error) : null,
      h(Input, { label: 'Spielername', value: uSt[0], onChange: function (e) { uSt[1](e.target.value); }, autoComplete: 'username', error: nameBad, size: 'lg' }),
      reg ? h(Input, { label: 'E-Mail', type: 'email', value: eSt[0], onChange: function (e) { eSt[1](e.target.value); }, autoComplete: 'email', size: 'lg' }) : null,
      h('div', { className: 'bnk-auth__pw' },
        h(Input, { label: 'Passwort', type: showSt[0] ? 'text' : 'password', value: pSt[0], onChange: function (e) { pSt[1](e.target.value); }, autoComplete: reg ? 'new-password' : 'current-password', error: pwShort, size: 'lg' }),
        h('button', { type: 'button', className: 'bnk-auth__show', 'aria-pressed': showSt[0] ? 'true' : 'false', onClick: function () { showSt[1](!showSt[0]); } }, showSt[0] ? 'Verbergen' : 'Anzeigen')),
      reg ? h(Checkbox, { label: h('span', null, 'Ich akzeptiere die ', h('a', { href: props.termsHref || '#', className: 'bnk-pos__link', style: { textDecoration: 'underline' } }, 'Spielregeln'), '.'), checked: aSt[0], onChange: function (e) { aSt[1](e.target.checked); } }) : null,
      h(Button, { type: 'submit', variant: 'primary', size: 'lg', fullWidth: true, disabled: !ok, loading: props.loading }, reg ? 'Konto anlegen' : 'Anmelden'),
      h('p', { className: 'bnk-auth__alt' }, reg ? 'Schon dabei? ' : 'Neu hier? ',
        h('a', { href: props.switchHref || '#', className: 'bnk-pos__link', style: { textDecoration: 'underline' }, onClick: props.onSwitch }, reg ? 'Anmelden' : 'Konto anlegen'),
        !reg && props.resetHref ? h('span', null, ' · ', h('a', { href: props.resetHref, className: 'bnk-pos__link', style: { textDecoration: 'underline' } }, 'Passwort vergessen')) : null));
  }

  window.Bankiersgruen = window.Bankiersgruen || {};
  window.Bankiersgruen.Button = Button;
  window.Bankiersgruen.Card = Card;
  window.Bankiersgruen.PriceChange = PriceChange;
  window.Bankiersgruen.Sparkline = Sparkline;
  window.Bankiersgruen.StockRow = StockRow;
  window.Bankiersgruen.Input = Input;
  window.Bankiersgruen.Select = Select;
  window.Bankiersgruen.Textarea = Textarea;
  window.Bankiersgruen.SegmentedControl = SegmentedControl;
  window.Bankiersgruen.DataTable = DataTable;
  window.Bankiersgruen.AppHeader = AppHeader;
  window.Bankiersgruen.HeaderStat = HeaderStat;
  window.Bankiersgruen.Tabs = Tabs;
  window.Bankiersgruen.PlayerMenu = PlayerMenu;
  window.Bankiersgruen.RankBadge = RankBadge;
  window.Bankiersgruen.ProgressBar = ProgressBar;
  window.Bankiersgruen.Achievement = Achievement;
  window.Bankiersgruen.Toast = Toast;
  window.Bankiersgruen.ToastRegion = ToastRegion;
  window.Bankiersgruen.Dialog = Dialog;
  window.Bankiersgruen.SummaryList = SummaryList;
  window.Bankiersgruen.StockSearch = StockSearch;
  window.Bankiersgruen.StatusLabel = StatusLabel;
  window.Bankiersgruen.Banner = Banner;
  window.Bankiersgruen.StatTile = StatTile;
  window.Bankiersgruen.StatGroup = StatGroup;
  window.Bankiersgruen.PageHeader = PageHeader;
  window.Bankiersgruen.ChatThread = ChatThread;
  window.Bankiersgruen.ChatComposer = ChatComposer;
  window.Bankiersgruen.UserPicker = UserPicker;
  window.Bankiersgruen.ConversationList = ConversationList;
  window.Bankiersgruen.ChatWindow = ChatWindow;
  window.Bankiersgruen.TickerMention = TickerMention;
  window.Bankiersgruen.TradeShare = TradeShare;
  window.Bankiersgruen.Avatar = Avatar;
  window.Bankiersgruen.ForumCategoryList = ForumCategoryList;
  window.Bankiersgruen.ThreadList = ThreadList;
  window.Bankiersgruen.ForumPost = ForumPost;
  window.Bankiersgruen.ForumThread = ForumThread;
  window.Bankiersgruen.ForumEditor = ForumEditor;
  window.Bankiersgruen.Pagination = Pagination;
  window.Bankiersgruen.StockEmbed = StockEmbed;
  window.Bankiersgruen.MentionMenu = MentionMenu;
  window.Bankiersgruen.AssetCard = AssetCard;
  window.Bankiersgruen.HelpfulButton = HelpfulButton;
  window.Bankiersgruen.ForumText = ForumText;
  window.Bankiersgruen.OrderTicket = OrderTicket;
  window.Bankiersgruen.HighscoreTable = HighscoreTable;
  window.Bankiersgruen.ReactionBar = ReactionBar;
  window.Bankiersgruen.Amount = Amount;
  window.Bankiersgruen.SecurityHeader = SecurityHeader;
  window.Bankiersgruen.OrderBook = OrderBook;
  window.Bankiersgruen.PollCard = PollCard;
  window.Bankiersgruen.PollList = PollList;
  window.Bankiersgruen.VoteBar = VoteBar;
  window.Bankiersgruen.CorporateActionForm = CorporateActionForm;
  window.Bankiersgruen.CompanyFoundingForm = CompanyFoundingForm;
  window.Bankiersgruen.POLL_KINDS = POLL_KINDS;
  window.Bankiersgruen.CORPORATE_ACTIONS = CORPORATE_ACTIONS;
  window.Bankiersgruen.Checkbox = Checkbox;
  window.Bankiersgruen.Switch = Switch;
  window.Bankiersgruen.RadioGroup = RadioGroup;
  window.Bankiersgruen.Tooltip = Tooltip;
  window.Bankiersgruen.Term = Term;
  window.Bankiersgruen.Skeleton = Skeleton;
  window.Bankiersgruen.Loading = Loading;
  window.Bankiersgruen.EmptyState = EmptyState;
  window.Bankiersgruen.DropdownMenu = DropdownMenu;
  window.Bankiersgruen.Sheet = Sheet;
  window.Bankiersgruen.NotificationBell = NotificationBell;
  window.Bankiersgruen.NotificationList = NotificationList;
  window.Bankiersgruen.GLOSSARY = GLOSSARY;
  window.Bankiersgruen.ProfitLoss = ProfitLoss;
  window.Bankiersgruen.PortfolioSummary = PortfolioSummary;
  window.Bankiersgruen.PositionTable = PositionTable;
  window.Bankiersgruen.OrderList = OrderList;
  window.Bankiersgruen.TradeLog = TradeLog;
  window.Bankiersgruen.TradeStats = TradeStats;
  window.Bankiersgruen.SuggestionList = SuggestionList;
  window.Bankiersgruen.CompanyDevelopment = CompanyDevelopment;
  window.Bankiersgruen.ShareList = ShareList;
  window.Bankiersgruen.SUGGESTION_TYPES = SUGGESTION_TYPES;
  window.Bankiersgruen.VOLUME_GROUPS = VOLUME_GROUPS;
  window.Bankiersgruen.BondFacts = BondFacts;
  window.Bankiersgruen.BondList = BondList;
  window.Bankiersgruen.IndexFacts = IndexFacts;
  window.Bankiersgruen.IndexMembers = IndexMembers;
  window.Bankiersgruen.WarrantList = WarrantList;
  window.Bankiersgruen.MinerCard = MinerCard;
  window.Bankiersgruen.SignedAmount = SignedAmount;
  window.Bankiersgruen.BalanceSheet = BalanceSheet;
  window.Bankiersgruen.BankingPanel = BankingPanel;
  window.Bankiersgruen.TransferForm = TransferForm;
  window.Bankiersgruen.AccountStatement = AccountStatement;
  window.Bankiersgruen.Icon = Icon;
  window.Bankiersgruen.Emblem = Emblem;
  window.Bankiersgruen.Wordmark = Wordmark;
  window.Bankiersgruen.AppFooter = AppFooter;
  window.Bankiersgruen.ProfileHeader = ProfileHeader;
  window.Bankiersgruen.EmploymentList = EmploymentList;
  window.Bankiersgruen.ICONS = ICONS;
  window.Bankiersgruen.ICON_LABELS = ICON_LABELS;
  window.Bankiersgruen.BottomNav = BottomNav;
  window.Bankiersgruen.MobileTopBar = MobileTopBar;
  window.Bankiersgruen.TradeBar = TradeBar;
  window.Bankiersgruen.EtfFacts = EtfFacts;
  window.Bankiersgruen.EtfUnitsForm = EtfUnitsForm;
  window.Bankiersgruen.RealEstateList = RealEstateList;
  window.Bankiersgruen.AllianceMembers = AllianceMembers;
  window.Bankiersgruen.SettingsSection = SettingsSection;
  window.Bankiersgruen.SettingsRow = SettingsRow;
  window.Bankiersgruen.ALLIANCE_ROLES = ALLIANCE_ROLES;
  window.Bankiersgruen.MarketPulse = MarketPulse;
  window.Bankiersgruen.MarketFilterBar = MarketFilterBar;
  window.Bankiersgruen.MarketResults = MarketResults;
  window.Bankiersgruen.LiveTicker = LiveTicker;
  window.Bankiersgruen.BondIssueForm = BondIssueForm;
  window.Bankiersgruen.IndexBuilder = IndexBuilder;
  window.Bankiersgruen.EtfCreateForm = EtfCreateForm;
  window.Bankiersgruen.WarrantIssueForm = WarrantIssueForm;
  window.Bankiersgruen.AchievementBoard = AchievementBoard;
  window.Bankiersgruen.AuthForm = AuthForm;
  window.Bankiersgruen.buildMarketFilter = buildMarketFilter;
  window.Bankiersgruen.MARKET_TYPES = MARKET_TYPES;
  window.Bankiersgruen.ACHIEVEMENT_TITLES = ACHIEVEMENT_TITLES;
  window.Bankiersgruen.HIGHSCORE_TYPES = HIGHSCORE_TYPES;
  window.Bankiersgruen.LISTING_TYPES = LISTING_TYPES;
  window.Bankiersgruen.format = { money: money, price: price, dateTime: dateTime, compact: function (n, threshold) { var c = compactParts(n, threshold || 1e6); return c ? (n < 0 ? '−' : '') + fmt(c.value, c.d) + '\u00a0' + c.unit : null; } };
  window.Bankiersgruen.NewsFeed = NewsFeed;
  window.Bankiersgruen.NewsItem = NewsItem;
  window.Bankiersgruen.Countdown = Countdown;
})();
