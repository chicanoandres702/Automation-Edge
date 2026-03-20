const { FlatCompat } = require("@eslint/eslintrc");
const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  // Use core recommended plugin configs (avoiding Next shareable config to prevent
  // circular-config validation issues). These provide TypeScript / React / a11y
  // baseline rules that work with the installed parser/plugins.
  ...compat.extends(
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ),
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "dist/**"],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: "module",
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    // rely on Next.js shareable config for plugin setup; explicit plugin requires
    // can be added here if project-specific rules require them
    rules: {
      // Relax some strict rules for incremental migration
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "react/no-unescaped-entities": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
];
