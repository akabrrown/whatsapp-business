import type { Config } from 'tailwindcss';

// ROSE & DENIM design tokens: figma.ui/ux.md §0.
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: { DEFAULT: '#2C3E66', deep: '#22314F' },
        rose: { DEFAULT: '#A84B58', soft: '#E8C4C8', light: '#C97B84' },
        cream: '#FAF7F5',
        charcoal: '#2B2B2B',
        sand: { DEFAULT: '#9E6D38', pale: '#F0DFC8', light: '#D9A679' },
        wagreen: { DEFAULT: '#25D366', dark: '#0E7057' }, // WhatsApp green: handoff CTA only (ux.md §3.4)
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
