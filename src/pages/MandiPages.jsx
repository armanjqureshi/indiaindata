import { Link, useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ChartCard from '../components/ChartCard.jsx'
import DataPanel from '../components/DataTools.jsx'
import NotFound from './NotFound.jsx'
import { useMandi, useMandiIndex, fmt } from '../data/live.js'
import { MANDI_COMMODITIES, MANDI_HUB, bySlug, mandiPath, stateLabel, stateSlug } from '../data/mandi.js'
import { PRICE_PAGES, PRICES_HUB } from '../data/prices.js'

const SRC_NAME = 'Agmarknet, Directorate of Marketing and Inspection (Ministry of Agriculture and Farmers Welfare), through data.gov.in'
const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>
const inr0 = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`)
const perKg = (v) => (v == null ? '—' : `₹${(v / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)
const longDate = (iso) => fmt.date(iso, { day: 'numeric', month: 'long', year: 'numeric' })
// retail-price pages that exist for the same item, to link to
const RETAIL_PAGE = { onion: '/onion-price-today', tomato: '/tomato-price-today', potato: '/potato-price-today' }

// history rows are [date, median, markets]
function changeOver(hist, days) {
  if (!hist || hist.length < 2) return null
  const [lastD, lastV] = hist[hist.length - 1]
  const cutoff = new Date(Date.parse(lastD + 'T00:00:00Z') - days * 864e5).toISOString().slice(0, 10)
  for (let i = hist.length - 2; i >= 0; i--) if (hist[i][0] <= cutoff) return { from: hist[i][0], pct: (lastV / hist[i][1] - 1) * 100 }
  return null
}
const prevDay = (hist) => (hist && hist.length >= 2 ? { from: hist[hist.length - 2][0], pct: (hist[hist.length - 1][1] / hist[hist.length - 2][1] - 1) * 100 } : null)

function Stat({ label, value, sub }) {
  return (
    <div className="bg-panel p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="num mt-1 text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
    </div>
  )
}

function Hero({ crumbs, title, children }) {
  return (
    <section className="border-b border-ink/10 bg-panel">
      <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <p className="text-sm text-ink/60">{crumbs}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
        {children}
      </div>
    </section>
  )
}

function Changes({ hist }) {
  const rows = [['Since the previous day', prevDay(hist)], ['Over 7 days', changeOver(hist, 7)], ['Over 30 days', changeOver(hist, 30)], ['Over a year', changeOver(hist, 365)]].filter(([, c]) => c)
  if (!rows.length) return null
  return (
    <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
      {rows.map(([l, c]) => (
        <p key={l} className="text-sm"><span className="text-ink/60">{l}: </span><span className={`num font-semibold ${c.pct > 0 ? 'text-down' : c.pct < 0 ? 'text-up' : ''}`}>{pct(c.pct)}</span><span className="text-ink/50"> (from {fmt.shortDate(c.from)})</span></p>
      ))}
    </div>
  )
}

function Trend({ title, series }) {
  // series: { name: [[date, value]] }; joined on date
  const names = Object.keys(series)
  const first = series[names[0]] || []
  if (first.length < 2) return null
  const dates = [...new Set(names.flatMap((n) => series[n].map((r) => r[0])))].sort()
  const maps = Object.fromEntries(names.map((n) => [n, Object.fromEntries(series[n].map((r) => [r[0], r[1]]))]))
  const chart = {
    type: 'line',
    title,
    subtitle: '₹ a quintal, median of market modal prices, daily',
    source: 'Agmarknet via data.gov.in',
    xKey: 'date',
    dataKeys: names,
    unit: '',
    data: dates.map((d) => ({ date: fmt.shortDate(d), ...Object.fromEntries(names.map((n) => [n, maps[n][d] ?? null])) })),
  }
  return <div className="mt-8"><ChartCard chart={chart} sectionSlug="economy" /></div>
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

function About() {
  return (
    <>
      <H>About these prices</H>
      <div className="max-w-3xl space-y-3 leading-body text-ink/80">
        <p>These are wholesale prices at agricultural produce markets (mandis), reported by market committees to Agmarknet and published by the {SRC_NAME}. They are what traders pay at the market, not what you pay at a shop or on an app, which is higher.</p>
        <p>Each market reports a minimum, a maximum and a modal price (the price at which most of the produce sold), in rupees a quintal (100 kg). For each market we take the average modal price across the varieties and grades it reported. The state and all-India figures are the median of those market prices, so one unusual market does not move them. They are not weighted by how much each market sold, because the data does not carry arrivals.</p>
        <p>Not every market reports every day, and the number of markets behind a figure changes from day to day. We drop entries that are far from the day&apos;s median, which are usually typing or unit errors. Reports can be revised later by the markets.</p>
      </div>
    </>
  )
}

const NotTracked = () => <NotFound />

const AGM = 'https://agmarknet.gov.in/'
const mandiDataset = (name, description, path, asOf, liveFile, keywords) => ({
  name, description, path, asOf, liveFile, keywords,
  source: SRC_NAME, sourceUrl: AGM,
  variables: ['Median of market modal prices (Rs a quintal)', 'Minimum price', 'Maximum price', 'Number of reporting mandis'],
})
const HIST_COLS = [{ key: 'date', label: 'Date' }, { key: 'median', label: 'Median modal price (Rs a quintal)' }, { key: 'markets', label: 'Reporting mandis' }]
const histRows = (h) => (h || []).map(([date, median, markets]) => ({ date, median, markets }))

function stateKey(d, stSlug) {
  return Object.keys(d?.latest?.states || {}).find((s) => stateSlug(s) === stSlug)
}

/* ---------- one commodity, all states ---------- */
export function MandiCommodityPage() {
  const { slug } = useParams()
  const c = bySlug[slug]
  const d = useMandi(slug)
  const latest = d?.latest
  useSeo({
    title: c ? `${c.name} mandi price today in India` : MANDI_HUB.title,
    description: c ? `Wholesale ${c.lower} price today at mandis across India: the all-India median and the state-wise prices in rupees a quintal, with the change over time. Source: Agmarknet.` : '',
  })
  if (!c) return <NotTracked />
  const hist = d?.history?.india || []
  const states = latest ? Object.entries(latest.states).map(([s, v]) => ({ s, ...v })).sort((a, b) => b.median - a.median) : []
  const rich = states.filter((x) => x.markets >= 3)
  const hi = rich[0], lo = rich[rich.length - 1]
  const lower = c.lower
  return (
    <>
      <Hero crumbs={<Link to={MANDI_HUB.path} className="hover:text-brand">Mandi prices today</Link>} title={`${c.name} mandi price today`}>
        {latest ? (
          <>
            <p className="num mt-4 text-5xl font-semibold text-brand sm:text-6xl">{inr0(latest.india.median)}<span className="ml-2 text-2xl text-ink/60">a quintal</span></p>
            <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">Median wholesale price of {lower} at {latest.india.markets} mandis in {latest.india.states} states on {longDate(latest.date)}, which is {perKg(latest.india.median)} a kg. Source: Agmarknet.</p>
          </>
        ) : (
          <p className="mt-3 text-lg text-ink/80">The latest prices are loading.</p>
        )}
      </Hero>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        {latest && (
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
            <Stat label="All-India median" value={`${inr0(latest.india.median)}/qtl`} sub={`${perKg(latest.india.median)} a kg, ${longDate(latest.date)}`} />
            <Stat label="Dearest state" value={hi ? `${inr0(hi.median)}/qtl` : '—'} sub={hi ? `${stateLabel(hi.s)}, ${hi.markets} mandis` : null} />
            <Stat label="Cheapest state" value={lo ? `${inr0(lo.median)}/qtl` : '—'} sub={lo ? `${stateLabel(lo.s)}, ${lo.markets} mandis` : null} />
          </div>
        )}
        <Changes hist={hist} />
        <Trend title={`${c.name}: all-India median wholesale price`} series={{ 'All-India': hist.map((r) => [r[0], r[1]]) }} />

        <H>{c.name} price by state</H>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2 text-right">Median a quintal</th>
                <th className="hidden px-3 py-2 text-right sm:table-cell">Median a kg</th>
                <th className="px-3 py-2 text-right">Mandis</th>
              </tr>
            </thead>
            <tbody>
              {states.map((x) => (
                <tr key={x.s} className="border-b border-ink/10 last:border-0">
                  <td className="px-3 py-2 font-semibold">{x.markets >= 3 ? <Link to={mandiPath(c, x.s)} className="hover:text-brand">{stateLabel(x.s)}</Link> : stateLabel(x.s)}</td>
                  <td className="num px-3 py-2 text-right">{inr0(x.median)}</td>
                  <td className="num hidden px-3 py-2 text-right sm:table-cell">{perKg(x.median)}</td>
                  <td className="num px-3 py-2 text-right">{x.markets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">Median of market modal prices in each state. States with fewer than three reporting mandis are listed without a page.</p>

        <p className="mt-6 text-sm">
          {RETAIL_PAGE[slug] && <><Link to={RETAIL_PAGE[slug]} className="text-brand hover:underline">{c.name} retail price today</Link> · </>}
          <Link to={MANDI_HUB.path} className="text-brand hover:underline">All mandi prices</Link>
        </p>

        <Faq items={[
          [`What is the mandi price of ${lower} today?`, latest ? `The median wholesale price of ${lower} was ${inr0(latest.india.median)} a quintal (${perKg(latest.india.median)} a kg) across ${latest.india.markets} mandis on ${longDate(latest.date)}, according to Agmarknet data.` : 'This page shows the latest figure from Agmarknet.'],
          [`Which state has the highest ${lower} price?`, hi ? `On ${longDate(latest.date)}, ${stateLabel(hi.s)} had the highest state median at ${inr0(hi.median)} a quintal, and ${stateLabel(lo.s)} the lowest at ${inr0(lo.median)} (states with at least three reporting mandis).` : 'See the state table above.'],
          ['Is the mandi price what I pay at the shop?', `No. The mandi price is what traders pay at the wholesale market. Retail prices add transport, handling, market fees and the seller's margin, so they are usually higher.`],
          ['How often is this updated?', 'Daily. Markets report through the day and the data refreshes overnight, so a day can be revised until the next morning.'],
        ]} />
        {latest && (
          <DataPanel
            dataset={mandiDataset(`${c.name} mandi prices in India, by state`, `Daily wholesale ${lower} prices at agricultural markets (mandis) across India: the all-India and state-wise median of market modal prices in rupees a quintal, with the number of reporting mandis. From Agmarknet via data.gov.in, compiled by India in Data.`, mandiPath(c), latest.date, `live/mandi/${slug}.json`, [`${lower} mandi price`, `${lower} price today`])}
            csv={[
              { filename: `india-in-data-${slug}-mandi-price-by-state-${latest.date}`, label: 'State-wise prices today (CSV)', columns: [{ key: 'state', label: 'State' }, { key: 'median', label: 'Median modal price (Rs a quintal)' }, { key: 'min', label: 'Lowest minimum price' }, { key: 'max', label: 'Highest maximum price' }, { key: 'markets', label: 'Reporting mandis' }, { key: 'date', label: 'Date' }], rows: states.map((x) => ({ state: stateLabel(x.s), median: x.median, min: x.min, max: x.max, markets: x.markets, date: latest.date })) },
              { filename: `india-in-data-${slug}-mandi-price-history`, label: 'All-India daily history (CSV)', columns: HIST_COLS, rows: histRows(hist) },
            ]}
          />
        )}
        <About />
      </section>
    </>
  )
}

/* ---------- one commodity in one state ---------- */
export function MandiStatePage() {
  const { slug, state: stSlug } = useParams()
  const c = bySlug[slug]
  const d = useMandi(slug, stSlug)
  const st = stateKey(d, stSlug)
  const label = st ? stateLabel(st) : stSlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  useSeo({
    title: c ? `${c.name} price in ${label} today: mandi rates` : MANDI_HUB.title,
    description: c ? `Wholesale ${c.lower} price in ${label} today: the state median, rates at individual mandis in rupees a quintal, and how it compares with the all-India price. Source: Agmarknet.` : '',
  })
  if (!c) return <NotTracked />
  const v = st ? d.latest.states[st] : null
  const india = d?.latest?.india
  const hist = (st && d.history?.states?.[st]) || []
  const list = v?.list || []
  const cheap = [...list].sort((a, b) => a.modal - b.modal)[0]
  const dear = list[0]
  const gap = v && india ? (v.median / india.median - 1) * 100 : null
  const lower = c.lower
  return (
    <>
      <Hero crumbs={<><Link to={MANDI_HUB.path} className="hover:text-brand">Mandi prices today</Link> / <Link to={mandiPath(c)} className="hover:text-brand">{c.name}</Link></>} title={`${c.name} price in ${label} today`}>
        {v ? (
          <>
            <p className="num mt-4 text-5xl font-semibold text-brand sm:text-6xl">{inr0(v.median)}<span className="ml-2 text-2xl text-ink/60">a quintal</span></p>
            <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">Median wholesale price of {lower} at {v.markets} mandis in {label} on {longDate(d.latest.date)}, which is {perKg(v.median)} a kg. Source: Agmarknet.</p>
          </>
        ) : (
          <p className="mt-3 text-lg text-ink/80">{d ? `There is no recent ${lower} price for ${label}.` : 'The latest prices are loading.'}</p>
        )}
      </Hero>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        {v && (
          <>
            <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
              <Stat label={`${label} median`} value={`${inr0(v.median)}/qtl`} sub={`${v.markets} mandis reporting`} />
              <Stat label="All-India median" value={`${inr0(india.median)}/qtl`} sub={`${label} is ${pct(gap)} against it`} />
              <Stat label="Range across mandis" value={`${inr0(cheap?.modal)} to ${inr0(dear?.modal)}`} sub="lowest and highest market modal price" />
            </div>
            <Changes hist={hist} />
            <Trend title={`${c.name} in ${label}: median wholesale price`} series={{ [label]: hist.map((r) => [r[0], r[1]]), 'All-India': d.history.india.map((r) => [r[0], r[1]]).filter((r) => hist.some((h) => h[0] === r[0])) }} />

            <H>{c.name} price at mandis in {label}</H>
            <div className="overflow-x-auto border-y border-ink/10">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                    <th className="px-3 py-2">Mandi</th>
                    <th className="hidden px-3 py-2 sm:table-cell">District</th>
                    <th className="px-3 py-2 text-right">Min</th>
                    <th className="px-3 py-2 text-right">Max</th>
                    <th className="px-3 py-2 text-right">Modal</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((m) => (
                    <tr key={`${m.district}|${m.market}`} className="border-b border-ink/10 last:border-0">
                      <td className="px-3 py-2 font-semibold">{m.market}</td>
                      <td className="hidden px-3 py-2 sm:table-cell">{m.district}</td>
                      <td className="num px-3 py-2 text-right">{inr0(m.min)}</td>
                      <td className="num px-3 py-2 text-right">{inr0(m.max)}</td>
                      <td className="num px-3 py-2 text-right">{inr0(m.modal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink/60">Rupees a quintal (100 kg), {longDate(d.latest.date)}.{v.markets > list.length ? ` The ${list.length} dearest of ${v.markets} mandis are shown.` : ''} Modal is the price at which most of the produce sold.</p>
          </>
        )}
        <p className="mt-6 text-sm">
          <Link to={mandiPath(c)} className="text-brand hover:underline">{c.name} price in all states</Link>
          {RETAIL_PAGE[slug] && <> · <Link to={RETAIL_PAGE[slug]} className="text-brand hover:underline">{c.name} retail price today</Link></>}
        </p>

        <Faq items={[
          [`What is the price of ${lower} in ${label} today?`, v ? `The median wholesale price of ${lower} in ${label} was ${inr0(v.median)} a quintal (${perKg(v.median)} a kg) across ${v.markets} mandis on ${longDate(d.latest.date)}, per Agmarknet data.` : `See the table for the latest figure.`],
          [`Which mandi in ${label} has the cheapest ${lower}?`, cheap ? `${cheap.market} (${cheap.district}) had the lowest modal price among the mandis listed, at ${inr0(cheap.modal)} a quintal. The dearest was ${dear.market} (${dear.district}) at ${inr0(dear.modal)}.` : 'See the table for the mandis.'],
          [`Is ${label} dearer than the rest of India?`, v && india ? `${label}'s median of ${inr0(v.median)} a quintal is ${pct(gap)} against the all-India median of ${inr0(india.median)}.` : 'See the figures above.'],
          ['Is the mandi price what I pay at the shop?', 'No. The mandi price is what traders pay at the wholesale market. Retail prices add transport, market fees and the seller’s margin, so they are higher.'],
        ]} />
        {v && (
          <DataPanel
            dataset={mandiDataset(`${c.name} mandi prices in ${label}`, `Daily wholesale ${lower} prices at mandis in ${label}: minimum, maximum and modal price at each reporting market, and the state median, in rupees a quintal. From Agmarknet via data.gov.in, compiled by India in Data.`, mandiPath(c, st), d.latest.date, `live/mandi/${slug}.json`, [`${lower} price in ${label}`, `${lower} mandi rate ${label}`])}
            csv={[
              { filename: `india-in-data-${slug}-${stSlug}-mandi-prices-${d.latest.date}`, label: `Mandi-wise prices in ${label} (CSV)`, columns: [{ key: 'market', label: 'Mandi' }, { key: 'district', label: 'District' }, { key: 'min', label: 'Min (Rs a quintal)' }, { key: 'max', label: 'Max (Rs a quintal)' }, { key: 'modal', label: 'Modal (Rs a quintal)' }, { key: 'date', label: 'Date' }], rows: list.map((m) => ({ ...m, date: d.latest.date })) },
              { filename: `india-in-data-${slug}-${stSlug}-mandi-price-history`, label: `${label} daily history (CSV)`, columns: HIST_COLS, rows: histRows(hist) },
            ]}
          />
        )}
        <About />
      </section>
    </>
  )
}

/* ---------- hub ---------- */
export function MandiHub() {
  const idx = useMandiIndex()
  useSeo({
    title: 'Mandi prices today in India: onion, tomato, potato, wheat and more',
    description: 'Wholesale mandi prices today for onion, tomato, potato, garlic, ginger, vegetables, wheat and pulses, by state, in rupees a quintal. Daily data from Agmarknet.',
  })
  const items = idx?.items || {}
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Mandi prices today</h1>
          <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">Wholesale prices of vegetables, wheat and pulses at mandis across India{idx?.asOf ? <> on {longDate(idx.asOf)}</> : ''}, in rupees a quintal. Pick a commodity to see every state and mandi. Data from Agmarknet.</p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
          {MANDI_COMMODITIES.map((c) => {
            const x = items[c.slug]
            const ch = x?.prev ? { from: x.prev.date, pct: (x.median / x.prev.median - 1) * 100 } : null
            return (
              <Link key={c.slug} to={mandiPath(c)} className="bg-panel p-4 transition-colors hover:bg-raise">
                <p className="text-sm text-ink/70">{c.name}</p>
                <p className="num mt-1 text-2xl font-semibold">{inr0(x?.median)}<span className="text-sm font-normal text-ink/50">/qtl</span></p>
                {ch && <p className={`num mt-1 text-xs ${ch.pct > 0 ? 'text-down' : ch.pct < 0 ? 'text-up' : 'text-ink/50'}`}>{pct(ch.pct)} since {fmt.shortDate(ch.from)}</p>}
              </Link>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-ink/60">Median of market modal prices across all reporting mandis, rupees a quintal (100 kg). Change is against the previous day.</p>
        <p className="mt-4 text-sm"><Link to={PRICES_HUB.path} className="text-brand hover:underline">Retail food prices today</Link></p>
        <DataPanel
          dataset={mandiDataset('Mandi prices today in India', 'Daily all-India median wholesale prices at agricultural markets (mandis) for onion, tomato, potato, garlic, ginger and other vegetables, wheat and pulses, in rupees a quintal. From Agmarknet via data.gov.in, compiled by India in Data.', MANDI_HUB.path, idx?.asOf, 'live/mandi-index.json', ['mandi prices today', 'mandi bhav'])}
          csv={{ filename: `india-in-data-mandi-prices-${idx?.asOf || 'latest'}`, label: 'All commodities today (CSV)', columns: [{ key: 'name', label: 'Commodity' }, { key: 'median', label: 'All-India median modal price (Rs a quintal)' }, { key: 'markets', label: 'Reporting mandis' }, { key: 'states', label: 'States' }, { key: 'date', label: 'Date' }], rows: MANDI_COMMODITIES.filter((c) => items[c.slug]).map((c) => ({ ...items[c.slug], name: c.name })) }}
        />
        <About />
      </section>
    </>
  )
}
