import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSeo from '../components/Seo.jsx'
import ChartCard from '../components/ChartCard.jsx'
import DataPanel from '../components/DataTools.jsx'
import NotFound from './NotFound.jsx'
import { useDistricts, useDistrictIndex } from '../data/live.js'

// District pages: every district in the 2011 Census, grouped by today's states and UTs.
// Data: live/districts/<state>.json and live/districts-index.json, built by
// scripts/data/build-districts.py from the Census 2011 Primary Census Abstract.

const SOURCE = 'Census of India 2011, Primary Census Abstract (Office of the Registrar General and Census Commissioner, India)'
const SOURCE_URL = 'https://censusindia.gov.in/nada/index.php/catalog/6191'
export const DISTRICTS_HUB = '/districts'
export const districtPath = (stateSlug, slug) => `/districts/${stateSlug}${slug ? '/' + slug : ''}`

/* ---------- formatting ---------- */
const commas = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'))
function people(n) {
  if (n == null) return '—'
  if (n >= 1e7) return `${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} crore`
  if (n >= 1e5) return `${(n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} lakh`
  return commas(n)
}
const pc = (v, d = 1) => (v == null ? '—' : `${Number(v).toFixed(d)}%`)
function ord(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const fullName = (d) => (d.censusName ? `${d.name} (${d.censusName})` : d.name)

/* ---------- shared bits ---------- */
const H = ({ children }) => <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">{children}</h2>

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
        {crumbs && <p className="text-sm text-ink/60">{crumbs}</p>}
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

function About() {
  return (
    <>
      <H>About these figures</H>
      <div className="max-w-3xl space-y-3 leading-body text-ink/80">
        <p>All figures are from the 2011 Census, the most recent completed census of India, published in the Primary Census Abstract by the Office of the Registrar General and Census Commissioner. The next census, Census 2027, will replace them.</p>
        <p>Districts are shown as they were in 2011. Many states have created new districts since, so a district today may be smaller than the one shown here. Districts are grouped under today&apos;s states and union territories: the ten 2011 districts now in Telangana are under Telangana, Leh and Kargil are under Ladakh, and Dadra and Nagar Haveli and Daman and Diu are shown together. Districts renamed since 2011 carry their current name, with the Census name in brackets.</p>
        <p>Literacy rate is the share of people aged seven and over who can read and write with understanding. Sex ratio is females per 1,000 males; child sex ratio is the same for children aged 0 to 6. Workers include main workers (six months or more of work in the year) and marginal workers (less than six months).</p>
      </div>
    </>
  )
}

/* ---------- sortable table of districts ---------- */
const COLS = [
  { key: 'name', label: 'District', num: false },
  { key: 'pop', label: 'Population', num: true, fmt: commas },
  { key: 'literacy', label: 'Literacy', num: true, fmt: (v) => pc(v) },
  { key: 'sexRatio', label: 'Sex ratio', num: true, fmt: (v) => v },
  { key: 'urbanPct', label: 'Urban', num: true, fmt: (v) => pc(v) },
]

function DistrictTable({ rows, showState = false, limit }) {
  const [sort, setSort] = useState({ key: 'pop', dir: -1 })
  const [all, setAll] = useState(false)
  const sorted = useMemo(() => {
    const r = [...rows]
    r.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key]
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir
    })
    return r
  }, [rows, sort])
  const shown = limit && !all ? sorted.slice(0, limit) : sorted
  const head = (c) => {
    const on = sort.key === c.key
    return (
      <th key={c.key} scope="col" aria-sort={on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-semibold ${c.num ? 'text-right' : ''}`}>
        <button type="button" onClick={() => setSort({ key: c.key, dir: on ? -sort.dir : c.num ? -1 : 1 })} className={`inline-flex items-center gap-1 hover:text-brand ${on ? 'text-ink' : ''}`}>
          {c.label}
          <span aria-hidden="true" className="text-[10px]">{on ? (sort.dir > 0 ? '▲' : '▼') : ''}</span>
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
              <th scope="col" className="w-10 px-3 py-2 text-right font-semibold">#</th>
              {COLS.slice(0, 1).map(head)}
              {showState && <th scope="col" className="hidden px-3 py-2 font-semibold md:table-cell">State or UT</th>}
              {COLS.slice(1).map(head)}
            </tr>
          </thead>
          <tbody>
            {shown.map((d, i) => (
              <tr key={`${d.stateSlug || ''}/${d.slug}`} className="border-b border-ink/10 last:border-0">
                <td className="num px-3 py-2 text-right text-ink/50">{i + 1}</td>
                <td className="px-3 py-2 font-semibold">
                  <Link to={districtPath(d.stateSlug, d.slug)} className="hover:text-brand">{d.name}</Link>
                  {d.censusName && <span className="font-normal text-ink/50"> ({d.censusName})</span>}
                  {showState && <span className="block text-xs font-normal text-ink/50 md:hidden">{d.state}</span>}
                </td>
                {showState && <td className="hidden px-3 py-2 md:table-cell"><Link to={districtPath(d.stateSlug)} className="hover:text-brand">{d.state}</Link></td>}
                {COLS.slice(1).map((c) => (
                  <td key={c.key} className="num px-3 py-2 text-right">{c.fmt(d[c.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit && rows.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-sm font-semibold text-brand hover:underline">
          {all ? `Show the first ${limit}` : `Show all ${rows.length} districts`}
        </button>
      )}
    </>
  )
}

const ROW_COLS = [
  { key: 'name', label: 'District' }, { key: 'censusName', label: 'Census 2011 name' }, { key: 'state', label: 'State or UT' },
  { key: 'pop', label: 'Population' }, { key: 'literacy', label: 'Literacy rate (%)' }, { key: 'sexRatio', label: 'Sex ratio (females per 1,000 males)' },
  { key: 'childSexRatio', label: 'Child sex ratio (0-6)' }, { key: 'urbanPct', label: 'Urban population (%)' },
  { key: 'scPct', label: 'Scheduled Castes (%)' }, { key: 'stPct', label: 'Scheduled Tribes (%)' }, { key: 'workPct', label: 'Workers (% of population)' },
]
const PROFILE_COLS = [
  { key: 'area', label: 'Area' }, { key: 'pop', label: 'Population' }, { key: 'male', label: 'Males' }, { key: 'female', label: 'Females' },
  { key: 'households', label: 'Households' }, { key: 'pop06', label: 'Children 0-6' }, { key: 'urbanPop', label: 'Urban population' }, { key: 'ruralPop', label: 'Rural population' },
  { key: 'sc', label: 'Scheduled Castes' }, { key: 'st', label: 'Scheduled Tribes' }, { key: 'literates', label: 'Literates' },
  { key: 'workers', label: 'Workers' }, { key: 'mainWorkers', label: 'Main workers' }, { key: 'marginalWorkers', label: 'Marginal workers' },
  { key: 'cultivators', label: 'Cultivators' }, { key: 'agriLabourers', label: 'Agricultural labourers' }, { key: 'householdIndustry', label: 'Household industry workers' }, { key: 'otherWorkers', label: 'Other workers' },
  { key: 'literacy', label: 'Literacy rate (%)' }, { key: 'literacyMale', label: 'Male literacy (%)' }, { key: 'literacyFemale', label: 'Female literacy (%)' },
  { key: 'sexRatio', label: 'Sex ratio' }, { key: 'childSexRatio', label: 'Child sex ratio' }, { key: 'urbanPct', label: 'Urban (%)' },
  { key: 'workPct', label: 'Work participation (%)' }, { key: 'femaleWorkPct', label: 'Female work participation (%)' }, { key: 'householdSize', label: 'Persons per household' },
]

/* ---------- one district ---------- */
export function DistrictPage() {
  const { state: st, district: ds } = useParams()
  const data = useDistricts(st, ds)
  const d = data?.districts?.find((x) => x.slug === ds)
  const s = data?.state
  const india = data?.india
  const n = data?.totalDistricts || 640
  const label = d ? fullName(d) : ds.replace(/-/g, ' ')
  useSeo({
    title: d ? `${label} district population, literacy rate and sex ratio (Census 2011)` : 'District not found',
    description: d ? `${d.name} district, ${s.name}: population ${commas(d.pop)}, literacy ${pc(d.literacy)}, sex ratio ${d.sexRatio}, urban share ${pc(d.urbanPct)} in the 2011 Census, with its rank among India's ${n} districts and what its workers do.` : '',
  })
  if (!data) return <Hero title="Loading district data" />
  if (!d || !d.rankIndia) return <NotFound />
  const others = data.districts.filter((x) => x.slug !== d.slug)
  const sn = data.districts.length
  const rows = [
    ['Population', commas(d.pop), commas(s.pop), commas(india.pop)],
    ['Literacy rate (age 7+)', pc(d.literacy), pc(s.literacy), pc(india.literacy)],
    ['Male literacy', pc(d.literacyMale), pc(s.literacyMale), pc(india.literacyMale)],
    ['Female literacy', pc(d.literacyFemale), pc(s.literacyFemale), pc(india.literacyFemale)],
    ['Sex ratio (females per 1,000 males)', d.sexRatio, s.sexRatio, india.sexRatio],
    ['Child sex ratio (age 0-6)', d.childSexRatio, s.childSexRatio, india.childSexRatio],
    ['Urban population', pc(d.urbanPct), pc(s.urbanPct), pc(india.urbanPct)],
    ['Scheduled Castes', pc(d.scPct), pc(s.scPct), pc(india.scPct)],
    ['Scheduled Tribes', pc(d.stPct), pc(s.stPct), pc(india.stPct)],
    ['Workers, share of population', pc(d.workPct), pc(s.workPct), pc(india.workPct)],
    ['Women who work, share of women', pc(d.femaleWorkPct), pc(s.femaleWorkPct), pc(india.femaleWorkPct)],
    ['Children aged 0-6, share of population', pc(d.childPct), pc(s.childPct), pc(india.childPct)],
    ['Persons per household', d.householdSize.toFixed(2), s.householdSize.toFixed(2), india.householdSize.toFixed(2)],
  ]
  const series = [d.name, s.name, 'India']
  const pick = (k) => ({ [d.name]: d[k], [s.name]: s[k], India: india[k] })
  const workChart = {
    type: 'bar',
    title: `What workers do in ${d.name}`,
    subtitle: 'Share of all workers (main and marginal), per cent, 2011',
    source: 'Census of India 2011, Primary Census Abstract',
    xKey: 'work', dataKeys: series, unit: '%',
    data: [['Cultivators', 'cultivatorsPct'], ['Farm labourers', 'agriLabourersPct'], ['Household industry', 'householdIndustryPct'], ['Other work', 'otherWorkersPct']].map(([w, k]) => ({ work: w, ...pick(k) })),
  }
  const litChart = {
    type: 'bar',
    title: `Literacy in ${d.name}, ${s.name} and India`,
    subtitle: 'People aged 7 and over who can read and write, per cent, 2011',
    source: 'Census of India 2011, Primary Census Abstract',
    xKey: 'group', dataKeys: series, unit: '%',
    data: [['All', 'literacy'], ['Men', 'literacyMale'], ['Women', 'literacyFemale']].map(([g, k]) => ({ group: g, ...pick(k) })),
  }
  const top = d.rankState.pop === 1
  return (
    <>
      <Hero crumbs={<><Link to={DISTRICTS_HUB} className="hover:text-brand">Districts</Link> / <Link to={districtPath(s.slug)} className="hover:text-brand">{s.name}</Link></>} title={`${d.name} district`}>
        {d.censusName && <p className="mt-2 text-ink/60">Called {d.censusName} in the 2011 Census</p>}
        <p className="mt-4 max-w-3xl text-lg leading-body text-ink/80">
          {d.name === s.name ? d.name : `${d.name} in ${s.name}`} had <span className="num font-semibold text-ink">{people(d.pop)}</span> people{d.pop >= 1e5 ? ` (${commas(d.pop)})` : ''} in the 2011 Census, the {ord(d.rankIndia.pop)} most populous of India&apos;s {n} districts{sn === 1 ? ` and the only district in ${s.name}` : top ? ` and the largest in ${s.name}` : ` and ${ord(d.rankState.pop)} of ${sn} in ${s.name}`}. {pc(d.literacy)} of people aged seven and over could read and write, against {pc(india.literacy)} nationally.
        </p>
      </Hero>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Population, 2011" value={people(d.pop)} sub={sn === 1 ? `${ord(d.rankIndia.pop)} of ${n} in India` : `${ord(d.rankIndia.pop)} of ${n} in India, ${ord(d.rankState.pop)} of ${sn} in ${s.name}`} />
          <Stat label="Literacy rate" value={pc(d.literacy)} sub={sn === 1 ? `${ord(d.rankIndia.literacy)} of ${n} in India` : `${ord(d.rankIndia.literacy)} in India, ${ord(d.rankState.literacy)} in ${s.name}`} />
          <Stat label="Sex ratio" value={d.sexRatio} sub={`females per 1,000 males; India ${india.sexRatio}`} />
          <Stat label="Child sex ratio (0-6)" value={d.childSexRatio} sub={`girls per 1,000 boys; India ${india.childSexRatio}`} />
          <Stat label="Urban population" value={pc(d.urbanPct)} sub={`${people(d.urbanPop)} in towns and cities`} />
          <Stat label="Households" value={people(d.households)} sub={`${d.householdSize.toFixed(1)} people per household`} />
        </div>

        <H>{d.name} against {s.name} and India</H>
        <div className="overflow-x-auto border-y border-ink/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left text-xs text-ink/60">
                <th scope="col" className="px-3 py-2 font-semibold">Measure, 2011</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">{d.name}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">{s.name}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">India</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([m, a, b, c]) => (
                <tr key={m} className="border-b border-ink/10 last:border-0">
                  <td className="px-3 py-2">{m}</td>
                  <td className="num px-3 py-2 text-right font-semibold">{a}</td>
                  <td className="num px-3 py-2 text-right">{b}</td>
                  <td className="num px-3 py-2 text-right">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ChartCard chart={litChart} sectionSlug="society" />
          <ChartCard chart={workChart} sectionSlug="economy" />
        </div>

        {others.length > 0 && (
          <>
            <H>Other districts in {s.name}</H>
            <DistrictTable rows={data.districts.map((x) => ({ ...x, stateSlug: s.slug }))} limit={15} />
          </>
        )}
        <p className="mt-6 text-sm">
          <Link to={districtPath(s.slug)} className="text-brand hover:underline">All districts of {s.name}</Link>
          {' · '}
          <Link to={DISTRICTS_HUB} className="text-brand hover:underline">All districts of India</Link>
          {' · '}
          <Link to="/population-by-state" className="text-brand hover:underline">Population by state</Link>
        </p>

        <Faq items={[
          [`What is the population of ${d.name} district?`, `${d.name} district had ${commas(d.pop)} people in the 2011 Census (${commas(d.male)} males and ${commas(d.female)} females). It was the ${ord(d.rankIndia.pop)} most populous of India's ${n} districts${sn === 1 ? '' : ` and ${ord(d.rankState.pop)} of ${sn} in ${s.name}`}.`],
          [`What is the literacy rate of ${d.name}?`, `${pc(d.literacy, 2)} in 2011: ${pc(d.literacyMale, 2)} for men and ${pc(d.literacyFemale, 2)} for women, counting people aged seven and over. The ${s.name} rate was ${pc(s.literacy, 2)} and India's ${pc(india.literacy, 2)}.`],
          [`What is the sex ratio of ${d.name}?`, `${d.sexRatio} females per 1,000 males in 2011, against ${s.sexRatio} in ${s.name} and ${india.sexRatio} in India. Among children aged 0 to 6 it was ${d.childSexRatio} girls per 1,000 boys.`],
          [`How urban is ${d.name}?`, `${pc(d.urbanPct)} of its people lived in towns and cities in 2011, ${d.urbanPct > s.urbanPct ? 'more' : 'less'} than the ${s.name} share of ${pc(s.urbanPct)}.`],
          ['Is this the latest data?', 'Yes for district-level counts of population, literacy and workers: the 2011 Census is the latest completed census. Census 2027 will replace these figures. District boundaries are as they were in 2011.'],
        ]} />

        <DataPanel
          dataset={{
            name: `${label} district, ${s.name}: Census 2011 population, literacy and workers`,
            description: `Census 2011 profile of ${label} district, ${s.name}: population, households, literacy, sex ratio, child sex ratio, urban share, Scheduled Castes and Tribes, and workers by type, compared with ${s.name} and India. From the Primary Census Abstract; compiled by India in Data.`,
            path: districtPath(s.slug, d.slug), source: SOURCE, sourceUrl: SOURCE_URL, temporalCoverage: '2011',
            liveFile: `live/districts/${s.slug}.json`,
            variables: ['Population', 'Literacy rate', 'Sex ratio', 'Child sex ratio', 'Urban population share', 'Workers by category'],
            keywords: [`${d.name} population`, `${d.name} literacy rate`, `${d.name} sex ratio`, `${d.name} district`],
          }}
          csv={{ filename: `india-in-data-${d.slug}-district-census-2011`, label: `${d.name}, ${s.name} and India (CSV)`, columns: PROFILE_COLS, rows: [{ area: `${d.name} district`, ...d }, { area: s.name, ...s }, { area: 'India', ...india }] }}
        />
        <About />
      </section>
    </>
  )
}

