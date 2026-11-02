import FpiSelloff from './FpiSelloff.jsx'
import { FPI_DAYS } from './fpiSelloffData.js'
import UpiRecord from './UpiRecord.jsx'
import { UPI_MONTHS } from './upiRecordData.js'

export const INFOGRAPHICS = [
  {
    slug: 'upi-record-october-2026',
    title: 'UPI handled 25.47 billion payments in October, a record',
    short: 'UPI’s record month, October 2026',
    dek: 'It was the first month above 25 billion payments and ₹30 lakh crore. Payments grew 23% on a year earlier, value 16%, so the average payment shrank.',
    topic: 'Economy',
    date: '2026-11-02',
    Component: UpiRecord,
    image: '/infographics/upi-record-october-2026.png',
    ogImage: '/infographics/upi-record-october-2026-og.png',
    source: 'NPCI UPI monthly statistics, as reported by Inc42 (October 2026) and compiled by India Dispatch Research (October 2025 to September 2026)',
    related: { to: '/article/upi-record-october-2026', label: 'Read the story: UPI’s record October' },
    table: { head: ['Month', 'Payments (billion)', 'Value (₹ lakh crore)'], rows: UPI_MONTHS.map((m) => [m.month, m.vol.toFixed(2), m.val.toFixed(2)]) },
    summary:
      'UPI processed 25.47 billion payments worth ₹31.53 lakh crore in October 2026, the first month above 25 billion payments and above ₹30 lakh crore. The previous volume record was 24.51 billion in August 2026. In one month, UPI moved slightly more money than Tamil Nadu’s economy produced in all of 2024-25 (₹31.19 lakh crore of GSDP); among states with 2024-25 figures, only Maharashtra’s output (₹45.32 lakh crore) was larger. Against October 2025, payments rose 23% and value 16%, so the average payment fell from about ₹1,318 to about ₹1,238.',
  },
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
