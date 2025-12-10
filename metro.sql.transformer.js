/**
 * Simple transformer to inline .sql files as string modules for Metro.
 * This keeps Drizzle migration imports working in React Native / Expo.
 */
const upstreamTransformer = require('metro-react-native-babel-transformer');

module.exports.transform = ({ src, filename, options }) => {
  if (filename.endsWith('.sql')) {
    return upstreamTransformer.transform({
      src: `module.exports = ${JSON.stringify(src)};`,
      filename,
      options,
    });
  }

  return upstreamTransformer.transform({ src, filename, options });
};
