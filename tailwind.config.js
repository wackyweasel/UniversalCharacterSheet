/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'paper': '#ffffff',
        'ink': '#000000',
      },
      fontFamily: {
        'mono': ['"Courier New"', 'Courier', 'monospace'],
      },
      boxShadow: {
        'hard': '4px 4px 0 0 #000000',
      }
    },
  },
  plugins: [],
}
