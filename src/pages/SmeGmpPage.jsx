import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import { useIpos, useGmp, gmpFor, useTodayIST, ipoStatus, istDateOf, fmt } from '../data/live.js'
import { gainClass } from '../components/ipo/ipoUtil.js'

const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>

const FAQ = [
  ['What is SME IPO GMP?', 'It is the unofficial grey market premium quoted for an IPO on an exchange’s SME platform, such as NSE Emerge. It works like mainboard GMP: a GMP of ₹10 on an issue price of ₹100 implies a listing price of about ₹110. No exchange or regulator publishes it.'],
  ['Is SME GMP more reliable than mainboard GMP?', 'There is less to go on. SME issues are small, thinly traded and often have no reported GMP at all, which the sites show as ₹0. In the NSE Emerge listings tracked here, issues with a reported GMP of ₹0 have listed both well above and well below the issue price. Treat any number as a rumour.'],
  ['Why do some SME IPOs list at exactly +90% or -20%?', 'SME listings can open within a price band set by the exchange. Many of the biggest moves on this page sit at the edge of that band, so the figure shows the band limit more than a market price.'],
  ['Which exchanges do you cover?', 'NSE Emerge only. We do not yet cover BSE SME issues, so some SME IPOs people search for will not appear here.'],
  ['Where do the figures come from?', 'Prices, subscription and listing gains are from NSE. Each GMP figure is entered by hand from a named published source with its date. If we have none, we say so.'],
]

