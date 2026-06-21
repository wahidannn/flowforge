import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#f7f4ef",
        line: "#d8d4cc",
        sage: "#6f8f72",
        coral: "#bf6b5b",
        gold: "#b9954d",
      },
    },
  },
  plugins: [animate],
};

export default config;
