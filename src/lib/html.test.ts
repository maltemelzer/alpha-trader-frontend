import { htmlToText, textToHtml } from './html';

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
