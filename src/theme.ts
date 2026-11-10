// System fonts and native shapes keep the interface fully available offline.
export const theme = {
  colors: {
    bg: '#0B0F0D',
    card: '#151A17',
    raised: '#1D2420',
    border: '#303A34',
    green: '#6AD6A2',
    primary: '#36C783',
    muted: '#A8B4AC',
    white: '#F2F4F3',
    gold: '#E4C66A',
    danger: '#FFB4AB',
    glow: '#172C22',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 40 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  type: { caption: 12, small: 14, body: 16, heading: 18, title: 24, display: 32, score: 64 },
  elevation: { flat: 0, floating: 4 },
  icon: { small: 18, medium: 24, large: 32 },
  touch: 48,
  motion: { press: 100, reveal: 180 },
} as const;
