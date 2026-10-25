import FpiSelloff from './FpiSelloff.jsx'
import { FPI_DAYS } from './fpiSelloffData.js'

export const INFOGRAPHICS = [
  {
    slug: 'fpi-selloff-october-2026',
    title: 'Foreign investors pulled ₹48,056 crore out of Indian shares in 15 days',
    short: 'The October FPI sell-off, day by day',
    dek: '92% of the selling came in the first six sessions of the month. Since 12 October the net flow has been small.',
    topic: 'Markets',
    date: '2026-10-25',
    Component: FpiSelloff,
    image: '/infographics/fpi-selloff-october-2026.png',
    ogImage: '/infographics/fpi-selloff-october-2026-og.png',
    source: 'NSDL trends in FPI investment (equity, all routes); NSE provisional FII/DII data',
    related: { to: '/article/fpi-outflows-october-2026', label: 'Read the story: foreign investors pulled money from Indian shares' },
    table: { head: ['Date', 'Net FPI equity flow (₹ crore)'], rows: FPI_DAYS.map((r) => [r.date, r.v.toFixed(2)]) },
    summary:
      'Foreign portfolio investors were net sellers of Indian equities on 11 of 15 trading days in October 2026 up to the 23rd, with a net outflow of ₹48,056 crore. The biggest day was 9 October at ₹12,884 crore. The first six sessions accounted for ₹44,166 crore, or 92% of the total.',
  },
]
export const getInfographic = (slug) => INFOGRAPHICS.find((i) => i.slug === slug) || null
