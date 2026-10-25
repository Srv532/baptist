/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#07070d',
        brand: { DEFAULT: '#8b5cf6', glow: '#c4b5fd', hot: '#f472b6', cool: '#22d3ee' },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', "'Segoe UI'", 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
