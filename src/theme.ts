// System fonts and native shapes keep the interface fully available offline.
export const theme = {
  colors: {
    bg: '#07110F',
    card: '#14231F',
    raised: '#1A2D26',
    border: '#2B4139',
    green: '#69E6AC',
    primary: '#22C55E',
    muted: '#ADC0B7',
    white: '#F8FAFC',
    gold: '#E4C66A',
    danger: '#FFB4AB',
    glow: '#103B29',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 40 },
  radius: { sm: 12, md: 18, lg: 26, pill: 999 },
  type: { caption: 12, small: 14, body: 16, heading: 22, title: 32, display: 44, score: 72 },
  elevation: { flat: 0, floating: 4 },
  icon: { small: 18, medium: 24, large: 32 },
  touch: 48,
  motion: { press: 100, reveal: 180 },
} as const;
