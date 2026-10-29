import type { Config } from 'tailwindcss';

/**
 * Voyago design tokens. The palette pairs a deep ocean teal with a sunset
 * coral accent on a warm sand background - original to this project.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0A2540',
          soft: '#334E68',
          // 5.1:1 on white, 4.9:1 on the warm page background (WCAG AA needs 4.5).
          muted: '#56708C',
          faint: '#9FB3C8',
        },
        brand: {
          50: '#EFFAF9',
          100: '#D4F1EF',
          200: '#A9E3DF',
          300: '#6FCCC6',
          400: '#35ADA8',
          500: '#14918A',
          600: '#0F766E',
          700: '#0D5F5A',
          800: '#0D4B48',
          900: '#0C3F3D',
        },
        coral: {
          50: '#FFF3F0',
          100: '#FFE1DA',
          200: '#FFC3B6',
          300: '#FF9B86',
          400: '#FF7C62',
          500: '#FF6B5A',
          600: '#ED4B34',
          700: '#C73823',
          800: '#A42F1F',
          900: '#872A1D',
        },
        sand: {
          50: '#FFFDFB',
          100: '#FFF8F0',
          200: '#F7EFE4',
          300: '#EBE0D2',
        },
        amber: { 400: '#F5A524', 500: '#E08C0B' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: {
        card: '0 1px 2px rgba(10,37,64,0.04), 0 8px 24px -12px rgba(10,37,64,0.18)',
        lift: '0 4px 8px rgba(10,37,64,0.06), 0 16px 40px -16px rgba(10,37,64,0.28)',
        focus: '0 0 0 3px rgba(15,118,110,0.28)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
