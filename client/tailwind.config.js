/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Stadium night: deep ink under floodlights.
        ink: {
          950: "#07080a",
          900: "#0b0d10",
          850: "#101318",
          800: "#151a21",
          700: "#1f2630",
          600: "#2c3542",
          500: "#47536a",
          300: "#9aa7ba",
          100: "#e8edf4",
        },
        // Floodlight gold.
        flood: {
          300: "#ffe08a",
          400: "#ffce54",
          500: "#f5b921",
          600: "#d99a08",
        },
        // Pitch green.
        pitch: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
