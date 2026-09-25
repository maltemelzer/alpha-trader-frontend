import { bankAccounts, paybackHours } from './derive';

describe('paybackHours', () => {
  const m = { coinsPerHour: 1, nextLevelCoinsPerHour: 1.5, nextLevelCosts: 10_000, maximumCapacity: 20, storage: 5, transferableCoins: 5 };
  it('divides the costs by the extra value per hour', () => {
    expect(paybackHours(m, 20_000)).toBe(1);
    expect(paybackHours(m, 100)).toBe(200);
  });
  it('is undefined without a price or gain', () => {
    expect(paybackHours(m, undefined)).toBeUndefined();
    expect(paybackHours({ ...m, nextLevelCoinsPerHour: 1 }, 100)).toBeUndefined();
  });
});

describe('bankAccounts', () => {
  it('lists the private account first, companies by name', () => {
    expect(
      bankAccounts(
        [{ id: 'p', cash: 5 }],
        [
          { name: 'Zeta', bankAccount: { id: 'z', cash: 1 } },
          { name: 'Alpha', bankAccount: { id: 'a', cash: 2 } },
          { name: 'Ohne Konto' },
        ],
      ).map((a) => a.name),
    ).toEqual(['Privatkonto', 'Alpha', 'Zeta']);
  });
});