const BUCKETS = [
  ['Under 5 times', 0, 5],
  ['5 to 20 times', 5, 20],
  ['20 to 100 times', 20, 100],
  ['100 times or more', 100, Infinity],
]
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length
const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export default function SmeGmpPage() {
  useSeo({
    title: 'SME IPO GMP today: NSE Emerge grey market premium and listing gains',
    description:
      'SME IPO GMP for NSE Emerge issues, plus what the listing data shows: how many SME IPOs list below issue price, and how subscription relates to listing gain. Sourced from NSE.',
  })
  const data = useIpos()
  const gmp = useGmp()
  const today = useTodayIST(istDateOf(data.updatedAt))
  const ipos = data.ipos.filter((i) => i.board === 'sme').map((i) => ({ ...i, status: ipoStatus(i, today) }))
  const latest = (slug) => gmpFor(gmp.entries, slug).latest || undefined
  const price = (i) => i.issuePrice || i.priceHigh

  const rank = { open: 0, upcoming: 1, closed: 2 }
  const live = ipos
    .filter((i) => rank[i.status] !== undefined)
    .sort((a, b) => rank[a.status] - rank[b.status] || a.open.localeCompare(b.open))
  const label = { open: 'Open', upcoming: 'Upcoming', closed: 'Awaiting listing' }

  const listed = ipos.filter((i) => i.status === 'listed' && Number.isFinite(i.listingGainPct))
  const gains = listed.map((i) => i.listingGainPct)
  const n = listed.length
  const below = gains.filter((g) => g < 0).length
  const flat = gains.filter((g) => g === 0).length
  const big = gains.filter((g) => g >= 40).length
  const from = n ? listed.map((i) => i.listingDate).sort()[0] : null
  const recent = [...listed].sort((a, b) => b.listingDate.localeCompare(a.listingDate)).slice(0, 25)
  const buckets = BUCKETS.map(([name, lo, hi]) => {
    const g = listed.filter((i) => Number.isFinite(i.subscription) && i.subscription >= lo && i.subscription < hi).map((i) => i.listingGainPct)
    return { name, count: g.length, avg: g.length ? mean(g) : null, below: g.filter((v) => v < 0).length }
  })

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">SME IPO GMP today</h1>
          <p className="mt-3 max-w-2xl leading-body text-ink/70">
            Grey market premium for SME IPOs on NSE Emerge, and what the listing record shows about them. GMP is unofficial and not a forecast.
          </p>
          <p className="mt-4 max-w-2xl rounded-sm border border-down/40 bg-down/10 px-4 py-3 text-sm leading-body">
            GMP is not published by any exchange or regulator, and SME issues are small and thinly traded. Not investment advice. Read the <Link to="/disclaimer" className="font-semibold text-brand hover:underline">disclaimer</Link>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>SME IPOs open, upcoming or awaiting listing</H>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">SME IPOs on NSE Emerge with reported GMP</caption>
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                {['IPO', 'Status', 'Bidding', 'Upper price', 'Lot size', 'Subscription', 'Reported GMP'].map((h, k) => (
                  <th key={h} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${k >= 3 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {live.map((i) => {
                const e = latest(i.slug)
                return (
                  <tr key={i.slug} className="border-b border-ink/10 align-top last:border-0">
                    <td className="px-3 py-2.5"><Link to={`/ipos/${i.slug}`} className="font-semibold hover:text-brand">{i.name.replace(/\s+Limited$/i, '')}</Link></td>
                    <td className="whitespace-nowrap px-3 py-2.5">{label[i.status]}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5">{fmt.shortDate(i.open)} – {fmt.shortDate(i.close)}</td>
                    <td className="num px-3 py-2.5 text-right">{price(i) ? fmt.rupees(price(i)) : '—'}</td>
                    <td className="num px-3 py-2.5 text-right">{i.lotSize ?? '—'}</td>
                    <td className="num px-3 py-2.5 text-right">{Number.isFinite(i.subscription) ? fmt.times(i.subscription) : '—'}</td>
                    <td className="num px-3 py-2.5 text-right">{e ? <span className={gainClass(e.gmp)}>{`${e.gmp > 0 ? '+' : ''}${fmt.rupees(e.gmp)}`}</span> : <span className="text-ink/40">Not reported</span>}</td>
                  </tr>
                )
              })}
              {!live.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink/60">No NSE Emerge SME IPO is open, upcoming or awaiting listing today. This table fills in when one is announced.</td></tr>}
            </tbody>
          </table>
        </div>

        {n > 0 && (
          <>
            <H>What SME listings have looked like</H>
            <p className="max-w-3xl leading-body text-ink/80">
              NSE Emerge SME IPOs that listed from {fmt.date(from)} to {fmt.date(recent[0].listingDate)}, {n} issues. Listing gain is the listing price against the issue price, from NSE.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-px border border-ink/10 bg-ink/10 sm:grid-cols-4">
              {[
                ['Listed below issue price', `${below} of ${n}`, `${((below / n) * 100).toFixed(0)}% of issues`],
                ['Average listing gain', fmt.pct(mean(gains)), `median ${fmt.pct(median(gains))}`],
                ['Listed flat', `${flat} of ${n}`, 'opened at issue price'],
                ['Gained 40% or more', `${big} of ${n}`, `${((big / n) * 100).toFixed(0)}% of issues`],
              ].map(([k, v, s]) => (
                <div key={k} className="bg-paper p-4">
                  <div className="text-xs text-ink/60">{k}</div>
                  <div className="num mt-1 text-2xl font-semibold">{v}</div>
                  <div className="text-xs text-ink/60">{s}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-body text-ink/70">
              The average is pulled up by a few very large gains, so the median is the better guide to a typical issue.
            </p>

            <H>Listing gain by subscription</H>
            <div className="overflow-x-auto border-y border-ink/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">SME listing gain by subscription multiple</caption>
                <thead>
                  <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                    <th className="px-3 py-2 font-semibold">Final subscription</th>
                    <th className="px-3 py-2 text-right font-semibold">Issues</th>
                    <th className="px-3 py-2 text-right font-semibold">Average listing gain</th>
                    <th className="px-3 py-2 text-right font-semibold">Listed below issue price</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => (
                    <tr key={b.name} className="border-b border-ink/10 last:border-0">
                      <td className="px-3 py-2.5 font-semibold">{b.name}</td>
                      <td className="num px-3 py-2.5 text-right">{b.count}</td>
                      <td className={`num px-3 py-2.5 text-right ${b.avg === null ? '' : gainClass(b.avg)}`}>{b.avg === null ? '—' : fmt.pct(b.avg)}</td>
                      <td className="num px-3 py-2.5 text-right">{b.count ? `${b.below} of ${b.count}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-body text-ink/70">
              Only {buckets.reduce((a, b) => a + b.count, 0)} of the {n} issues have a final subscription figure in our data, and some groups hold only a few issues, so read the pattern, not the exact figures. It is a record of past listings and does not predict the next one.
            </p>

            <H>Recent SME listings and last reported GMP</H>
            <div className="overflow-x-auto border-y border-ink/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Recent SME listings with last reported GMP and listing gain</caption>
                <thead>
                  <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                    <th className="px-3 py-2 font-semibold">IPO</th>
                    <th className="px-3 py-2 font-semibold">Listed</th>
                    <th className="px-3 py-2 text-right font-semibold">Issue price</th>
                    <th className="px-3 py-2 text-right font-semibold">Subscription</th>
                    <th className="px-3 py-2 text-right font-semibold">Last GMP</th>
                    <th className="px-3 py-2 text-right font-semibold">Listing gain</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((i) => {
                    const e = latest(i.slug)
                    return (
                      <tr key={i.slug} className="border-b border-ink/10 last:border-0">
                        <td className="px-3 py-2.5"><Link to={`/ipos/${i.slug}`} className="font-semibold hover:text-brand">{i.name.replace(/\s+Limited$/i, '')}</Link></td>
                        <td className="num whitespace-nowrap px-3 py-2.5">{fmt.shortDate(i.listingDate)}</td>
                        <td className="num px-3 py-2.5 text-right">{price(i) ? fmt.rupees(price(i)) : '—'}</td>
                        <td className="num px-3 py-2.5 text-right">{Number.isFinite(i.subscription) ? fmt.times(i.subscription) : '—'}</td>
                        <td className="num px-3 py-2.5 text-right">{e ? `${e.gmp > 0 ? '+' : ''}${fmt.rupees(e.gmp, e.gmp % 1 ? 1 : 0)}` : <span className="text-ink/40">Not recorded</span>}</td>
                        <td className={`num px-3 py-2.5 text-right font-semibold ${gainClass(i.listingGainPct)}`}>{fmt.pct(i.listingGainPct)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-body text-ink/60">
              Last GMP is the final figure reported before listing by Investorgain’s SME performance tracker, shown only where we have recorded it. A GMP of ₹0 usually means no figure was quoted, not that the grey market expected no gain.
            </p>
          </>
        )}

        <H>About SME IPO GMP</H>
        <div className="max-w-3xl space-y-4">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-1 leading-body text-ink/80">{a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-sm text-ink/60">
          Mainboard issues are on the <Link to="/ipo-gmp" className="text-brand hover:underline">IPO GMP page</Link>. See also <Link to="/ipo-subscription-status" className="text-brand hover:underline">IPO subscription status</Link> and the <Link to="/ipos" className="text-brand hover:underline">IPO tracker</Link>.
        </p>
      </section>
    </>
  )
}
