/**
 * ESLint flat config shim to reuse the existing Expo + Prettier settings.
 * Keeps behaviour consistent with the prior .eslintrc.js while satisfying ESLint 9.
 */

const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

module.exports = compat.config({
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "warn",
  },
});
