/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          charcoal: '#202020',
          ivory: '#F7F5F0',
          taupe: '#A58D79',
          sand: '#D9CBBE',
          gray: '#F1F1EF',
          border: '#E8E5E0',
        },
        success: '#4B7A5A',
        warning: '#B8892E',
        error: '#C45C5C',
        ink: {
          primary: '#202020',
          secondary: '#777777',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Manrope', 'Inter', 'sans-serif'],
      },
      spacing: {
        'section': '3.5rem',
        'card': '1rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(32,32,32,0.06)',
        card: '0 1px 3px rgba(32,32,32,0.08), 0 4px 12px rgba(32,32,32,0.04)',
        sheet: '0 -4px 24px rgba(32,32,32,0.12)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        toast: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        heart: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.35)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        toast: 'toast 200ms ease-out',
        heart: 'heart 300ms ease-out',
      },
    },
  },
  plugins: [],
}
