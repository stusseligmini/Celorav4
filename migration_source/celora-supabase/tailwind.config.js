/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'celora-teal': '#14b8a6',
        'celora-teal-light': '#2dd4bf',
        'celora-dark': '#0f1419',
      },
    },
  },
  plugins: [],
}