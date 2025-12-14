/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Default app sans
        sans: ["SpaceGrotesk-Regular", "system-ui", "-apple-system", "sans-serif"],
        // Optional explicit families you can use via className: font-groteskLight, etc.
        grotesk: ["SpaceGrotesk-Regular"],
        groteskLight: ["SpaceGrotesk-Light"],
        groteskMedium: ["SpaceGrotesk-Medium"],
        groteskSemiBold: ["SpaceGrotesk-SemiBold"],
        groteskBold: ["SpaceGrotesk-Bold"],

        geist: ["Geist-Regular"],
        geistBlack: ["Geist-Black"],
        geistBold: ["Geist-Bold"],
        geistExtraBold: ["Geist-ExtraBold"],
        geistExtraLight: ["Geist-ExtraLight"],
        geistLight: ["Geist-Light"],
        geistMedium: ["Geist-Medium"],
        geistSemiBold: ["Geist-SemiBold"],
        geistThin: ["Geist-Thin"],
      },
    },
  },
  plugins: [],
};
