import type { Config } from "tailwindcss";
import { designTokens } from "./lib/design-tokens";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: designTokens.colors,
      borderRadius: designTokens.radius,
      boxShadow: designTokens.shadows,
      spacing: designTokens.spacing,
    },
  },
  plugins: [],
};

export default config;
