import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#e2e8f0",
        tide: "#0b3c5d",
        foam: "#d7f9ff",
        ember: "#f97316",
        signal: "#14b8a6"
      },
      boxShadow: {
        panel: "0 18px 40px rgba(15, 23, 42, 0.12)"
      },
      backgroundImage: {
        "dashboard-grid":
          "linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
