import { forwardRef } from 'react'
import { UPI_MONTHS } from './upiRecordData.js'

// Same editorial style as the other infographics: warm paper, serif display type, fixed palette.
const C = {
  paper: '#f4ede0', ink: '#1f1c18', mute: '#6f665b', rule: '#d9ccb6',
  teal: '#2a9d8f', tealPale: '#bfe3dd', gold: '#e9c22a', goldDeep: '#c9a20f', red: '#d6473b', cream: '#ebe1cf',
}
const SERIF = 'Fraunces, Georgia, "Times New Roman", serif'
const SANS = '"Geist Variable", "Helvetica Neue", Arial, sans-serif'
const n0 = (n) => Math.round(n).toLocaleString('en-IN')

const last = UPI_MONTHS[UPI_MONTHS.length - 1]
const yearAgo = UPI_MONTHS[0]
const prev = UPI_MONTHS[UPI_MONTHS.length - 2]
const prevRecord = Math.max(...UPI_MONTHS.slice(0, -1).map((m) => m.vol))
const secs = 31 * 86400
const perSec = Math.round((last.vol * 1e9) / secs) // payments every second, October average
const croreSec = (last.val * 1e5) / secs // ₹ crore every second
const dayCrore = 101707 // October average daily value, ₹ crore (NPCI via Inc42)
const growthVol = Math.round((last.vol / yearAgo.vol - 1) * 100)
const growthVal = Math.round((last.val / yearAgo.val - 1) * 100)
const avgNow = Math.round((last.val * 1e12) / (last.vol * 1e9))
const avgThen = Math.round((yearAgo.val * 1e12) / (yearAgo.vol * 1e9))
const avgDrop = Math.round((1 - avgNow / avgThen) * 100)

// Scale comparisons, ₹ crore (both from our other pages)
const JIO = 30213 // Jio Platforms IPO, NSE issue data
const FPI = 48056 // October 2026 net FPI selling to 23 Oct, NSDL
const hm = (frac) => {
  const m = Math.round(frac * 24 * 60)
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}

