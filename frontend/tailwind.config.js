import animate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';

// Wraps a CSS variable so slash-opacity utilities (e.g. bg-accent/50) work
// even though our variables hold full oklch() colors, not raw channels.
const mix = (name) =>
  `color-mix(in oklch, var(${name}), transparent calc(100% * (1 - <alpha-value>)))`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
      },
      colors: {
        background: mix('--background'),
        foreground: mix('--foreground'),
        card: {
          DEFAULT: mix('--card'),
          foreground: mix('--card-foreground'),
        },
        popover: {
          DEFAULT: mix('--popover'),
          foreground: mix('--popover-foreground'),
        },
        primary: {
          DEFAULT: mix('--primary'),
          foreground: mix('--primary-foreground'),
        },
        secondary: {
          DEFAULT: mix('--secondary'),
          foreground: mix('--secondary-foreground'),
        },
        muted: {
          DEFAULT: mix('--muted'),
          foreground: mix('--muted-foreground'),
        },
        accent: {
          DEFAULT: mix('--accent'),
          foreground: mix('--accent-foreground'),
        },
        destructive: {
          DEFAULT: mix('--destructive'),
          foreground: mix('--destructive-foreground'),
        },
        border: mix('--border'),
        input: mix('--input'),
        ring: mix('--ring'),
        chart: {
          1: mix('--chart-1'),
          2: mix('--chart-2'),
          3: mix('--chart-3'),
          4: mix('--chart-4'),
          5: mix('--chart-5'),
        },
        sidebar: {
          DEFAULT: mix('--sidebar'),
          foreground: mix('--sidebar-foreground'),
          primary: mix('--sidebar-primary'),
          'primary-foreground': mix('--sidebar-primary-foreground'),
          accent: mix('--sidebar-accent'),
          'accent-foreground': mix('--sidebar-accent-foreground'),
          border: mix('--sidebar-border'),
          ring: mix('--sidebar-ring'),
        },
      },
    },
  },
  plugins: [animate, typography],
};
