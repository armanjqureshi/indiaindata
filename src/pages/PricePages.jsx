import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ChartCard from '../components/ChartCard.jsx'
import { usePrices, fmt } from '../data/live.js'
import { STAPLES, PRICE_GROUPS, PRICE_PAGES, OIL_PAGE, PRICES_HUB, unitOf } from '../data/prices.js'

const SRC_NAME = 'Department of Consumer Affairs, Price Monitoring Division'
const SRC_URL = 'https://fcainfoweb.nic.in/'
const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>
const r2 = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)
const longDate = (iso) => fmt.date(iso, { day: 'numeric', month: 'long', year: 'numeric' })
const bySlugDoca = Object.fromEntries(STAPLES.map((s) => [s.doca, s]))

// Retail price change against the latest entry at least `days` days before the newest one.
function changeOver(hist, days) {
  if (!hist || hist.length < 2) return null
  const [lastD, lastV] = hist[hist.length - 1]
  const cutoff = new Date(Date.parse(lastD + 'T00:00:00Z') - days * 864e5).toISOString().slice(0, 10)
  for (let i = hist.length - 2; i >= 0; i--) if (hist[i][0] <= cutoff) return { from: hist[i][0], pct: (lastV / hist[i][1] - 1) * 100 }
  return null
}
const prevReport = (hist) => (hist && hist.length >= 2 ? { from: hist[hist.length - 2][0], pct: (hist[hist.length - 1][1] / hist[hist.length - 2][1] - 1) * 100 } : null)

function useStaple(doca) {
  const p = usePrices()
  const retail = p.retail?.prices?.[doca] ?? null
  const wholesaleQtl = p.wholesale?.prices?.[doca] ?? null
  const hist = p.history?.retail?.[doca] || []
  return { p, retail, wholesaleQtl, wholesaleKg: wholesaleQtl == null ? null : wholesaleQtl / 100, hist, asOf: p.retail?.asOf, wAsOf: p.wholesale?.asOf }
}

function Hero({ title, children }) {
  return (
    <section className="border-b border-ink/10 bg-panel">
      <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <p className="text-sm text-ink/60"><Link to={PRICES_HUB.path} className="hover:text-brand">Food prices today</Link></p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
        {children}
      </div>
    </section>
  )
}

