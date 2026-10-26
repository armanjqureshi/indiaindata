import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import { MPI, MPI_INDIA } from '../data/poverty.js'
import { POP_YEARS, POP_INDIA, POP_STATES, POP } from '../data/population.js'
import { YEARS, STATES, PC_CURRENT, PC_CONSTANT, GSDP_CURRENT, GSDP_CONSTANT } from '../data/states.js'

const LAST = YEARS.length - 1
const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>
const rupees = (v) => `₹${Number(v).toLocaleString('en-IN')}`
const lakhCrore = (lakh) => `₹${(lakh / 1e7).toFixed(2)} lakh crore`
const pct = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
const SOURCE = 'RBI, Handbook of Statistics on Indian States 2024-25 (Tables 19 to 22), using data from the National Statistical Office, MoSPI. Base year 2011-12.'

const at = (series, state, yi) => series[state]?.[yi] ?? null
const latestIdx = (series, state) => {
  for (let i = LAST; i >= 0; i--) if (series[state][i] != null) return i
  return -1
}
function ranked(series, yi) {
  return STATES.map((s) => ({ state: s, v: at(series, s, yi) })).filter((r) => r.v != null).sort((a, b) => b.v - a.v)
}
function missing(series, yi) {
  return STATES.filter((s) => at(series, s, yi) == null).map((s) => {
    const li = latestIdx(series, s)
    return { state: s, last: li >= 0 ? YEARS[li] : null, v: li >= 0 ? series[s][li] : null }
  })
}
// Real growth in GSDP: constant-price GSDP against the previous year.
function realGrowth(state, yi) {
  const a = at(GSDP_CONSTANT, state, yi)
  const b = at(GSDP_CONSTANT, state, yi - 1)
  return a != null && b != null ? (a / b - 1) * 100 : null
}

function Hero({ title, intro, children }) {
  return (
    <section className="border-b border-ink/10 bg-panel">
      <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-body text-ink/80">{intro}</p>
        {children}
      </div>
    </section>
  )
}

function YearSelect({ year, setYear }) {
  return (
    <label className="mb-3 flex items-center gap-2 text-sm">
      <span className="font-semibold">Year</span>
      <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-ink/25 bg-paper px-2 py-1">
        {YEARS.map((y, i) => ({ y, i })).reverse().map(({ y, i }) => <option key={y} value={i}>{y}</option>)}
      </select>
    </label>
  )
}

function Bar({ value, max }) {
  return (
    <div className="h-2 w-full min-w-[80px] bg-ink/10" aria-hidden="true">
      <div className="h-2 bg-brand" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
    </div>
  )
}

function Missing({ list, fmtVal, yearLabel }) {
  if (!list.length) return null
  return (
    <p className="mt-3 max-w-3xl text-sm leading-body text-ink/70">
      Not published for {yearLabel}: {list.map((m) => (m.last ? `${m.state} (latest ${m.last}: ${fmtVal(m.v)})` : m.state)).join('; ')}.
    </p>
  )
}

