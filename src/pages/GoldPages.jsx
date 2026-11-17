import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ChartCard from '../components/ChartCard.jsx'
import DataPanel from '../components/DataTools.jsx'
import { useGold, useTodayIST, fmt } from '../data/live.js'
import { PURITIES, GOLD_HUB, SILVER_HUB, PLATINUM_PAGE, goldCityPath, silverCityPath, goldCity, GOLD_CITIES, UNITS } from '../data/gold.js'
import { aqiPath } from '../data/aqi.js'
import { propertyPath } from '../data/property.js'

// Gold, silver and platinum rates from the India Bullion and Jewellers Association (IBJA).
// Data: live/gold.json, written by scripts/data/update-gold.mjs. Gold and platinum are in
// Rs per 10 g and silver in Rs per kg, as IBJA quotes them, before GST and making charges.

const SOURCE = 'India Bullion and Jewellers Association (IBJA)'
const SOURCE_URL = 'https://ibjarates.com/'
const GST = 0.03

const rs = (v, dp = 0) => (v == null || Number.isNaN(v) ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`)
// weekday names built by hand: Node and browsers format weekday dates differently, which would
// break hydration of the prerendered page
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const weekday = (d) => WEEKDAY[new Date(d + 'T00:00:00Z').getUTCDay()]
const midDate = (d) => fmt.date(d, { day: 'numeric', month: 'long', year: 'numeric' })
const longDate = (d) => `${weekday(d)}, ${midDate(d)}`
const shortDate = (d) => fmt.date(d, { day: 'numeric', month: 'short' })
const SESSION = { am: 'opening (AM) rate', pm: 'closing (PM) rate' }
const G = (k) => PURITIES.find((p) => p.key === k)

// latest figures: the newest day's latest session, and the previous working day's close
function useRates() {
  const d = useGold()
  if (!d?.days?.length) return null
  const days = d.days
  const last = days[days.length - 1]
  const session = last.pm ? 'pm' : 'am'
  const prev = days[days.length - 2]
  const now = (f) => last[session]?.[f] ?? null
  const before = (f) => (prev ? prev.pm?.[f] ?? prev.am?.[f] ?? null : null)
  const change = (f) => (now(f) != null && before(f) != null ? now(f) - before(f) : null)
  return { d, days, last, session, prev, now, before, change }
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
function Move({ v, dp = 0, of }) {
  if (v == null) return <span className="text-ink/50">—</span>
  const p = of ? (v / (of - v)) * 100 : null
  return (
    <span className={`num ${v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-ink/60'}`}>
      {v > 0 ? '+' : v < 0 ? '−' : ''}{rs(Math.abs(v), dp)}{p != null && <span className="ml-1 text-xs">({p > 0 ? '+' : ''}{p.toFixed(2)}%)</span>}
    </span>
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
const Loading = ({ title }) => (
  <section className="mx-auto max-w-site px-4 py-16 sm:px-6">
    <h1 className="font-display text-4xl font-semibold">{title}</h1>
    <p className="mt-3 text-ink/70">The latest rates are loading.</p>
  </section>
)

// Shown only in the browser, once we know today's date: IBJA does not publish on weekends
// and central government holidays, so say whose rates these are.
function Freshness({ r }) {
  const today = useTodayIST(null)
  if (!today) return null
  if (r.last.d === today) {
    return r.session === 'am'
      ? <p className="mt-3 text-sm text-ink/60">Today&apos;s opening rates. IBJA publishes closing rates at about 5 pm.</p>
      : <p className="mt-3 text-sm text-ink/60">Today&apos;s closing rates.</p>
  }
  const h = Number(new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(11, 13))
  const wd = new Date(today + 'T00:00:00Z').getUTCDay()
  return (
    <p className="mt-3 text-sm text-ink/60">
      {wd === 0 || wd === 6 ? 'IBJA does not publish rates on weekends. ' : h < 13 ? 'Today’s rates usually come out at about 12 noon. ' : 'IBJA has not published rates today. '}
      These are the rates of {longDate(r.last.d)}.
    </p>
  )
}

function About({ metal = 'gold' }) {
  return (
    <>
      <H>About these rates</H>
      <div className="max-w-3xl space-y-3 leading-body text-ink/80">
        <p>The rates are published by the India Bullion and Jewellers Association, which polls bullion dealers and jewellers twice each working day: an opening (AM) rate at about noon and a closing (PM) rate at about 5 pm. The Reserve Bank of India uses IBJA&apos;s closing rate of 999 gold to price Sovereign Gold Bonds, and its gold-loan rules let lenders value gold at IBJA rates.</p>
        <p>{metal === 'silver' ? 'Silver is quoted per kilogram of 999 fine silver' : metal === 'platinum' ? 'Platinum is quoted per 10 grams of 999 platinum' : 'Gold is quoted per 10 grams for each purity'}, before 3% GST and before any making charge or jeweller&apos;s margin. There is one IBJA rate for the whole country; a shop&apos;s price will be higher. IBJA does not publish rates on Saturdays, Sundays and central government holidays.</p>
        <p>We read the rates from ibjarates.com after each release, and check them against IBJA&apos;s own 30-day record once a day appears in it. Nothing is estimated.</p>
      </div>
    </>
  )
}

/* ---------- jewellery price calculator ---------- */
function Calculator({ r, place }) {
  const [grams, setGrams] = useState('10')
  const [purity, setPurity] = useState('g916')
  const [making, setMaking] = useState('10')
  const per10 = r.now(purity)
  const w = Number(grams) || 0
  const m = Math.max(0, Number(making) || 0)
  const metal = per10 != null ? (per10 / 10) * w : null
  const mk = metal != null ? (metal * m) / 100 : null
  const gst = metal != null ? (metal + mk) * GST : null
  const field = 'mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2 num focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'
  return (
    <>
      <H id="calculator">What a piece of jewellery costs{place ? ` in ${place}` : ''}</H>
      <div className="grid gap-6 rounded-xl border border-ink/10 p-5 sm:p-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <label className="text-sm text-ink/70">Weight in grams
            <input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ''))} className={field} />
          </label>
          <label className="text-sm text-ink/70">Purity
            <select value={purity} onChange={(e) => setPurity(e.target.value)} className={field}>
              {PURITIES.filter((p) => p.key !== 'g995').map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-ink/70">Making charge, % of gold value
            <input inputMode="decimal" value={making} onChange={(e) => setMaking(e.target.value.replace(/[^\d.]/g, ''))} className={field} />
          </label>
        </div>
        <dl className="grid content-start gap-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-ink/70">Gold at today&apos;s IBJA rate ({rs(per10 != null ? per10 / 10 : null)} a gram)</dt><dd className="num">{rs(metal)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink/70">Making charge at {m}%</dt><dd className="num">{rs(mk)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink/70">GST at 3% on both</dt><dd className="num">{rs(gst)}</dd></div>
          <div className="flex justify-between gap-4 border-t border-ink/15 pt-2 text-base font-semibold"><dt>Total</dt><dd className="num text-brand">{rs(metal != null ? metal + mk + gst : null)}</dd></div>
        </dl>
        <p className="text-xs leading-body text-ink/60 lg:col-start-2">Making charges usually range from about 8% to 25% depending on the design; some shops charge a flat amount per gram instead. Shops also price gold a little above the IBJA rate, and add a hallmarking fee of about ₹45 a piece. Ask for the rate, making charge and GST to be shown separately on the bill.</p>
      </div>
    </>
  )
}

/* ---------- tables ---------- */
// purity table: per gram, local unit, per 10 g, change since the previous close
function GoldTable({ r, unit }) {
  const u = unit && UNITS[unit]
  return (
    <div className="overflow-x-auto border-y border-ink/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
            <th scope="col" className="px-3 py-2 font-semibold">Purity</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">1 gram</th>
            {u && <th scope="col" className="px-3 py-2 text-right font-semibold">1 {u.name} ({u.grams} g)</th>}
            <th scope="col" className="px-3 py-2 text-right font-semibold">10 grams</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Change, 10 g</th>
          </tr>
        </thead>
        <tbody>
          {PURITIES.map((p) => {
            const v = r.now(p.key)
            return (
              <tr key={p.key} className="border-b border-ink/10 last:border-0">
                <td className="px-3 py-2">
                  <span className="whitespace-nowrap font-semibold">{p.label.replace(/ \(.*\)$/, '')}</span>
                  <span className="block text-xs text-ink/50">{(p.fine * 100).toFixed(1)}% gold ({p.key.slice(1)})</span>
                </td>
                <td className="num px-3 py-2 text-right font-semibold">{rs(v != null ? v / 10 : null)}</td>
                {u && <td className="num px-3 py-2 text-right">{rs(v != null ? (v / 10) * u.grams : null)}</td>}
                <td className="num px-3 py-2 text-right">{rs(v)}</td>
                <td className="px-3 py-2 text-right"><Move v={r.change(p.key)} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function HistoryTable({ r, fields, n = 15, unitNote }) {
  const rows = r.days.slice(-n).reverse()
  return (
    <>
      <div className="overflow-x-auto border-y border-ink/10">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
              <th scope="col" className="px-3 py-2 font-semibold">Date</th>
              {fields.map(([f, label]) => (
                <th key={f} scope="col" className="px-3 py-2 text-right font-semibold" colSpan={2}>{label}</th>
              ))}
            </tr>
            <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
              <th scope="col" className="px-3 py-1" />
              {fields.map(([f]) => [
                <th key={f + 'a'} scope="col" className="px-3 py-1 text-right font-normal">Open</th>,
                <th key={f + 'p'} scope="col" className="px-3 py-1 text-right font-normal">Close</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.d} className="border-b border-ink/10 last:border-0">
                <td className="whitespace-nowrap px-3 py-2">{weekday(d.d).slice(0, 3)} {shortDate(d.d)}</td>
                {fields.map(([f]) => [
                  <td key={f + 'a'} className="num px-3 py-2 text-right text-ink/70">{rs(d.am?.[f])}</td>,
                  <td key={f + 'p'} className="num px-3 py-2 text-right font-semibold">{rs(d.pm?.[f])}</td>,
                ])}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink/60">{unitNote} Open is IBJA&apos;s AM rate and close its PM rate. A dash means IBJA published no rate for that session.</p>
    </>
  )
}

function CityLinks({ current, silver }) {
  const list = (silver ? GOLD_CITIES.filter((c) => c.silver) : GOLD_CITIES).filter((c) => c.slug !== current)
  const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map((c) => (
        <li key={c.slug} className="min-w-0">
          <Link to={silver ? silverCityPath(c.slug) : goldCityPath(c.slug)} className="hover:text-brand">{c.name}</Link>
        </li>
      ))}
    </ul>
  )
}

const csvDays = (days) => days.map((d) => ({
  date: d.d,
  ...Object.fromEntries(['g999', 'g995', 'g916', 'g750', 'g585', 'silver', 'platinum'].flatMap((f) => [[`${f}_am`, d.am?.[f]], [`${f}_pm`, d.pm?.[f]]])),
}))
const CSV_COLS = [
  { key: 'date', label: 'Date' },
  ...[['g999', 'Gold 999, Rs/10 g'], ['g995', 'Gold 995, Rs/10 g'], ['g916', 'Gold 916 (22K), Rs/10 g'], ['g750', 'Gold 750 (18K), Rs/10 g'], ['g585', 'Gold 585 (14K), Rs/10 g'], ['silver', 'Silver 999, Rs/kg'], ['platinum', 'Platinum 999, Rs/10 g']]
    .flatMap(([f, l]) => [{ key: `${f}_am`, label: `${l}, AM` }, { key: `${f}_pm`, label: `${l}, PM` }]),
]
const since = (r) => fmt.date(r.days[0].d, { month: 'long', year: 'numeric' })
const goldChart = (r, title) => {
  const pts = r.days.filter((d) => d.pm?.g999 || d.am?.g999)
  return {
    type: 'line', title, subtitle: 'Rs per 10 g, IBJA closing rate (opening rate where no close was published)', source: SOURCE,
    xKey: 'day', dataKeys: ['24 carat', '22 carat'], unit: '',
    data: pts.map((d) => ({ day: shortDate(d.d), '24 carat': d.pm?.g999 ?? d.am?.g999, '22 carat': d.pm?.g916 ?? d.am?.g916 ?? null })),
  }
}
// share of working days on which the close moved by more than 1%
function bigMoveShare(r, f) {
  const v = r.days.map((d) => d.pm?.[f] ?? d.am?.[f]).filter((x) => x != null)
  const ch = v.slice(1).map((x, i) => Math.abs(x / v[i] - 1))
  return ch.length ? Math.round((ch.filter((c) => c > 0.01).length / ch.length) * 100) : null
}
function rangeLine(r, f, per = 10, label = '24-carat gold') {
  const pts = r.days.map((d) => [d.d, d.pm?.[f] ?? d.am?.[f]]).filter((x) => x[1] != null)
  if (pts.length < 20) return null
  const hi = pts.reduce((a, b) => (b[1] > a[1] ? b : a))
  const lo = pts.reduce((a, b) => (b[1] < a[1] ? b : a))
  const first = pts[0]
  const last = pts[pts.length - 1]
  const p = (last[1] / first[1] - 1) * 100
  return `Since ${midDate(first[0])}, ${label} has ${p >= 0 ? 'risen' : 'fallen'} ${Math.abs(p).toFixed(1)}%. Its highest close in that time was ${rs(hi[1] / per)} a gram on ${midDate(hi[0])}, its lowest ${rs(lo[1] / per)} on ${midDate(lo[0])}.`
}

/* ---------- gold: India ---------- */
export function GoldHub() {
  const r = useRates()
  useSeo({
    title: 'Gold rate today in India: 24 carat and 22 carat price per gram (IBJA)',
    description: "Today's gold rate in India for 24, 22, 18 and 14 carat gold per gram and per 10 grams, from the India Bullion and Jewellers Association, with the change since yesterday, the trend and a jewellery price calculator.",
  })
  if (!r) return <Loading title="Gold rate today in India" />
  const g24 = r.now('g999'), g22 = r.now('g916')
  const trend = rangeLine(r, 'g999')
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Gold rate today in India</h1>
          <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <p className="text-sm text-ink/60">24 carat, 1 gram</p>
              <p className="num text-5xl font-semibold text-brand sm:text-6xl">{rs(g24 / 10)}</p>
              <p className="mt-1 text-sm"><Move v={r.change('g999') != null ? r.change('g999') / 10 : null} of={g24 / 10} /> <span className="text-ink/60">since the previous close</span></p>
            </div>
            <div>
              <p className="text-sm text-ink/60">22 carat, 1 gram</p>
              <p className="num text-5xl font-semibold sm:text-6xl">{rs(g22 / 10)}</p>
              <p className="mt-1 text-sm"><Move v={r.change('g916') != null ? r.change('g916') / 10 : null} of={g22 / 10} /></p>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-body text-ink/80">
            IBJA&apos;s {SESSION[r.session]} for {longDate(r.last.d)}: {rs(g24)} for 10 grams of 24-carat (999) gold and {rs(g22)} for 22-carat (916), before 3% GST and making charges. Silver was {rs(r.now('silver'))} a kilogram.
          </p>
          <Freshness r={r} />
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H id="rates">Gold rate by purity</H>
        <GoldTable r={r} />
        <p className="mt-3 text-xs text-ink/60">IBJA {SESSION[r.session]}, {midDate(r.last.d)}. Before GST and making charges. Change is from the closing rate of {r.prev ? midDate(r.prev.d) : 'the previous working day'}.</p>

        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
          <Stat label="22 carat, 10 g with 3% GST" value={rs(g22 * (1 + GST))} sub="before making charges" />
          <Stat label="22 carat, 1 sovereign (8 g)" value={rs((g22 / 10) * 8)} sub="before GST" />
          <Stat label="24 carat, 1 tola (11.66 g)" value={rs((g24 / 10) * UNITS.tola.grams)} sub="before GST" />
        </div>

        <div className="mt-8"><ChartCard chart={goldChart(r, `Gold rate since ${since(r)}`)} sectionSlug="market" /></div>
        {trend && <p className="mt-3 max-w-3xl leading-body text-ink/80">{trend}</p>}

        <Calculator r={r} />

        <H id="history">Gold rate in the last 15 working days</H>
        <HistoryTable r={r} fields={[['g999', '24 carat (999)'], ['g916', '22 carat (916)'], ['g750', '18 carat (750)']]} unitNote="Rs per 10 g." />

        <H id="cities">Gold rate in your city</H>
        <p className="mb-4 max-w-3xl leading-body text-ink/80">IBJA publishes one rate for the whole country. Each city page shows it in the units used locally, with local links; a shop&apos;s price will sit somewhat above it.</p>
        <CityLinks />
        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to={SILVER_HUB} className="text-brand hover:underline">Silver rate today</Link>
          <Link to={PLATINUM_PAGE} className="text-brand hover:underline">Platinum rate today</Link>
        </p>

        <Faq items={[
          ['What is the gold rate today in India?', `IBJA's ${SESSION[r.session]} for ${midDate(r.last.d)} was ${rs(g24 / 10)} a gram (${rs(g24)} for 10 g) for 24-carat gold and ${rs(g22 / 10)} a gram (${rs(g22)} for 10 g) for 22-carat gold. These are before 3% GST and making charges.`],
          ['What is the difference between 24, 22 and 18 carat gold?', '24-carat gold is 99.9% pure and is used for coins and bars. Most jewellery is 22 carat (91.6% gold, hallmarked 916) or 18 carat (75%, hallmarked 750); the rest is other metals that make it harder. The rate moves in step with purity, so 22-carat gold costs about 91.6% of the 24-carat rate.'],
          ['Is the gold rate the same in every city?', 'IBJA publishes one benchmark rate for India, and GST is the same everywhere. Shops in different cities price slightly above the benchmark to cover transport, insurance and their margin, and some local jewellers’ associations announce their own daily rate, so the price you are quoted can differ a little from city to city.'],
          ['When is the gold rate updated?', 'IBJA publishes an opening (AM) rate at about 12 noon and a closing (PM) rate at about 5 pm on working days. It does not publish on Saturdays, Sundays and central government holidays; the last published rate applies until the next one.'],
          ['Does the gold rate include GST?', `No. Add 3% GST on the value of the gold and the making charge. For 10 g of 22-carat gold at today's rate, the gold alone comes to ${rs(g22 * (1 + GST))} with GST, before making charges.`],
          ['Which gold rate do banks use for gold loans and gold bonds?', 'The Reserve Bank of India prices Sovereign Gold Bonds on the average IBJA closing rate of 999 gold over the three working days before the issue or redemption. Its gold-loan rules let lenders value the gold pledged using IBJA rates or the price on a regulated commodity exchange.'],
        ]} />

        <DataPanel
          dataset={{
            name: 'Gold, silver and platinum rates in India, daily (IBJA)',
            description: 'Daily opening (AM) and closing (PM) rates of 999, 995, 916, 750 and 585 gold in Rs per 10 g, 999 silver in Rs per kg and 999 platinum in Rs per 10 g, as published by the India Bullion and Jewellers Association. Before GST and making charges. Compiled by India in Data.',
            path: GOLD_HUB, asOf: r.last.d, source: SOURCE, sourceUrl: SOURCE_URL, liveFile: 'live/gold.json',
            variables: ['Gold rate', 'Silver rate', 'Platinum rate'], keywords: ['gold rate today', 'gold price India', '22 carat gold rate', '24 carat gold rate', 'IBJA rate'],
          }}
          csv={{ filename: `india-in-data-ibja-gold-silver-rates-${r.last.d}`, label: `Daily rates since ${midDate(r.days[0].d)} (CSV)`, columns: CSV_COLS, rows: csvDays(r.days).reverse() }}
        />
        <About />
      </section>
    </>
  )
}

/* ---------- gold: one city ---------- */
export function GoldCityPage() {
  const { city: slug } = useParams()
  const c = goldCity[slug]
  const r = useRates()
  const name = c?.name || slug
  const u = c?.unit && UNITS[c.unit]
  useSeo({
    title: `Gold rate today in ${name}: 22 carat and 24 carat price per ${u ? `gram and ${c.unit}` : 'gram'}`,
    description: `Today's gold rate in ${name}${c?.aka ? ` (${c.aka})` : ''} for 22, 24 and 18 carat gold per gram${u ? `, per ${u.name}` : ''} and per 10 grams, from IBJA's benchmark, with the change since yesterday, the trend and a jewellery price calculator.`,
  })
  if (!c) return <Loading title={`Gold rate today in ${name}`} />
  if (!r) return <Loading title={`Gold rate today in ${name}`} />
  const g24 = r.now('g999'), g22 = r.now('g916')
  const where = c.kind === 'state' ? name : `${name}, ${c.state}`
  const neighbours = c.state ? GOLD_CITIES.filter((x) => x.slug !== c.slug && (x.state === c.state || x.slug === c.state.toLowerCase().replace(/\s+/g, '-'))) : GOLD_CITIES.filter((x) => x.state === name)
  const trend = rangeLine(r, 'g916', 10, '22-carat gold')
  const unitLine = u ? ` One ${u.name} (${u.grams} g) of 22-carat gold comes to ${rs((g22 / 10) * u.grams)}.` : ''
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <p className="text-sm text-ink/60"><Link to={GOLD_HUB} className="hover:text-brand">Gold rate today</Link> / {c.kind === 'state' ? 'States' : c.state}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">Gold rate today in {name}</h1>
          <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <p className="text-sm text-ink/60">22 carat, 1 gram</p>
              <p className="num text-5xl font-semibold text-brand sm:text-6xl">{rs(g22 / 10)}</p>
              <p className="mt-1 text-sm"><Move v={r.change('g916') != null ? r.change('g916') / 10 : null} of={g22 / 10} /> <span className="text-ink/60">since the previous close</span></p>
            </div>
            <div>
              <p className="text-sm text-ink/60">24 carat, 1 gram</p>
              <p className="num text-5xl font-semibold sm:text-6xl">{rs(g24 / 10)}</p>
              <p className="mt-1 text-sm"><Move v={r.change('g999') != null ? r.change('g999') / 10 : null} of={g24 / 10} /></p>
            </div>
            {u && (
              <div>
                <p className="text-sm text-ink/60">22 carat, 1 {u.name}</p>
                <p className="num text-5xl font-semibold sm:text-6xl">{rs((g22 / 10) * u.grams)}</p>
                <p className="mt-1 text-sm text-ink/60">{u.grams} grams</p>
              </div>
            )}
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-body text-ink/80">
            The benchmark rate for gold in {where} on {longDate(r.last.d)} was {rs(g22)} for 10 grams of 22-carat gold and {rs(g24)} for 24-carat, IBJA&apos;s {SESSION[r.session]}.{unitLine} Jewellers in {name} price off this rate; add 3% GST and the making charge for what you will pay.
          </p>
          <Freshness r={r} />
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H id="rates">Gold rate in {name} by purity</H>
        <GoldTable r={r} unit={c.unit} />
        <p className="mt-3 text-xs text-ink/60">IBJA {SESSION[r.session]}, {midDate(r.last.d)}. Before GST and making charges. Change is from the closing rate of {r.prev ? midDate(r.prev.d) : 'the previous working day'}.</p>

        <Calculator r={r} place={name} />

        <div className="mt-10"><ChartCard chart={goldChart(r, `Gold rate since ${since(r)}`)} sectionSlug="market" /></div>
        {trend && <p className="mt-3 max-w-3xl leading-body text-ink/80">{trend}</p>}

        <H id="history">Gold rate in the last 10 working days</H>
        <HistoryTable r={r} n={10} fields={[['g916', '22 carat (916)'], ['g999', '24 carat (999)']]} unitNote="Rs per 10 g." />

        <H>Why a shop in {name} may quote a different rate</H>
        <div className="max-w-3xl space-y-3 leading-body text-ink/80">
          <p>IBJA&apos;s rate is a national benchmark for gold traded in bulk. A jeweller in {name} adds a margin to cover transport, insurance and running costs, and {c.state === 'Tamil Nadu' || c.state === 'Kerala' || c.slug === 'kerala' || c.slug === 'puducherry' ? 'jewellers’ associations in the south announce their own daily board rate, which is usually close to but not the same as IBJA’s' : 'some local jewellers’ associations announce their own daily rate'}. The making charge, which varies by design and shop, is added on top, and 3% GST is charged on the total.</p>
          <p>For a fair comparison, ask each shop for its rate per gram for the purity you are buying, check the BIS hallmark (916 for 22 carat, 750 for 18 carat) and the six-character HUID code on the piece, and get the gold value, making charge and GST shown separately on the bill.</p>
        </div>

        {(c.aqi || c.property || neighbours.length > 0 || c.silver) && (
          <>
            <H>More on {name}</H>
            <ul className="space-y-1.5 text-sm">
              {c.silver && <li><Link to={silverCityPath(c.slug)} className="text-brand hover:underline">Silver rate today in {name}</Link></li>}
              {c.aqi && <li><Link to={aqiPath(c.aqi)} className="text-brand hover:underline">{name} air quality today</Link></li>}
              {c.property && <li><Link to={propertyPath(c.property)} className="text-brand hover:underline">{name} property prices per sq ft</Link></li>}
              {neighbours.map((x) => <li key={x.slug}><Link to={goldCityPath(x.slug)} className="text-brand hover:underline">Gold rate today in {x.name}</Link></li>)}
            </ul>
          </>
        )}

        <H>Gold rate in other cities</H>
        <CityLinks current={c.slug} />

        <Faq items={[
          [`What is the gold rate today in ${name}?`, `On ${midDate(r.last.d)}, IBJA's ${SESSION[r.session]} was ${rs(g22 / 10)} a gram for 22-carat gold and ${rs(g24 / 10)} a gram for 24-carat gold (${rs(g22)} and ${rs(g24)} for 10 g). Jewellers in ${name} add GST and making charges to this.`],
          ...(u ? [[`What is the 22 carat gold rate per ${u.name} in ${name}?`, `At IBJA's rate of ${rs(g22 / 10)} a gram, one ${u.name} (${u.grams} g) of 22-carat gold comes to ${rs((g22 / 10) * u.grams)} before GST, or ${rs((g22 / 10) * u.grams * (1 + GST))} with 3% GST, before making charges.`]] : []),
          [`How much does 10 grams of 22 carat jewellery cost in ${name}?`, `The gold is worth ${rs(g22)} at today's IBJA rate. With a 10% making charge and 3% GST the total comes to about ${rs(g22 * 1.1 * (1 + GST))}. Shops' own rates and making charges vary.`],
          [`Is the gold rate in ${name} different from Mumbai or Delhi?`, 'The IBJA benchmark is the same across India and GST is the same everywhere. What differs is each shop’s margin and making charge, and any rate announced by a local jewellers’ association, so quotes in different cities are usually within a small range of each other.'],
          [`When does the gold rate change in ${name}?`, 'IBJA sets an opening rate at about 12 noon and a closing rate at about 5 pm on working days. There are no new rates on Saturdays, Sundays and central government holidays.'],
        ]} />

        <DataPanel
          dataset={{
            name: `Gold rate in ${name}, daily (IBJA benchmark)`,
            description: `Daily opening and closing IBJA benchmark rates of 999, 995, 916, 750 and 585 gold in Rs per 10 g, as applied in ${name}. Before GST and making charges. From the India Bullion and Jewellers Association; compiled by India in Data.`,
            path: goldCityPath(c.slug), asOf: r.last.d, source: SOURCE, sourceUrl: SOURCE_URL, liveFile: 'live/gold.json',
            variables: ['Gold rate'], keywords: [`gold rate today in ${name}`, `${name} gold rate`, `22 carat gold rate ${name}`],
          }}
          csv={{ filename: `india-in-data-gold-rate-${c.slug}-${r.last.d}`, label: `Daily gold rates since ${midDate(r.days[0].d)} (CSV)`, columns: CSV_COLS.filter((x) => !/silver|platinum/.test(x.key)), rows: csvDays(r.days).reverse() }}
        />
        <About />
      </section>
    </>
  )
}

/* ---------- silver ---------- */
function SilverTable({ r }) {
  const kg = r.now('silver')
  const ch = r.change('silver')
  const rows = [['1 gram', 1, 2], ['10 grams', 10, 0], ['100 grams', 100, 0], ['1 kilogram', 1000, 0]]
  return (
    <div className="overflow-x-auto border-y border-ink/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
            <th scope="col" className="px-3 py-2 font-semibold">Weight</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Rate</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">With 3% GST</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([l, g, dp]) => (
            <tr key={l} className="border-b border-ink/10 last:border-0">
              <td className="px-3 py-2 font-semibold">{l}</td>
              <td className="num px-3 py-2 text-right font-semibold">{rs(kg != null ? (kg * g) / 1000 : null, dp)}</td>
              <td className="num px-3 py-2 text-right">{rs(kg != null ? ((kg * g) / 1000) * (1 + GST) : null, dp)}</td>
              <td className="px-3 py-2 text-right"><Move v={ch != null ? (ch * g) / 1000 : null} dp={dp} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
const silverChart = (r) => ({
  type: 'line', title: `Silver rate since ${since(r)}`, subtitle: 'Rs per kg, IBJA closing rate (opening rate where no close was published)', source: SOURCE,
  xKey: 'day', dataKeys: ['Silver'], unit: '',
  data: r.days.filter((d) => d.pm?.silver || d.am?.silver).map((d) => ({ day: shortDate(d.d), Silver: d.pm?.silver ?? d.am?.silver })),
})
const SILVER_CSV = [{ key: 'date', label: 'Date' }, { key: 'silver_am', label: 'Silver 999, Rs/kg, AM' }, { key: 'silver_pm', label: 'Silver 999, Rs/kg, PM' }]

function SilverPage({ c }) {
  const r = useRates()
  const name = c?.name
  const title = name ? `Silver rate today in ${name}` : 'Silver rate today in India'
  useSeo({
    title: `${title}: price per gram and kg (IBJA)`,
    description: `Today's silver rate${name ? ` in ${name}` : ' in India'} per gram, 10 grams, 100 grams and kilogram for 999 silver, from the India Bullion and Jewellers Association, with GST, the change since yesterday and the trend.`,
  })
  if (!r) return <Loading title={title} />
  const kg = r.now('silver')
  const trend = rangeLine(r, 'silver', 1000, 'silver')
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          {name && <p className="text-sm text-ink/60"><Link to={SILVER_HUB} className="hover:text-brand">Silver rate today</Link> / {c.kind === 'state' ? 'States' : c.state}</p>}
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
          <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <p className="text-sm text-ink/60">999 silver, 1 kg</p>
              <p className="num text-5xl font-semibold text-brand sm:text-6xl">{rs(kg)}</p>
              <p className="mt-1 text-sm"><Move v={r.change('silver')} of={kg} /> <span className="text-ink/60">since the previous close</span></p>
            </div>
            <div>
              <p className="text-sm text-ink/60">1 gram</p>
              <p className="num text-5xl font-semibold sm:text-6xl">{rs(kg / 1000, 2)}</p>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-body text-ink/80">
            IBJA&apos;s {SESSION[r.session]} for 999 silver on {longDate(r.last.d)} was {rs(kg)} a kilogram, or {rs(kg / 100)} for 10 grams, before 3% GST{name ? `. Shops in ${name} price off this benchmark` : ''}.
          </p>
          <Freshness r={r} />
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H id="rates">Silver rate{name ? ` in ${name}` : ''} by weight</H>
        <SilverTable r={r} />
        <p className="mt-3 text-xs text-ink/60">999 silver, IBJA {SESSION[r.session]}, {midDate(r.last.d)}. Change is from the closing rate of {r.prev ? midDate(r.prev.d) : 'the previous working day'}. Silver articles and jewellery carry a making charge on top.</p>

        <div className="mt-8"><ChartCard chart={silverChart(r)} sectionSlug="market" /></div>
        {trend && <p className="mt-3 max-w-3xl leading-body text-ink/80">{trend}</p>}

        <H id="history">Silver rate in the last 15 working days</H>
        <HistoryTable r={r} fields={[['silver', 'Silver 999']]} unitNote="Rs per kg." />

        <H>{name ? 'Silver rate in other cities' : 'Silver rate in your city'}</H>
        <CityLinks current={c?.slug} silver />
        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to={name ? goldCityPath(c.slug) : GOLD_HUB} className="text-brand hover:underline">Gold rate today{name ? ` in ${name}` : ''}</Link>
          <Link to={PLATINUM_PAGE} className="text-brand hover:underline">Platinum rate today</Link>
        </p>

        <Faq items={[
          [`What is the silver rate today${name ? ` in ${name}` : ' in India'}?`, `IBJA's ${SESSION[r.session]} for 999 silver on ${midDate(r.last.d)} was ${rs(kg)} a kilogram, which is ${rs(kg / 1000, 2)} a gram or ${rs(kg / 100)} for 10 grams, before 3% GST.`],
          ['How much GST is charged on silver?', `3%, the same as gold. On 1 kg at today's rate that is ${rs(kg * GST)}, taking the total to ${rs(kg * (1 + GST))} before any making charge.`],
          ['When is the silver rate updated?', 'IBJA publishes an opening rate at about 12 noon and a closing rate at about 5 pm on working days, and none on Saturdays, Sundays and central government holidays.'],
          ['Why does silver move more than gold?', `Silver is used heavily in industry, in solar panels and electronics, as well as for jewellery and savings, so its price swings with factory demand as well as with gold. Since ${midDate(r.days[0].d)} its closing rate has moved by more than 1% on ${bigMoveShare(r, 'silver')}% of working days, against ${bigMoveShare(r, 'g999')}% for 24-carat gold.`],
        ]} />

        <DataPanel
          dataset={{
            name: `Silver rate${name ? ` in ${name}` : ' in India'}, daily (IBJA)`,
            description: 'Daily opening and closing rates of 999 silver in Rs per kg, from the India Bullion and Jewellers Association. Before GST. Compiled by India in Data.',
            path: name ? silverCityPath(c.slug) : SILVER_HUB, asOf: r.last.d, source: SOURCE, sourceUrl: SOURCE_URL, liveFile: 'live/gold.json',
            variables: ['Silver rate'], keywords: [name ? `silver rate today in ${name}` : 'silver rate today', 'silver price per kg', 'silver price per gram'],
          }}
          csv={{ filename: `india-in-data-silver-rate${name ? `-${c.slug}` : ''}-${r.last.d}`, label: `Daily silver rates since ${midDate(r.days[0].d)} (CSV)`, columns: SILVER_CSV, rows: csvDays(r.days).reverse() }}
        />
        <About metal="silver" />
      </section>
    </>
  )
}
export const SilverHub = () => <SilverPage />
export function SilverCityPage() {
  const { city: slug } = useParams()
  const c = goldCity[slug]
  if (!c?.silver) return <Loading title="Silver rate today" />
  return <SilverPage c={c} />
}

/* ---------- platinum ---------- */
export function PlatinumPage() {
  const r = useRates()
  useSeo({
    title: 'Platinum rate today in India: price per gram and 10 grams (IBJA)',
    description: "Today's platinum rate in India per gram and per 10 grams for 999 platinum, from the India Bullion and Jewellers Association, with GST, the change since yesterday and recent rates.",
  })
  if (!r) return <Loading title="Platinum rate today in India" />
  // platinum is only in IBJA's daily tables, so its newest day can lag the gold figures
  const withPt = r.days.filter((d) => d.am?.platinum || d.pm?.platinum)
  const last = withPt[withPt.length - 1]
  const prev = withPt[withPt.length - 2]
  if (!last) return <Loading title="Platinum rate today in India" />
  const session = last.pm?.platinum ? 'pm' : 'am'
  const v = last[session].platinum
  const before = prev ? prev.pm?.platinum ?? prev.am?.platinum : null
  const ch = before != null ? v - before : null
  const g24 = (last.pm?.g999 ?? last.am?.g999)
  return (
    <>
      <section className="border-b border-ink/10 bg-panel">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Platinum rate today in India</h1>
          <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <p className="text-sm text-ink/60">999 platinum, 1 gram</p>
              <p className="num text-5xl font-semibold text-brand sm:text-6xl">{rs(v / 10)}</p>
              <p className="mt-1 text-sm"><Move v={ch != null ? ch / 10 : null} of={v / 10} /> <span className="text-ink/60">since the previous close</span></p>
            </div>
            <div>
              <p className="text-sm text-ink/60">10 grams</p>
              <p className="num text-5xl font-semibold sm:text-6xl">{rs(v)}</p>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-body text-ink/80">
            IBJA&apos;s {SESSION[session]} for 999 platinum on {longDate(last.d)} was {rs(v)} for 10 grams, before 3% GST.{g24 ? ` That is ${Math.round((v / g24) * 100)}% of the price of 24-carat gold.` : ''}
          </p>
          <Freshness r={{ ...r, last, session }} />
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
          <Stat label="1 gram with 3% GST" value={rs((v / 10) * (1 + GST))} />
          <Stat label="10 grams with 3% GST" value={rs(v * (1 + GST))} />
          <Stat label="Platinum against 24-carat gold" value={g24 ? `${Math.round((v / g24) * 100)}%` : '—'} sub="price per gram" />
        </div>

        <H id="history">Recent platinum rates</H>
        <HistoryTable r={{ ...r, days: withPt }} fields={[['platinum', 'Platinum 999']]} unitNote="Rs per 10 g." />
        <p className="mt-2 text-xs text-ink/60">IBJA&apos;s 30-day record covers gold and silver only, so our platinum record has gaps before 11 November 2026. It fills in each working day from now on.</p>

        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to={GOLD_HUB} className="text-brand hover:underline">Gold rate today</Link>
          <Link to={SILVER_HUB} className="text-brand hover:underline">Silver rate today</Link>
        </p>

        <Faq items={[
          ['What is the platinum rate today in India?', `IBJA's ${SESSION[session]} for 999 platinum on ${midDate(last.d)} was ${rs(v / 10)} a gram, or ${rs(v)} for 10 grams, before 3% GST.`],
          ['Is platinum cheaper than gold?', g24 ? `Yes, at present. Platinum costs about ${Math.round((v / g24) * 100)}% of the price of 24-carat gold per gram. Platinum jewellery is usually 95% pure and often carries higher making charges than gold, so finished pieces cost more than the metal price suggests.` : 'Compare the two rates on this page and the gold rate page.'],
          ['When is the platinum rate updated?', 'IBJA publishes an opening rate at about 12 noon and a closing rate at about 5 pm on working days, and none on Saturdays, Sundays and central government holidays.'],
        ]} />

        <DataPanel
          dataset={{
            name: 'Platinum rate in India, daily (IBJA)',
            description: 'Daily opening and closing rates of 999 platinum in Rs per 10 g, from the India Bullion and Jewellers Association. Before GST. Compiled by India in Data.',
            path: PLATINUM_PAGE, asOf: last.d, source: SOURCE, sourceUrl: SOURCE_URL, liveFile: 'live/gold.json',
            variables: ['Platinum rate'], keywords: ['platinum rate today', 'platinum price India', 'platinum price per gram'],
          }}
          csv={{ filename: `india-in-data-platinum-rate-${last.d}`, label: 'Daily platinum rates (CSV)', columns: [{ key: 'date', label: 'Date' }, { key: 'platinum_am', label: 'Platinum 999, Rs/10 g, AM' }, { key: 'platinum_pm', label: 'Platinum 999, Rs/10 g, PM' }], rows: csvDays(withPt).reverse() }}
        />
        <About metal="platinum" />
      </section>
    </>
  )
}