/* ---------- districts of one state ---------- */
export function DistrictStatePage() {
  const { state: st } = useParams()
  const data = useDistricts(st)
  const s = data?.state
  useSeo({
    title: s ? (s.districts === 1 ? `Districts of ${s.name}: population, literacy and sex ratio (Census 2011)` : `Districts of ${s.name}: population, literacy and sex ratio of all ${s.districts} districts (Census 2011)`) : 'Districts',
    description: s ? `${s.districts === 1 ? `The district` : `All ${s.districts} districts`} of ${s.name} in the 2011 Census, ranked by population, literacy rate, sex ratio and urban share, with a page for each district.` : '',
  })
  if (!data) return <Hero title="Loading district data" />
  if (!s) return <NotFound />
  const ds = data.districts.map((x) => ({ ...x, stateSlug: s.slug }))
  const by = (k, dir = -1) => [...ds].sort((a, b) => (b[k] - a[k]) * -dir)
  const big = by('pop')[0], small = by('pop', 1)[0]
  const lit = by('literacy')[0], lowLit = by('literacy', 1)[0]
  const fem = by('sexRatio')[0], lowFem = by('sexRatio', 1)[0]
  const many = ds.length > 1
  return (
    <>
      <Hero crumbs={<Link to={DISTRICTS_HUB} className="hover:text-brand">Districts</Link>} title={`Districts of ${s.name}`}>
        <p className="mt-4 max-w-3xl text-lg leading-body text-ink/80">
          The 2011 Census counted {s.districts} {s.districts === 1 ? 'district' : 'districts'} in what is now {s.name}, home to {people(s.pop)} people.{many ? <> {big.name} was the largest, with {people(big.pop)}; {lit.name} had the highest literacy rate at {pc(lit.literacy)}.</> : ''}
        </p>
      </Hero>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Population, 2011" value={people(s.pop)} sub={`${s.districts} ${s.districts === 1 ? 'district' : 'districts'}`} />
          <Stat label="Literacy rate" value={pc(s.literacy)} sub={`India ${pc(data.india.literacy)}`} />
          <Stat label="Sex ratio" value={s.sexRatio} sub={`females per 1,000 males; India ${data.india.sexRatio}`} />
          <Stat label="Urban population" value={pc(s.urbanPct)} sub={`India ${pc(data.india.urbanPct)}`} />
        </div>

        <H>All districts of {s.name}</H>
        <DistrictTable rows={ds} />
        <p className="mt-3 text-xs text-ink/60">Census 2011. Click a column to sort. Literacy is for people aged seven and over; sex ratio is females per 1,000 males.</p>

        <p className="mt-6 text-sm">
          <Link to={DISTRICTS_HUB} className="text-brand hover:underline">Districts of all states</Link>
          {' · '}
          <Link to="/state-wise-gdp-of-india" className="text-brand hover:underline">State-wise GDP</Link>
          {' · '}
          <Link to="/population-by-state" className="text-brand hover:underline">Population by state</Link>
        </p>

        <Faq items={[
          [`How many districts were there in ${s.name} in the 2011 Census?`, `${s.districts}. Districts created since 2011 are not shown separately here, because the Census reports figures for the districts as they were then.`],
          ...(many ? [
            [`Which is the most populous district of ${s.name}?`, `${big.name}, with ${commas(big.pop)} people in 2011. The smallest was ${small.name}, with ${commas(small.pop)}.`],
            [`Which district of ${s.name} has the highest literacy rate?`, `${lit.name}, at ${pc(lit.literacy, 2)} in 2011. The lowest was ${lowLit.name}, at ${pc(lowLit.literacy, 2)}.`],
            [`Which district of ${s.name} has the best sex ratio?`, `${fem.name}, with ${fem.sexRatio} females per 1,000 males in 2011. The lowest was ${lowFem.name}, at ${lowFem.sexRatio}.`],
          ] : []),
        ]} />

        <DataPanel
          dataset={{
            name: `Districts of ${s.name}: Census 2011 population, literacy and sex ratio`,
            description: `Population, literacy rate, sex ratio, child sex ratio, urban share, Scheduled Caste and Tribe shares and work participation for all ${s.districts} districts of ${s.name} in the 2011 Census. From the Primary Census Abstract; compiled by India in Data.`,
            path: districtPath(s.slug), source: SOURCE, sourceUrl: SOURCE_URL, temporalCoverage: '2011', liveFile: `live/districts/${s.slug}.json`,
            variables: ['Population', 'Literacy rate', 'Sex ratio', 'Urban population share'], keywords: [`districts of ${s.name}`, `${s.name} district population`],
          }}
          csv={{ filename: `india-in-data-districts-of-${s.slug}-census-2011`, label: `All ${s.name} districts (CSV)`, columns: ROW_COLS, rows: ds.map((x) => ({ ...x, state: s.name })) }}
        />
        <About />
      </section>
    </>
  )
}

