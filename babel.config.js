// Expo's preset exactly as Expo uses it without a config file (it adds the Reanimated worklets plugin
// itself). Jest (jest-expo) compiles through this preset too.
//
// Expo 58's experimental native transform worker (app.json → experiments.noxcturnalTransformWorker)
// is deliberately OFF: it miscompiles `new` on an inline-required class (`new require("./X").X()`),
// dropping those modules from the bundle (expo-router's LoaderClient, React Native's
// AssetSourceResolver). Re-test before enabling it again.
module.exports = function babelConfig(api) {
  api.cache(true);
  return { presets: ["babel-preset-expo"] };
};
