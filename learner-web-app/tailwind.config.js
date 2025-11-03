/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'coursera-blue': '#0056D2',
        'coursera-light-blue': '#E3F2FD',
      },
    },
  },
  plugins: [],
}