function Faq({ items }) {
  return (
    <>
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

function Footer({ extra }) {
  return (
    <>
      <p className="mt-8 max-w-3xl text-xs leading-body text-ink/60">
        Source: {SOURCE} Figures are at current prices unless stated. Latest published year is {YEARS[LAST]}; the Handbook does not give every state for that year. Ladakh is left out because the Handbook has only two years for it. See our <Link to="/methodology" className="text-brand hover:underline">methodology</Link>.
      </p>
      {extra}
      <p className="mt-4 text-sm"><Link to="/states" className="text-brand hover:underline">All state rankings</Link></p>
    </>
  )
}

/* ---------- state-wise GSDP ---------- */
export function StateGdp() {
  useSeo({
    title: 'State-wise GDP of India: GSDP of all states (2024-25)',
    description: 'GSDP of every Indian state and UT from the RBI Handbook, in rupees lakh crore, with real growth. Maharashtra is largest. Choose any year from 2011-12 to 2024-25.',
  })
  const [yi, setYi] = useState(LAST)
  const rows = ranked(GSDP_CURRENT, yi)
  const top = ranked(GSDP_CURRENT, LAST)
  const max = rows[0]?.v || 1
  const g = (s) => realGrowth(s, LAST)
  const growth = STATES.map((s) => ({ s, g: g(s) })).filter((r) => r.g != null).sort((a, b) => b.g - a.g)
  return (
    <>
      <Hero
        title="State-wise GDP of India"
        intro={`Maharashtra has the largest state economy: a GSDP of ${lakhCrore(top[0].v)} in ${YEARS[LAST]} at current prices, followed by ${top[1].state} (${lakhCrore(top[1].v)}) and ${top[2].state} (${lakhCrore(top[2].v)}). Gujarat is not in the ${YEARS[LAST]} data yet; its latest figure is ${lakhCrore(GSDP_CURRENT.Gujarat[latestIdx(GSDP_CURRENT, 'Gujarat')])} for ${YEARS[latestIdx(GSDP_CURRENT, 'Gujarat')]}.`}
      />
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>GSDP by state</H>
        <YearSelect year={yi} setYear={setYi} />
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Gross state domestic product by state, current prices</caption>
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th className="px-3 py-2 font-semibold">Rank</th>
                <th className="px-3 py-2 font-semibold">State or UT</th>
                <th className="px-3 py-2 text-right font-semibold">GSDP, {YEARS[yi]}</th>
                <th className="px-3 py-2 text-right font-semibold">Real growth</th>
                <th className="hidden px-3 py-2 sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, k) => {
                const gr = yi > 0 ? realGrowth(r.state, yi) : null
                return (
                  <tr key={r.state} className="border-b border-ink/10 last:border-0">
                    <td className="num px-3 py-2">{k + 1}</td>
                    <td className="px-3 py-2 font-semibold">{r.state}</td>
                    <td className="num px-3 py-2 text-right">{lakhCrore(r.v)}</td>
                    <td className="num px-3 py-2 text-right">{gr == null ? '—' : pct(gr)}</td>
                    <td className="hidden w-1/4 px-3 py-2 sm:table-cell"><Bar value={r.v} max={max} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Missing list={missing(GSDP_CURRENT, yi)} fmtVal={lakhCrore} yearLabel={YEARS[yi]} />
        <p className="mt-3 max-w-3xl text-sm leading-body text-ink/70">
          GSDP at current prices is the value of goods and services a state produces, in that year’s prices. Real growth uses constant 2011-12 prices, so it strips out inflation, and is shown against the previous year.
        </p>

        <H>Fastest growing states, {YEARS[LAST]}</H>
        <p className="max-w-3xl leading-body text-ink/80">
          Real GSDP growth over {YEARS[LAST - 1]}, for the {growth.length} states with both years: {growth.slice(0, 3).map((r) => `${r.s} ${pct(r.g)}`).join(', ')} lead; {growth.slice(-2).map((r) => `${r.s} ${pct(r.g)}`).join(' and ')} are slowest.
        </p>

        <Faq items={[
          ['Which is the richest state in India by GDP?', `Maharashtra, with ${lakhCrore(top[0].v)} in ${YEARS[LAST]}. See also the richest state by income per person, which gives a different answer.`],
          ['What is GSDP?', 'Gross state domestic product, the total value of goods and services produced within a state in a year. It measures the size of an economy, not how well off a typical resident is.'],
          ['Why is Gujarat missing for the latest year?', 'The RBI Handbook has no 2023-24 or 2024-25 figure for Gujarat, and none for seven other states and UTs. We show them with their latest published year instead of estimating.'],
          ['Why do other websites show different numbers?', 'Many sites use state budget estimates or a newer base year. These are the national statistics office’s estimates as compiled by the RBI, on the 2011-12 base, and may be revised.'],
        ]} />
        <Footer extra={<p className="mt-2 text-sm">Related: <Link to="/richest-state-in-india" className="text-brand hover:underline">richest state in India</Link>, <Link to="/per-capita-income-by-state" className="text-brand hover:underline">per capita income by state</Link>.</p>} />
      </section>
    </>
  )
}

/* ---------- per capita income ---------- */
export function StatePerCapita() {
  useSeo({
    title: 'Per capita income by state in India (2024-25)',
    description: 'Per capita net state domestic product for every Indian state and UT, 2011-12 to 2024-25, from the RBI Handbook. See which states are richest and poorest per person.',
  })
  const [yi, setYi] = useState(LAST)
  const rows = ranked(PC_CURRENT, yi)
  const max = rows[0]?.v || 1
  const low = rows[rows.length - 1]
  const prevYear = (s) => (yi > 0 ? at(PC_CURRENT, s, yi - 1) : null)
  const top = ranked(PC_CURRENT, LAST)
  const bottom = top[top.length - 1]
  return (
    <>
      <Hero
        title="Per capita income by state"
        intro={`Among states with ${YEARS[LAST]} figures, ${top[0].state} has the highest per capita income at ${rupees(top[0].v)} a year, and ${bottom.state} the lowest at ${rupees(bottom.v)}, so the highest is about ${(top[0].v / bottom.v).toFixed(1)} times the lowest. Per capita net state domestic product is total income divided by population, so it is an average, not what a typical person earns.`}
      />
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>Per capita income, all states</H>
        <YearSelect year={yi} setYear={setYi} />
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Per capita net state domestic product by state, current prices</caption>
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th className="px-3 py-2 font-semibold">Rank</th>
                <th className="px-3 py-2 font-semibold">State or UT</th>
                <th className="px-3 py-2 text-right font-semibold">₹ per person, {YEARS[yi]}</th>
                <th className="px-3 py-2 text-right font-semibold">Change on year</th>
                <th className="px-3 py-2 text-right font-semibold">Multiple of lowest</th>
                <th className="hidden px-3 py-2 sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, k) => {
                const p = prevYear(r.state)
                return (
                  <tr key={r.state} className="border-b border-ink/10 last:border-0">
                    <td className="num px-3 py-2">{k + 1}</td>
                    <td className="px-3 py-2 font-semibold">{r.state}</td>
                    <td className="num px-3 py-2 text-right">{rupees(r.v)}</td>
                    <td className="num px-3 py-2 text-right">{p ? pct((r.v / p - 1) * 100) : '—'}</td>
                    <td className="num px-3 py-2 text-right">{(r.v / low.v).toFixed(1)}x</td>
                    <td className="hidden w-1/5 px-3 py-2 sm:table-cell"><Bar value={r.v} max={max} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Missing list={missing(PC_CURRENT, yi)} fmtVal={rupees} yearLabel={YEARS[yi]} />
        <p className="mt-3 max-w-3xl text-sm leading-body text-ink/70">
          Figures are at current prices, so they include inflation. Small states and UTs such as Sikkim, Goa and Chandigarh rank high partly because of their size and economic mix. Compare years with care.
        </p>
        <Faq items={[
          ['Which state has the highest per capita income in India?', `In ${YEARS[LAST]}, ${top[0].state} among the states with data. In ${YEARS[LAST - 1]}, the last year with figures for almost every state, Sikkim (${rupees(PC_CURRENT.Sikkim[LAST - 1])}) and Goa (${rupees(PC_CURRENT.Goa[LAST - 1])}) were highest, ahead of Delhi (${rupees(PC_CURRENT.Delhi[LAST - 1])}).`],
          ['Which state has the lowest per capita income?', `${bottom.state}, at ${rupees(bottom.v)} in ${YEARS[LAST]}, followed by ${top[top.length - 2].state} and ${top[top.length - 3].state}.`],
          ['What is per capita NSDP?', 'Per capita net state domestic product is a state’s net income (output minus depreciation) divided by its population. It is the standard state-level proxy for income per person.'],
          ['Is this the same as the national per capita income?', 'No. This is for states and UTs. The national figure comes from a separate national accounts estimate and is not in this table.'],
        ]} />
        <Footer extra={<p className="mt-2 text-sm">Related: <Link to="/richest-state-in-india" className="text-brand hover:underline">richest state in India</Link>, <Link to="/state-wise-gdp-of-india" className="text-brand hover:underline">state-wise GDP</Link>.</p>} />
      </section>
    </>
  )
}

/* ---------- richest state ---------- */
export function RichestState() {
  useSeo({
    title: 'Richest state in India: by GDP and by income per person',
    description: 'Which is the richest state in India? Maharashtra is largest by GDP; Goa, Sikkim and Delhi lead on per capita income. Ranked tables from the RBI Handbook.',
  })
  const gdp = ranked(GSDP_CURRENT, LAST).slice(0, 10)
  const pcLast = ranked(PC_CURRENT, LAST).slice(0, 10)
  const pcPrev = ranked(PC_CURRENT, LAST - 1).slice(0, 10)
  const table = (rows, fmtVal, label) => (
    <div className="overflow-x-auto border-y border-ink/10">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{label}</caption>
        <tbody>
          {rows.map((r, k) => (
            <tr key={r.state} className="border-b border-ink/10 last:border-0">
              <td className="num w-10 px-3 py-2">{k + 1}</td>
              <td className="px-3 py-2 font-semibold">{r.state}</td>
              <td className="num px-3 py-2 text-right">{fmtVal(r.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
  return (
    <>
      <Hero
        title="Richest state in India"
        intro={`It depends on what “richest” means. By the size of its economy, Maharashtra is the richest state (GSDP ${lakhCrore(gdp[0].v)} in ${YEARS[LAST]}). By income per person, small states lead: Sikkim and Goa topped ${YEARS[LAST - 1]}, and Delhi tops the ${YEARS[LAST]} list because Sikkim and Goa have no ${YEARS[LAST]} figure yet.`}
      />
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <H>Largest economies, {YEARS[LAST]}</H>
            {table(gdp, lakhCrore, 'Top 10 states by GSDP')}
            <p className="mt-2 text-xs text-ink/60">GSDP, current prices. <Link to="/state-wise-gdp-of-india" className="text-brand hover:underline">All states</Link></p>
          </div>
          <div>
            <H>Income per person, {YEARS[LAST - 1]}</H>
            {table(pcPrev, rupees, 'Top 10 by per capita income, previous year')}
            <p className="mt-2 text-xs text-ink/60">Per capita NSDP, ₹ a year. Gujarat has no figure for this year.</p>
          </div>
          <div>
            <H>Income per person, {YEARS[LAST]}</H>
            {table(pcLast, rupees, 'Top 10 by per capita income, latest year')}
            <p className="mt-2 text-xs text-ink/60">States with {YEARS[LAST]} data only. <Link to="/per-capita-income-by-state" className="text-brand hover:underline">All states</Link></p>
          </div>
        </div>
        <Faq items={[
          ['Which is the richest state in India?', `By total economic output, Maharashtra, followed by Tamil Nadu and Uttar Pradesh. By income per person, Sikkim and Goa led in ${YEARS[LAST - 1]}, with Delhi, Chandigarh and Telangana next.`],
          ['Why do the two measures differ?', 'GSDP adds up everything a state produces, so big states score high. Per capita income divides by population, so small, high-income places such as Goa and Sikkim score high. Neither says how wealth is spread within a state.'],
          ['Is Gujarat not in the top?', `The RBI Handbook has no Gujarat figures after 2022-23. Its ${YEARS[latestIdx(GSDP_CURRENT, 'Gujarat')]} GSDP was ${lakhCrore(GSDP_CURRENT.Gujarat[latestIdx(GSDP_CURRENT, 'Gujarat')])}. We do not estimate missing years.`],
          ['Which is the poorest state?', `Bihar has the lowest per capita income in the ${YEARS[LAST]} data (${rupees(PC_CURRENT.Bihar[LAST])}), followed by Uttar Pradesh and Jharkhand. See the poorest state in India page for a second measure.`],
        ]} />
        <Footer extra={<p className="mt-2 text-sm">Related: <Link to="/poorest-state-in-india" className="text-brand hover:underline">poorest state in India</Link>.</p>} />
      </section>
    </>
  )
}

/* ---------- hub ---------- */
export function StatesHub() {
  useSeo({
    title: 'Indian states ranked: GDP, per capita income and richest state',
    description: 'Rankings of Indian states by GSDP, per capita income and wealth, from the RBI Handbook of Statistics on Indian States.',
  })
  const cards = [
    ['/state-wise-gdp-of-india', 'State-wise GDP of India', 'GSDP of every state and UT, with real growth, 2011-12 to 2024-25.'],
    ['/per-capita-income-by-state', 'Per capita income by state', 'Income per person for every state and UT, richest to poorest.'],
    ['/richest-state-in-india', 'Richest state in India', 'The answer by size of economy and by income per person.'],
    ['/population-by-state', 'India population by state', 'Projected population of every state and UT, 2011 to 2036.'],
    ['/poorest-state-in-india', 'Poorest state in India', 'Lowest incomes and highest multidimensional poverty, by state.'],
  ]
  return (
    <>
      <Hero title="Indian states, ranked" intro="State-level income and output from the RBI Handbook of Statistics on Indian States 2024-25, with the source and year on every page." />
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 md:grid-cols-3">
          {cards.map(([to, t, d]) => (
            <Link key={to} to={to} className="bg-paper p-5 hover:bg-ink/[0.03]">
              <h2 className="font-display text-xl font-semibold">{t}</h2>
              <p className="mt-2 text-sm leading-body text-ink/70">{d}</p>
            </Link>
          ))}
        </div>
        <Footer />
      </section>
    </>
  )
}

/* ---------- population ---------- */
const POP_LAST = POP_YEARS.length - 1
const POP_NOW = POP_YEARS.indexOf(2026)
const popFmt = (thousand) => (thousand >= 10000 ? `${(thousand / 10000).toFixed(2)} crore` : `${(thousand / 100).toFixed(1)} lakh`)
const popFmtShort = (thousand) => (thousand >= 10000 ? `${(thousand / 10000).toFixed(2)} cr` : `${(thousand / 100).toFixed(1)} lakh`)

export function StatePopulation() {
  useSeo({
    title: 'India population by state (2026 projection)',
    description: 'Projected population of every Indian state and UT from 2011 to 2036, from the National Commission on Population. Uttar Pradesh is largest. Ranked, with share of India.',
  })
  const [yi, setYi] = useState(POP_NOW)
  const rows = POP_STATES.map((s) => ({ state: s, v: POP[s][yi], base: POP[s][0] })).sort((a, b) => b.v - a.v)
  const max = rows[0].v
  const now = POP_STATES.map((s) => ({ state: s, v: POP[s][POP_NOW] })).sort((a, b) => b.v - a.v)
  const large = POP_STATES.filter((s) => POP[s][0] >= 10000)
  const growth = large.map((s) => ({ s, g: (POP[s][POP_NOW] / POP[s][0] - 1) * 100 })).sort((a, b) => b.g - a.g)
  const big = large.map((s) => ({ s, g: (POP[s][POP_LAST] / POP[s][POP_NOW] - 1) * 100 })).sort((a, b) => b.g - a.g)
  const fiveShare = (now.slice(0, 5).reduce((a, r) => a + r.v, 0) / POP_INDIA[POP_NOW]) * 100
  return (
    <>
      <Hero
        title="India population by state"
        intro={`India’s projected population on 1 March 2026 is ${popFmt(POP_INDIA[POP_NOW])}. ${now[0].state} is the largest state with ${popFmt(now[0].v)}, followed by ${now[1].state} (${popFmt(now[1].v)}) and ${now[2].state} (${popFmt(now[2].v)}). These are official projections, not a count: the last census was in 2011.`}
      />
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>Population by state</H>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <span className="font-semibold">Year</span>
          <select value={yi} onChange={(e) => setYi(Number(e.target.value))} className="border border-ink/25 bg-paper px-2 py-1">
            {POP_YEARS.map((y, i) => ({ y, i })).reverse().map(({ y, i }) => <option key={y} value={i}>{y}{y === 2011 ? ' (Census)' : ''}</option>)}
          </select>
        </label>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Population by state and UT</caption>
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th className="px-3 py-2 font-semibold">Rank</th>
                <th className="px-3 py-2 font-semibold">State or UT</th>
                <th className="px-3 py-2 text-right font-semibold">Population, {POP_YEARS[yi]}</th>
                <th className="px-3 py-2 text-right font-semibold">Share of India</th>
                <th className="px-3 py-2 text-right font-semibold">Change since 2011</th>
                <th className="hidden px-3 py-2 sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, k) => (
                <tr key={r.state} className="border-b border-ink/10 last:border-0">
                  <td className="num px-3 py-2">{k + 1}</td>
                  <td className="px-3 py-2 font-semibold">{r.state}</td>
                  <td className="num px-3 py-2 text-right">{popFmtShort(r.v)}</td>
                  <td className="num px-3 py-2 text-right">{((r.v / POP_INDIA[yi]) * 100).toFixed(1)}%</td>
                  <td className="num px-3 py-2 text-right">{yi === 0 ? '—' : pct((r.v / r.base - 1) * 100)}</td>
                  <td className="hidden w-1/5 px-3 py-2 sm:table-cell"><Bar value={r.v} max={max} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-body text-ink/70">
          India total for {POP_YEARS[yi]}: {popFmt(POP_INDIA[yi])}. The five largest states hold {fiveShare.toFixed(0)}% of the population in 2026. 1 crore is 10 million.
        </p>

        <H>Which states are growing fastest</H>
        <p className="max-w-3xl leading-body text-ink/80">
          Among the {large.length} states and UTs that had at least 1 crore people in 2011, between the Census and 2026 {growth.slice(0, 3).map((r) => `${r.s} (${pct(r.g)})`).join(', ')} grew fastest and {growth.slice(-3).reverse().map((r) => `${r.s} (${pct(r.g)})`).join(', ')} grew slowest. For 2026 to 2036, {big.slice(0, 2).map((r) => r.s).join(' and ')} are projected to add the most ({big.slice(0, 2).map((r) => pct(r.g)).join(' and ')}), while {big.slice(-2).map((r) => r.s).join(' and ')} add the least ({big.slice(-2).map((r) => pct(r.g)).join(' and ')}).
        </p>

        <Faq items={[
          ['What is the population of India in 2026?', `The official projection is ${popFmt(POP_INDIA[POP_NOW])} on 1 March 2026. It is a projection built from the 2011 Census, not a count.`],
          ['Which is the most populous state in India?', `${now[0].state}, with a projected ${popFmt(now[0].v)} in 2026, about ${((now[0].v / POP_INDIA[POP_NOW]) * 100).toFixed(0)}% of India. ${now[1].state} and ${now[2].state} come next.`],
          ['Where do these numbers come from?', 'From the Report of the Technical Group on Population Projections 2011-2036, published by the National Commission on Population under the Ministry of Health and Family Welfare in July 2020. It projects each state from the 2011 Census using assumptions about births, deaths and migration.'],
          ['Why do other sites show different figures?', 'Sites use different projections, the UN estimates, or a simple extrapolation of 2011. The projections here are the Indian government’s own and will be replaced once a new census is published.'],
        ]} />
        <p className="mt-8 max-w-3xl text-xs leading-body text-ink/60">
          Source: National Commission on Population, Ministry of Health and Family Welfare, Report of the Technical Group on Population Projections 2011-2036 (July 2020), Table 8, projected total population as on 1 March. State figures add up to the India total within rounding. Dadra and Nagar Haveli and Daman and Diu are combined. The report projects the seven north-eastern states other than Assam together, so several show the same growth, and very small UTs such as Dadra and Nagar Haveli and Daman and Diu show large swings from its migration assumptions. See our <Link to="/methodology" className="text-brand hover:underline">methodology</Link>.
        </p>
        <p className="mt-4 text-sm"><Link to="/states" className="text-brand hover:underline">All state rankings</Link></p>
      </section>
    </>
  )
}

/* ---------- poorest state ---------- */
export function PoorestState() {
  useSeo({
    title: 'Poorest state in India: by income and by multidimensional poverty',
    description: 'Which is the poorest state in India? Bihar is lowest on income per person and on NITI Aayog’s multidimensional poverty index. Ranked tables with sources.',
  })
  const pc = ranked(PC_CURRENT, LAST)
  const lowest = [...pc].reverse().slice(0, 10)
  const mpi = Object.entries(MPI).map(([state, v]) => ({ state, a: v[0], b: v[3] })).sort((x, y) => y.b - x.b)
  const maxB = mpi[0].b
  const falls = [...mpi].sort((x, y) => (y.a - y.b) - (x.a - x.b))
  return (
    <>
      <Hero
        title="Poorest state in India"
        intro={`Bihar is the poorest state on both common measures. Its income per person was ${rupees(PC_CURRENT.Bihar[LAST])} in ${YEARS[LAST]}, the lowest of any state with data, and ${MPI.Bihar[3].toFixed(2)}% of its people were multidimensionally poor in 2019-21, the highest share in the country. Uttar Pradesh and Jharkhand follow on income; Jharkhand and Meghalaya follow Bihar on the poverty index.`}
      />
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <H>Lowest income per person, {YEARS[LAST]}</H>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Ten states with the lowest per capita income</caption>
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th className="px-3 py-2 font-semibold">State</th>
                <th className="px-3 py-2 text-right font-semibold">₹ per person a year</th>
                <th className="px-3 py-2 text-right font-semibold">Share of the highest ({pc[0].state})</th>
              </tr>
            </thead>
            <tbody>
              {lowest.map((r) => (
                <tr key={r.state} className="border-b border-ink/10 last:border-0">
                  <td className="px-3 py-2 font-semibold">{r.state}</td>
                  <td className="num px-3 py-2 text-right">{rupees(r.v)}</td>
                  <td className="num px-3 py-2 text-right">{((r.v / pc[0].v) * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-body text-ink/70">
          Per capita net state domestic product at current prices, from the RBI Handbook. Eight states and UTs, including Gujarat, have no {YEARS[LAST]} figure. See the <Link to="/per-capita-income-by-state" className="text-brand hover:underline">full ranking</Link>.
        </p>

        <H>Share of people who are multidimensionally poor</H>
        <p className="max-w-3xl leading-body text-ink/80">
          NITI Aayog’s index counts a person as poor if they are deprived on a third or more of 12 measures covering health, education and living standards, such as nutrition, schooling, sanitation, cooking fuel and housing. It is not an income measure and not the poverty line. India’s headcount fell from {MPI_INDIA[0].toFixed(2)}% in 2015-16 to {MPI_INDIA[3].toFixed(2)}% in 2019-21.
        </p>
        <div className="mt-4 overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Multidimensional poverty headcount by state, 2015-16 and 2019-21</caption>
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th className="px-3 py-2 font-semibold">Rank</th>
                <th className="px-3 py-2 font-semibold">State or UT</th>
                <th className="px-3 py-2 text-right font-semibold">2019-21</th>
                <th className="px-3 py-2 text-right font-semibold">2015-16</th>
                <th className="px-3 py-2 text-right font-semibold">Change</th>
                <th className="hidden px-3 py-2 sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {mpi.map((r, k) => (
                <tr key={r.state} className="border-b border-ink/10 last:border-0">
                  <td className="num px-3 py-2">{k + 1}</td>
                  <td className="px-3 py-2 font-semibold">{r.state}</td>
                  <td className="num px-3 py-2 text-right">{r.b.toFixed(2)}%</td>
                  <td className="num px-3 py-2 text-right">{r.a.toFixed(2)}%</td>
                  <td className="num px-3 py-2 text-right">{(r.b - r.a).toFixed(1)} pts</td>
                  <td className="hidden w-1/5 px-3 py-2 sm:table-cell"><Bar value={r.b} max={maxB} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-body text-ink/70">
          Headcount ratio, per cent of the population. Surveys: NFHS-4 (2015-16) and NFHS-5 (2019-21). The most recent figures here are from before 2022.
        </p>

        <Faq items={[
          ['Which is the poorest state in India?', `Bihar, on both measures: the lowest income per person (${rupees(PC_CURRENT.Bihar[LAST])} in ${YEARS[LAST]}) and the highest multidimensional poverty headcount (${MPI.Bihar[3].toFixed(2)}% in 2019-21).`],
          ['Which state has improved the most?', `${falls[0].state} cut its headcount by ${(falls[0].a - falls[0].b).toFixed(1)} percentage points between 2015-16 and 2019-21, the most of any state, followed by ${falls[1].state} (${(falls[1].a - falls[1].b).toFixed(1)}) and ${falls[2].state} (${(falls[2].a - falls[2].b).toFixed(1)}).`],
          ['Which state has the lowest poverty?', `Kerala has the lowest multidimensional poverty headcount at ${MPI.Kerala[3].toFixed(2)}%, followed by Goa, Puducherry and Lakshadweep, all below 1.2%.`],
          ['Why do the two lists differ?', `Income per person measures money earned. The multidimensional index measures deprivation in health, schooling and living conditions. Jammu & Kashmir, for example, is fifth lowest on income but has a poverty headcount of only ${MPI['Jammu & Kashmir'][3].toFixed(2)}%.`],
          ['Is this the same as the poverty line?', 'No. The poverty line is a consumption cut-off. The multidimensional index counts deprivations from household surveys, so the two give different numbers.'],
        ]} />
        <p className="mt-8 max-w-3xl text-xs leading-body text-ink/60">
          Sources: RBI, Handbook of Statistics on Indian States 2024-25: Table 19 (per capita NSDP, from the National Statistical Office, MoSPI) and Table 10 (multidimensional poverty, from NITI Aayog, National Multidimensional Poverty Index: A Progress Review 2023). See our <Link to="/methodology" className="text-brand hover:underline">methodology</Link>.
        </p>
        <p className="mt-4 text-sm">Related: <Link to="/richest-state-in-india" className="text-brand hover:underline">richest state in India</Link>. <Link to="/states" className="text-brand hover:underline">All state rankings</Link></p>
      </section>
    </>
  )
}
