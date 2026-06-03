import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: "var(--background)",
        "background-secondary": "var(--background-secondary)",
        card: {
          DEFAULT: "var(--card-bg)",
          border: "var(--card-border)",
          hover: "var(--card-hover)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
          glow: "var(--primary-glow)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          light: "var(--secondary-light)",
        },
        accent: {
          gold: "var(--accent-gold)",
          "gold-light": "var(--accent-gold-light)",
          "gold-glow": "var(--accent-gold-glow)",
          red: "var(--accent-red)",
          "red-light": "var(--accent-red-light)",
          blue: "var(--accent-blue)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-glow': 'pulse-glow 2s infinite ease-in-out',
        'float': 'float 3s infinite ease-in-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'gradient': 'gradient-shift 3s ease infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
