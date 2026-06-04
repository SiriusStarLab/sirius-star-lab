export const brand = {
  colors: {
    primary: "hsl(193, 100%, 32%)",
    primaryHex: "#006680",
    primaryLight: "hsl(193, 100%, 55%)",
    primaryLightHex: "#00C3E8",
    accent: "hsl(193, 100%, 40%)",
    accentHex: "#00A3C4",

    background: "#F5F8FF",
    backgroundCard: "#FFFFFF",
    backgroundMuted: "#F8FAFC",
    backgroundSubtle: "#EEF2FF",

    text: "#0F172A",
    textSecondary: "rgba(15,23,42,0.65)",
    textMuted: "rgba(15,23,42,0.45)",
    textFaint: "rgba(15,23,42,0.35)",

    border: "rgba(15,23,42,0.08)",
    borderStrong: "rgba(15,23,42,0.14)",

    success: "hsl(155, 70%, 40%)",
    successBg: "hsl(155, 70%, 94%)",
    warning: "hsl(38, 95%, 50%)",
    warningBg: "hsl(38, 95%, 94%)",
    error: "hsl(0, 80%, 55%)",
    errorBg: "hsl(0, 80%, 96%)",
    info: "hsl(220, 90%, 56%)",
    infoBg: "hsl(220, 90%, 95%)",

    purple: "hsl(260, 80%, 55%)",
    purpleBg: "hsl(260, 80%, 96%)",
  },

  fonts: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Outfit', system-ui, sans-serif",
    mono: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    display: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  radii: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    full: "9999px",
  },

  shadows: {
    sm: "0 1px 3px rgba(0,102,128,0.06)",
    md: "0 4px 16px rgba(0,102,128,0.10)",
    lg: "0 8px 32px rgba(0,102,128,0.14)",
    glow: "0 0 20px rgba(0,195,232,0.25)",
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "40px",
  },

  cssVars: `
    --color-primary: hsl(193, 100%, 32%);
    --color-primary-light: hsl(193, 100%, 55%);
    --color-accent: hsl(193, 100%, 40%);
    --color-background: #F5F8FF;
    --color-text: #0F172A;
    --color-text-secondary: rgba(15,23,42,0.65);
    --color-border: rgba(15,23,42,0.08);
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Outfit', system-ui, sans-serif;
    --font-mono: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    --font-display: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --shadow-md: 0 4px 16px rgba(0,102,128,0.10);
  `,
} as const;

export type BrandColor = keyof typeof brand.colors;
