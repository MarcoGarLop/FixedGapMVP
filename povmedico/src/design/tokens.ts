export const colors = {
  background: '#F5F1EC',
  surface: '#FFFFFF',
  surfaceElevated: '#FBF8F5',
  surfaceHover: '#F0EBE5',
  border: '#E6DDD4',
  borderActive: '#D4C8BC',

  accent: '#2BA89C',
  accentSoft: 'rgba(43, 168, 156, 0.12)',

  proximal: '#D4695C',
  distal: '#2BA89C',
  pronosup: '#5B8EC4',

  ok: '#4CAF82',
  warning: '#D4943A',
  alert: '#C4524A',

  text: '#2A2218',
  textSecondary: '#5C5043',
  textMuted: '#8C7F73',
} as const;

export const shadows = {
  clay: '0 4px 14px rgba(44, 36, 32, 0.06), 0 1.5px 4px rgba(44, 36, 32, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  clayHover: '0 8px 24px rgba(44, 36, 32, 0.09), 0 2px 6px rgba(44, 36, 32, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
  elevated: '0 12px 40px rgba(44, 36, 32, 0.1), 0 3px 10px rgba(44, 36, 32, 0.06), inset 0 1.5px 0 rgba(255, 255, 255, 0.85)',
  inset: 'inset 0 2px 6px rgba(44, 36, 32, 0.06), inset 0 0 0 1px rgba(44, 36, 32, 0.03)',
} as const;

export const radii = {
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const;

export const chartTheme = {
  grid: '#E6DDD4',
  axisText: '#8C7F73',
  labelText: '#5C5043',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E6DDD4',
} as const;
