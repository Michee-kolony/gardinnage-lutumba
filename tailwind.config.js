/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
     "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#d4a94a',
          dark: '#b3872f',
        },
        // Palette du site public : blanc, noir et le jaune doré du logo.
        brand: {
          DEFAULT: '#d4a94a',
          dark: '#b3872f',
          soft: '#f8edd3',
        },
        ink: {
          DEFAULT: '#0a0a0a',
          soft: '#171717',
        },
        cream: '#f7f6f1',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
