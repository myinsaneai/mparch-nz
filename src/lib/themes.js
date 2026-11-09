// Each theme sets colours/fonts via CSS variables (see styles.css, [data-theme=...])
// and picks one of three list layouts: 'rows', 'grid' or 'index'.
export const THEMES = {
  original: {
    label: 'Original',
    layout: 'rows',
    blurb: 'Light, minimal. Alternating image and title panels.',
    fonts: ['Barlow:wght@400;500;600;700;800'],
    swatch: ['#ffffff', '#f1f1f1', '#111111'],
  },
  editorial: {
    label: 'Editorial Index',
    layout: 'index',
    blurb: 'Large serif headings and a numbered index with thumbnails.',
    fonts: ['Barlow:wght@400;500;600;700;800'],
    swatch: ['#ffffff', '#111111', '#555555'],
  },
  dark: {
    label: 'Dark Gallery',
    layout: 'grid',
    blurb: 'Near-black page with an amber accent and large image cards.',
    fonts: ['Barlow:wght@400;500;600;700;800'],
    swatch: ['#0f0f10', '#2a2724', '#e8b04a'],
  },
  swiss: {
    label: 'Swiss Grid',
    layout: 'grid',
    blurb: 'Heavy uppercase type, hard rules and a red accent.',
    fonts: ['Barlow:wght@400;500;600;700;800'],
    swatch: ['#ffffff', '#111111', '#d62d0f'],
  },
  soft: {
    label: 'Soft Studio',
    layout: 'grid',
    blurb: 'Sage and forest green with rounded cards.',
    fonts: ['Barlow:wght@400;500;600;700;800'],
    swatch: ['#e9eee4', '#f8faf4', '#1f3a2e'],
  },
  blueprint: {
    label: 'Blueprint',
    layout: 'grid',
    blurb: 'Deep blue with thin lines and a monospaced drawing-sheet feel.',
    fonts: ['Barlow:wght@400;500;600;700;800'],
    swatch: ['#0b2545', '#12335f', '#ffd166'],
  },
};

export const DEFAULT_THEME = 'original';

export function themeOf(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME];
}

export function fontsHref(id) {
  const families = themeOf(id).fonts.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
