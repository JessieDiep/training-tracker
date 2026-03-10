export const THEMES = {
  rose: {
    name: 'Rose', emoji: '🌸',
    bg:          '#FFF8FB',
    dark:        '#8B1A4A',
    active:      '#C2185B',
    accent:      '#E91E8C',
    soft:        '#F48FB1',
    border:      '#F9D0DF',
    muted:       '#C077A0',
    mid:         '#F4A7B9',
    surface:     '#FFF0F5',
    text:        '#3A2040',
    subtext:     '#5A3050',
    shellStart:  '#FFE8F0',
    shellMid:    '#F8E8FF',
    shellEnd:    '#E8F4FF',
    phoneShadow: 'rgba(194,24,91,0.18)',
  },
  ocean: {
    name: 'Ocean', emoji: '🌊',
    bg:          '#F0F9FF',
    dark:        '#0C4A6E',
    active:      '#0369A1',
    accent:      '#0EA5E9',
    soft:        '#7DD3FC',
    border:      '#BAE6FD',
    muted:       '#4D8FAA',
    mid:         '#93C5FD',
    surface:     '#E0F2FE',
    text:        '#0C3A5A',
    subtext:     '#1A5278',
    shellStart:  '#DBEAFE',
    shellMid:    '#E0F2FE',
    shellEnd:    '#EFF6FF',
    phoneShadow: 'rgba(3,105,161,0.15)',
  },
  forest: {
    name: 'Forest', emoji: '🌿',
    bg:          '#F0FDF4',
    dark:        '#14532D',
    active:      '#15803D',
    accent:      '#16A34A',
    soft:        '#86EFAC',
    border:      '#BBF7D0',
    muted:       '#4B7A5A',
    mid:         '#A7F3C0',
    surface:     '#DCFCE7',
    text:        '#052E16',
    subtext:     '#14532D',
    shellStart:  '#D1FAE5',
    shellMid:    '#DCFCE7',
    shellEnd:    '#F0FDF4',
    phoneShadow: 'rgba(21,128,61,0.15)',
  },
  midnight: {
    name: 'Midnight', emoji: '🌙',
    bg:          '#FAF5FF',
    dark:        '#3B0764',
    active:      '#7E22CE',
    accent:      '#9333EA',
    soft:        '#D8B4FE',
    border:      '#E9D5FF',
    muted:       '#7C5C9E',
    mid:         '#C4B5FD',
    surface:     '#F3E8FF',
    text:        '#2E1065',
    subtext:     '#3B0764',
    shellStart:  '#F3E8FF',
    shellMid:    '#EDE9FE',
    shellEnd:    '#FAF5FF',
    phoneShadow: 'rgba(126,34,206,0.18)',
  },
}

export const STORAGE_KEY = 'tt-theme'
export const DEFAULT_THEME = 'rose'

export function applyTheme(name) {
  const t = THEMES[name] ?? THEMES.rose
  const r = document.documentElement
  r.style.setProperty('--t-bg',           t.bg)
  r.style.setProperty('--t-dark',         t.dark)
  r.style.setProperty('--t-active',       t.active)
  r.style.setProperty('--t-accent',       t.accent)
  r.style.setProperty('--t-soft',         t.soft)
  r.style.setProperty('--t-border',       t.border)
  r.style.setProperty('--t-muted',        t.muted)
  r.style.setProperty('--t-mid',          t.mid)
  r.style.setProperty('--t-surface',      t.surface)
  r.style.setProperty('--t-text',         t.text)
  r.style.setProperty('--t-subtext',      t.subtext)
  r.style.setProperty('--t-shell-start',  t.shellStart)
  r.style.setProperty('--t-shell-mid',    t.shellMid)
  r.style.setProperty('--t-shell-end',    t.shellEnd)
  r.style.setProperty('--t-phone-shadow', t.phoneShadow)
}

export function loadTheme() {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME
}

export function saveTheme(name) {
  localStorage.setItem(STORAGE_KEY, name)
}
