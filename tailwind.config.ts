import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#0a0c10",
        panel: "#10131a",
        cyan: {
          glow: "#00f0ff",
        },
        magenta: {
          glow: "#ff00c8",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 240, 255, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
