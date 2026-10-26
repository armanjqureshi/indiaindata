import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import { useIpos, useGmp, gmpFor, useTodayIST, ipoStatus, istDateOf, fmt } from '../data/live.js'
import { gainClass } from '../components/ipo/ipoUtil.js'

const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>

const FAQ = [
  ['What is IPO GMP?', 'GMP, or grey market premium, is the price at which an IPO’s shares are said to trade informally before they list, compared with the issue price. A GMP of ₹50 on an issue price of ₹200 means the grey market implies a listing price of about ₹250, a 25% premium.'],
  ['Where does GMP come from?', 'From dealers and brokers in an unofficial market. No stock exchange or regulator records it, and there is no official source. Websites collect figures by asking dealers, and each site can report a different number.'],
  ['Is GMP a reliable guide to listing price?', 'No. It can change within hours, can be wrong, and has been far from the actual listing price for many issues. Treat it as a rumour of demand. It is not a forecast, and it is not advice.'],
  ['How do you get your GMP figures?', 'We do not copy a feed. Each figure is entered by hand from a named published source, with its date. If we have no figure we say so. The record above compares our last reported GMP with the actual listing gain.'],
]

export default function GmpPage() {
  useSeo({
    title: 'IPO GMP today: grey market premium for upcoming IPOs',
    description:
      'Reported grey market premium (GMP) for open, upcoming and unlisted IPOs, with the source and time of each figure, and a record of how GMP compared with actual listing gains.',
  })
  const data = useIpos()
  const gmp = useGmp()
  const today = useTodayIST(istDateOf(data.updatedAt))
  const ipos = data.ipos.map((i) => ({ ...i, status: ipoStatus(i, today) }))
  const bySlug = new Proxy({}, { get: (_, slug) => gmpFor(gmp.entries, String(slug)).latest || undefined })

  const rank = { open: 0, upcoming: 1, closed: 2 }
  const rows = ipos
    .filter((i) => i.board === 'mainboard' && rank[i.status] !== undefined)
    .sort((a, b) => rank[a.status] - rank[b.status] || (a.status === 'closed' ? (a.timetable?.listing || '').localeCompare(b.timetable?.listing || '') : a.open.localeCompare(b.open)))
  const tracked = ipos
    .filter((i) => i.status === 'listed' && bySlug[i.slug] && Number.isFinite(i.listingGainPct))
    .sort((a, b) => b.listingDate.localeCompare(a.listingDate))

  const price = (i) => i.issuePrice || i.priceHigh
  const pct = (i, e) => (e && price(i) ? (e.gmp / price(i)) * 100 : null)
  const label = { open: 'Open', upcoming: 'Upcoming', closed: 'Awaiting listing' }

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">IPO GMP today</h1>
          <p className="mt-3 max-w-2xl leading-body text-ink/70">
            Grey market premium for open, upcoming and awaiting-listing mainboard IPOs. Every figure shows its source and date. It is an unofficial, unverified number and not a forecast.
          </p>
          <p className="mt-4 max-w-2xl rounded-sm border border-down/40 bg-down/10 px-4 py-3 text-sm leading-body">
            GMP is not published by any exchange or regulator. It can change in hours and can be wrong. Not investment advice. Read the <Link to="/disclaimer" className="font-semibold text-brand hover:underline">disclaimer</Link>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>Reported GMP, mainboard IPOs</H>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Reported grey market premium by IPO</caption>
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                {['IPO', 'Status', 'Bidding', 'Upper price', 'Reported GMP', 'GMP %', 'Implied listing price', 'Source'].map((h, k) => (
                  <th key={h} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${k >= 3 && k <= 6 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const e = bySlug[i.slug]
                const p = pct(i, e)
                return (
                  <tr key={i.slug} className="border-b border-ink/10 align-top last:border-0">
                    <td className="px-3 py-2.5"><Link to={`/ipo-gmp/${i.slug}`} className="font-semibold hover:text-brand">{i.name.replace(/\s+Limited$/i, '')} GMP</Link></td>
                    <td className="whitespace-nowrap px-3 py-2.5">{label[i.status]}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5">{fmt.shortDate(i.open)} – {fmt.shortDate(i.close)}</td>
                    <td className="num px-3 py-2.5 text-right">{price(i) ? fmt.rupees(price(i)) : '—'}</td>
                    <td className={`num px-3 py-2.5 text-right font-semibold ${e ? gainClass(e.gmp) : ''}`}>{e ? `${e.gmp > 0 ? '+' : ''}${fmt.rupees(e.gmp)}` : <span className="font-normal text-ink/40">Not reported</span>}</td>
                    <td className={`num px-3 py-2.5 text-right ${e ? gainClass(p) : ''}`}>{p === null ? '—' : fmt.pct(p)}</td>
                    <td className="num px-3 py-2.5 text-right">{e && price(i) ? fmt.rupees(price(i) + e.gmp) : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-ink/70">
                      {e ? (<>{e.sourceUrl ? <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{e.source}</a> : e.source}<span className="num block text-ink/50">{fmt.date(e.asOf)}</span></>) : '—'}
                    </td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-ink/60">No mainboard IPO is open, upcoming or awaiting listing.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">
          Implied listing price is the upper price band plus the reported GMP. It is an illustration, not a prediction. SME IPOs are on the <Link to="/sme-ipo-gmp" className="text-brand hover:underline">SME IPO GMP page</Link>. “Not reported” means we have no figure from a source we can name.
        </p>

        <H>GMP against actual listing gain</H>
        {tracked.length ? (
          <div className="overflow-x-auto border-y border-ink/10">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                  <th className="px-3 py-2 font-semibold">IPO</th>
                  <th className="px-3 py-2 text-right font-semibold">Last reported GMP</th>
                  <th className="px-3 py-2 text-right font-semibold">Listing gain</th>
                  <th className="px-3 py-2 text-right font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody>
                {tracked.map((i) => {
                  const p = pct(i, bySlug[i.slug])
                  return (
                    <tr key={i.slug} className="border-b border-ink/10 last:border-0">
                      <td className="px-3 py-2.5"><Link to={`/ipos/${i.slug}`} className="font-semibold hover:text-brand">{i.name.replace(/\s+Limited$/i, '')}</Link></td>
                      <td className="num px-3 py-2.5 text-right">{fmt.pct(p)}</td>
                      <td className={`num px-3 py-2.5 text-right font-semibold ${gainClass(i.listingGainPct)}`}>{fmt.pct(i.listingGainPct)}</td>
                      <td className="num px-3 py-2.5 text-right">{fmt.pct(i.listingGainPct - p).replace('%', ' pts')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm leading-body text-ink/70">
            Tracking has started. Once an issue on this page lists, we show its last reported GMP next to the actual listing gain here, so you can see how far apart they were. Jio Platforms is the first, with listing expected on 28 October.
          </p>
        )}

        <H>About grey market premium</H>
        <div className="max-w-3xl space-y-4">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-1 leading-body text-ink/80">{a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-sm text-ink/60">
          See the live <Link to="/ipo-subscription-status" className="text-brand hover:underline">IPO subscription status</Link> and the full <Link to="/ipos" className="text-brand hover:underline">IPO tracker</Link>.
        </p>
      </section>
    </>
  )
}
