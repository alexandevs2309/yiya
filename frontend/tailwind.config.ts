import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          active: "var(--bg-active)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          muted: "var(--accent-muted)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        status: {
          free: {
            bg: "var(--status-free-bg)",
            text: "var(--status-free-text)",
            dot: "var(--status-free-text)",
          },
          occupied: {
            bg: "var(--status-occupied-bg)",
            text: "var(--status-occupied-text)",
            dot: "var(--status-occupied-text)",
          },
          billing: {
            bg: "var(--status-billing-bg)",
            text: "var(--status-billing-text)",
            dot: "var(--status-billing-text)",
          },
        },
        category: {
          pescados: "#0369A1",
          mariscos: "#6D28D9",
          carnes: "#B91C1C",
          bebidas: "#B45309",
          postres: "#9D174D",
          otros: "#4338CA",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        sidebar: "1px 0 0 0 #2D3148",
        topbar: "0 1px 0 0 #2D3148",
        "order-panel": "-1px 0 0 0 #2D3148",
        modal: "0 8px 32px rgba(0,0,0,0.5)",
        toast: "0 4px 16px rgba(0,0,0,0.4)",
        card: "0 1px 2px rgba(0,0,0,0.2)",
        button: "0 2px 8px rgba(0,0,0,0.3)",
      },
      keyframes: {
        "pulse-border": {
          "0%, 100%": { borderColor: "#EF4444" },
          "50%": { borderColor: "#EF444440" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.2s ease-out",
        "toast-in": "toast-in 0.25s ease-out",
        "pulse-dot": "pulse-dot 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
