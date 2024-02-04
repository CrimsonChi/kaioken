import type { Config } from "tailwindcss"

export default {
  content: [
    "./{pages,layouts,components,src,renderer}/**/*.{html,js,jsx,ts,tsx,vue}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
