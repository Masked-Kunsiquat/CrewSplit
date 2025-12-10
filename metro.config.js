// Metro configuration for Expo
// Ensures .sql migration files are bundled and inlined as strings for Drizzle migrations
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

module.exports = {
  ...defaultConfig,
  transformer: {
    ...defaultConfig.transformer,
    babelTransformerPath: require.resolve('./metro.sql.transformer'),
  },
  resolver: {
    ...defaultConfig.resolver,
    assetExts: assetExts.filter((ext) => ext !== 'sql'),
    sourceExts: [...sourceExts, 'sql'],
  },
};
