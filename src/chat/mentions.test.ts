import { describe, expect, it } from 'vitest';
import { activeTrigger, applyMention, mentionedAsins } from './mentions';

describe('mentionedAsins', () => {
  it('finds #, ! and old $ mentions once each', () => {
    expect(mentionedAsins('Schaut euch #ACALPHCOIN an, !STSN3G03LB und $ACALPHCOIN')).toEqual(['ACALPHCOIN', 'STSN3G03LB']);
  });
  it('ignores hashtags, short tokens and exclamation marks after words', () => {
    expect(mentionedAsins('#1 #Top #TOP Super!STSN3G03LB #ACALPHCOINS a#ACALPHCOIN')).toEqual([]);
  });
  it('handles empty input', () => {
    expect(mentionedAsins(undefined)).toEqual([]);
  });
});

describe('activeTrigger', () => {
  it('opens after # at the start and after a space', () => {
    expect(activeTrigger('#', 1)).toEqual({ mode: 'link', start: 0, query: '' });
    expect(activeTrigger('Kauft !alph', 11)).toEqual({ mode: 'embed', start: 6, query: 'alph' });
  });
  it('stays closed after a word, after a space in the query and away from the caret', () => {
    expect(activeTrigger('Super!', 6)).toBeNull();
    expect(activeTrigger('#alpha kasse', 12)).toBeNull();
    expect(activeTrigger('#alpha und', 10)).toBeNull();
  });
  it('uses the caret, not the end of the text', () => {
    expect(activeTrigger('Hallo #alp und mehr', 10)).toEqual({ mode: 'link', start: 6, query: 'alp' });
  });
});

describe('applyMention', () => {
  it('replaces the typed query with the ASIN and a space', () => {
    const t = activeTrigger('Kauft #alph', 11)!;
    expect(applyMention('Kauft #alph', t, 11, 'ACALPHCOIN')).toEqual({ value: 'Kauft #ACALPHCOIN ', caret: 18 });
  });
  it('keeps the rest of the text and does not double the space', () => {
    const t = activeTrigger('!st jetzt', 3)!;
    expect(applyMention('!st jetzt', t, 3, 'STSN3G03LB')).toEqual({ value: '!STSN3G03LB jetzt', caret: 12 });
  });
});
