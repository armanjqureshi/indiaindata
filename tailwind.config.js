/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    // Category colors composed at runtime (see sectionColorMap in content.js)
    ...['news', 'business', 'market', 'blogs', 'economy', 'society'].flatMap((c) => [
      `hover:border-${c}`,
      `group-hover:text-${c}`,
    ]),
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAFAF7',
        ink: '#1A1A1A',
        brand: {
          DEFAULT: '#0E6E6E',
          dark: '#0A5252',
          light: '#E3F0F0',
        },
        news: { DEFAULT: '#4A6FA5', light: '#EAF0F7' },
        business: { DEFAULT: '#4F46B8', light: '#ECEBF8' },
        market: { DEFAULT: '#1E7F4F', light: '#E7F3EC' },
        economy: { DEFAULT: '#B45309', light: '#F9EFE2' },
        society: { DEFAULT: '#7E3FA8', light: '#F2EAF8' },
        blogs: { DEFAULT: '#0E6E6E', light: '#E3F0F0' },
        up: '#1E7F4F',
        down: '#C0392B',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        site: '1200px',
      },
      lineHeight: {
        body: '1.5',
      },
    },
  },
  plugins: [],
}
