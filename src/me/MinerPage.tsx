import { useState } from 'react';
import { DS } from '../ds';
import { useMiner, useMinerActions, usePortfolio, usePriceSpread } from '../api/queries';
import { paybackHours } from './derive';
import './MePage.css';

const COIN = 'ACALPHCOIN';

/** AlphaCoin miner: output, storage, transfer to the portfolio and upgrade (after a confirmation). */
export function MinerPage() {
  const miner = useMiner();
  const spread = usePriceSpread(COIN);
  const portfolio = usePortfolio();
  const { transfer, upgrade } = useMinerActions();
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const coinPrice = spread.data?.bidPrice ?? spread.data?.lastPrice?.value;
  const m = miner.data;
  const error = transfer.error ?? upgrade.error;

  return (
    <div className="page">
      <DS.PageHeader
        size="md"
        title="Miner"
        meta={coinPrice ? <span>AlphaCoin {DS.format.money(coinPrice, '€')}</span> : undefined}
        description="Der Miner schürft AlphaCoins in seinen Speicher. Übertragene Coins landen im Privatportfolio und sind dort handelbar."
      />
      <div className="page__body me__narrow">
        <DS.Card title="Mein Miner">
          {m ? (
            <DS.MinerCard
              miner={m}
              coinPrice={coinPrice}
              cash={portfolio.data?.cash}
              paybackHours={paybackHours(m, coinPrice)}
              onTransfer={() =>
                transfer.mutate(undefined, { onSuccess: () => setDone(`${m.transferableCoins} AlphaCoins übertragen.`) })
              }
              onUpgrade={() => setConfirm(true)}
            />
          ) : (
            <DS.Loading rows={4} />
          )}
        </DS.Card>
        {error && <DS.Banner variant="error">Aktion fehlgeschlagen: {error.message}</DS.Banner>}
        {done && (
          <DS.ToastRegion>
            <DS.Toast title="Miner" duration={4000} onClose={() => setDone(null)}>
              {done}
            </DS.Toast>
          </DS.ToastRegion>
        )}
      </div>
      <DS.Dialog
        open={confirm}
        size="sm"
        onClose={() => !upgrade.isPending && setConfirm(false)}
        title="Miner ausbauen?"
        description={
          m &&
          `Kosten ${DS.format.money(m.nextLevelCosts ?? 0, '€', 2, 'auto')} vom Privatkonto. Danach ${m.nextLevelCoinsPerHour?.toLocaleString('de-DE')} AC je Stunde statt ${m.coinsPerHour.toLocaleString('de-DE')}.`
        }
        actions={
          <>
            <DS.Button variant="secondary" onClick={() => setConfirm(false)} disabled={upgrade.isPending}>
              Abbrechen
            </DS.Button>
            <DS.Button
              variant="primary"
              loading={upgrade.isPending}
              onClick={() =>
                upgrade.mutate(undefined, {
                  onSuccess: () => {
                    setConfirm(false);
                    setDone('Miner ausgebaut.');
                  },
                })
              }
            >
              Ausbauen
            </DS.Button>
          </>
        }
      />
    </div>
  );
}
