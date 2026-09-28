import { useMemo } from 'react';
import { DS } from '../ds';
import { useDailyHistory, useListingProfile } from '../api/queries';
import { change24h, recentPrices } from '../security/derive';
import { useNow } from '../lib/useNow';

const DAY = 86_400_000;
const isBond = (type?: string) => !!type && /BOND|REPO/.test(type);

/** `!ASIN` in a chat message: the security as a small card – price, change, 30 days of prices, three facts. */
export function AssetEmbed({ asin }: { asin: string }) {
  const profile = useListingProfile(asin);
  const history = useDailyHistory(asin);
  const now = useNow();
  const p = profile.data;

  const spark = useMemo(
    () => recentPrices(history.data, p?.prices14d, 30 * DAY, now).map((x) => x.value),
    [history.data, p?.prices14d, now],
  );

  if (profile.isError) return <DS.AssetCard asin={asin} error="Wertpapier nicht gefunden" />;
  if (!p) return <DS.AssetCard asin={asin} loading />;

  const type = p.type;
  const spread = p.currentSpread;
  const px = (v?: number) => (v != null ? DS.format.price(v, type) : '–');
  const third =
    isBond(type) && p.bond?.interestRate != null
      ? { label: 'Zins', value: `${p.bond.interestRate.toLocaleString('de-DE', { maximumFractionDigits: 4 })} %` }
      : type === 'STOCK' && p.marketCap
        ? { label: 'Börsenwert', value: DS.format.money(p.marketCap, '€', 2, true) }
        : spread?.spreadPercent != null
          ? { label: 'Spread', value: `${spread.spreadPercent.toLocaleString('de-DE', { maximumFractionDigits: 2 })} %` }
          : null;

  return (
    <DS.AssetCard
      asin={asin}
      name={p.name}
      listingType={type}
      price={p.lastPrice?.value ?? spread?.lastPrice?.value}
      change={change24h(p.prices14d, now)?.pct}
      changeSuffix="24 h"
      spark={spark}
      period="30 T"
      facts={[{ label: 'Geld', value: px(spread?.bidPrice) }, { label: 'Brief', value: px(spread?.askPrice) }, ...(third ? [third] : [])]}
      href={`/wertpapier/${asin}`}
    />
  );
}
