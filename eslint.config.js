/**
 * ESLint flat config shim to reuse the existing Expo + Prettier settings.
 * Keeps behaviour consistent with the prior .eslintrc.js while satisfying ESLint 9.
 *
 * Includes custom architecture enforcement rules.
 */

const { FlatCompat } = require("@eslint/eslintrc");
const compat = new FlatCompat();
const customRules = require("./eslint-rules");

module.exports = [
  ...compat.config({
    extends: ["expo", "prettier"],
    plugins: ["prettier"],
    rules: {
      "prettier/prettier": "warn",
    },
  }),
  {
    files: ["jest.setup.js", "jest.config.js"],
    languageOptions: {
      globals: {
        jest: "readonly",
      },
    },
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
  },
  // Custom architecture enforcement rules
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    plugins: {
      architecture: customRules,
    },
    rules: {
      "architecture/no-repository-in-screens": "error",
      "architecture/no-external-imports-in-engine": "error",
      "architecture/no-inline-fx-conversion": "warn",
      "architecture/no-manual-error-creation": "warn",
    },
  },
];
