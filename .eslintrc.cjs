/** Root ESLint config. Individual packages extend this. */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  extends: ["eslint:recommended"],
  ignorePatterns: ["dist", "node_modules", ".next", "coverage"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "warn",
      },
    },
  ],
};
