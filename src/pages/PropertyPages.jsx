import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ChartCard from '../components/ChartCard.jsx'
import DataPanel from '../components/DataTools.jsx'
import { useProperty, fmt } from '../data/live.js'
import { PROPERTY_HUB, propertyPath, propertyCity, PROPERTY_TIER_LABEL, SIZE_BANDS } from '../data/property.js'

// City home prices from the National Housing Bank's RESIDEX. Data: live/property-cities.json,
// written by scripts/data/update-property.mjs.

const SOURCE = 'National Housing Bank, RESIDEX'
const SOURCE_URL = 'https://residex.nhbonline.org.in/'
const rs = (v) => (v == null ? '—' : `₹${Math.round(v).toLocaleString('en-IN')}`)
function rupeesShort(v) {
  if (v == null) return '—'
  if (v >= 1e7) return `₹${(v / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} crore`
  return `₹${(v / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 1 })} lakh`
}
const pct = (v, d = 1) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`)
const qLabel = (q) => fmt.date(q, { month: 'long', year: 'numeric' })
const qShort = (q) => fmt.date(q, { month: 'short', year: 'numeric' })
function ord(n) {
  const t = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (t[(v - 20) % 10] || t[v] || t[0])
}
const yearBefore = (q) => `${Number(q.slice(0, 4)) - 1}${q.slice(4)}`

// summary numbers for one city from its series
function summary(c) {
  const a = c.assessment || []
  const last = [...a].reverse().find((x) => x.avg4q?.composite)
  if (!last) return null
  const i = a.indexOf(last)
  const prevQ = a[i - 1]
  const yAgo = a.find((x) => x.q === yearBefore(last.q))
  return {
    q: last.q,
    price: last.avg4q.composite,
    priceQ: last.quarter?.composite ?? null,
    bands: last.avg4q,
    bandsQ: last.quarter,
    index: last.index,
    yoy: yAgo?.index && last.index ? (last.index / yAgo.index - 1) * 100 : null,
    qoq: prevQ?.index && last.index ? (last.index / prevQ.index - 1) * 100 : null,
    priceYoy: yAgo?.avg4q?.composite ? (last.avg4q.composite / yAgo.avg4q.composite - 1) * 100 : null,
  }
}

/* ---------- shared bits ---------- */
const H = ({ children, id }) => <h2 id={id} className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>
function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0 bg-panel p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="num mt-1 text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
    </div>
  )
}
const Change = ({ v }) => <span className={`num ${v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-ink/60'}`}>{pct(v)}</span>

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
        <p>The prices come from the National Housing Bank&apos;s RESIDEX. NHB collects the values that banks and housing finance companies put on homes when they lend against them, and publishes an average price per square foot of carpet area for each city every quarter, along with a house price index (base year 2024-25 = 100). We show the four-quarter moving average, which NHB uses to smooth out quarter-to-quarter noise, and the latest quarter on its own.</p>
        <p>These are valuation prices for the city as a whole, not asking prices from listings and not prices for a particular locality. Carpet area is the usable floor area inside the walls; prices quoted on built-up or super built-up area look lower per square foot for the same home. The percentage changes use NHB&apos;s index, which allows for differences in the mix of homes valued each quarter.</p>
        <p>The long-run chart uses NHB&apos;s earlier series of market prices for homes under construction (base year 2017-18), which ran from June 2013 to September 2024. It measures a different set of homes, so it should not be joined to the current figures.</p>
      </div>
    </>
  )
}

