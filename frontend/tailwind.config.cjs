/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          50: '#f8fafc',
          100: '#f3f6fb',
          900: '#050b18',
        },
        primary: {
          DEFAULT: '#2563eb',
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
          DEFAULT: '#10b981',
          500: '#10b981',
          600: '#059669',
        },
        accent: {
          DEFAULT: '#fbbf24',
          400: '#facc15',
          500: '#fbbf24',
          600: '#f59e0b',
        },
        neutral: {
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
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
        heading: ['Poppins', 'Inter', 'ui-sans-serif'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
        30: '7.5rem',
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.75rem',
        '3xl': '2.5rem',
      },
      boxShadow: {
        card: '0 20px 45px -15px rgba(15,23,42,0.18)',
        glow: '0 15px 35px rgba(56,189,248,0.25)',
        glass: '0 18px 40px -12px rgba(15,23,42,0.25)',
      },
      dropShadow: {
        soft: '0 12px 20px rgba(15,23,42,0.15)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #1d4ed8 100%)',
        'gradient-secondary': 'linear-gradient(135deg, rgba(15,118,110,0.95) 0%, rgba(37,99,235,0.85) 100%)',
        'gradient-glass': 'linear-gradient(115deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 100%)',
        'gradient-dark': 'linear-gradient(140deg, rgba(15,23,42,1) 0%, rgba(15,23,42,0.85) 50%, rgba(2,6,23,0.9) 100%)',
      },
      animation: {
        float: 'float 12s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 0.7 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
