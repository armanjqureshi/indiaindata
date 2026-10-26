import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import { useIpos, useGmp, gmpFor, useTodayIST, ipoStatus, istDateOf, fmt } from '../data/live.js'
import { gainClass, priceLabel, BOARD_LABEL } from '../components/ipo/ipoUtil.js'

const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length
const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const weekday = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const BUCKETS = [['Under 5 times', 0, 5], ['5 to 20 times', 5, 20], ['20 to 100 times', 20, 100], ['100 times or more', 100, Infinity]]

function Stat({ label, value, sub }) {
  return (
    <div className="bg-paper p-4">
      <div className="text-xs text-ink/60">{label}</div>
      <div className="num mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-ink/60">{sub}</div>}
    </div>
  )
}

export default function IpoDashboardPage() {
  useSeo({
    title: 'IPO dashboard: open, upcoming and listing IPOs with GMP and subscription',
    description:
      'One page for every IPO on NSE: what is open now, what opens next, what lists soon, with subscription, grey market premium, a 14-day calendar and how IPOs have listed this year.',
  })
  const data = useIpos()
  const gmp = useGmp()
  const today = useTodayIST(istDateOf(data.updatedAt))
  const ipos = data.ipos.map((i) => ({ ...i, status: ipoStatus(i, today) }))
  const latest = (slug) => gmpFor(gmp.entries, slug).latest || undefined
  const byOpen = (a, b) => a.open.localeCompare(b.open) || (a.board === b.board ? 0 : a.board === 'mainboard' ? -1 : 1)

  const open = ipos.filter((i) => i.status === 'open').sort(byOpen)
  const upcoming = ipos.filter((i) => i.status === 'upcoming').sort(byOpen)
  const awaiting = ipos.filter((i) => i.status === 'closed').sort((a, b) => (a.timetable?.listing || '').localeCompare(b.timetable?.listing || ''))
  const closingToday = open.filter((i) => i.close === today).length
  const year = today ? today.slice(0, 4) : '2026'

  // Calendar: every dated step of every open, upcoming or awaiting issue in the next 14 days.
  const horizon = today ? addDays(today, 14) : null
  const events = []
  for (const i of [...open, ...upcoming, ...awaiting]) {
    const t = i.timetable || {}
    for (const [key, text] of [['open', 'opens'], ['close', 'closes'], ['allotment', 'allotment'], ['listing', 'lists']]) {
      const d = key === 'open' ? i.open : key === 'close' ? i.close : t[key]
      if (d && today && d >= today && d <= horizon) events.push({ d, text, i })
    }
  }
  events.sort((a, b) => a.d.localeCompare(b.d) || a.i.name.localeCompare(b.i.name))
  const days = [...new Set(events.map((e) => e.d))]

  const stats = (board) => {
    const l = ipos.filter((i) => i.board === board && i.status === 'listed' && Number.isFinite(i.listingGainPct) && (i.listingDate || '').startsWith(year))
    const g = l.map((i) => i.listingGainPct)
    return { l, n: g.length, avg: g.length ? mean(g) : null, med: g.length ? median(g) : null, below: g.filter((v) => v < 0).length }
  }
  const main = stats('mainboard')
  const sme = stats('sme')
  const buckets = BUCKETS.map(([name, lo, hi]) => {
    const g = main.l.filter((i) => Number.isFinite(i.subscription) && i.subscription >= lo && i.subscription < hi).map((i) => i.listingGainPct)
    return { name, count: g.length, avg: g.length ? mean(g) : null, below: g.filter((v) => v < 0).length }
  })
  const updated = data.updatedAt ? fmt.date(istDateOf(data.updatedAt)) : null

  const gmpCell = (i) => {
    const e = latest(i.slug)
    const p = i.board === 'mainboard' ? `/ipo-gmp/${i.slug}` : '/sme-ipo-gmp'
    return e
      ? <Link to={p} className={`hover:underline ${gainClass(e.gmp)}`}>{`${e.gmp > 0 ? '+' : ''}${fmt.rupees(e.gmp)}`}</Link>
      : <span className="text-ink/40">Not reported</span>
  }
  const Table = ({ rows, empty, third }) => (
    <div className="overflow-x-auto border-y border-ink/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
            <th className="px-3 py-2 font-semibold">IPO</th>
            <th className="px-3 py-2 font-semibold">Board</th>
            <th className="px-3 py-2 text-right font-semibold">Price</th>
            <th className="px-3 py-2 text-right font-semibold">Lot</th>
            <th className="px-3 py-2 font-semibold">{third[0]}</th>
            <th className="px-3 py-2 text-right font-semibold">Subscription</th>
            <th className="px-3 py-2 text-right font-semibold">GMP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.slug} className="border-b border-ink/10 align-top last:border-0">
              <td className="px-3 py-2.5"><Link to={`/ipos/${i.slug}`} className="font-semibold hover:text-brand">{i.name.replace(/\s+Limited$/i, '')}</Link></td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs">{BOARD_LABEL[i.board]}</td>
              <td className="num whitespace-nowrap px-3 py-2.5 text-right">{priceLabel(i)}</td>
              <td className="num px-3 py-2.5 text-right">{i.lotSize ?? '—'}</td>
              <td className="num whitespace-nowrap px-3 py-2.5">{third[1](i)}</td>
              <td className="num px-3 py-2.5 text-right">{Number.isFinite(i.subscription) ? fmt.times(i.subscription) : '—'}</td>
              <td className="num px-3 py-2.5 text-right">{gmpCell(i)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-ink/60">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">IPO dashboard</h1>
          <p className="mt-3 max-w-2xl leading-body text-ink/70">
            Every IPO on NSE in one place: open now, opening next and awaiting listing, with subscription, grey market premium and a 14-day calendar. Below it, how IPOs have actually listed this year.
          </p>
          {updated && <p className="num mt-3 text-xs text-ink/50">IPO list refreshed {updated}. See the <Link to="/methodology" className="text-brand hover:underline">methodology</Link>. GMP is unofficial and not a forecast; read the <Link to="/disclaimer" className="text-brand hover:underline">disclaimer</Link>.</p>}
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid grid-cols-2 gap-px border border-ink/10 bg-ink/10 sm:grid-cols-4">
          <Stat label="Open for bidding" value={open.length} sub={closingToday ? `${closingToday} closing today` : 'none closing today'} />
          <Stat label="Opening next" value={upcoming.length} sub={upcoming[0] ? `first: ${fmt.shortDate(upcoming[0].open)}` : 'none announced'} />
          <Stat label="Awaiting listing" value={awaiting.length} sub={awaiting[0] ? `next: ${fmt.shortDate(awaiting[0].timetable?.listing)}` : 'none'} />
          <Stat label={`Mainboard listed in ${year}`} value={main.n} sub={main.n ? `${fmt.pct(main.avg)} average gain` : ''} />
        </div>

        <H>Open for bidding now</H>
        <Table rows={open} empty="No IPO is open for bidding today." third={['Closes', (i) => fmt.shortDate(i.close)]} />

        <H>Opening next</H>
        <Table rows={upcoming} empty="No upcoming IPO dates announced yet." third={['Opens', (i) => `${fmt.shortDate(i.open)} – ${fmt.shortDate(i.close)}`]} />

        <H>Awaiting listing</H>
        <Table rows={awaiting} empty="No IPO is waiting to list." third={['Lists', (i) => (i.timetable?.listing ? fmt.shortDate(i.timetable.listing) : '—')]} />
        <p className="mt-3 text-xs text-ink/60">Subscription is the final consolidated NSE and BSE figure once bidding closes. Listing dates are expected dates until the exchange confirms them. GMP figures are entered by hand from a named source; open a figure for its source and date on the <Link to="/ipo-gmp" className="text-brand hover:underline">IPO GMP page</Link>.</p>

        <H>Next 14 days</H>
        {days.length ? (
          <div className="border-y border-ink/10">
            {days.map((d) => (
              <div key={d} className="grid gap-2 border-b border-ink/10 py-2.5 last:border-0 sm:grid-cols-[110px_1fr]">
                <div className="num text-sm font-semibold">{weekday(d)}</div>
                <ul className="space-y-1 text-sm">
                  {events.filter((e) => e.d === d).map((e) => (
                    <li key={e.i.slug + e.text}><Link to={`/ipos/${e.i.slug}`} className="font-semibold hover:text-brand">{e.i.name.replace(/\s+Limited$/i, '')}</Link> <span className="text-ink/70">{e.text}</span>{e.i.board === 'sme' && <span className="ml-1 text-xs text-ink/50">(SME)</span>}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink/70">No IPO dates in the next 14 days.</p>
        )}

        <H>How IPOs have listed in {year}</H>
        <div className="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">
          {[['Mainboard', main, null], ['SME (NSE Emerge)', sme, '/sme-ipo-gmp']].map(([name, s, link]) => (
            <div key={name} className="bg-paper p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{name}</h3>
                {link && <Link to={link} className="text-xs text-brand hover:underline">SME detail</Link>}
              </div>
              {s.n ? (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-ink/60">Listed</dt><dd className="num text-lg font-semibold">{s.n}</dd></div>
                  <div><dt className="text-xs text-ink/60">Below issue price</dt><dd className="num text-lg font-semibold">{s.below} <span className="text-xs font-normal text-ink/60">({((s.below / s.n) * 100).toFixed(0)}%)</span></dd></div>
                  <div><dt className="text-xs text-ink/60">Average gain</dt><dd className={`num text-lg font-semibold ${gainClass(s.avg)}`}>{fmt.pct(s.avg)}</dd></div>
                  <div><dt className="text-xs text-ink/60">Median gain</dt><dd className={`num text-lg font-semibold ${gainClass(s.med)}`}>{fmt.pct(s.med)}</dd></div>
                </dl>
              ) : <p className="mt-3 text-sm text-ink/60">No listings yet this year.</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-body text-ink/60">Listing gain is the listing price against the issue price, from NSE, for issues that listed on NSE in {year}. The average is pulled up by a few very large gains, so the median is the better guide to a typical issue.</p>

        {main.n > 0 && (
          <>
            <H>Mainboard listing gain by subscription</H>
            <div className="overflow-x-auto border-y border-ink/10">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                    <th className="px-3 py-2 font-semibold">Final subscription</th>
                    <th className="px-3 py-2 text-right font-semibold">Issues</th>
                    <th className="px-3 py-2 text-right font-semibold">Average listing gain</th>
                    <th className="px-3 py-2 text-right font-semibold">Below issue price</th>
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
            <p className="mt-3 max-w-3xl text-xs leading-body text-ink/60">Only issues with a final subscription figure in our data are counted ({buckets.reduce((a, b) => a + b.count, 0)} of {main.n}). A record of past listings, not a prediction.</p>
          </>
        )}

        <p className="mt-10 max-w-3xl text-sm text-ink/70">
          More: <Link to="/ipo-subscription-status" className="text-brand hover:underline">IPO subscription status</Link>, <Link to="/ipo-gmp" className="text-brand hover:underline">IPO GMP today</Link>, <Link to="/sme-ipo-gmp" className="text-brand hover:underline">SME IPO GMP</Link> and the full <Link to="/ipos" className="text-brand hover:underline">IPO tracker</Link>.
        </p>
      </section>
    </>
  )
}
