import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      ".next/**",
      ".next-*/**",
      ".codex-artifacts/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "out/**",
      "apps/**/dist/**",
      "apps/mobile-shells/**/android/**",
      "apps/mobile-shells/**/node_modules/**",
      "public/app-profissional/assets/**",
      "public/app-profissional/sw.js",
      "public/app-profissional/workbox-*.js",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],

    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },

    rules: {
      // O adaptador de banco ainda preserva contratos dinamicos de consultas/RPCs.
      "@typescript-eslint/no-explicit-any": "off",

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^(_|inicio30Dias$)" },
      ],

      "no-useless-assignment": "off",
      "preserve-caught-error": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  {
    files: ["apps/app-profissional-vite/src/pages/ClientesPage.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
