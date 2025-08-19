import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    },
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          500: '#10b981',
          600: '#059669',
        },
        muted: {
          100: '#f1f5f9',
          200: '#e2e8f0',
          700: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 2px 10px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config
