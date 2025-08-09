module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        "jm-primary-deep": "#1e40af",
        "jm-primary": "#3b82f6",
        "jm-primary-light": "#60a5fa",
        "jm-pale": "#e0e7ff",
        "jm-light": "#f0f4ff",
      },
      backgroundImage: {
        "jm-gradient": "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
        "jm-gradient-hover":
          "linear-gradient(135deg, #1a3a9f 0%, #3575e0 100%)",
      },
      fontFamily: {
        jm: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
