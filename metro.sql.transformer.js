/**
 * Inline .sql files as ESM string modules for Metro.
 * Mirrors the SVG transformer pattern from Expo docs.
 */
const upstreamTransformer = require('metro-react-native-babel-transformer');

module.exports.transform = ({ src, filename, options }) => {
  if (filename.endsWith('.sql')) {
    const code = `export default ${JSON.stringify(src)};`;
    return upstreamTransformer.transform({ src: code, filename, options });
  }

  return upstreamTransformer.transform({ src, filename, options });
};
