import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(220 18% 88%)',
        input: 'hsl(220 18% 88%)',
        ring: 'hsl(245 72% 58%)',
        background: 'hsl(220 27% 98%)',
        foreground: 'hsl(224 28% 10%)',
        primary: {
          DEFAULT: 'hsl(245 72% 58%)',
          foreground: 'hsl(0 0% 100%)'
        },
        secondary: {
          DEFAULT: 'hsl(222 26% 94%)',
          foreground: 'hsl(224 28% 12%)'
        },
        muted: {
          DEFAULT: 'hsl(220 24% 95%)',
          foreground: 'hsl(220 10% 42%)'
        },
        accent: {
          DEFAULT: 'hsl(245 72% 96%)',
          foreground: 'hsl(245 70% 32%)'
        },
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(224 28% 10%)'
        }
      },
      borderRadius: {
        lg: '8px',
        md: '7px',
        sm: '6px'
      }
    }
  },
  plugins: [animate]
};
