import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ChartCard from '../components/ChartCard.jsx'
import DataPanel from '../components/DataTools.jsx'
import { useAqi, useAqiCity, useAqiFor, fmt } from '../data/live.js'
import { AQI_CATS, aqiCat, AQI_HUB, aqiPath, TIER_LABEL } from '../data/aqi.js'

// City air quality pages. Data: live/aqi.json (latest bulletin) and live/aqi/<city>.json
// (daily history), written by scripts/data/update-aqi.mjs from CPCB's daily AQI bulletin.

const SOURCE = 'Central Pollution Control Board (CPCB), daily AQI bulletin'
const SOURCE_URL = 'https://cpcb.nic.in/AQI_Bulletin.php'
const longDate = (iso) => fmt.date(iso, { day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = (iso) => fmt.shortDate(iso)
function ord(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const pollutantText = (p) => (Array.isArray(p) ? p : String(p || '').split(',')).filter(Boolean).join(' and ') || '—'
const where = (c) => (c.state && c.state !== c.name ? `${c.name}, ${c.state}` : c.name)

/* ---------- shared bits ---------- */
const H = ({ children, id }) => <h2 id={id} className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>

function Chip({ aqi, size = 'sm' }) {
  const c = aqiCat(aqi)
  const big = size === 'lg'
  return (
    <span className={`num inline-flex items-center justify-center rounded-md font-semibold ${big ? 'min-w-[5.5rem] px-3 py-1 text-5xl sm:text-6xl' : 'min-w-[3rem] px-2 py-0.5 text-sm'}`} style={{ background: c.color, color: c.ink }}>
      {aqi}
    </span>
  )
}

function Change({ now, then, label }) {
  if (then == null) return null
  const d = now - then
  return (
    <span className={`num ${d > 0 ? 'text-down' : d < 0 ? 'text-up' : 'text-ink/60'}`} title={label}>
      {d > 0 ? '+' : ''}{d}
    </span>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0 bg-panel p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <div className="num mt-1 text-3xl font-semibold">{value}</div>
      {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
    </div>
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

function Scale() {
  return (
    <div className="overflow-x-auto border-y border-ink/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
            <th scope="col" className="px-3 py-2 font-semibold">AQI</th>
            <th scope="col" className="px-3 py-2 font-semibold">Category</th>
            <th scope="col" className="px-3 py-2 font-semibold">Possible health impact (CPCB)</th>
          </tr>
        </thead>
        <tbody>
          {AQI_CATS.map((c) => (
            <tr key={c.name} className="border-b border-ink/10 last:border-0">
              <td className="num whitespace-nowrap px-3 py-2">{c.min}–{c.max}</td>
              <td className="whitespace-nowrap px-3 py-2"><span className="mr-2 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: c.color }} />{c.name}</td>
              <td className="px-3 py-2 text-ink/80">{c.health}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function About() {
  return (
    <>
      <H>About these figures</H>
      <div className="max-w-3xl space-y-3 leading-body text-ink/80">
        <p>The figures come from the Central Pollution Control Board&apos;s daily AQI bulletin. Each city&apos;s AQI is the average of the past 24 hours up to 4 pm, from continuous monitoring stations run by CPCB, state pollution control boards and other agencies. Where a city has several stations, CPCB averages them; the bulletin notes that air quality can vary a lot across one city.</p>
        <p>The national AQI is calculated from up to eight pollutants (PM2.5, PM10, nitrogen dioxide, sulphur dioxide, carbon monoxide, ozone, ammonia and lead). The &quot;prominent pollutant&quot; is the one that drives the index that day. Cities with too little data on a given day are left out of that day&apos;s bulletin.</p>
        <p>Tiers: metros are the eight largest cities; million-plus cities are the other cities with 10 lakh or more people in the 2011 Census; other cities are the rest of the bulletin.</p>
      </div>
      <H>What the AQI numbers mean</H>
      <Scale />
    </>
  )
}

/* ---------- table of cities ---------- */
const COLS = [
  { key: 'name', label: 'City', num: false },
  { key: 'aqi', label: 'AQI', num: true },
  { key: 'change', label: 'Since yesterday', num: true },
  { key: 'yearAgoAqi', label: 'A year ago', num: true },
]
function CityTable({ rows, limit }) {
  const [sort, setSort] = useState({ key: 'aqi', dir: -1 })
  const [all, setAll] = useState(false)
  const sorted = useMemo(() => {
    const r = rows.map((c) => ({ ...c, change: c.prev ? c.aqi - c.prev.aqi : null, yearAgoAqi: c.yearAgo?.aqi ?? null }))
    r.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key]
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir
    })
    return r
  }, [rows, sort])
  const shown = limit && !all ? sorted.slice(0, limit) : sorted
  const head = (c) => {
    const on = sort.key === c.key
    return (
      <th key={c.key} scope="col" aria-sort={on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-semibold ${c.num ? 'text-right' : ''} ${c.key === 'yearAgoAqi' ? 'hidden sm:table-cell' : ''}`}>
        <button type="button" onClick={() => setSort({ key: c.key, dir: on ? -sort.dir : c.num ? -1 : 1 })} className={`inline-flex items-center gap-1 hover:text-brand ${on ? 'text-ink' : ''}`}>
          {c.label}<span aria-hidden="true" className="text-[10px]">{on ? (sort.dir > 0 ? '▲' : '▼') : ''}</span>
        </button>
      </th>
    )
  }
  return (
    <>
      <div className="overflow-x-auto border-y border-ink/10">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
              {head(COLS[0])}
              <th scope="col" className="hidden px-3 py-2 font-semibold md:table-cell">Category</th>
              {head(COLS[1])}
              <th scope="col" className="hidden px-3 py-2 font-semibold lg:table-cell">Main pollutant</th>
              {COLS.slice(2).map(head)}
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.slug} className="border-b border-ink/10 last:border-0">
                <td className="px-3 py-2">
                  <Link to={aqiPath(c.slug)} className="font-semibold hover:text-brand">{c.name}</Link>
                  {c.state && c.state !== c.name && <span className="block text-xs text-ink/50">{c.state}</span>}
                </td>
                <td className="hidden px-3 py-2 md:table-cell">{c.category}</td>
                <td className="px-3 py-2 text-right"><Chip aqi={c.aqi} /></td>
                <td className="hidden px-3 py-2 lg:table-cell">{pollutantText(c.pollutants)}</td>
                <td className="px-3 py-2 text-right">{c.change == null ? <span className="text-ink/40">—</span> : <Change now={c.aqi} then={c.prev.aqi} />}</td>
                <td className="num hidden px-3 py-2 text-right sm:table-cell">{c.yearAgoAqi ?? <span className="text-ink/40">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit && rows.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-sm font-semibold text-brand hover:underline">
          {all ? `Show the first ${limit}` : `Show all ${rows.length} cities`}
        </button>
      )}
    </>
  )
}

function Strip({ counts, total }) {
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full" role="img" aria-label={AQI_CATS.map((c) => `${counts[c.name] || 0} ${c.name}`).join(', ')}>
        {AQI_CATS.map((c) => (counts[c.name] ? <div key={c.name} style={{ width: `${(counts[c.name] / total) * 100}%`, background: c.color }} /> : null))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {AQI_CATS.map((c) => (
          <li key={c.name} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c.color }} />
            <span className="text-ink/70">{c.name}</span>
            <span className="num font-semibold">{counts[c.name] || 0}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const CSV_COLS = [
  { key: 'name', label: 'City' }, { key: 'state', label: 'State or UT' }, { key: 'tierLabel', label: 'Tier' }, { key: 'aqi', label: 'AQI' }, { key: 'category', label: 'Category' },
  { key: 'pollutantList', label: 'Prominent pollutant' }, { key: 'stations', label: 'Stations reporting' }, { key: 'totalStations', label: 'Stations in city' },
  { key: 'prevAqi', label: 'Previous day AQI' }, { key: 'avg7', label: '7-day average' }, { key: 'yearAgoAqi', label: 'AQI a year earlier' }, { key: 'date', label: 'Date' },
]
const csvRow = (c, date) => ({ ...c, tierLabel: TIER_LABEL[c.tier], pollutantList: pollutantText(c.pollutants), prevAqi: c.prev?.aqi ?? null, yearAgoAqi: c.yearAgo?.aqi ?? null, date })

/* ---------- hub ---------- */
export function AqiHub() {
  const d = useAqi()
  const [tier, setTier] = useState(0)
  const [q, setQ] = useState('')
  useSeo({
    title: 'AQI today: air quality index of every Indian city (CPCB)',
    description: "Today's air quality index for about 280 Indian cities from CPCB's daily bulletin: the metros, million-plus cities and smaller towns, with the main pollutant, the change since yesterday and a year ago.",
  })
  if (!d) return <section className="mx-auto max-w-site px-4 py-16 sm:px-6"><h1 className="font-display text-4xl font-semibold">AQI today</h1><p className="mt-3 text-ink/70">The latest bulletin is loading.</p></section>
  const cities = d.cities
  const total = cities.length
  const metros = cities.filter((c) => c.tier === 1).sort((a, b) => b.aqi - a.aqi)
  const worst = cities.slice(0, 10)
  const best = [...cities].sort((a, b) => a.aqi - b.aqi).slice(0, 10)
  const bad = (d.counts['Very Poor'] || 0) + (d.counts.Severe || 0)
  const ql = q.trim().toLowerCase()
  const rows = cities.filter((c) => (!tier || c.tier === tier) && (!ql || c.name.toLowerCase().includes(ql) || (c.state || '').toLowerCase().includes(ql)))
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">AQI today</h1>
          <p className="mt-4 max-w-3xl text-lg leading-body text-ink/80">
            Air quality in {total} Indian cities on {longDate(d.date)}, from CPCB&apos;s 4 pm bulletin. {bad ? `${bad} ${bad === 1 ? 'city was' : 'cities were'} rated Very Poor or worse, led by ${worst[0].name} at ${worst[0].aqi}.` : `The most polluted was ${worst[0].name} at ${worst[0].aqi}.`} {best[0].name} had the cleanest air, at {best[0].aqi}.
          </p>
          <div className="mt-6 max-w-3xl"><Strip counts={d.counts} total={total} /></div>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>Metros</H>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-4">
          {metros.map((c) => (
            <Link key={c.slug} to={aqiPath(c.slug)} className="min-w-0 bg-panel p-4 transition-colors hover:bg-raise">
              <p className="font-semibold">{c.name}</p>
              <div className="mt-2 flex items-baseline gap-2"><Chip aqi={c.aqi} /><span className="text-sm text-ink/70">{c.category}</span></div>
              <p className="mt-2 text-xs text-ink/60">{c.prev ? <>Yesterday {c.prev.aqi} (<Change now={c.aqi} then={c.prev.aqi} />)</> : 'No reading yesterday'}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 md:grid-cols-2">
          {[['Most polluted today', worst], ['Cleanest air today', best]].map(([t, list]) => (
            <div key={t} className="min-w-0 bg-panel p-5">
              <h3 className="font-semibold">{t}</h3>
              <ol className="mt-3 space-y-1.5 text-sm">
                {list.map((c, i) => (
                  <li key={c.slug} className="flex items-center gap-2">
                    <span className="num w-5 shrink-0 text-right text-ink/40">{i + 1}</span>
                    <Link to={aqiPath(c.slug)} className="min-w-0 flex-1 truncate hover:text-brand">{c.name}{c.state && c.state !== c.name ? <span className="text-ink/50">, {c.state}</span> : null}</Link>
                    <Chip aqi={c.aqi} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <H id="all-cities">Every city</H>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-ink/15 p-1 text-sm" role="group" aria-label="Filter by tier">
            {[[0, 'All cities'], [1, 'Metros'], [2, 'Million-plus'], [3, 'Other cities']].map(([t, l]) => (
              <button key={t} type="button" aria-pressed={tier === t} onClick={() => setTier(t)} className={`rounded-md px-3 py-1.5 ${tier === t ? 'bg-brand text-white' : 'hover:bg-raise'}`}>{l}</button>
            ))}
          </div>
          <label className="flex flex-col text-xs text-ink/60">
            City or state
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example, Lucknow" className="mt-1 rounded-lg border border-ink/15 bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink/40" />
          </label>
        </div>
        {rows.length ? <CityTable key={`${tier}|${ql}`} rows={rows} limit={tier || ql ? undefined : 40} /> : <p className="text-sm text-ink/70">No city matches. CPCB may spell it differently, or it may not have a monitoring station.</p>}
        <p className="mt-3 text-xs text-ink/60">AQI on {longDate(d.date)}, 24-hour average to 4 pm. &quot;Since yesterday&quot; compares with the previous bulletin.</p>
        {d.absent?.length > 0 && <p className="mt-3 max-w-3xl text-sm text-ink/70">Left out of today&apos;s bulletin for lack of data: {d.absent.join(', ')}.</p>}

        <DataPanel
          dataset={{
            name: 'Air quality index of Indian cities today (CPCB daily bulletin)',
            description: `City-wise air quality index for ${total} Indian cities on ${longDate(d.date)}: AQI, category, prominent pollutant and monitoring stations, with the previous day, the 7-day average and the same day a year earlier. From CPCB's daily AQI bulletin; compiled by India in Data.`,
            path: AQI_HUB, asOf: d.date, source: SOURCE, sourceUrl: SOURCE_URL, liveFile: 'live/aqi.json',
            variables: ['Air quality index', 'AQI category', 'Prominent pollutant'], keywords: ['AQI today', 'air quality index India', 'city AQI'],
          }}
          csv={{ filename: `india-in-data-aqi-${d.date}`, label: `All ${total} cities (CSV)`, columns: CSV_COLS, rows: cities.map((c) => csvRow(c, d.date)) }}
        />
        <About />
      </section>
    </>
  )
}

/* ---------- one city ---------- */
export function AqiCityPage() {
  const { slug } = useParams()
  const h = useAqiCity(slug)
  const day = useAqiFor(slug)
  const name = h?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  useSeo({
    title: `${name} AQI today: air quality index and pollution level`,
    description: `${name}'s air quality index (AQI) today from CPCB's daily bulletin, with the main pollutant, the change since yesterday and a year ago, and every day's AQI over the past year.`,
  })
  if (!h?.history?.length) return <section className="mx-auto max-w-site px-4 py-16 sm:px-6"><h1 className="font-display text-4xl font-semibold">{name} AQI today</h1><p className="mt-3 text-ink/70">The latest readings are loading.</p></section>

  const hist = h.history
  const last = hist[hist.length - 1]
  const [lastDate, aqi, poll, st, totalSt] = last
  const cat = aqiCat(aqi)
  const me = day?.cities?.find((c) => c.slug === slug)
  const isToday = day && lastDate === day.date
  const total = day?.total || day?.cities?.length
  const prev = hist.length > 1 ? hist[hist.length - 2] : null
  const week = hist.filter((x) => x[0] > addDays(lastDate, -7))
  const avg7 = week.length >= 4 ? Math.round(week.reduce((a, x) => a + x[1], 0) / week.length) : null
  const yearAgo = [0, 1, 2, 3].map((k) => hist.find((x) => x[0] === addDays(lastDate, -365 - k))).find(Boolean)
  const year = hist.filter((x) => x[0] > addDays(lastDate, -365))
  const counts = Object.fromEntries(AQI_CATS.map((c) => [c.name, year.filter((x) => aqiCat(x[1]).name === c.name).length]))
  const worstDay = year.reduce((a, x) => (!a || x[1] > a[1] ? x : a), null)
  const bestDay = year.reduce((a, x) => (!a || x[1] < a[1] ? x : a), null)
  const badDays = (counts.Poor || 0) + (counts['Very Poor'] || 0) + (counts.Severe || 0)
  // monthly averages, last 12 months with data
  const months = {}
  for (const x of year) (months[x[0].slice(0, 7)] ||= []).push(x[1])
  const monthRows = Object.entries(months).sort().map(([m, v]) => ({ month: m, avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), max: Math.max(...v), days: v.length }))
  const recent = hist.filter((x) => x[0] > addDays(lastDate, -90))
  const chart = {
    type: 'line',
    title: `${name}: daily AQI`,
    subtitle: `90 days to ${shortDate(lastDate)}; CPCB bulletin, 24-hour average to 4 pm`,
    source: 'Central Pollution Control Board',
    xKey: 'date', dataKeys: ['AQI'], unit: '',
    data: recent.map((x) => ({ date: shortDate(x[0]), AQI: x[1] })),
  }
  const peers = (day?.cities || []).filter((c) => c.slug !== slug && h.state && c.state === h.state)
  const metros = (day?.cities || []).filter((c) => c.tier === 1 && c.slug !== slug)
  const place = h.state && h.state !== name ? `${name}, ${h.state}` : name

  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <p className="text-sm text-ink/60"><Link to={AQI_HUB} className="hover:text-brand">AQI today</Link>{h.state && h.state !== name ? ` / ${h.state}` : ''}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">{name} AQI today</h1>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Chip aqi={aqi} size="lg" />
            <div>
              <p className="text-2xl font-semibold">{cat.name}</p>
              <p className="text-sm text-ink/70">{cat.health}</p>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-body text-ink/80">
            {isToday ? <>{place} had an air quality index of {aqi} on {longDate(lastDate)}</> : <>The latest reading for {place} is {aqi}, on {longDate(lastDate)}. {day ? `It is not in the ${longDate(day.date)} bulletin${day.absent?.includes(name) ? ', which left it out for lack of data' : ''}.` : ''} </>}
            {isToday && <>, the 24-hour average to 4 pm. The main pollutant was {pollutantText(poll)}{me?.rank && total ? <>, and it was the {ord(me.rank)} most polluted of {total} cities in CPCB&apos;s bulletin</> : null}.</>}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Previous reading" value={prev ? prev[1] : '—'} sub={prev ? <>{shortDate(prev[0])}, change <Change now={aqi} then={prev[1]} /></> : 'No earlier reading'} />
          <Stat label="7-day average" value={avg7 ?? '—'} sub={avg7 ? aqiCat(avg7).name : 'Too few readings'} />
          <Stat label="A year earlier" value={yearAgo ? yearAgo[1] : '—'} sub={yearAgo ? `${shortDate(yearAgo[0])}, ${aqiCat(yearAgo[1]).name}` : 'No reading a year ago'} />
          <Stat label="Stations reporting" value={st != null ? `${st} of ${totalSt}` : '—'} sub="monitoring stations in the city" />
        </div>

        {recent.length >= 2 && <div className="mt-8"><ChartCard chart={chart} sectionSlug="society" /></div>}

        {year.length >= 30 && (
          <>
            <H>The past year in {name}</H>
            <p className="max-w-3xl leading-body text-ink/80">
              Of the {year.length} days with a reading in the past year, {badDays} {badDays === 1 ? 'was' : 'were'} Poor or worse. The worst was {shortDate(worstDay[0])} {worstDay[0].slice(0, 4)}, at {worstDay[1]} ({aqiCat(worstDay[1]).name}); the cleanest was {shortDate(bestDay[0])} {bestDay[0].slice(0, 4)}, at {bestDay[1]}.
            </p>
            <div className="mt-4 max-w-3xl"><Strip counts={counts} total={year.length} /></div>
            <div className="mt-6 overflow-x-auto border-y border-ink/10">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                    <th scope="col" className="px-3 py-2 font-semibold">Month</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Average AQI</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Worst day</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Days with data</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((m) => (
                    <tr key={m.month} className="border-b border-ink/10 last:border-0">
                      <td className="px-3 py-2">{fmt.date(m.month + '-01', { month: 'long', year: 'numeric' })}</td>
                      <td className="px-3 py-2 text-right"><Chip aqi={m.avg} /></td>
                      <td className="num px-3 py-2 text-right">{m.max}</td>
                      <td className="num px-3 py-2 text-right">{m.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {peers.length > 0 && (
          <>
            <H>Other cities in {h.state} today</H>
            <CityTable rows={peers} limit={12} />
          </>
        )}
        {metros.length > 0 && (
          <>
            <H>The metros today</H>
            <CityTable rows={metros} />
          </>
        )}
        <p className="mt-6 text-sm"><Link to={AQI_HUB} className="text-brand hover:underline">AQI of every city today</Link></p>

        <Faq items={[
          [`What is the AQI of ${name} today?`, `${aqi} (${cat.name}) on ${longDate(lastDate)}, the 24-hour average to 4 pm in CPCB's daily bulletin${st != null ? `, based on ${st} of the city's ${totalSt} monitoring stations` : ''}.`],
          [`Is the air in ${name} safe today?`, `CPCB rates an AQI of ${aqi} as ${cat.name}. Its health note for this level: ${cat.health.toLowerCase()}.`],
          [`What is the main pollutant in ${name}?`, `${pollutantText(poll)} on ${longDate(lastDate)}. The prominent pollutant is the one with the highest sub-index that day.`],
          [`How does ${name}'s air compare with last year?`, yearAgo ? `On ${longDate(yearAgo[0])} the AQI was ${yearAgo[1]} (${aqiCat(yearAgo[1]).name}), against ${aqi} now.` : 'We do not have a reading for the same time last year.'],
        ]} />

        <DataPanel
          dataset={{
            name: `${name} air quality index, daily`,
            description: `Daily air quality index (AQI) for ${place} from CPCB's daily bulletin: the 24-hour average to 4 pm, the prominent pollutant and the number of monitoring stations reporting, ${hist[0][0]} to ${lastDate}. Compiled by India in Data.`,
            path: aqiPath(slug), asOf: lastDate, source: SOURCE, sourceUrl: SOURCE_URL, liveFile: `live/aqi/${slug}.json`, temporalCoverage: `${hist[0][0]}/${lastDate}`,
            variables: ['Air quality index', 'Prominent pollutant'], keywords: [`${name} AQI`, `${name} air quality`, `${name} pollution`],
          }}
          csv={{ filename: `india-in-data-${slug}-aqi-daily`, label: `${name} daily AQI (CSV)`, columns: [{ key: 'date', label: 'Date' }, { key: 'aqi', label: 'AQI' }, { key: 'category', label: 'Category' }, { key: 'pollutant', label: 'Prominent pollutant' }, { key: 'stations', label: 'Stations reporting' }, { key: 'total', label: 'Stations in city' }], rows: hist.map(([date, a, p, s, t]) => ({ date, aqi: a, category: aqiCat(a).name, pollutant: pollutantText(p), stations: s, total: t })) }}
        />
        <About />
      </section>
    </>
  )
}
