/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["SpaceGrotesk-Regular", "system-ui", "-apple-system", "sans-serif"],
        bold: ["SpaceGrotesk-Bold", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
