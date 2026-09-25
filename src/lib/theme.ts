// Colour-blind theme (data-theme="cb" on <html>), remembered per browser.
const KEY = 'at.theme';

export type Theme = 'standard' | 'cb';

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'cb' ? 'cb' : 'standard';
  } catch {
    return 'standard';
  }
}

export function applyTheme(theme: Theme = getTheme()) {
  if (theme === 'cb') document.documentElement.dataset.theme = 'cb';
  else delete document.documentElement.dataset.theme;
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: applies for this page load only */
  }
  applyTheme(theme);
}
