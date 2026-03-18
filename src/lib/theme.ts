export type ThemeName = 'default' | 'black-red';

const THEME_KEY = 'ui_theme';

function applyThemeClass(theme: ThemeName) {
  try {
    const root = document.documentElement;
    // Remove known theme classes
    root.classList.remove('theme-black-red');
    if (theme === 'black-red') root.classList.add('theme-black-red');
  } catch (e) {
    // ignore
  }
}

export async function setTheme(theme: ThemeName): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise<void>((resolve) => chrome.storage.local.set({ [THEME_KEY]: theme }, () => resolve()));
    } else {
      localStorage.setItem(THEME_KEY, theme);
    }
    if (typeof document !== 'undefined') applyThemeClass(theme);
  } catch (e) {
    // ignore
  }
}

export async function getStoredTheme(): Promise<ThemeName | null> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await new Promise<any>((resolve) => chrome.storage.local.get([THEME_KEY], resolve));
      const t = res?.[THEME_KEY];
      return (t as ThemeName) || null;
    }
    const t = localStorage.getItem(THEME_KEY);
    return (t as ThemeName) || null;
  } catch (e) {
    return null;
  }
}

export async function initTheme(): Promise<void> {
  try {
    const t = await getStoredTheme();
    if (t && typeof document !== 'undefined') applyThemeClass(t);
  } catch (e) { /* ignore */ }
}

export default {
  setTheme,
  getStoredTheme,
  initTheme,
};
