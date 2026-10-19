/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        primary: '#06C167',
        'primary-dark': '#05A559',
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
