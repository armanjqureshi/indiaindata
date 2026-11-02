import { forwardRef } from 'react'
import { UPI_MONTHS } from './upiRecordData.js'
import { RUPEE_DOTS } from './upiRupeeDots.js'
import { POP_INDIA, POP_YEARS } from '../data/population.js'

// House infographic style (warm paper, serif display), drawn with objects from UPI's own world:
// a ₹ made of payments, a wall clock, and receipt strips feeding out of a payment printer.
const C = {
  paper: '#f4ede0', ink: '#1f1c18', mute: '#6f665b', rule: '#d9ccb6', slip: '#fffdf7', slipEdge: '#cdbfa6',
  teal: '#2a9d8f', tealDeep: '#1f7a6f', tealPale: '#bfe3dd', gold: '#e9c22a', goldDeep: '#b8920b', red: '#d6473b', face: '#fbf6ec',
}
const SERIF = '"Fraunces Variable", Fraunces, Georgia, "Times New Roman", serif'
const SANS = '"Geist Variable", "Helvetica Neue", Arial, sans-serif'
const MONO = '"Geist Mono Variable", ui-monospace, Menlo, monospace'
const n0 = (n) => Math.round(n).toLocaleString('en-IN')

const last = UPI_MONTHS[UPI_MONTHS.length - 1]
const yearAgo = UPI_MONTHS[0]
const prevRecord = UPI_MONTHS.slice(0, -1).reduce((a, b) => (b.vol > a.vol ? b : a))
const SECS = 31 * 86400
const perSec = Math.round((last.vol * 1e9) / SECS) // 9,509
const croreSec = (last.val * 1e5) / SECS // ₹ crore a second
const DAY_CRORE = 101707 // October average daily value, ₹ crore (NPCI via Inc42)
const pop2026 = POP_INDIA[POP_YEARS.indexOf(2026)] * 1000 // NCP projection, 1 March 2026
const perPerson = Math.round((last.vol * 1e9) / pop2026)
const growthVol = Math.round((last.vol / yearAgo.vol - 1) * 100)
const growthVal = Math.round((last.val / yearAgo.val - 1) * 100)
const avgNow = Math.round((last.val * 1e12) / (last.vol * 1e9))
const avgThen = Math.round((yearAgo.val * 1e12) / (yearAgo.vol * 1e9))
const avgDrop = Math.round((1 - avgNow / avgThen) * 100)

// The clock: an average October day's value, flowing evenly from midnight
const JIO = 30213 // Jio Platforms IPO, ₹ crore (NSE issue data)
const FPI = 48056 // net FPI selling of Indian shares, 1-23 October 2026, ₹ crore (NSDL)
const clockTime = (crore) => {
  const mins = Math.round((crore / DAY_CRORE) * 24 * 60)
  return { mins, label: `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} am` }
}
const tJio = clockTime(JIO)
const tFpi = clockTime(FPI)

if (RUPEE_DOTS.count !== perSec) {
  // The ₹ is built for this exact number; regenerate upiRupeeDots.js if the data change.
  console.warn(`UPI infographic: ₹ has ${RUPEE_DOTS.count} dots but the per-second figure is ${perSec}`)
}

