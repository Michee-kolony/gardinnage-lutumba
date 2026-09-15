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
      },
    },
  },
  plugins: [],
}

