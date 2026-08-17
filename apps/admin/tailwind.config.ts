import type { Config } from 'tailwindcss';

// Admin design tokens: same brand palette, Linear-style restraint (ux.md §2).
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: { DEFAULT: '#2C3E66', deep: '#22314F' },
        rose: { DEFAULT: '#C97B84', soft: '#E8C4C8' },
        cream: '#FAF7F5',
        charcoal: '#2B2B2B',
        sand: { DEFAULT: '#D9A679', pale: '#F0DFC8' },
        sage: '#8FA98F', // delivered/positive states (§3.8)
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
