import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import path from "path";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { 
        ecmaFeatures: { jsx: true },
        tsconfigRootDir: path.dirname
     },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "18.3" } },
    rules: {
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      "react-hooks/rules-of-hooks": "error",
      // Turned off on purpose: the original prototype relies on stale-closure refs
      // in many effects. Re-enable once the logic is split into hooks.
      "react-hooks/exhaustive-deps": "off",
      "no-unused-vars": "warn",
    },
  },
];