/* ---------- all districts ---------- */
function TopList({ title, rows, value }) {
  return (
    <div className="min-w-0 bg-panel p-5">
      <h3 className="font-semibold">{title}</h3>
      <ol className="mt-3 space-y-1.5 text-sm">
        {rows.map((d, i) => (
          <li key={`${d.stateSlug}/${d.slug}`} className="flex items-baseline gap-2">
            <span className="num w-5 shrink-0 text-right text-ink/40">{i + 1}</span>
            <Link to={districtPath(d.stateSlug, d.slug)} className="min-w-0 flex-1 truncate hover:text-brand">{d.name}<span className="text-ink/50">, {d.state}</span></Link>
            <span className="num shrink-0 font-semibold">{value(d)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function DistrictsHub() {
  const idx = useDistrictIndex()
  const [state, setState] = useState('')
  const [q, setQ] = useState('')
  useSeo({
    title: 'Districts of India: population, literacy and sex ratio of all 640 districts (Census 2011)',
    description: 'Every district of India in the 2011 Census, with population, literacy rate, sex ratio and urban share, rankings, and a page for each district and state.',
  })
  if (!idx) return <Hero title="Loading district data" />
  const all = idx.districts
  const sort = (k, dir = -1) => [...all].sort((a, b) => (b[k] - a[k]) * -dir).slice(0, 10)
  const ql = q.trim().toLowerCase()
  const rows = all.filter((d) => (!state || d.stateSlug === state) && (!ql || d.name.toLowerCase().includes(ql) || (d.censusName || '').toLowerCase().includes(ql)))
  return (
    <>
      <Hero title="Districts of India">
        <p className="mt-4 max-w-3xl text-lg leading-body text-ink/80">
          The 2011 Census counted {all.length} districts, from {all[0].name} with {people(all[0].pop)} people to {all[all.length - 1].name} with {commas(all[all.length - 1].pop)}. Find any district&apos;s population, literacy rate, sex ratio and urban share, and how it ranks in its state and in India.
        </p>
      </Hero>
      <section className="mx-auto max-w-site px-4 pb-14 sm:px-6">
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
          <TopList title="Most populous" rows={sort('pop')} value={(d) => people(d.pop)} />
          <TopList title="Highest literacy" rows={sort('literacy')} value={(d) => pc(d.literacy)} />
          <TopList title="Lowest literacy" rows={sort('literacy', 1)} value={(d) => pc(d.literacy)} />
          <TopList title="Most women per 1,000 men" rows={sort('sexRatio')} value={(d) => d.sexRatio} />
          <TopList title="Fewest women per 1,000 men" rows={sort('sexRatio', 1)} value={(d) => d.sexRatio} />
          <TopList title="Most urban" rows={sort('urbanPct')} value={(d) => pc(d.urbanPct)} />
        </div>

        <H>Find a district</H>
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="flex flex-col text-xs text-ink/60">
            State or UT
            <select value={state} onChange={(e) => setState(e.target.value)} className="mt-1 rounded-lg border border-ink/15 bg-panel px-3 py-2 text-sm text-ink">
              <option value="">All states and UTs</option>
              {idx.states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-xs text-ink/60">
            District name
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example, Pune" className="mt-1 rounded-lg border border-ink/15 bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink/40" />
          </label>
        </div>
        {rows.length ? <DistrictTable key={`${state}|${ql}`} rows={rows} showState limit={state || ql ? undefined : 50} /> : <p className="text-sm text-ink/70">No district matches. Try another spelling or the name used in 2011.</p>}

        <H>Districts by state</H>
        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {idx.states.map((s) => (
            <li key={s.slug} className="flex justify-between gap-3 border-b border-ink/10 py-1.5">
              <Link to={districtPath(s.slug)} className="font-semibold hover:text-brand">{s.name}</Link>
              <span className="num text-ink/60">{s.districts} {s.districts === 1 ? 'district' : 'districts'}</span>
            </li>
          ))}
        </ul>

        <DataPanel
          dataset={{
            name: 'Districts of India: Census 2011 population, literacy and sex ratio',
            description: `Population, literacy rate, sex ratio and urban share for all ${all.length} districts of India in the 2011 Census, grouped by today's states and union territories. From the Primary Census Abstract; compiled by India in Data.`,
            path: DISTRICTS_HUB, source: SOURCE, sourceUrl: SOURCE_URL, temporalCoverage: '2011', liveFile: 'live/districts-index.json',
            variables: ['Population', 'Literacy rate', 'Sex ratio', 'Urban population share'], keywords: ['districts of India', 'district population', 'district literacy rate'],
          }}
          csv={{ filename: 'india-in-data-districts-of-india-census-2011', label: `All ${all.length} districts (CSV)`, columns: ROW_COLS.filter((c) => ['name', 'censusName', 'state', 'pop', 'literacy', 'sexRatio', 'urbanPct'].includes(c.key)), rows: all }}
        />
        <About />
      </section>
    </>
  )
}
