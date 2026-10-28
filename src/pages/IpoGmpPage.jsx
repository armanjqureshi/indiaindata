import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts'
import useSeo from '../components/Seo.jsx'
import NotFound from './NotFound.jsx'
import { useIpos, useGmp, gmpFor, useLive, useTodayIST, ipoStatus, istDateOf, fetchLive, fmt, getDetailSnapshot, getRowSnapshot } from '../data/live.js'
import { gainClass, priceLabel, dateRange } from '../components/ipo/ipoUtil.js'

const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>

export default function IpoGmpPage() {
  const { slug } = useParams()
  const index = useIpos()
  const gmpData = useGmp()
  const [archiveRow, setArchiveRow] = useState(null)
  const fromIndex = index.ipos.find((i) => i.slug === slug) || getRowSnapshot(slug) || null
  useEffect(() => {
    if (!fromIndex) fetchLive('live/ipos-archive.json').then((d) => setArchiveRow(d?.ipos?.find((i) => i.slug === slug) || null))
  }, [fromIndex, slug])
  const row = fromIndex || archiveRow
  const detail = useLive(`live/ipo/${slug}.json`, getDetailSnapshot(slug) || null)
  const today = useTodayIST(istDateOf(index.updatedAt))
  const name = row?.name?.replace(/\s+Limited$/i, '')
  const { latest, history } = gmpFor(gmpData.entries, slug)

  useSeo({
    title: name ? `${name} IPO GMP today: grey market premium and listing price` : 'IPO not found',
    description: name
      ? `${name} IPO GMP today: reported grey market premium with its source and date, implied listing price, price band, lot size, subscription status and listing date. Unofficial figure, not a forecast.`
      : undefined,
  })

  if (!row) return archiveRow === null && !fromIndex ? <div className="mx-auto max-w-site px-4 py-20 text-center text-sm text-ink/60">Loading…</div> : <NotFound />

  const status = ipoStatus(row, today)
  const price = row.issuePrice || row.priceHigh
  const pct = latest && price ? (latest.gmp / price) * 100 : null
  const implied = latest && price ? price + latest.gmp : null
  const sub = detail?.subscription
  const perLot = latest && row.lotSize ? latest.gmp * row.lotSize : null
  const series = [...history].reverse().map((e) => ({ label: fmt.shortDate(e.asOf) + (e.time ? ` ${e.time}` : ''), gmp: e.gmp }))
  const prev = history.length > 1 ? history[1] : null
  const delta = latest && prev ? latest.gmp - prev.gmp : null
  const trend = delta === null ? null : delta > 0 ? 'Rising' : delta < 0 ? 'Falling' : 'Unchanged'
  const listing = row.timetable?.listing
  const open = status === 'open' || status === 'upcoming' || status === 'closed'

  const faqs = [
    [`What is the ${name} IPO GMP today?`, latest ? `The latest grey market premium we have for ${name} is ${latest.gmp > 0 ? '+' : ''}${fmt.rupees(latest.gmp)} per share${pct !== null ? `, about ${fmt.pct(pct)} of the ${fmt.rupees(price)} ${row.issuePrice ? 'issue price' : 'upper price band'}` : ''}, reported by ${latest.source} on ${fmt.date(latest.asOf)}. It is unofficial and may have changed since.` : `We do not have a grey market premium for ${name} from a source we can name. When one is reported it will appear on this page with its source and date.`],
    [`What is the expected listing price of ${name}?`, implied ? `Adding the reported GMP to the ${row.issuePrice ? 'issue price' : 'upper price band'} gives an implied grey market price of about ${fmt.rupees(implied)}. That is an illustration of what the grey market was saying. It is not a forecast, and the real listing price can be very different.` : `With no reported GMP there is no implied listing price. The ${row.issuePrice ? 'issue price' : 'price band'} is ${priceLabel(row)}.`],
    [`What is the gain per lot at the current GMP?`, perLot !== null ? `One lot is ${fmt.inr(row.lotSize, 0)} shares. At a GMP of ${fmt.rupees(latest.gmp)} the grey market gain is about ${fmt.rupees(perLot)} per lot, before brokerage and tax. It only matters if the shares list at that price, which GMP does not guarantee.` : 'We need both a reported GMP and the lot size to show this. It will appear once a GMP is reported.'],
    [`Is the ${name} GMP rising or falling?`, trend ? `Compared with the previous report, it is ${trend.toLowerCase()}${delta ? ` (${delta > 0 ? '+' : ''}${fmt.rupees(delta)})` : ''}. A change between two reports is not a trend, and GMP can reverse within hours.` : 'We have one report so far, so we cannot say. A trend needs at least two dated reports.'],
    [`When does ${name} list?`, listing ? `${name} is expected to list on ${fmt.date(listing)}${row.timetable?.expected?.listing ? ', based on the SEBI T+3 timetable. The exchange confirms the date.' : '.'}` : 'The listing date has not been announced yet.'],
    ['Is GMP guaranteed?', 'No. GMP is an unofficial, unverified figure from dealers in an informal market. It can change within hours and has often been far from the actual listing price. Read the offer document and do not rely on GMP alone. This is not investment advice.'],
  ]

  return (
    <>
      <header className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <p className="text-sm text-ink/60"><Link to="/ipo-gmp" className="hover:text-brand">IPO GMP today</Link></p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-5xl">{name} IPO GMP today</h1>
          <p className="mt-3 max-w-2xl leading-body text-ink/70">
            Reported grey market premium for the {name} IPO, with the source and date. Unofficial and unverified.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <section className="mt-8 rounded-xl border border-ink/10 bg-panel p-5">
          {latest ? (
            <>
              <p className="text-sm text-ink/60">Reported GMP</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className={`num text-4xl font-semibold ${gainClass(latest.gmp)}`}>{latest.gmp > 0 ? '+' : ''}{fmt.rupees(latest.gmp)}</span>
                {pct !== null && <span className={`num text-xl font-semibold ${gainClass(pct)}`}>{fmt.pct(pct)}</span>}
                {implied && <span className="text-sm text-ink/70">implied price <span className="num font-semibold text-ink">{fmt.rupees(implied)}</span></span>}
                {trend && <span className={`rounded-[2px] px-1.5 py-0.5 text-xs font-semibold ${trend === 'Rising' ? 'bg-up/15 text-up' : trend === 'Falling' ? 'bg-down/15 text-down' : 'bg-ink/10 text-ink/70'}`}>{trend}{delta ? ` ${delta > 0 ? '+' : ''}${fmt.rupees(delta)} since previous report` : ''}</span>}
              </p>
              {perLot !== null && (
                <p className="mt-2 text-sm text-ink/80">
                  Illustrative grey market gain per lot ({fmt.inr(row.lotSize, 0)} shares): <span className={`num font-semibold ${gainClass(perLot)}`}>{perLot > 0 ? '+' : ''}{fmt.rupees(perLot)}</span>, before costs and tax. Not a profit you can count on.
                </p>
              )}
              <p className="mt-2 text-sm text-ink/70">
                Per {latest.sourceUrl ? <a href={latest.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="text-brand hover:underline">{latest.source}</a> : latest.source}, {fmt.date(latest.asOf)}{latest.time ? `, ${latest.time} IST` : ''}.
                {latest.note ? ` ${latest.note}` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">No GMP reported yet</p>
              <p className="mt-1 text-sm leading-body text-ink/70">We only publish a grey market premium when we can name where it came from. Check back, as figures often appear once bidding opens.</p>
            </>
          )}
          <p className="mt-3 rounded-sm border border-down/40 bg-down/10 px-3 py-2 text-xs leading-body">
            GMP is not published by any exchange or regulator. It can change in hours and can be wrong. It is not a forecast of the listing price. Not investment advice.
          </p>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 md:grid-cols-4">
          {[
            [row.issuePrice ? 'Issue price' : 'Price band', priceLabel(row)],
            ['Lot size', row.lotSize ? `${fmt.inr(row.lotSize, 0)} shares${row.lotValue ? `, ${fmt.rupees(row.lotValue)}` : ''}` : '—'],
            ['Bidding', dateRange(row)],
            ['Allotment', row.timetable?.allotment ? `${fmt.date(row.timetable.allotment)}${row.timetable.expected?.allotment ? ' (expected)' : ''}` : '—'],
            ['Listing', listing ? `${fmt.date(listing)}${row.timetable?.expected?.listing ? ' (expected)' : ''}` : '—'],
            ['Issue size', detail?.issueSize?.totalCr ? fmt.crore(detail.issueSize.totalCr) : row.sizeCr ? fmt.crore(row.sizeCr) : '—'],
            ['Subscribed', sub?.total != null ? fmt.times(sub.total) : status === 'upcoming' ? 'Not open yet' : '—'],
            ['Status', { open: 'Open for bidding', upcoming: 'Upcoming', closed: 'Awaiting listing', listed: 'Listed' }[status] || '—'],
          ].map(([l, v]) => (
            <div key={l} className="bg-panel p-3">
              <p className="text-xs text-ink/60">{l}</p>
              <p className="num mt-1 text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>

        <H>{name} GMP chart</H>
        {series.length > 1 ? (
          <div className="h-64 w-full rounded-xl border border-ink/10 bg-panel p-3" role="img" aria-label={`${name} reported GMP over time`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" strokeOpacity={0.3} />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" strokeOpacity={0.3} width={48} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v}`, 'GMP']} contentStyle={{ background: 'var(--tw-panel, #12202c)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 12 }} />
                <Line type="monotone" dataKey="gmp" stroke="#ff9a3c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : implied && row.priceLow ? (
          <>
            <div className="h-64 w-full rounded-xl border border-ink/10 bg-panel p-3" role="img" aria-label={`${name} price band against the implied grey market price`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { label: 'Lower band', v: row.priceLow, c: '#6b8aa6' },
                  { label: row.issuePrice ? 'Issue price' : 'Upper band', v: price, c: '#6b8aa6' },
                  { label: 'Implied by GMP', v: implied, c: '#ff9a3c' },
                ].filter((d, k) => !(row.issuePrice && k === 0))} margin={{ top: 22, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" strokeOpacity={0.3} />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} stroke="currentColor" strokeOpacity={0.3} width={56} domain={[0, 'dataMax']} tickFormatter={(v) => `₹${v}`} />
                  <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                    {[0, 1, 2].map((k) => <Cell key={k} fill={k === 2 ? '#ff9a3c' : '#6b8aa6'} />)}
                    <LabelList dataKey="v" position="top" formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} style={{ fontSize: 11, fill: 'currentColor' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-ink/60">One report so far, so this shows the price band against the price the reported GMP implies. The trend line appears once there are two or more dated reports.</p>
          </>
        ) : (
          <p className="text-sm leading-body text-ink/70">The chart appears once a GMP is reported. With two or more dated reports it becomes a trend line.</p>
        )}

        {history.length > 1 && (
          <>
            <H>{name} GMP history</H>
            <div className="overflow-x-auto border-y border-ink/10">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 text-right font-semibold">GMP</th>
                    <th className="px-3 py-2 text-right font-semibold">GMP %</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((e, k) => (
                    <tr key={k} className="border-b border-ink/10 last:border-0">
                      <td className="num px-3 py-2">{fmt.date(e.asOf)}{e.time ? ` ${e.time}` : ''}</td>
                      <td className="num px-3 py-2 text-right">{e.gmp > 0 ? '+' : ''}{fmt.rupees(e.gmp)}</td>
                      <td className="num px-3 py-2 text-right">{price ? fmt.pct((e.gmp / price) * 100) : '—'}</td>
                      <td className="px-3 py-2 text-xs">{e.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {status === 'listed' && row.listingGainPct != null && latest && pct !== null && (
          <p className="mt-6 text-sm leading-body text-ink/80">
            After listing: the last reported GMP was <span className="num font-semibold">{fmt.pct(pct)}</span>. The actual listing gain was <span className={`num font-semibold ${gainClass(row.listingGainPct)}`}>{fmt.pct(row.listingGainPct)}</span>.
          </p>
        )}

        <H>{name} IPO GMP: common questions</H>
        <div className="max-w-3xl space-y-4">
          {faqs.map(([q, a]) => (
            <div key={q}>
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-1 leading-body text-ink/80">{a}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm text-ink/60">
          More on {name}: <Link to={`/ipos/${row.slug}`} className="text-brand hover:underline">full IPO details</Link>, <Link to="/ipo-subscription-status" className="text-brand hover:underline">subscription status</Link>, <Link to="/ipo-gmp" className="text-brand hover:underline">GMP for all IPOs</Link>. Read the <Link to="/disclaimer" className="text-brand hover:underline">disclaimer</Link>.
        </p>
      </div>
    </>
  )
}
