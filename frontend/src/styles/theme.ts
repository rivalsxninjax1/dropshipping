import tokens from '../tokens.json'

const brandColors = {
  primary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#0ea5e9',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  emerald: {
    500: '#10b981',
    600: '#059669',
  },
  accent: {
    400: '#facc15',
    500: '#fbbf24',
    600: '#f59e0b',
  },
  neutrals: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5f5',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
}

const typography = {
  fontFamily: {
    sans: ['Nunito', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
    heading: ['Poppins', 'Inter', 'system-ui'],
  },
  lineHeights: {
    relaxed: 1.65,
    snug: 1.3,
  },
}

export const foundation = {
  colors: brandColors,
  typography,
  spacing: tokens.spacing,
  radii: tokens.radius,
  shadows: tokens.shadows,
  gradients: {
    primary: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #1d4ed8 100%)',
    night: 'linear-gradient(140deg, rgba(15,23,42,1) 0%, rgba(15,23,42,0.85) 50%, rgba(2,6,23,0.9) 100%)',
  },
  container: {
    maxWidth: '1200px',
    gutter: '1.5rem',
  },
}

export type ThemeFoundation = typeof foundation
