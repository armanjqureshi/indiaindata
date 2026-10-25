// Net FPI equity flows, ₹ crore, one value per reporting day, 1-23 October 2026.
// Source: NSDL "Trends in FPI investment" (equity, all routes). The last three values are
// the day-to-day change in NSDL's month-to-date total (-49,457.17, -49,870.37, -48,211.30, -48,056.33).
export const FPI_DAYS = [
  ['2026-10-01', -9231.88],
  ['2026-10-05', -9281.52],
  ['2026-10-06', -4162.66],
  ['2026-10-07', -2449.84],
  ['2026-10-08', -6155.75],
  ['2026-10-09', -12884.07],
  ['2026-10-12', -3251.04],
  ['2026-10-13', 2000.73],
  ['2026-10-14', -1436.41],
  ['2026-10-15', -1102.13],
  ['2026-10-16', -4145.84],
  ['2026-10-19', 2643.24],
  ['2026-10-21', -413.2],
  ['2026-10-22', 1659.07],
  ['2026-10-23', 154.97],
].map(([date, v]) => ({ date, v }))

// Last four sessions with both series. FII/FPI and DII cash-market net, NSE provisional data
// (NSE, BSE and MSEI combined). A different measure from the NSDL series above.
export const NSE_DAYS = [
  { date: '2026-10-19', fii: -1148.64, dii: 3201.19 },
  { date: '2026-10-21', fii: 1022.32, dii: 1614.32 },
  { date: '2026-10-22', fii: -3458.7, dii: 2891.32 },
  { date: '2026-10-23', fii: 887.65, dii: 3235.36 },
]
