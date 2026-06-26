/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        luxury: {
          gold: "#C9A962",
          "gold-light": "#E8D5A3",
          "gold-dark": "#9A7B3C",
          champagne: "#F7F3EB",
          ivory: "#FAFAF8",
          obsidian: "#0A0A0B",
          slate: "#141416",
          graphite: "#1C1C1F",
          pearl: "#E8E6E1",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "fade-in": "fadeIn 0.4s ease-out forwards",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%, 100%": { backgroundPosition: "200% center" },
          "50%": { backgroundPosition: "-200% center" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      boxShadow: {
        luxury: "0 25px 80px -20px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,169,98,0.08)",
        "luxury-lg": "0 40px 100px -30px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,98,0.12)",
        glow: "0 0 40px rgba(201,169,98,0.15)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
