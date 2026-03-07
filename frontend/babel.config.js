module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // REMOVE 'react-native-worklets/plugin' from here
      'react-native-reanimated/plugin', // Keep this at the VERY END of the list
    ],
  };
};