const UpiRecord = forwardRef(function UpiRecord(_, ref) {
  // ---- the ₹ of dots ----
  const gx = 80, gy = 488, P = RUPEE_DOTS.pitch
  const rupeePath = RUPEE_DOTS.runs.map(([x, y, n]) => `M${(gx + x).toFixed(2)},${(gy + y).toFixed(2)}h${((n - 1) * P + P / 2).toFixed(2)}`).join('')
  const lens = { x: gx + 566, y: gy + 202, r: 62, zoom: 4 }
  const lensDots = []
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
    const x = lens.x + i * P * lens.zoom, y = lens.y + j * P * lens.zoom
    if (Math.hypot(x - lens.x, y - lens.y) < lens.r - 6) lensDots.push([x, y])
  }

  // ---- the clock ----
  const cx = 850, cy = 1800, R = 280
  const at = (r, mins) => { // position on a 12-hour face, minutes after midnight
    const a = (mins / 720) * 2 * Math.PI
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)]
  }
  const wedge = (r, mins) => { const [x, y] = at(r, mins); return `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${mins > 360 ? 1 : 0} 1 ${x},${y} Z` }
  const band = (r0, r1, mins) => {
    const [ax, ay] = at(r1, mins), [bx, by] = at(r0, mins), big = mins > 360 ? 1 : 0
    return `M${cx},${cy - r1} A${r1},${r1} 0 ${big} 1 ${ax},${ay} L${bx},${by} A${r0},${r0} 0 ${big} 0 ${cx},${cy - r0} Z`
  }

  // ---- the receipt strips ----
  const base = 2800, k = 19, sx0 = 100, slot = 1000 / UPI_MONTHS.length, sw = 58
  const tooth = sw / 6
  const strip = (x, top) => {
    let d = `M${x},${base} L${x},${top + 6}`
    for (let t = 0; t < 6; t++) d += ` L${x + t * tooth + tooth / 2},${top} L${x + (t + 1) * tooth},${top + 6}`
    return `${d} L${x + sw},${base} Z`
  }

  const H = 3370
  return (
    <svg ref={ref} viewBox={`0 0 1200 ${H}`} xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`India made ${last.vol} billion UPI payments worth ₹${last.val} lakh crore in October 2026, a record. That is ${n0(perSec)} payments in an average second. At October's pace UPI moves as much money as the Jio Platforms IPO by ${tJio.label} and as much as October's foreign selling of Indian shares by ${tFpi.label}.`}
      style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <clipPath id="upiLens"><circle cx={lens.x} cy={lens.y} r={lens.r - 4} /></clipPath>
      </defs>
      <rect width="1200" height={H} fill={C.paper} />

      {/* title */}
      <text x="80" y="92" fontFamily={SANS} fontSize="20" fontWeight="700" letterSpacing="3" fill={C.teal}>THE UPI RECORD</text>
      <text x="1120" y="92" textAnchor="end" fontFamily={SERIF} fontSize="22" fontWeight="700" fill={C.ink}>India in Data</text>
      <text x="1120" y="116" textAnchor="end" fontFamily={SANS} fontSize="16" fill={C.mute}>indiaindata.online</text>
      <text x="80" y="176" fontFamily={SERIF} fontSize="54" fontWeight="600" fill={C.ink}>In October, India made</text>
      <text x="76" y="294" fontFamily={SERIF} fontSize="124" fontWeight="800" letterSpacing="-2" fill={C.teal}>{last.vol} billion</text>
      <text x="80" y="360" fontFamily={SERIF} fontSize="54" fontWeight="600" fill={C.ink}>UPI payments. A record.</text>
      <text x="80" y="408" fontFamily={SANS} fontSize="21" fill={C.mute}>Worth ₹{last.val} lakh crore: the first month above 25 billion payments and above ₹30 lakh crore.</text>

      {/* ₹ made of one second of payments */}
      <line x1="80" x2="1120" y1="446" y2="446" stroke={C.rule} strokeWidth="2" />
      <path d={rupeePath} fill="none" stroke={C.teal} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`0 ${P}`} />
      <circle cx={lens.x} cy={lens.y} r={lens.r} fill={C.paper} />
      <g clipPath="url(#upiLens)">
        {lensDots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={6.8} fill={C.teal} />)}
      </g>
      <circle cx={lens.x} cy={lens.y} r={lens.r} fill="none" stroke={C.ink} strokeWidth="6" />
      <line x1={lens.x + (lens.r + 3) * 0.707} y1={lens.y + (lens.r + 3) * 0.707} x2={lens.x + (lens.r + 50) * 0.707} y2={lens.y + (lens.r + 50) * 0.707} stroke={C.ink} strokeWidth="13" strokeLinecap="round" />

      <text x="740" y="528" fontFamily={SERIF} fontSize="38" fontWeight="700" fill={C.ink}>Every dot is one</text>
      <text x="740" y="572" fontFamily={SERIF} fontSize="38" fontWeight="700" fill={C.ink}>UPI payment.</text>
      <g fontFamily={SANS} fontSize="20" fill={C.mute}>
        <text x="740" y="616">This ₹ is made of {n0(perSec)} dots, the</text>
        <text x="740" y="642">number of UPI payments in an</text>
        <text x="740" y="668">average second of October.</text>
      </g>
      <g>
        <text x="740" y="790" fontFamily={SERIF} fontSize="58" fontWeight="800" fill={C.teal}>₹{croreSec.toFixed(2)} crore</text>
        <text x="742" y="822" fontFamily={SANS} fontSize="19" fill={C.ink}>moved every second</text>
        <text x="740" y="940" fontFamily={SERIF} fontSize="58" fontWeight="800" fill={C.teal}>822 million</text>
        <text x="742" y="972" fontFamily={SANS} fontSize="19" fill={C.ink}>payments a day, worth ₹1.02 lakh crore,</text>
        <text x="742" y="996" fontFamily={SANS} fontSize="19" fill={C.ink}>the first time a day passed ₹1 lakh crore</text>
        <text x="740" y="1114" fontFamily={SERIF} fontSize="58" fontWeight="800" fill={C.teal}>{perPerson} payments</text>
        <text x="742" y="1146" fontFamily={SANS} fontSize="19" fill={C.ink}>for every person in India, in one month</text>
      </g>

      {/* the clock */}
      <line x1="80" x2="1120" y1="1330" y2="1330" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="1396" fontFamily={SERIF} fontSize="44" fontWeight="700" fill={C.ink}>Start the clock at midnight</text>
      <text x="80" y="1432" fontFamily={SANS} fontSize="20" fill={C.mute}>Let an average October day’s ₹1.02 lakh crore of UPI payments flow at an even pace from 12 am.</text>

      <circle cx={cx} cy={cy} r={R} fill={C.face} stroke={C.ink} strokeWidth="9" />
      <path d={band(150, 196, tFpi.mins)} fill={C.red} />
      <path d={wedge(134, tJio.mins)} fill={C.gold} />
      {Array.from({ length: 60 }, (_, m) => {
        const hour = m % 5 === 0
        const [x1, y1] = at(R - 14, m * 12), [x2, y2] = at(hour ? R - 38 : R - 24, m * 12)
        return <line key={m} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={hour ? 5 : 2} strokeLinecap="round" />
      })}
      {Array.from({ length: 12 }, (_, h) => {
        const [x, y] = at(R - 66, h * 60)
        return <text key={h} x={x} y={y + 12} textAnchor="middle" fontFamily={SERIF} fontSize="34" fontWeight="700" fill={C.ink}>{h === 0 ? 12 : h}</text>
      })}
      {(() => {
        const [jx, jy] = at(122, tJio.mins), [fx, fy] = at(206, tFpi.mins)
        return (
          <g strokeLinecap="round">
            <line x1={cx} y1={cy} x2={fx} y2={fy} stroke={C.ink} strokeWidth="14" />
            <line x1={cx} y1={cy} x2={fx} y2={fy} stroke={C.red} strokeWidth="7" />
            <line x1={cx} y1={cy} x2={jx} y2={jy} stroke={C.ink} strokeWidth="20" />
            <line x1={cx} y1={cy} x2={jx} y2={jy} stroke={C.gold} strokeWidth="12" />
            <circle cx={cx} cy={cy} r="16" fill={C.ink} />
            <circle cx={cx} cy={cy} r="5" fill={C.face} />
          </g>
        )
      })()}

      <text x="80" y="1560" fontFamily={SERIF} fontSize="72" fontWeight="800" fill={C.goldDeep}>{tJio.label}</text>
      <g fontFamily={SANS} fontSize="21" fill={C.ink}>
        <text x="82" y="1600"><tspan fontWeight="700">₹{n0(JIO)} crore</tspan> has moved: as much</text>
        <text x="82" y="1628">as Jio Platforms raised in</text>
        <text x="82" y="1656">India’s largest IPO</text>
      </g>
      <text x="80" y="1820" fontFamily={SERIF} fontSize="72" fontWeight="800" fill={C.red}>{tFpi.label}</text>
      <g fontFamily={SANS} fontSize="21" fill={C.ink}>
        <text x="82" y="1860"><tspan fontWeight="700">₹{n0(FPI)} crore</tspan>: as much as</text>
        <text x="82" y="1888">foreign investors pulled out of</text>
        <text x="82" y="1916">Indian shares in all of October</text>
      </g>
      <g fontFamily={SANS} fontSize="17" fill={C.mute}>
        <text x="82" y="2040">Fewer people pay at night, so the real times</text>
        <text x="82" y="2062">come later. The clock compares sizes, not timing.</text>
      </g>

      {/* receipt strips */}
      <line x1="80" x2="1120" y1="2150" y2="2150" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="2216" fontFamily={SERIF} fontSize="44" fontWeight="700" fill={C.ink}>The receipts kept getting longer</text>
      <text x="80" y="2252" fontFamily={SANS} fontSize="20" fill={C.mute}>One strip per month. Length is billions of UPI payments, drawn to scale from zero.</text>
      <line x1="90" x2="1110" y1={base - prevRecord.vol * k} y2={base - prevRecord.vol * k} stroke={C.goldDeep} strokeWidth="2.5" strokeDasharray="3 7" strokeLinecap="round" />
      <text x="100" y={base - prevRecord.vol * k - 12} fontFamily={SANS} fontSize="17" fontWeight="700" fill={C.goldDeep}>Previous record: {prevRecord.vol} billion, August 2026</text>
      {UPI_MONTHS.map((m, i) => {
        const x = sx0 + i * slot + (slot - sw) / 2
        const top = base - m.vol * k
        const hero = i === UPI_MONTHS.length - 1
        const lines = []
        for (let y = top + 52, j = 0; y < base - 10; y += 17, j++) lines.push([y, 18 + ((i * 7 + j * 13) % 24)])
        return (
          <g key={m.month}>
            <path d={strip(x, top)} fill={C.slip} stroke={hero ? C.teal : C.slipEdge} strokeWidth={hero ? 2.5 : 1.5} strokeLinejoin="round" />
            {lines.map(([y, w]) => <line key={y} x1={x + 9} x2={x + 9 + w} y1={y} y2={y} stroke={hero ? C.tealPale : C.rule} strokeWidth="3" strokeLinecap="round" />)}
            <text x={x + sw / 2} y={top + 32} textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight={hero ? 800 : 600} fill={hero ? C.tealDeep : C.ink}>{m.vol.toFixed(2)}</text>
            {m.month.startsWith('Feb') && <text x={x + sw / 2} y={top - 12} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize="15" fill={C.mute}>28 days</text>}
          </g>
        )
      })}
      <g transform={`rotate(-14 ${sx0 + 11.6 * slot} ${base - last.vol * k + 120})`}>
        <circle cx={sx0 + 11.6 * slot} cy={base - last.vol * k + 120} r="52" fill={C.paper} fillOpacity="0.55" stroke={C.red} strokeWidth="4" />
        <circle cx={sx0 + 11.6 * slot} cy={base - last.vol * k + 120} r="44" fill="none" stroke={C.red} strokeWidth="1.5" />
        <text x={sx0 + 11.6 * slot} y={base - last.vol * k + 116} textAnchor="middle" fontFamily={SANS} fontSize="19" fontWeight="800" letterSpacing="1.5" fill={C.red}>RECORD</text>
        <text x={sx0 + 11.6 * slot} y={base - last.vol * k + 140} textAnchor="middle" fontFamily={MONO} fontSize="13" fontWeight="700" fill={C.red}>OCT 2026</text>
      </g>
      <rect x="80" y={base - 6} width="1040" height="70" rx="18" fill={C.ink} />
      <rect x="96" y={base - 4} width="1008" height="8" rx="4" fill="#3d362e" />
      {UPI_MONTHS.map((m, i) => {
        const [mo, yr] = m.month.split(' ')
        const x = sx0 + i * slot + slot / 2
        return (
          <g key={m.month}>
            <text x={x} y={base + 32} textAnchor="middle" fontFamily={SANS} fontSize="16" fontWeight="700" fill={C.paper}>{mo}</text>
            {(i === 0 || mo === 'Jan') && <text x={x} y={base + 52} textAnchor="middle" fontFamily={SANS} fontSize="13" fill="#b9ad9a">{yr}</text>}
          </g>
        )
      })}

      {/* smaller payments */}
      <line x1="80" x2="1120" y1="2920" y2="2920" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="2986" fontFamily={SERIF} fontSize="44" fontWeight="700" fill={C.ink}>More payments, smaller ones</text>
      <text x="80" y="3022" fontFamily={SANS} fontSize="20" fill={C.mute}>On a year earlier, payments rose {growthVol}% but the money they moved rose {growthVal}%. The average payment shrank.</text>
      {[[80, 'OCT 2025', avgThen, C.mute], [680, 'OCT 2026', avgNow, C.teal]].map(([x, lab, v, col]) => (
        <g key={lab}>
          <path d={`M${x},3060 h440 v50 a18,18 0 0 0 0,36 v54 h-440 v-54 a18,18 0 0 0 0,-36 Z`} fill={C.slip} stroke={C.slipEdge} strokeWidth="1.5" />
          <line x1={x + 120} x2={x + 120} y1="3072" y2="3188" stroke={C.slipEdge} strokeWidth="1.5" strokeDasharray="4 5" />
          <text x={x + 60} y="3118" textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill={C.mute}>AVG</text>
          <text x={x + 60} y="3140" textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill={C.mute}>UPI</text>
          <text x={x + 60} y="3162" textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill={C.mute}>PMT</text>
          <text x={x + 150} y="3100" fontFamily={MONO} fontSize="16" fontWeight="700" fill={C.mute}>{lab}</text>
          <text x={x + 146} y="3172" fontFamily={SERIF} fontSize="74" fontWeight="800" fill={col}>₹{n0(v)}</text>
        </g>
      ))}
      <text x="600" y="3146" textAnchor="middle" fontFamily={SANS} fontSize="48" fill={C.mute}>→</text>
      <text x="1104" y="3100" textAnchor="end" fontFamily={MONO} fontSize="16" fontWeight="800" fill={C.red}>−{avgDrop}%</text>

      <g fontFamily={SANS} fontSize="14" fill={C.mute}>
        <text x="80" y="3260">Sources: NPCI UPI monthly statistics: October 2026 as reported by Inc42; October 2025 to September 2026 compiled by India Dispatch Research.</text>
        <text x="80" y="3280">Population: National Commission on Population projection for 1 March 2026. Jio IPO size: NSE issue data. Foreign selling: NSDL net FPI equity</text>
        <text x="80" y="3300">flows, 1 to 23 October 2026. FPI selling is a net flow and UPI is gross value moved, so the clock compares sizes only. Per-second, per-person,</text>
        <text x="80" y="3320">clock and average-payment figures are our calculations. UPI value is money moved, not consumer spending.</text>
      </g>
    </svg>
  )
})

export default UpiRecord
