/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bar: {
          dark: "#1a1a2e",
          mid: "#16213e",
          accent: "#e94560",
          gold: "#f5c518",
          green: "#4ecca3",
          light: "#e8e8e8",
        },
      },
    },
  },
  plugins: [],
};
