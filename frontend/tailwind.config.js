/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#F5C518',
          red: '#E63329',
          dark: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
};
