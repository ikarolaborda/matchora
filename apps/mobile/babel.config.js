module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    // expo-router/babel is bundled into babel-preset-expo for SDK 50+; no
    // separate router plugin entry is required.
    plugins: [],
  };
};
