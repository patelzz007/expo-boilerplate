// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const { withUniwindConfig } = require("uniwind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Modules are evaluated when first used, so cold start only runs what the first screen needs.
config.transformer.getTransformOptions = async () => ({
  transform: { experimentalImportSupport: false, inlineRequires: true },
});

// withUniwindConfig must stay the outermost wrapper
module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
  // The themes beyond light and dark: src/styles/tokens.css declares an `@variant` for each.
  extraThemes: ["nord"],
});
