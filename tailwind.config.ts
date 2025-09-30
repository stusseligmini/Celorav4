import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "cyan-primary": "var(--cyan-primary)",
        "cyan-secondary": "var(--cyan-secondary)",
        "cyan-accent": "var(--cyan-accent)",
        "dark-surface": "var(--dark-surface)",
        "dark-card": "var(--dark-card)",
        "dark-border": "var(--dark-border)",
      },
      boxShadow: {
        "neon": "var(--neon-glow)",
        "neon-sm": "0 0 5px #06b6d4, 0 0 10px rgba(6, 182, 212, 0.3)",
        "neon-lg": "0 0 15px #06b6d4, 0 0 30px rgba(6, 182, 212, 0.5)",
      },
      textShadow: {
        "neon": "var(--neon-text-shadow)",
      },
      animation: {
        "neon-pulse": "neonPulse 2s infinite",
        "neon-border": "neonBorder 3s infinite",
        "gradient-flow": "gradientBackground 15s ease infinite",
        "scanline": "scanline 3s linear infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    // Plugin for text shadow
    function ({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        ".text-shadow-neon": {
          textShadow: "0 0 5px rgba(6, 182, 212, 0.8), 0 0 10px rgba(6, 182, 212, 0.4)",
        },
        ".text-shadow-none": {
          textShadow: "none",
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
export default config;