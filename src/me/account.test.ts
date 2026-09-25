import {
  deletionConfirmed,
  fieldProblem,
  licenseDays,
  localeOption,
  minutesText,
  newsletterChange,
  newsletterOn,
  noteRequest,
  noteTarget,
  onlineStats,
  premiumDaysLeft,
  referralsByMonth,
  referrerOf,
  subscriptionIdOf,
  userChange,
} from './account';

describe('userChange', () => {
  it('sends exactly one field', () => {
    expect(userChange('username', '  Neuer_Name ', undefined, 'Alt')).toEqual({ username: 'Neuer_Name' });
    expect(userChange('emailaddress', 'a@b.de')).toEqual({ emailaddress: 'a@b.de' });
    expect(userChange('password', 'geheim123', 'geheim123')).toEqual({ password: 'geheim123' });
  });
  it('sends nothing for invalid input', () => {
    expect(userChange('username', 'Alt', undefined, 'Alt')).toBeUndefined();
    expect(userChange('password', 'geheim123', 'geheim124')).toBeUndefined();
    expect(userChange('emailaddress', 'kein-at')).toBeUndefined();
  });
});

describe('fieldProblem', () => {
  it('explains what is wrong', () => {
    expect(fieldProblem('username', '')).toBe('Bitte ausfüllen.');
    expect(fieldProblem('username', 'ab')).toBe('Mindestens 3 Zeichen.');
    expect(fieldProblem('username', 'mit leer')).toBe('Ohne Leerzeichen.');
    expect(fieldProblem('emailaddress', 'A@B.de', undefined, 'a@b.de')).toBe('Das ist schon deine Adresse.');
    expect(fieldProblem('password', 'kurz')).toBe('Mindestens 8 Zeichen.');
    expect(fieldProblem('password', 'langgenug', 'anders')).toBe('Die Wiederholung stimmt nicht überein.');
    expect(fieldProblem('password', 'langgenug', 'langgenug')).toBeNull();
  });
});

describe('newsletter', () => {
  it('counts pending opt-in as on and switches with one field', () => {
    expect(newsletterOn('NOT_CONFIRMED_SUBSCRIBED')).toBe(true);
    expect(newsletterOn('UNSUBSCRIBED')).toBe(false);
    expect(newsletterChange(true)).toEqual({ emailSubscriptionType: 'SUBSCRIBED' });
    expect(newsletterChange(false)).toEqual({ emailSubscriptionType: 'UNSUBSCRIBED' });
  });
});

describe('localeOption', () => {
  it('maps stored tags to the offered languages', () => {
    expect(localeOption('de-DE')).toBe('de-DE');
    expect(localeOption('de_AT')).toBe('de-DE');
    expect(localeOption('en')).toBe('en-US');
    expect(localeOption('fr-FR')).toBeUndefined();
    expect(localeOption(null)).toBeUndefined();
  });
});

describe('noteRequest', () => {
  it('creates, edits and deletes like the original game', () => {
    expect(noteRequest(undefined, 'STSN3G03LB', ' Kaufen unter 2 € ')).toEqual({
      method: 'POST',
      query: { type: 'NOTE', identifier: 'STSN3G03LB', content: 'Kaufen unter 2 €' },
    });
    expect(noteRequest('p1', 'STSN3G03LB', 'neu')).toEqual({
      method: 'PUT',
      id: 'p1',
      query: { type: 'NOTE', identifier: 'STSN3G03LB', content: 'neu' },
    });
    expect(noteRequest('p1', 'STSN3G03LB', '   ')).toEqual({ method: 'DELETE', id: 'p1' });
  });
  it('does nothing without identifier or without text for a new note', () => {
    expect(noteRequest(undefined, '', 'x')).toBeUndefined();
    expect(noteRequest(undefined, 'Anna', '')).toBeUndefined();
  });
});

describe('noteTarget', () => {
  it('links ASINs and player names', () => {
    expect(noteTarget('STSN3G03LB')).toEqual({ label: 'STSN3G03LB', href: '/wertpapier/STSN3G03LB' });
    expect(noteTarget('Anna B')).toEqual({ label: 'Anna B', href: '/spieler/Anna%20B' });
    expect(noteTarget('4e7a81a2-92db-4655-a23b-0413bd316a15').href).toBeUndefined();
    expect(noteTarget(undefined)).toEqual({ label: '–' });
  });
});

describe('referral', () => {
  it('reads „no referrer“ from the empty message', () => {
    expect(referrerOf({ code: 200, message: null })).toBeNull();
    expect(referrerOf(null)).toBeNull();
    expect(referrerOf({ username: 'Anna', refId: 'x' })).toEqual({ username: 'Anna', refId: 'x' });
  });
  it('counts referred players per month', () => {
    const d = (s: string) => new Date(s).getTime();
    expect(referralsByMonth([{ registrationDate: d('2026-02-03') }, { registrationDate: d('2026-01-20') }, { registrationDate: d('2026-02-28') }, {}])).toEqual([
      { month: '2026-01', count: 1 },
      { month: '2026-02', count: 2 },
    ]);
  });
});

describe('online time and gold', () => {
  const DAY = 86_400_000;
  it('averages the online time per day since registration', () => {
    expect(onlineStats(600, 0, 10 * DAY)).toEqual({ hours: 10, perDay: 60, days: 10 });
    expect(onlineStats(undefined, 0, DAY)).toBeUndefined();
    expect(onlineStats(30, undefined, DAY)?.perDay).toBeUndefined();
  });
  it('writes minutes as hours and minutes', () => {
    expect(minutesText(12.4)).toBe('12 Min.');
    expect(minutesText(65)).toBe('1 Std. 5 Min.');
    expect(minutesText(8051 - 11)).toBe('134 Std.');
    expect(minutesText(120_000)).toBe('2.000 Std.');
  });
  it('counts whole days of gold left', () => {
    expect(premiumDaysLeft(null, 0)).toBe(0);
    expect(premiumDaysLeft(DAY / 2, 0)).toBe(1);
    expect(premiumDaysLeft(3 * DAY, 0)).toBe(3);
    expect(premiumDaysLeft(DAY, 2 * DAY)).toBe(0);
  });
  it('reads voucher days and the subscription id', () => {
    expect(licenseDays({ days: 30 })).toBe(30);
    expect(licenseDays({})).toBeUndefined();
    expect(subscriptionIdOf({ subscriptionId: 'sub_1' })).toBe('sub_1');
    expect(subscriptionIdOf({ subscription: { id: 'sub_2' } })).toBe('sub_2');
    expect(subscriptionIdOf({ status: 'none' })).toBeUndefined();
  });
});

describe('deletionConfirmed', () => {
  it('needs the exact name', () => {
    expect(deletionConfirmed('Anna', 'Anna')).toBe(true);
    expect(deletionConfirmed('anna', 'Anna')).toBe(false);
    expect(deletionConfirmed('Anna ', 'Anna')).toBe(false);
    expect(deletionConfirmed('', undefined)).toBe(false);
  });
});
