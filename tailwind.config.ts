import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./shared/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 40px rgba(59, 130, 246, 0.24)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top left, rgba(56,189,248,0.20), transparent 30%), radial-gradient(circle at top right, rgba(139,92,246,0.16), transparent 32%), linear-gradient(180deg, rgba(8,15,33,1), rgba(12,18,40,1))",
      },
    },
  },
  plugins: [],
} satisfies Config;
