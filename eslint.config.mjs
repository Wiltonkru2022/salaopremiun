import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "out/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],

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
      // IMPORTANTE: não travar dev em integrações Supabase/RPC ainda sem tipos gerados
      "@typescript-eslint/no-explicit-any": "off",

      // hooks funcionando corretamente
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // evitar lixo
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // evitar erro com {}
      "@typescript-eslint/no-empty-object-type": "off",

      // permitir comentários vazios em catch
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
