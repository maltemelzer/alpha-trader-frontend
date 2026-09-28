import { htmlToMarkup, htmlToText, markupToHtml, textToHtml } from './html';

describe('htmlToText', () => {
  it('keeps paragraphs and line breaks, drops tags, decodes entities', () => {
    expect(htmlToText('<p><strong>&raquo; Wer</strong><br />Die <span class="red">O</span>PEC</p><p>Zweiter</p>')).toBe(
      '» Wer\nDie OPEC\n\nZweiter',
    );
  });
  it('never returns markup', () => {
    expect(htmlToText('<img src=x onerror=alert(1)>Hallo<script>x</script>')).toBe('Hallox');
    expect(htmlToText(null)).toBe('');
  });
});

describe('textToHtml', () => {
  it('escapes and keeps paragraphs', () => {
    expect(textToHtml('Hallo <b>\nWelt\n\n2. Absatz & mehr')).toBe('<p>Hallo &lt;b&gt;<br />Welt</p><p>2. Absatz &amp; mehr</p>');
  });
  it('round-trips through htmlToText', () => {
    expect(htmlToText(textToHtml('a\nb\n\nc'))).toBe('a\nb\n\nc');
  });
});

describe('markupToHtml', () => {
  it('writes the HTML TinyMCE stores in the original game', () => {
    expect(markupToHtml('## Neu\n\nHallo **Welt** und *du*\nZeile 2\n\n- a\n- b\n\n1. x\n2. y\n\n> Zitat')).toBe(
      '<h2>Neu</h2>\n<p>Hallo <strong>Welt</strong> und <em>du</em><br />\nZeile 2</p>\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n' +
        '<ol>\n<li>x</li>\n<li>y</li>\n</ol>\n<blockquote>\n<p>Zitat</p>\n</blockquote>',
    );
  });
  it('turns URLs and [Text](URL) into links, escapes everything else', () => {
    expect(markupToHtml('Siehe https://a.de/x?y=1&z=2. Oder [hier](https://b.de) <b>')).toBe(
      '<p>Siehe <a href="https://a.de/x?y=1&amp;z=2">https://a.de/x?y=1&amp;z=2</a>. Oder <a href="https://b.de">hier</a> &lt;b&gt;</p>',
    );
    expect(markupToHtml('[x](javascript:alert(1))')).toBe('<p>[x](javascript:alert(1))</p>');
    expect(markupToHtml('![Logo](https://c.de/l.png)')).toBe('<p><img src="https://c.de/l.png" alt="Logo" /></p>');
  });
  it('splits a heading off the lines around it', () => {
    expect(markupToHtml('## Titel\nText')).toBe('<h2>Titel</h2>\n<p>Text</p>');
  });
});

describe('htmlToMarkup', () => {
  it('reads TinyMCE HTML back into editor markup', () => {
    const html =
      '<h2 style="text-align: justify;">Funds</h2>\n<p style="text-align: justify;">Ein <strong>fetter</strong> Satz,<br>\n <em>kursiv</em>.</p>\n' +
      '<ul><li>eins</li><li>zwei</li></ul><ol><li>a</li></ol><blockquote><p>Zitat</p></blockquote>' +
      '<p><a href="https://alpha-trader.com/security/asin/IDADRLVTQS">Alpha Index</a> <a href="https://x.de">https://x.de</a></p>';
    expect(htmlToMarkup(html)).toBe(
      '## Funds\n\nEin **fetter** Satz,\n*kursiv*.\n\n- eins\n- zwei\n\n1. a\n\n> Zitat\n\n' +
        '[Alpha Index](https://alpha-trader.com/security/asin/IDADRLVTQS) https://x.de',
    );
  });
  it('points game links at this app when asked', () => {
    expect(htmlToMarkup('<p><a href="https://alpha-trader.com/security/asin/STSN3G03LB">A</a></p>', { localLinks: true })).toBe(
      '[A](/wertpapier/STSN3G03LB)',
    );
  });
  it('drops unsafe links and images, keeps their text', () => {
    expect(htmlToMarkup('<p><a href="javascript:x">Klick</a><img src="x" onerror="y"><script>z</script></p>')).toBe('Klick');
  });
  it('repairs posts that were sent JSON-encoded', () => {
    const broken = '" \n<p>Liebe Börsengemeinde,</p>\n<p>**Optionsscheine**<br>\n Beispiel</p>\n"';
    expect(htmlToMarkup(broken)).toBe('Liebe Börsengemeinde,\n\n**Optionsscheine**\nBeispiel');
    expect(htmlToText(broken)).toBe('Liebe Börsengemeinde,\n\n**Optionsscheine**\nBeispiel');
  });
  it('round-trips the editor markup', () => {
    const text = '## Kopf\n\nText mit **fett**, *kursiv* und [Link](https://a.de)\nzweite Zeile\n\n- a\n- b\n\n> Zitat';
    expect(htmlToMarkup(markupToHtml(text))).toBe(text);
  });
});
