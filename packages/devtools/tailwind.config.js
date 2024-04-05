/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html",
  "./devtools.html",
  "./options.html",
  "./popup.html",
  "./sidepanel.html",
  "./src/**/*.{js,ts,jsx,tsx}",
  "./src/popup/*.{js,ts,jsx,tsx}"
],
  theme: {
    extend: {
      colors:{
        primary:"rgb(220, 20, 60)"
      },
      backgroundColor: {
        primary: "rgb(220, 20, 60)",
        "primary-light": "rgb(228 50 86)",
      },
    },
  },
  plugins: [],
}