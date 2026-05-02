import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ivvlin: {
          black: "#000000",
          surface: "#0D0D0D",
          surface2: "#111111",
          border: "#1A1A1A",
          border2: "#2A2A2A",
          muted: "#555555",
          subtle: "#888888",
          accent: "#6C5CE7",
          hot: "#FF6B35",
          warm: "#F59E0B",
          cold: "#3B82F6",
          success: "#10B981",
          danger: "#EF4444",
        },
      },
    },
  },
};

export default config;
