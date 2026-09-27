/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sigapei: {
          green: '#006B3C',
          'green-dark': '#004D2B',
          'green-light': '#00874C',
          'green-soft': '#EAF5EF',
          gold: '#E9AA20',
          'gold-hover': '#D49514',
          'gold-light': '#FEF7E8',
          'gold-border': '#F5D388',
          cream: '#FFF6DD',
          black: '#000000',
          dark: '#0F172A',
          canvas: '#F8FAFC',
          sidebar: '#004D2B',
          'sidebar-deep': '#003320',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 107, 60, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 12px 30px -4px rgba(0, 107, 60, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'modal': '0 25px 60px -15px rgba(0, 77, 43, 0.35)',
        'glow-gold': '0 0 25px rgba(233, 170, 32, 0.45)',
      }
    },
  },
  plugins: [],
}
