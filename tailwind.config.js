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
        paper: 'rgb(var(--paper) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        raise: 'rgb(var(--raise) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
          light: 'rgb(var(--brand) / 0.14)',
        },
        news: { DEFAULT: 'rgb(var(--news) / <alpha-value>)', light: 'rgb(var(--news) / 0.14)' },
        business: { DEFAULT: 'rgb(var(--business) / <alpha-value>)', light: 'rgb(var(--business) / 0.14)' },
        market: { DEFAULT: 'rgb(var(--market) / <alpha-value>)', light: 'rgb(var(--market) / 0.14)' },
        economy: { DEFAULT: 'rgb(var(--economy) / <alpha-value>)', light: 'rgb(var(--economy) / 0.14)' },
        society: { DEFAULT: 'rgb(var(--society) / <alpha-value>)', light: 'rgb(var(--society) / 0.14)' },
        blogs: { DEFAULT: 'rgb(var(--blogs) / <alpha-value>)', light: 'rgb(var(--blogs) / 0.14)' },
        'deco-gold': 'rgb(var(--deco-gold) / <alpha-value>)',
        up: 'rgb(var(--up) / <alpha-value>)',
        down: 'rgb(var(--down) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
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
