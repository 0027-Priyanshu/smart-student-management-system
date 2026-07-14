/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bgDark: "#0b0c10",
          bgCard: "#12141c",
          accentViolet: "#8a5cf6",
          accentCyan: "#06b6d4",
          emerald: "#10b981",
          rose: "#ef4444",
          amber: "#f59e0b",
          textLight: "#f3f4f6",
          textMuted: "#9ca3af",
          textDark: "#1f2937"
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        title: ["Outfit", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 20px rgba(138, 92, 246, 0.25)",
        card: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
