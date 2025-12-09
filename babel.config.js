module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@modules': './src/modules',
            '@ui': './src/ui',
            '@store': './src/store',
            '@db': './src/db',
            '@utils': './src/utils'
          }
        }
      ]
    ]
  };
};
