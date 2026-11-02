import { forwardRef } from 'react'
import { UPI_MONTHS } from './upiRecordData.js'

// Same editorial style as the other infographics: warm paper, serif display type, fixed palette.
const C = {
  paper: '#f4ede0', ink: '#1f1c18', mute: '#6f665b', rule: '#d9ccb6',
  teal: '#2a9d8f', tealPale: '#bfe3dd', gold: '#c9a20f', cream: '#ebe1cf',
}
const SERIF = 'Fraunces, Georgia, "Times New Roman", serif'
const SANS = '"Geist Variable", "Helvetica Neue", Arial, sans-serif'
const n0 = (n) => Math.round(n).toLocaleString('en-IN')

const last = UPI_MONTHS[UPI_MONTHS.length - 1]
const yearAgo = UPI_MONTHS[0]
const prevRecord = Math.max(...UPI_MONTHS.slice(0, -1).map((m) => m.vol))
const secs = 31 * 86400
const perSec = (last.vol * 1e9) / secs // payments every second
const croreSec = (last.val * 1e5) / secs // ₹ crore every second (1 lakh crore = 1e5 crore)
const growthVol = Math.round((last.vol / yearAgo.vol - 1) * 100)
const growthVal = Math.round((last.val / yearAgo.val - 1) * 100)
const avgNow = Math.round((last.val * 1e12) / (last.vol * 1e9))
const avgThen = Math.round((yearAgo.val * 1e12) / (yearAgo.vol * 1e9))
const avgDrop = Math.round((1 - avgNow / avgThen) * 100)

