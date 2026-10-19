/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#C8A96E',
        'primary-dark': '#B89660',
        'eugene-bg': '#0F0E0C',
        'eugene-surface': '#1A1714',
        'eugene-surface2': '#242018',
        'eugene-cream': '#F0E8D8',
        'eugene-muted': '#A89A82',
        'eugene-border': '#3A3228',
        light: '#F6F6F6',
        medium: '#EEEEEE',
        dark: '#1A1A1A',
        black: '#000000',
        muted: '#6B6B6B',
      },
    },
  },
  plugins: [],
}