/* ---------- city table ---------- */
function CityTable({ rows }) {
  const [sort, setSort] = useState({ key: 'price', dir: -1 })
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const x = a[sort.key], y = b[sort.key]
    if (x == null) return 1
    if (y == null) return -1
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir
  }), [rows, sort])
  const head = (key, label, num = true) => {
    const on = sort.key === key
    return (
      <th scope="col" aria-sort={on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-semibold ${num ? 'text-right' : ''}`}>
        <button type="button" onClick={() => setSort({ key, dir: on ? -sort.dir : num ? -1 : 1 })} className={`inline-flex items-center gap-1 hover:text-brand ${on ? 'text-ink' : ''}`}>
          {label}<span aria-hidden="true" className="text-[10px]">{on ? (sort.dir > 0 ? '▲' : '▼') : ''}</span>
        </button>
      </th>
    )
  }
  return (
    <div className="overflow-x-auto border-y border-ink/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
            {head('name', 'City', false)}
            {head('price', 'Price per sq ft')}
            {head('yoy', 'In a year')}
            {head('qoq', 'In the quarter')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.slug} className="border-b border-ink/10 last:border-0">
              <td className="px-3 py-2">
                <Link to={propertyPath(c.slug)} className="font-semibold hover:text-brand">{c.name}</Link>
                <span className="block text-xs text-ink/50">{c.region || c.state}</span>
              </td>
              <td className="num px-3 py-2 text-right font-semibold">{rs(c.price)}</td>
              <td className="px-3 py-2 text-right"><Change v={c.yoy} /></td>
              <td className="px-3 py-2 text-right"><Change v={c.qoq} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CSV_COLS = [
  { key: 'name', label: 'City' }, { key: 'state', label: 'State or UT' }, { key: 'regionLabel', label: 'Region' }, { key: 'tierLabel', label: 'Tier' },
  { key: 'quarterEnd', label: 'Quarter ended' }, { key: 'price', label: 'Price, Rs per sq ft carpet (4-quarter average)' }, { key: 'priceQ', label: 'Price, latest quarter' },
  { key: 'small', label: 'Up to 646 sq ft' }, { key: 'mid', label: '646-1,184 sq ft' }, { key: 'large', label: 'Above 1,184 sq ft' },
  { key: 'index', label: 'HPI @ assessment prices (FY 2024-25 = 100)' }, { key: 'yoyR', label: 'Index change in a year (%)' }, { key: 'qoqR', label: 'Index change in the quarter (%)' },
]
const csvRow = (c) => ({ ...c, regionLabel: c.region || '', tierLabel: PROPERTY_TIER_LABEL[c.tier], quarterEnd: c.q, small: c.bands?.small, mid: c.bands?.mid, large: c.bands?.large, yoyR: c.yoy == null ? null : Math.round(c.yoy * 10) / 10, qoqR: c.qoq == null ? null : Math.round(c.qoq * 10) / 10 })

/* ---------- hub ---------- */
export function PropertyHub() {
  const d = useProperty()
  useSeo({
    title: 'Property prices in India: price per sq ft in 50 cities (NHB RESIDEX)',
    description: 'Average home price per square foot of carpet area in 50 Indian cities, from metros to tier 2 and tier 3 cities, with the change over the quarter and the year. Official figures from the National Housing Bank.',
  })
  if (!d) return <section className="mx-auto max-w-site px-4 py-16 sm:px-6"><h1 className="font-display text-4xl font-semibold">Property prices in India</h1><p className="mt-3 text-ink/70">The latest figures are loading.</p></section>
  const rows = d.cities.map((c) => ({ ...c, ...summary(c) })).filter((c) => c.price)
  const byPrice = [...rows].sort((a, b) => b.price - a.price)
  const rising = rows.filter((c) => c.yoy > 0).length
  const fastest = [...rows].filter((c) => c.yoy != null).sort((a, b) => b.yoy - a.yoy)[0]
  const q = d.latestQuarter
  const chart = {
    type: 'bar', title: 'The 12 dearest cities', subtitle: `Rs per sq ft of carpet area, four quarters to ${qLabel(q)}`, source: SOURCE,
    xKey: 'city', dataKeys: ['Price'], unit: '',
    data: byPrice.slice(0, 12).map((c) => ({ city: c.name, Price: Math.round(c.price) })),
  }
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Property prices in India</h1>
          <p className="mt-4 max-w-3xl text-lg leading-body text-ink/80">
            The average price of a home per square foot of carpet area in {rows.length} cities, from the National Housing Bank, for the quarter to {qLabel(q)}. {byPrice[0].name} is the dearest at {rs(byPrice[0].price)}; {byPrice[byPrice.length - 1].name} is the cheapest at {rs(byPrice[byPrice.length - 1].price)}. Prices rose in {rising} of {rows.length} cities over the year, fastest in {fastest.name} ({pct(fastest.yoy)}).
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8"><ChartCard chart={chart} sectionSlug="economy" /></div>
        {[1, 2, 3].map((t) => (
          <div key={t}>
            <H id={`tier-${t}`}>{PROPERTY_TIER_LABEL[t]}</H>
            <CityTable rows={rows.filter((c) => c.tier === t)} />
          </div>
        ))}
        <p className="mt-3 text-xs text-ink/60">Rs per sq ft of carpet area, four-quarter moving average to {qLabel(q)}. Changes are in NHB&apos;s house price index. Tier 1 covers the eight metros and the cities in their metropolitan regions; tier 2, other cities with 10 lakh or more people in the 2011 Census.</p>
        <DataPanel
          dataset={{
            name: 'Home prices per square foot in 50 Indian cities (NHB RESIDEX)',
            description: `Average carpet-area price of homes in Rs per sq ft for ${rows.length} Indian cities, by home size, with NHB's house price index and its quarterly and annual change, quarter ended ${qLabel(q)}. From the National Housing Bank's RESIDEX; compiled by India in Data.`,
            path: PROPERTY_HUB, asOf: q, source: SOURCE, sourceUrl: SOURCE_URL, liveFile: 'live/property-cities.json',
            variables: ['Price per sq ft (carpet area)', 'House price index'], keywords: ['property prices India', 'price per sq ft', 'house price index'],
          }}
          csv={{ filename: `india-in-data-property-prices-${q}`, label: `All ${rows.length} cities (CSV)`, columns: CSV_COLS, rows: byPrice.map(csvRow) }}
        />
        <About />
      </section>
    </>
  )
}

/* ---------- one city ---------- */
export function PropertyCityPage() {
  const { city: slug } = useParams()
  const meta = propertyCity[slug]
  const d = useProperty(slug)
  const name = meta?.name || slug
  useSeo({
    title: `${name} property prices: price per sq ft and trend (NHB)`,
    description: `Average home price per square foot of carpet area in ${name}, by home size, with the change over the quarter and the year, and the long-run trend. Official figures from the National Housing Bank's RESIDEX.`,
  })
  const c = d?.cities?.find((x) => x.slug === slug)
  if (!d || !c) return <section className="mx-auto max-w-site px-4 py-16 sm:px-6"><h1 className="font-display text-4xl font-semibold">{name} property prices</h1><p className="mt-3 text-ink/70">The latest figures are loading.</p></section>
  const s = summary(c)
  const all = d.cities.map((x) => ({ ...x, ...summary(x) })).filter((x) => x.price)
  const rank = [...all].sort((a, b) => b.price - a.price).findIndex((x) => x.slug === slug) + 1
  const peers = all.filter((x) => x.slug !== slug && (c.region ? x.region === c.region : x.tier === c.tier))
  const recent = c.assessment.filter((x) => x.avg4q?.composite)
  const recentChart = {
    type: 'line', title: `${name}: price per sq ft`, subtitle: 'Rs per sq ft of carpet area, NHB assessment prices', source: SOURCE,
    xKey: 'quarter', dataKeys: ['Four-quarter average', 'Quarter'], unit: '',
    data: recent.map((x) => ({ quarter: qShort(x.q), 'Four-quarter average': x.avg4q.composite, Quarter: x.quarter?.composite ?? null })),
  }
  const uc = c.underConstruction.filter((x) => x.price?.composite)
  const ucChart = uc.length > 4 && {
    type: 'line', title: `${name}: under-construction homes, ${uc[0].q.slice(0, 4)} to ${uc[uc.length - 1].q.slice(0, 4)}`, subtitle: "Rs per sq ft of carpet area, NHB's earlier market-price series (ended September 2024)", source: SOURCE,
    xKey: 'quarter', dataKeys: ['Price'], unit: '',
    data: uc.map((x) => ({ quarter: qShort(x.q), Price: x.price.composite })),
  }
  const ucFirst = uc[0], ucLast = uc[uc.length - 1]
  const homes = [500, 750, 1000].map((sq) => ({ sq, cost: sq * s.price }))
  const place = c.region && c.region.split(' ')[0] !== name ? `${name} (${c.region})` : name
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <p className="text-sm text-ink/60"><Link to={PROPERTY_HUB} className="hover:text-brand">Property prices</Link> / {PROPERTY_TIER_LABEL[c.tier]}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">{name} property prices</h1>
          <p className="num mt-4 text-5xl font-semibold text-brand sm:text-6xl">{rs(s.price)}<span className="ml-2 text-2xl text-ink/60">per sq ft</span></p>
          <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">
            The average value of a home in {place} was {rs(s.price)} per square foot of carpet area in the four quarters to {qLabel(s.q)}, according to the National Housing Bank. {s.yoy != null ? <>NHB&apos;s price index for the city was {s.yoy >= 0 ? 'up' : 'down'} {Math.abs(s.yoy).toFixed(1)}% on a year earlier. </> : null}It is the {rank === 1 ? 'dearest' : `${ord(rank)} dearest`} of the {all.length} cities NHB covers.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Price per sq ft" value={rs(s.price)} sub={`four quarters to ${qShort(s.q)}`} />
          <Stat label="Latest quarter alone" value={rs(s.priceQ)} sub={qLabel(s.q)} />
          <Stat label="Change in a year" value={<Change v={s.yoy} />} sub="NHB price index" />
          <Stat label="Change in the quarter" value={<Change v={s.qoq} />} sub="NHB price index" />
        </div>

        <H>Price by size of home</H>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th scope="col" className="px-3 py-2 font-semibold">Carpet area</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Four-quarter average</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">{qShort(s.q)} quarter</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_BANDS.map((b) => (
                <tr key={b.key} className="border-b border-ink/10 last:border-0">
                  <td className="px-3 py-2">{b.label}</td>
                  <td className="num px-3 py-2 text-right font-semibold">{rs(s.bands?.[b.key])}</td>
                  <td className="num px-3 py-2 text-right">{rs(s.bandsQ?.[b.key])}</td>
                </tr>
              ))}
              <tr className="border-t border-ink/15">
                <td className="px-3 py-2 font-semibold">All homes</td>
                <td className="num px-3 py-2 text-right font-semibold">{rs(s.price)}</td>
                <td className="num px-3 py-2 text-right">{rs(s.priceQ)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">Rs per sq ft of carpet area, by the size of the home valued.</p>

        <H>What a home costs at the city average</H>
        <div className="grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
          {homes.map((h) => <Stat key={h.sq} label={`${h.sq.toLocaleString('en-IN')} sq ft carpet`} value={rupeesShort(h.cost)} sub={`at ${rs(s.price)} per sq ft`} />)}
        </div>
        <p className="mt-3 text-xs text-ink/60">Carpet area times the city average, before stamp duty, registration and GST. Real prices vary a lot by locality, building and floor.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ChartCard chart={recentChart} sectionSlug="economy" />
          {ucChart && <ChartCard chart={ucChart} sectionSlug="economy" />}
        </div>

        {peers.length > 0 && (
          <>
            <H>{c.region ? `Other cities in the ${c.region}` : `Other ${PROPERTY_TIER_LABEL[c.tier].toLowerCase()}`}</H>
            <CityTable rows={peers} />
          </>
        )}
        <p className="mt-6 text-sm">
          <Link to={PROPERTY_HUB} className="text-brand hover:underline">All 50 cities</Link>
        </p>

        <Faq items={[
          [`What is the price per sq ft in ${name}?`, `${rs(s.price)} per square foot of carpet area on average, over the four quarters to ${qLabel(s.q)}, based on bank and housing finance company valuations collected by the National Housing Bank. The figure for the ${qLabel(s.q)} quarter alone was ${rs(s.priceQ)}.`],
          [`Are property prices rising in ${name}?`, s.yoy != null ? `NHB's house price index for ${name} was ${s.yoy >= 0 ? 'up' : 'down'} ${Math.abs(s.yoy).toFixed(1)}% on a year earlier and ${s.qoq >= 0 ? 'up' : 'down'} ${Math.abs(s.qoq).toFixed(1)}% on the previous quarter, in the quarter to ${qLabel(s.q)}.` : 'NHB has not yet published a year of data on its current series for this city.'],
          [`How much does a 750 sq ft flat cost in ${name}?`, `At the city average of ${rs(s.price)} per sq ft, a home with 750 sq ft of carpet area would cost about ${rupeesShort(750 * s.price)}, before stamp duty, registration and taxes. Prices in individual localities can be far above or below the average.`],
          ...(ucFirst && ucLast ? [[`How have ${name} prices changed over the long run?`, `On NHB's earlier series for homes under construction, the average price went from ${rs(ucFirst.price.composite)} per sq ft in ${qLabel(ucFirst.q)} to ${rs(ucLast.price.composite)} in ${qLabel(ucLast.q)}, when that series ended.`]] : []),
        ]} />

        <DataPanel
          dataset={{
            name: `${name} home prices per sq ft (NHB RESIDEX)`,
            description: `Quarterly carpet-area price of homes in ${name} in Rs per sq ft, overall and by home size, with NHB's house price index, and the earlier under-construction price series (June 2013 to September 2024). From the National Housing Bank's RESIDEX; compiled by India in Data.`,
            path: propertyPath(slug), asOf: s.q, source: SOURCE, sourceUrl: SOURCE_URL, liveFile: 'live/property-cities.json',
            variables: ['Price per sq ft (carpet area)', 'House price index'], keywords: [`${name} property prices`, `${name} price per sq ft`, `${name} flat price`],
          }}
          csv={[
            { filename: `india-in-data-${slug}-property-prices`, label: `${name}, current series (CSV)`, columns: [{ key: 'q', label: 'Quarter ended' }, { key: 'p4', label: 'Rs per sq ft, 4-quarter average' }, { key: 'pq', label: 'Rs per sq ft, quarter' }, { key: 's', label: 'Up to 646 sq ft' }, { key: 'm', label: '646-1,184 sq ft' }, { key: 'l', label: 'Above 1,184 sq ft' }, { key: 'index', label: 'Index (FY 2024-25 = 100)' }], rows: c.assessment.map((x) => ({ q: x.q, p4: x.avg4q?.composite, pq: x.quarter?.composite, s: x.avg4q?.small, m: x.avg4q?.mid, l: x.avg4q?.large, index: x.index })) },
            ...(uc.length ? [{ filename: `india-in-data-${slug}-under-construction-prices-2013-2024`, label: `${name}, under construction 2013-2024 (CSV)`, columns: [{ key: 'q', label: 'Quarter ended' }, { key: 'p', label: 'Rs per sq ft' }, { key: 's', label: 'Up to 646 sq ft' }, { key: 'm', label: '646-1,184 sq ft' }, { key: 'l', label: 'Above 1,184 sq ft' }, { key: 'index', label: 'Index (FY 2017-18 = 100)' }], rows: c.underConstruction.map((x) => ({ q: x.q, p: x.price?.composite, s: x.price?.small, m: x.price?.mid, l: x.price?.large, index: x.index })) }] : []),
          ]}
        />
        <About />
      </section>
    </>
  )
}
