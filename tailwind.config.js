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
        paper: '#0B151E',
        panel: '#112230',
        raise: '#17303F',
        ink: '#E6EDF1',
        brand: {
          DEFAULT: '#FF9A3D',
          dark: '#FFB872',
          light: 'rgba(255,154,61,0.14)',
        },
        news: { DEFAULT: '#7FA9EA', light: 'rgba(127,169,234,0.14)' },
        business: { DEFAULT: '#A39BFF', light: 'rgba(163,155,255,0.14)' },
        market: { DEFAULT: '#3FD08D', light: 'rgba(63,208,141,0.14)' },
        economy: { DEFAULT: '#E9CB4F', light: 'rgba(233,203,79,0.14)' },
        society: { DEFAULT: '#D08CF0', light: 'rgba(208,140,240,0.14)' },
        blogs: { DEFAULT: '#3FC8CF', light: 'rgba(63,200,207,0.14)' },
        up: '#3FD08D',
        down: '#FF6B5B',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
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