const UpiRecord = forwardRef(function UpiRecord(_, ref) {
  // ---- dot field: one dot per payment in one average second ----
  const dx = 80, dy = 530, pitch = 8, cols = 130
  const fullRows = Math.floor(perSec / cols)
  const rem = perSec % cols
  const fieldH = fullRows * pitch + (rem ? pitch : 0)

  // ---- dial: one average UPI day as a 24-hour clock ----
  const cx = 600, cy = 1780, R1 = 250, R2 = 200, sw = 34
  const pt = (r, f) => {
    const a = -Math.PI / 2 + f * 2 * Math.PI
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const arc = (r, f) => {
    const [x0, y0] = pt(r, 0), [x1, y1] = pt(r, f)
    return `M${x0},${y0} A${r},${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x1},${y1}`
  }
  const fJio = JIO / dayCrore, fFpi = FPI / dayCrore

  // ---- stepped line ----
  const px0 = 130, px1 = 1090, pyB = 2570, pyT = 2290, vMin = 18, vMax = 27
  const stepW = (px1 - px0) / (UPI_MONTHS.length - 1)
  const X = (i) => px0 + i * stepW
  const Y = (v) => pyB - ((v - vMin) / (vMax - vMin)) * (pyB - pyT)
  const linePts = UPI_MONTHS.map((m, i) => `${X(i)},${Y(m.vol)}`).join(' ')
  const areaPts = `${X(0)},${pyB} ${linePts} ${X(UPI_MONTHS.length - 1)},${pyB}`

  return (
    <svg ref={ref} viewBox="0 0 1200 3170" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`UPI handled ${last.vol} billion payments worth ₹${last.val} lakh crore in October 2026, a record. That is about ${n0(perSec)} payments every second. Payments grew ${growthVol}% on a year earlier and value ${growthVal}%.`}
      style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <pattern id="upiDot" width={pitch} height={pitch} patternUnits="userSpaceOnUse">
          <circle cx={pitch / 2} cy={pitch / 2} r="2.4" fill={C.teal} />
        </pattern>
      </defs>
      <rect width="1200" height="3170" fill={C.paper} />

      {/* title */}
      <text x="80" y="92" fontFamily={SANS} fontSize="20" fontWeight="700" letterSpacing="3" fill={C.teal}>THE UPI RECORD</text>
      <text x="1120" y="92" textAnchor="end" fontFamily={SERIF} fontSize="22" fontWeight="700" fill={C.ink}>India in Data</text>
      <text x="1120" y="116" textAnchor="end" fontFamily={SANS} fontSize="16" fill={C.mute}>indiaindata.online</text>
      <text x="80" y="176" fontFamily={SERIF} fontSize="64" fontWeight="700" fill={C.ink}>UPI handled</text>
      <text x="80" y="262" fontFamily={SERIF} fontSize="84" fontWeight="800" fill={C.teal}>{last.vol} billion payments</text>
      <text x="80" y="322" fontFamily={SERIF} fontSize="44" fontWeight="600" fill={C.ink}>in October 2026, a record month</text>
      <text x="80" y="366" fontFamily={SANS} fontSize="21" fill={C.mute}>Worth ₹{last.val} lakh crore. The first month above 25 billion payments and above ₹30 lakh crore.</text>

      {/* dot field */}
      <line x1="80" x2="1120" y1="410" y2="410" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="470" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>This is one second of UPI</text>
      <text x="80" y="504" fontFamily={SANS} fontSize="20" fill={C.mute}>Every dot is one payment. The October average was {n0(perSec)} payments a second, all month.</text>
      <rect x={dx} y={dy} width={cols * pitch} height={fullRows * pitch} fill="url(#upiDot)" />
      {rem > 0 && <rect x={dx} y={dy + fullRows * pitch} width={rem * pitch} height={pitch} fill="url(#upiDot)" />}
      <text x="80" y={dy + fieldH + 90} fontFamily={SERIF} fontSize="110" fontWeight="800" fill={C.teal}>{n0(perSec)}</text>
      <text x="82" y={dy + fieldH + 130} fontFamily={SANS} fontSize="22" fill={C.ink}>payments every second, and ₹{croreSec.toFixed(2)} crore moved</text>
      <text x="82" y={dy + fieldH + 162} fontFamily={SANS} fontSize="20" fill={C.mute}>A day is 86,400 of these panels: 822 million payments and ₹1.02 lakh crore.</text>

      {/* dial */}
      <line x1="80" x2="1120" y1="1300" y2="1300" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="1362" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>If one UPI day were a clock</text>
      <text x="80" y="1396" fontFamily={SANS} fontSize="20" fill={C.mute}>The full circle is the ₹1.02 lakh crore UPI moved on an average October day, spread evenly over 24 hours.</text>
      <circle cx={cx} cy={cy} r={R1} fill="none" stroke={C.cream} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={R2} fill="none" stroke={C.cream} strokeWidth={sw} />
      <path d={arc(R1, fFpi)} fill="none" stroke={C.red} strokeWidth={sw} />
      <path d={arc(R2, fJio)} fill="none" stroke={C.gold} strokeWidth={sw} />
      {[0, 6, 12, 18].map((h) => {
        const [x, y] = pt(R1 + 46, h / 24)
        return <text key={h} x={x} y={y + 6} textAnchor="middle" fontFamily={SANS} fontSize="18" fontWeight="700" fill={C.mute}>{h === 0 ? '0 h' : `${h} h`}</text>
      })}
      <text x={cx} y={cy - 24} textAnchor="middle" fontFamily={SERIF} fontSize="52" fontWeight="800" fill={C.teal}>₹1.02</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontFamily={SERIF} fontSize="30" fontWeight="700" fill={C.ink}>lakh crore</text>
      <text x={cx} y={cy + 44} textAnchor="middle" fontFamily={SANS} fontSize="18" fill={C.mute}>one UPI day</text>
      <g>
        <rect x="80" y="2080" width="20" height="20" rx="10" fill={C.red} />
        <text x="112" y="2097" fontFamily={SANS} fontSize="22" fontWeight="700" fill={C.ink}>October’s net FPI selling: ₹{n0(FPI)} crore</text>
        <text x="112" y="2127" fontFamily={SANS} fontSize="22" fill={C.red}>UPI moves that in {hm(fFpi)}</text>
        <rect x="660" y="2080" width="20" height="20" rx="10" fill={C.gold} />
        <text x="692" y="2097" fontFamily={SANS} fontSize="22" fontWeight="700" fill={C.ink}>Jio Platforms IPO: ₹{n0(JIO)} crore</text>
        <text x="692" y="2127" fontFamily={SANS} fontSize="22" fill={C.goldDeep}>UPI moves that in {hm(fJio)}</text>
      </g>

      {/* stepped line */}
      <line x1="80" x2="1120" y1="2190" y2="2190" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="2250" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>Thirteen months, one new high</text>
      {[20, 22, 24, 26].map((v) => (
        <g key={v}>
          <line x1={px0 - 20} x2={px1 + 20} y1={Y(v)} y2={Y(v)} stroke={C.rule} strokeWidth="1.5" strokeDasharray="2 6" />
          <text x={px0 - 30} y={Y(v) + 6} textAnchor="end" fontFamily={SANS} fontSize="16" fill={C.mute}>{v}</text>
        </g>
      ))}
      <text x="80" y="2282" fontFamily={SANS} fontSize="16" fill={C.mute}>Billion payments a month. The scale starts at 18.</text>
      <polygon points={areaPts} fill={C.tealPale} opacity="0.7" />
      <polyline points={linePts} fill="none" stroke={C.teal} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <line x1={px0 - 20} x2={px1 + 20} y1={Y(prevRecord)} y2={Y(prevRecord)} stroke={C.goldDeep} strokeWidth="2.5" strokeDasharray="3 6" strokeLinecap="round" />
      {UPI_MONTHS.map((m, i) => {
        const [mo, yr] = m.month.split(' ')
        const hero = i === UPI_MONTHS.length - 1
        return (
          <g key={m.month}>
            <circle cx={X(i)} cy={Y(m.vol)} r={hero ? 12 : 6} fill={hero ? C.teal : C.paper} stroke={C.teal} strokeWidth="4" />
            <text x={X(i)} y={pyB + 30} textAnchor="middle" fontFamily={SANS} fontSize="16" fill={C.ink}>{mo}</text>
            {(i === 0 || mo === 'Jan') && <text x={X(i)} y={pyB + 52} textAnchor="middle" fontFamily={SANS} fontSize="15" fill={C.mute}>{yr}</text>}
          </g>
        )
      })}
      <text x={X(UPI_MONTHS.length - 1)} y={Y(last.vol) - 26} textAnchor="end" fontFamily={SERIF} fontSize="36" fontWeight="800" fill={C.teal}>{last.vol}</text>
      <text x={px0 - 20} y={Y(prevRecord) - 12} fontFamily={SANS} fontSize="17" fontWeight="700" fill={C.goldDeep}>Previous record: {prevRecord}, August 2026</text>
      <text x={X(4)} y={Y(UPI_MONTHS[4].vol) + 34} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize="16" fill={C.mute}>28-day February</text>

      {/* growth + average payment */}
      <line x1="80" x2="1120" y1="2680" y2="2680" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="2740" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>More payments, but smaller ones</text>
      <rect x="80" y="2770" width={growthVol * 20} height="40" rx="4" fill={C.teal} />
      <text x={80 + growthVol * 20 + 16} y="2799" fontFamily={SANS} fontSize="22" fill={C.ink}><tspan fontWeight="700">Payments +{growthVol}%</tspan> on October 2025</text>
      <rect x="80" y="2824" width={growthVal * 20} height="40" rx="4" fill={C.tealPale} />
      <text x={80 + growthVal * 20 + 16} y="2853" fontFamily={SANS} fontSize="22" fill={C.ink}><tspan fontWeight="700">Value moved +{growthVal}%</tspan></text>
      <text x="80" y="2990" fontFamily={SERIF} fontSize="84" fontWeight="800" fill={C.mute}>₹{n0(avgThen)}</text>
      <text x="420" y="2986" fontFamily={SANS} fontSize="56" fill={C.rule}>→</text>
      <text x="520" y="2990" fontFamily={SERIF} fontSize="84" fontWeight="800" fill={C.teal}>₹{n0(avgNow)}</text>
      <text x="860" y="2954" fontFamily={SANS} fontSize="18" fill={C.mute}>the average UPI payment fell {avgDrop}%,</text>
      <text x="860" y="2978" fontFamily={SANS} fontSize="18" fill={C.mute}>October 2025 to October 2026</text>

      <g fontFamily={SANS} fontSize="14" fill={C.mute}>
        <text x="80" y="3060">Sources: NPCI UPI monthly statistics. October 2026 as reported by Inc42; October 2025 to September 2026 compiled by India Dispatch Research.</text>
        <text x="80" y="3080">Jio IPO size: NSE issue data. October FPI selling: NSDL, net equity flow to 23 October. These are net flows and UPI is gross value moved,</text>
        <text x="80" y="3100">so the clock compares scale only. Per-second, hours and average-payment figures are our calculations, with the day spread evenly over 24 hours.</text>
        <text x="80" y="3120">UPI value is not consumer spending. FPI data are revised.</text>
      </g>
    </svg>
  )
})

export default UpiRecord
