module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 50],
    "subject-full-stop": [2, "never", "."],
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "hotfix", "docs", "style", "refactor", "perf", "test", "chore"],
    ],
  },
};
