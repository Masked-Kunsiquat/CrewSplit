// Metro configuration for Expo
// Ensures .sql migration files are bundled and inlined as strings for Drizzle migrations
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Treat .sql as a source file (not an asset) so we can inline contents
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'sql');
config.resolver.sourceExts.push('sql');
config.transformer.babelTransformerPath = require.resolve('./metro.sql.transformer');

module.exports = config;
