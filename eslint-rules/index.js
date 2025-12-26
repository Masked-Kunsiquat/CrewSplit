/**
 * Custom ESLint rules for CrewSplit architecture enforcement
 */

module.exports = {
  rules: {
    "no-repository-in-screens": require("./no-repository-in-screens"),
    "no-external-imports-in-engine": require("./no-external-imports-in-engine"),
    "no-inline-fx-conversion": require("./no-inline-fx-conversion"),
    "no-manual-error-creation": require("./no-manual-error-creation"),
  },
};
