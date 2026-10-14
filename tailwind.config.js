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
        // Palette du site public : blanc, jaune et noir.
        brand: {
          DEFAULT: '#facc15',
          dark: '#eab308',
          soft: '#fef9c3',
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
