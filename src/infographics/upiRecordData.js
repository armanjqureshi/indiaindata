// UPI monthly volume (billion payments) and value (₹ lakh crore), NPCI.
// Oct 2026: NPCI figures as reported by Inc42 (1 Nov 2026): 25.47 bn, ₹31.53 lakh crore, daily average 822 mn / ₹1,01,707 crore.
// Oct 2025 to Sep 2026: NPCI series compiled by India Dispatch Research; May to Sep 2026 and Oct 2025 volume
// cross-checked against NPCI figures reported by Swarajya and StartupTalky.
export const UPI_MONTHS = [
  ['Oct 2025', 20.7, 27.28],
  ['Nov 2025', 20.47, 26.32],
  ['Dec 2025', 21.63, 27.97],
  ['Jan 2026', 21.7, 28.33],
  ['Feb 2026', 20.39, 26.84],
  ['Mar 2026', 22.64, 29.53],
  ['Apr 2026', 22.35, 29.03],
  ['May 2026', 23.2, 29.9],
  ['Jun 2026', 22.72, 28.92],
  ['Jul 2026', 23.66, 29.88],
  ['Aug 2026', 24.51, 29.82],
  ['Sep 2026', 24.07, 29.37],
  ['Oct 2026', 25.47, 31.53],
].map(([month, vol, val]) => ({ month, vol, val }))
