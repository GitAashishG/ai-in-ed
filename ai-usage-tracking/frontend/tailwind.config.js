/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        usu: {
          blue: '#0f2439',
          navy: '#1a3a52'
        }
      }
    },
  },
  plugins: [],
}
