// Expo's preset exactly as Expo uses it without a config file (it adds the Reanimated worklets plugin
// itself). Jest (jest-expo) compiles through this preset too.
//
// Expo 58's experimental native transform worker (app.json → experiments.noxcturnalTransformWorker)
// is deliberately OFF: it miscompiles `new` on an inline-required class (`new require("./X").X()`),
// dropping those modules from the bundle (expo-router's LoaderClient, React Native's
// AssetSourceResolver). Re-test before enabling it again.
//
// Under Jest only, `import()` is rewritten to a `require`: Metro bundles `import()` itself, but Jest
// runs CommonJS (the demo-account list is loaded that way, contexts/identity/auth/demo-accounts.ts).
// The cache is keyed on NODE_ENV so the `test` block is never reused for Metro, or the other way round.
module.exports = function babelConfig(api) {
  api.cache.using(() => process.env.NODE_ENV);
  return {
    presets: ["babel-preset-expo"],
    env: {
      test: {
        plugins: ["@babel/plugin-transform-dynamic-import"],
      },
    },
  };
};
