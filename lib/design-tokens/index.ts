export const designTokens = {
  colors: {
    app: {
      bg: "var(--app-bg)",
      surface: "var(--app-surface)",
      "surface-muted": "var(--app-surface-muted)",
      border: "var(--app-border)",
      ink: "var(--app-ink)",
      muted: "var(--app-muted)",
      accent: "var(--app-accent)",
      "accent-strong": "var(--app-accent-strong)",
      success: "var(--app-success)",
      warning: "var(--app-warning)",
      danger: "var(--app-danger)",
      info: "var(--app-info)",
      ring: "var(--app-ring)",
    },
  },
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "8px",
    xl: "8px",
  },
  shadows: {
    soft: "0 10px 30px rgba(16, 24, 40, 0.08)",
    raised: "0 18px 48px rgba(16, 24, 40, 0.14)",
    focus: "0 0 0 4px var(--app-ring)",
  },
  spacing: {
    shell: "1.5rem",
    "shell-lg": "2rem",
    panel: "1rem",
    "panel-lg": "1.25rem",
  },
} as const;

export type DesignTokens = typeof designTokens;
