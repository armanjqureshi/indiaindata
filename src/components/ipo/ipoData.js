// CSV columns and Dataset details shared by the IPO pages' "Use this data" blocks.
export const IPO_COLS = [
  { key: 'name', label: 'IPO' }, { key: 'symbol', label: 'Symbol' }, { key: 'board', label: 'Board' }, { key: 'status', label: 'Status' },
  { key: 'open', label: 'Opens' }, { key: 'close', label: 'Closes' }, { key: 'listingDate', label: 'Listing date' },
  { key: 'priceLow', label: 'Price band low (Rs)' }, { key: 'priceHigh', label: 'Price band high (Rs)' }, { key: 'issuePrice', label: 'Issue price (Rs)' },
  { key: 'lotSize', label: 'Lot size (shares)' }, { key: 'sizeCr', label: 'Issue size (Rs crore)' },
  { key: 'subscription', label: 'Subscription (times)' }, { key: 'subscriptionAsOf', label: 'Subscription as of' },
  { key: 'listingOpen', label: 'Listing day open (Rs)' }, { key: 'listingClose', label: 'Listing day close (Rs)' }, { key: 'listingGainPct', label: 'Listing gain (%)' },
]
export const ipoRow = (i) => ({
  ...i,
  listingDate: i.listingDate || i.timetable?.listing || null,
  listingOpen: i.listing?.open ?? null,
  listingClose: i.listing?.close ?? null,
  listingGainPct: Number.isFinite(i.listingGainPct) ? Math.round(i.listingGainPct * 100) / 100 : null,
})

export const GMP_COLS = [
  { key: 'name', label: 'IPO' }, { key: 'board', label: 'Board' }, { key: 'status', label: 'Status' }, { key: 'price', label: 'Upper price or issue price (Rs)' },
  { key: 'gmp', label: 'Reported GMP (Rs)' }, { key: 'gmpPct', label: 'GMP (%)' }, { key: 'gmpDate', label: 'GMP date' }, { key: 'gmpSource', label: 'GMP source' },
  { key: 'listingGainPct', label: 'Actual listing gain (%)' },
]
export const gmpRow = (i, e) => {
  const price = i.issuePrice || i.priceHigh || null
  return {
    name: i.name, board: i.board, status: i.status, price,
    gmp: e?.gmp ?? null,
    gmpPct: e && price ? Math.round((e.gmp / price) * 10000) / 100 : null,
    gmpDate: e?.asOf ?? null, gmpSource: e?.source ?? null,
    listingGainPct: Number.isFinite(i.listingGainPct) ? Math.round(i.listingGainPct * 100) / 100 : null,
  }
}

export const IPO_SOURCE = 'NSE and BSE issue documents, subscription data and end-of-day prices'
export const IPO_SOURCE_URL = 'https://www.nseindia.com/'