const UpiRecord = forwardRef(function UpiRecord(_, ref) {
  const x0 = 80, slot = 1040 / UPI_MONTHS.length, bw = 56, base = 960, k = 14.5
  const yOf = (v) => base - v * k
  const gx = 80, gScale = 20

  return (
    <svg ref={ref} viewBox="0 0 1200 1960" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`UPI handled ${last.vol} billion payments worth ₹${last.val} lakh crore in October 2026, a record. Payments grew ${growthVol}% on a year earlier and value ${growthVal}%.`}
      style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect width="1200" height="1960" fill={C.paper} />

      <text x="80" y="92" fontFamily={SANS} fontSize="20" fontWeight="700" letterSpacing="3" fill={C.teal}>UPI, OCTOBER 2026</text>
      <text x="1120" y="92" textAnchor="end" fontFamily={SERIF} fontSize="22" fontWeight="700" fill={C.ink}>India in Data</text>
      <text x="1120" y="116" textAnchor="end" fontFamily={SANS} fontSize="16" fill={C.mute}>indiaindata.online</text>
      <text x="80" y="176" fontFamily={SERIF} fontSize="64" fontWeight="700" fill={C.ink}>UPI handled</text>
      <text x="80" y="262" fontFamily={SERIF} fontSize="84" fontWeight="800" fill={C.teal}>{last.vol} billion payments</text>
      <text x="80" y="322" fontFamily={SERIF} fontSize="44" fontWeight="600" fill={C.ink}>in one month, a record</text>
      <text x="80" y="366" fontFamily={SANS} fontSize="21" fill={C.mute}>Worth ₹{last.val} lakh crore. The first month above 25 billion payments and above ₹30 lakh crore.</text>

      {/* monthly bars */}
      <text x="80" y="450" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>Thirteen months of UPI payments</text>
      <text x="80" y="484" fontFamily={SANS} fontSize="20" fill={C.mute}>Billions of payments a month. Bars start at zero.</text>
      <line x1={x0} x2="1120" y1={yOf(prevRecord)} y2={yOf(prevRecord)} stroke={C.gold} strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" />
      <text x={x0} y={yOf(prevRecord) - 10} fontFamily={SANS} fontSize="17" fill={C.gold} fontWeight="700">Previous record: {prevRecord} bn, August 2026</text>
      {UPI_MONTHS.map((m, i) => {
        const hero = i === UPI_MONTHS.length - 1
        const x = x0 + i * slot + (slot - bw) / 2
        const [mo, yr] = m.month.split(' ')
        return (
          <g key={m.month}>
            <rect x={x} y={yOf(m.vol)} width={bw} height={m.vol * k} rx="4" fill={hero ? C.teal : C.tealPale} />
            <text x={x + bw / 2} y={yOf(m.vol) - 10} textAnchor="middle" fontFamily={SANS} fontSize={hero ? 20 : 16} fontWeight="700" fill={hero ? C.teal : C.ink}>{m.vol.toFixed(2)}</text>
            <text x={x + bw / 2} y={base + 28} textAnchor="middle" fontFamily={SANS} fontSize="16" fill={C.ink}>{mo}</text>
            {(i === 0 || mo === 'Jan') && <text x={x + bw / 2} y={base + 50} textAnchor="middle" fontFamily={SANS} fontSize="15" fill={C.mute}>{yr}</text>}
          </g>
        )
      })}
      <line x1={x0} x2="1120" y1={base} y2={base} stroke={C.ink} strokeWidth="2" />

      {/* per second */}
      <line x1="80" x2="1120" y1="1070" y2="1070" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="1135" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>Every second in October</text>
      <text x="80" y="1270" fontFamily={SERIF} fontSize="120" fontWeight="800" fill={C.teal}>{n0(Math.round(perSec / 100) * 100)}</text>
      <text x="84" y="1312" fontFamily={SANS} fontSize="22" fill={C.ink}>UPI payments every second, on average</text>
      <text x="640" y="1270" fontFamily={SERIF} fontSize="120" fontWeight="800" fill={C.ink}>₹{croreSec.toFixed(2)}</text>
      <text x="644" y="1312" fontFamily={SANS} fontSize="22" fill={C.ink}>crore moved every second</text>
      <text x="80" y="1362" fontFamily={SANS} fontSize="20" fill={C.mute}>A day carried 822 million payments and ₹1.02 lakh crore. Daily value passed ₹1 lakh crore for the first time.</text>

      {/* growth */}
      <line x1="80" x2="1120" y1="1420" y2="1420" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="1485" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>More payments, but smaller ones</text>
      <text x="80" y="1519" fontFamily={SANS} fontSize="20" fill={C.mute}>October 2026 against October 2025</text>
      <rect x={gx} y="1548" width={growthVol * gScale} height="46" rx="4" fill={C.teal} />
      <text x={gx + growthVol * gScale + 16} y="1580" fontFamily={SANS} fontSize="22" fill={C.ink}><tspan fontWeight="700">Payments +{growthVol}%</tspan> ({yearAgo.vol.toFixed(2)} to {last.vol} bn)</text>
      <rect x={gx} y="1612" width={growthVal * gScale} height="46" rx="4" fill={C.tealPale} />
      <text x={gx + growthVal * gScale + 16} y="1644" fontFamily={SANS} fontSize="22" fill={C.ink}><tspan fontWeight="700">Value moved +{growthVal}%</tspan> (₹{yearAgo.val} to ₹{last.val} lakh crore)</text>

      <text x="80" y="1750" fontFamily={SERIF} fontSize="30" fontWeight="700" fill={C.ink}>The average payment fell {avgDrop}%</text>
      <text x="80" y="1850" fontFamily={SERIF} fontSize="84" fontWeight="800" fill={C.mute}>₹{n0(avgThen)}</text>
      <text x="420" y="1846" fontFamily={SANS} fontSize="56" fill={C.rule}>→</text>
      <text x="520" y="1850" fontFamily={SERIF} fontSize="84" fontWeight="800" fill={C.teal}>₹{n0(avgNow)}</text>
      <text x="860" y="1822" fontFamily={SANS} fontSize="18" fill={C.mute}>average value of one UPI</text>
      <text x="860" y="1846" fontFamily={SANS} fontSize="18" fill={C.mute}>payment, Oct 2025 and Oct 2026</text>

      <g fontFamily={SANS} fontSize="14" fill={C.mute}>
        <text x="80" y="1922">Source: NPCI UPI monthly statistics. October 2026 as reported by Inc42; October 2025 to September 2026 compiled by India Dispatch Research.</text>
        <text x="80" y="1942">Per-second figures and the average payment (value divided by number of payments) are our calculations. Value moved is not consumer spending.</text>
      </g>
    </svg>
  )
})

export default UpiRecord