function Faq({ items }) {
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <H>Questions</H>
      <div className="max-w-3xl space-y-4">
        {items.map(([q, a]) => (
          <div key={q}>
            <h3 className="font-semibold">{q}</h3>
            <p className="mt-1 leading-body text-ink/80">{a}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function About({ firstDay }) {
  return (
    <>
      <H>About these prices</H>
      <div className="max-w-3xl space-y-3 leading-body text-ink/80">
        <p>These are all-India averages published every day by the {SRC_NAME}, from prices reported by 555 market centres. Each centre reports the fair average quality it usually sells, so the variety can differ from city to city.</p>
        <p>Retail prices are in rupees a kilo (milk in rupees a litre). Wholesale prices are published in rupees a quintal (100 kg); we also show them a kilo. Prices reported on Saturdays, Sundays and holidays are provisional until the department verifies them on the next working day.</p>
        <p>The department’s city-by-city report is not openly downloadable, so these pages show the national average. Your local price can be higher or lower. {firstDay && <>We have recorded the daily figure since {longDate(firstDay)}.</>}</p>
        <p className="text-sm">Source: <a href={SRC_URL} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{SRC_NAME}</a>. Changes, the wholesale price a kilo and the retail-over-wholesale gap are our calculations. See our <Link to="/methodology" className="text-brand hover:underline">methodology</Link>.</p>
      </div>
    </>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-panel p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="num mt-1 text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
    </div>
  )
}

function Changes({ hist }) {
  const rows = [['Since the previous report', prevReport(hist)], ['Over 7 days', changeOver(hist, 7)], ['Over 30 days', changeOver(hist, 30)], ['Over a year', changeOver(hist, 365)]].filter(([, c]) => c)
  if (!rows.length) return <p className="mt-3 max-w-3xl text-sm text-ink/60">Changes over time will appear here as we record the price each day.</p>
  return (
    <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
      {rows.map(([l, c]) => (
        <p key={l} className="text-sm"><span className="text-ink/60">{l}: </span><span className={`num font-semibold ${c.pct > 0 ? 'text-down' : c.pct < 0 ? 'text-up' : ''}`}>{pct(c.pct)}</span><span className="text-ink/50"> (from {fmt.shortDate(c.from)})</span></p>
      ))}
    </div>
  )
}

function HistoryChart({ name, hist, unit }) {
  if (!hist || hist.length < 2) return null
  const chart = {
    type: 'line',
    title: `${name}: all-India average retail price`,
    subtitle: `₹ a ${unit}, daily`,
    source: SRC_NAME,
    xKey: 'date',
    dataKeys: ['price'],
    unit: '',
    data: hist.map(([d, v]) => ({ date: fmt.shortDate(d), price: v })),
  }
  return <div className="mt-8"><ChartCard chart={chart} sectionSlug="economy" /></div>
}

function GroupTable({ p, items, highlight }) {
  return (
    <div className="overflow-x-auto border-y border-ink/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2 text-right">Retail</th>
            <th className="px-3 py-2 text-right">Wholesale a kg</th>
            <th className="hidden px-3 py-2 text-right sm:table-cell">Wholesale a quintal</th>
            <th className="px-3 py-2 text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => {
            const v = p.retail?.prices?.[s.doca], w = p.wholesale?.prices?.[s.doca]
            const c = prevReport(p.history?.retail?.[s.doca])
            return (
              <tr key={s.doca} className={`border-b border-ink/10 last:border-0 ${highlight === s.doca ? 'bg-brand/5' : ''}`}>
                <td className="px-3 py-2 font-semibold">{s.path ? <Link to={s.path} className="hover:text-brand">{s.name}</Link> : s.name}</td>
                <td className="num px-3 py-2 text-right">{v == null ? '—' : `${r2(v)}/${unitOf(s)}`}</td>
                <td className="num px-3 py-2 text-right">{w == null ? '—' : r2(w / 100)}</td>
                <td className="num hidden px-3 py-2 text-right sm:table-cell">{w == null ? '—' : r2(w)}</td>
                <td className={`num px-3 py-2 text-right ${c?.pct > 0 ? 'text-down' : c?.pct < 0 ? 'text-up' : 'text-ink/50'}`}>{c ? pct(c.pct) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- one item ---------- */
export function StaplePricePage({ path }) {
  const page = PRICE_PAGES.find((x) => x.path === path)
  const s = bySlugDoca[page.doca]
  const unit = unitOf(s)
  const label = s.short || s.name
  const { p, retail, wholesaleQtl, wholesaleKg, hist, asOf, wAsOf } = useStaple(page.doca)
  useSeo({
    title: page.title,
    description: `All-India average retail and wholesale price of ${label.toLowerCase()} today, updated daily from the Department of Consumer Affairs, with the change over time and other staples.`,
  })
  const gap = retail != null && wholesaleKg ? (retail / wholesaleKg - 1) * 100 : null
  const siblings = STAPLES.filter((x) => x.group === s.group)
  const lower = label.toLowerCase()
  return (
    <>
      <Hero title={page.h1}>
        {retail != null ? (
          <>
            <p className="num mt-4 text-5xl font-semibold text-brand sm:text-6xl">{r2(retail)}<span className="ml-2 text-2xl text-ink/60">a {unit}</span></p>
            <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">All-India average retail price of {lower} on {longDate(asOf)}, from the {SRC_NAME}.</p>
          </>
        ) : (
          <p className="mt-3 text-lg text-ink/80">The latest price is loading.</p>
        )}
      </Hero>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
          <Stat label="Retail, all-India average" value={`${r2(retail)}/${unit}`} sub={asOf ? longDate(asOf) : null} />
          <Stat label="Wholesale, all-India average" value={`${r2(wholesaleKg)}/${unit}`} sub={wholesaleQtl != null ? `${r2(wholesaleQtl)} a quintal${wAsOf && wAsOf !== asOf ? `, ${longDate(wAsOf)}` : ''}` : null} />
          <Stat label="Retail above wholesale" value={pct(gap)} sub="gap between shop and wholesale prices" />
        </div>
        <Changes hist={hist} />
        <HistoryChart name={label} hist={hist} unit={unit} />

        <H>{PRICE_GROUPS.find((g) => g.key === s.group).name} today</H>
        <GroupTable p={p} items={siblings} highlight={s.doca} />
        <p className="mt-3 text-sm"><Link to={PRICES_HUB.path} className="text-brand hover:underline">All {STAPLES.length} staples</Link>{s.group === 'oils' ? '' : <> · <Link to={OIL_PAGE.path} className="text-brand hover:underline">Edible oil prices</Link></>}</p>

        <Faq items={[
          [`What is the price of ${lower} today?`, retail != null ? `The all-India average retail price of ${lower} was ${r2(retail)} a ${unit} on ${longDate(asOf)}, according to the Department of Consumer Affairs.${wholesaleQtl != null ? ` The average wholesale price was ${r2(wholesaleQtl)} a quintal, or ${r2(wholesaleKg)} a ${unit}.` : ''}` : `The department publishes the all-India average every day; this page shows the latest figure.`],
          [`Why is ${lower} cheaper or dearer in my city?`, `The figure is an average of prices reported by 555 market centres across India. Prices differ by city, market and quality, so the price in your area can be above or below it.`],
          ['How often is this price updated?', 'Every day. The department publishes new figures each evening, and prices reported on Saturdays, Sundays and holidays are provisional until verified on the next working day.'],
        ]} />
        <About firstDay={hist[0]?.[0]} />
      </section>
    </>
  )
}

/* ---------- edible oils ---------- */
export function EdibleOilPricePage() {
  const p = usePrices()
  const oils = STAPLES.filter((s) => s.group === 'oils')
  const asOf = p.retail?.asOf
  const ranked = oils.map((s) => ({ s, v: p.retail?.prices?.[s.doca] })).filter((x) => x.v != null).sort((a, b) => b.v - a.v)
  useSeo({ title: OIL_PAGE.title, description: 'All-India average retail and wholesale prices of mustard, groundnut, sunflower, soya and palm oil and vanaspati today, updated daily from the Department of Consumer Affairs.' })
  const hi = ranked[0], lo = ranked[ranked.length - 1]
  return (
    <>
      <Hero title={OIL_PAGE.h1}>
        <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">
          {hi && lo ? <>On {longDate(asOf)}, {hi.s.name.split(',')[0].toLowerCase()} was the dearest packed oil at {r2(hi.v)} a kg and {lo.s.name.split(',')[0].toLowerCase()} the cheapest at {r2(lo.v)}, as all-India averages from the {SRC_NAME}.</> : 'The latest prices are loading.'}
        </p>
      </Hero>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>Packed edible oils today</H>
        <GroupTable p={p} items={ranked.map((x) => x.s)} />
        <Faq items={[
          ['What is the price of mustard oil today?', p.retail?.prices?.['Mustard Oil (Packed)'] != null ? `The all-India average retail price of packed mustard oil was ${r2(p.retail.prices['Mustard Oil (Packed)'])} a kg on ${longDate(asOf)}, according to the Department of Consumer Affairs.` : 'See the table for the latest figure.'],
          ['Which cooking oil is cheapest?', lo ? `Among the oils the department tracks, packed ${lo.s.name.split(',')[0].toLowerCase()} had the lowest all-India average retail price, ${r2(lo.v)} a kg, on ${longDate(asOf)}.` : 'See the table for the latest figures.'],
          ['Are these prices for a litre or a kilo?', 'The department reports packed oil prices in rupees a kilo. A litre of oil weighs a little less than a kilo, about 0.91 kg, so the price a litre is lower.'],
        ]} />
        <About firstDay={p.history?.retail?.['Mustard Oil (Packed)']?.[0]?.[0]} />
      </section>
    </>
  )
}

/* ---------- hub ---------- */
export function FoodPricesHub() {
  const p = usePrices()
  const asOf = p.retail?.asOf
  useSeo({ title: PRICES_HUB.title, description: `All-India average retail and wholesale prices of ${STAPLES.length} kitchen staples today: tomato, onion, potato, rice, atta, dals, edible oils, sugar and milk. Updated daily from the Department of Consumer Affairs.` })
  const cards = [...PRICE_PAGES.map((x) => ({ path: x.path, doca: x.doca, label: bySlugDoca[x.doca].short || bySlugDoca[x.doca].name })), { path: OIL_PAGE.path, doca: 'Mustard Oil (Packed)', label: 'Edible oils', sub: 'mustard oil' }]
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">{PRICES_HUB.h1}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">All-India average prices of {STAPLES.length} kitchen staples{asOf ? <> on {longDate(asOf)}</> : ''}, published daily by the {SRC_NAME}.</p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
          {cards.map((c, i) => {
            const s = bySlugDoca[c.doca], v = p.retail?.prices?.[c.doca], ch = prevReport(p.history?.retail?.[c.doca])
            return (
              <Link key={c.path} to={c.path} className={`bg-panel p-4 transition-colors hover:bg-raise ${i === cards.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}>
                <p className="text-sm text-ink/70">{c.label}{c.sub && <span className="text-ink/50"> ({c.sub})</span>}</p>
                <p className="num mt-1 text-2xl font-semibold">{r2(v)}<span className="text-sm font-normal text-ink/50">/{unitOf(s)}</span></p>
                {ch && <p className={`num mt-1 text-xs ${ch.pct > 0 ? 'text-down' : ch.pct < 0 ? 'text-up' : 'text-ink/50'}`}>{pct(ch.pct)} since {fmt.shortDate(ch.from)}</p>}
              </Link>
            )
          })}
        </div>
        {PRICE_GROUPS.map((g) => (
          <div key={g.key}>
            <H>{g.name}</H>
            <GroupTable p={p} items={STAPLES.filter((s) => s.group === g.key)} />
          </div>
        ))}
        <p className="mt-3 text-xs text-ink/60">Retail in ₹ a kg (milk ₹ a litre). Wholesale is published in ₹ a quintal (100 kg); “wholesale a kg” is that figure divided by 100. Change is against the previous report.</p>
        <About firstDay={p.history?.retail?.Tomato?.[0]?.[0]} />
      </section>
    </>
  )
}
