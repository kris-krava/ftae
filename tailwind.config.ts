import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    screens: {
      tab: '768px',
      desk: '1280px',
    },
    extend: {
      colors: {
        canvas: '#f2d2c8',
        ink: '#333333',
        muted: '#6d6360',
        accent: '#c45c3a',
        divider: '#d0b2aa',
        field: '#c4a69d',
        placeholder: '#a8928c',
        surface: '#ffffff',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', '"Playfair Display"', 'serif'],
        script: ['var(--font-rock-salt)', '"Rock Salt"', 'cursive'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [forms],
};

export default config;
