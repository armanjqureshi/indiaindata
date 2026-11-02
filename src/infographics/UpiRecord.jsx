import { forwardRef } from 'react'
import { UPI_MONTHS } from './upiRecordData.js'
import { POP_INDIA, POP_YEARS } from '../data/population.js'
import { GSDP_CURRENT, YEARS } from '../data/states.js'

// Same editorial system as the FPI infographic: warm paper, serif display, one visual idea per section.
const C = {
  paper: '#f4ede0', ink: '#1f1c18', mute: '#6f665b', rule: '#d9ccb6', cream: '#ebe1cf',
  teal: '#2a9d8f', tealPale: '#bfe3dd', down: '#d6473b', gold: '#e9c22a', goldDeep: '#b8920b',
}
const SERIF = 'Fraunces, Georgia, "Times New Roman", serif'
const SANS = '"Geist Variable", "Helvetica Neue", Arial, sans-serif'
const n0 = (n) => Math.round(n).toLocaleString('en-IN')
const sign = (v, d = 2) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`

const first = UPI_MONTHS[0]
const last = UPI_MONTHS[UPI_MONTHS.length - 1]
const prev = UPI_MONTHS[UPI_MONTHS.length - 2]
const record = UPI_MONTHS.slice(0, -1).reduce((a, b) => (b.vol > a.vol ? b : a))
const perSec = Math.round((last.vol * 1e9) / (31 * 86400))
const perPerson = Math.round((last.vol * 1e9) / (POP_INDIA[POP_YEARS.indexOf(2026)] * 1000))
const perDayGrowth = (822 / 802 - 1) * 100 // daily averages as reported (NPCI via Inc42): 822 mn in October, 802 mn in September
const avgThen = Math.round((first.val * 1e12) / (first.vol * 1e9))
const avgNow = Math.round((last.val * 1e12) / (last.vol * 1e9))

// Sizes compared in section 2, ₹ lakh crore
const L = YEARS.length - 1
const lc = (state) => GSDP_CURRENT[state][L] / 1e7
const TN = lc('Tamil Nadu'), MH = lc('Maharashtra')
const DAY = 1.01707 // October average daily UPI value (NPCI via Inc42)
const FPI = 0.48056 // net FPI selling of Indian shares, 1-23 October 2026 (NSDL)
const JIO = 0.30213 // Jio Platforms IPO (NSE)

const UpiRecord = forwardRef(function UpiRecord(_, ref) {
  // ---- 1. waterfall: Oct 2025 total, twelve monthly changes, Oct 2026 total ----
  const wf = [{ kind: 'total', label: 'Oct 2025', from: 19, to: first.vol }]
  for (let i = 1; i < UPI_MONTHS.length; i++) wf.push({ kind: 'change', label: UPI_MONTHS[i].month.split(' ')[0], from: UPI_MONTHS[i - 1].vol, to: UPI_MONTHS[i].vol })
  wf.push({ kind: 'total', label: 'Oct 2026', from: 19, to: last.vol, hero: true })
  const slot = 1040 / wf.length, bw = 46, base = 1120, k = 80
  const Y = (v) => base - (v - 19) * k
  const bx = (i) => 80 + i * slot + (slot - bw) / 2

  // ---- 2. squares to scale ----
  const s = 420 / Math.sqrt(last.val)
  const side = (v) => Math.sqrt(v) * s

  // ---- 3. index lines, Oct 2025 = 100 ----
  const ix0 = 120, ix1 = 960, iyB = 2470, iMin = 95, iMax = 126, ik = 330 / (iMax - iMin)
  const IX = (i) => ix0 + (i * (ix1 - ix0)) / (UPI_MONTHS.length - 1)
  const IY = (v) => iyB - (v - iMin) * ik
  const vol = UPI_MONTHS.map((m) => (m.vol / first.vol) * 100)
  const val = UPI_MONTHS.map((m) => (m.val / first.val) * 100)
  const pts = (arr) => arr.map((v, i) => `${IX(i).toFixed(1)},${IY(v).toFixed(1)}`)
  const gap = `${pts(vol).join(' ')} ${pts(val).reverse().join(' ')}`

  const H = 2660
  return (
    <svg ref={ref} viewBox={`0 0 1200 ${H}`} xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`India made ${last.vol} billion UPI payments worth ₹${last.val} lakh crore in October 2026, a record. In one month UPI moved more money than Tamil Nadu's economy produces in a year (₹${TN.toFixed(2)} lakh crore in 2024-25). Payments grew 23% in a year and value 16%, so the average payment fell from ₹${n0(avgThen)} to ₹${n0(avgNow)}.`}
      style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect width="1200" height={H} fill={C.paper} />

      {/* title */}
      <text x="80" y="92" fontFamily={SANS} fontSize="20" fontWeight="700" letterSpacing="3" fill={C.teal}>THE UPI RECORD</text>
      <text x="1120" y="92" textAnchor="end" fontFamily={SERIF} fontSize="22" fontWeight="700" fill={C.ink}>India in Data</text>
      <text x="1120" y="116" textAnchor="end" fontFamily={SANS} fontSize="16" fill={C.mute}>indiaindata.online</text>
      <text x="80" y="170" fontFamily={SERIF} fontSize="64" fontWeight="700" fill={C.ink}>India made</text>
      <text x="80" y="256" fontFamily={SERIF} fontSize="88" fontWeight="800" fill={C.teal}>25.47 billion</text>
      <text x="80" y="324" fontFamily={SERIF} fontSize="44" fontWeight="600" fill={C.ink}>UPI payments in October, a record</text>
      <text x="80" y="370" fontFamily={SANS} fontSize="21" fill={C.mute}>Worth ₹{last.val} lakh crore. That is {n0(perSec)} payments a second, or {perPerson} for every person in India in the month.</text>

      {/* 1. waterfall */}
      <line x1="80" x2="1120" y1="414" y2="414" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="476" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>Twelve months to the record</text>
      <text x="80" y="510" fontFamily={SANS} fontSize="20" fill={C.mute}>Billion payments. Each middle bar is the change from the month before. The scale starts at 19 billion.</text>
      <line x1="80" x2="1120" y1={Y(record.vol)} y2={Y(record.vol)} stroke={C.goldDeep} strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" />
      <text x="80" y={Y(record.vol) - 12} fontFamily={SANS} fontSize="17" fontWeight="700" fill={C.goldDeep}>Previous record: {record.vol} billion, August 2026</text>
      <text x="560" y="600" fontFamily={SERIF} fontStyle="italic" fontSize="17" fill={C.mute}>October had a day more than September.</text>
      <text x="560" y="622" fontFamily={SERIF} fontStyle="italic" fontSize="17" fill={C.mute}>Per day, payments rose {perDayGrowth.toFixed(1)}%.</text>
      <line x1="880" x2={bx(12) - 6} y1="614" y2="640" stroke={C.mute} strokeWidth="1.2" />
      {wf.map((b, i) => {
        const x = bx(i)
        const up = b.to >= b.from
        const top = Y(Math.max(b.from, b.to)), bot = Y(Math.min(b.from, b.to))
        const fill = b.kind === 'total' ? (b.hero ? C.teal : C.ink) : up ? C.tealPale : C.down
        const next = wf[i + 1]
        return (
          <g key={i}>
            <rect x={x} y={top} width={bw} height={Math.max(2, bot - top)} fill={fill} />
            {b.kind === 'total' && <path d={`M${x - 3},${base - 34} l${bw / 4 + 1.5},-8 l${bw / 4 + 1.5},8 l${bw / 4 + 1.5},-8 l${bw / 4 + 1.5},8`} fill="none" stroke={C.paper} strokeWidth="5" />}
            {next && <line x1={x + bw} x2={bx(i + 1)} y1={Y(b.to)} y2={Y(b.to)} stroke={C.mute} strokeWidth="1.5" strokeDasharray="2 4" />}
            {b.kind === 'total'
              ? <text x={x + bw / 2} y={top - 14} textAnchor="middle" fontFamily={SERIF} fontSize={b.hero ? 30 : 24} fontWeight="800" fill={b.hero ? C.teal : C.ink}>{b.to.toFixed(2)}</text>
              : <text x={x + bw / 2} y={up ? top - 10 : bot + 22} textAnchor="middle" fontFamily={SANS} fontSize="15" fontWeight="700" fill={up ? C.teal : C.down}>{sign(b.to - b.from)}</text>}
            <text x={x + bw / 2} y={base + 28} textAnchor="middle" fontFamily={SANS} fontSize={b.kind === 'total' ? 15 : 16} fontWeight={b.kind === 'total' ? 700 : 400} fill={b.hero ? C.teal : C.ink}>{b.kind === 'total' ? b.label.split(' ')[0] : b.label}</text>
            {b.kind === 'total' && <text x={x + bw / 2} y={base + 48} textAnchor="middle" fontFamily={SANS} fontSize="14" fontWeight="700" fill={b.hero ? C.teal : C.ink}>{b.label.split(' ')[1]}</text>}
            {b.label === 'Feb' && <text x={x + bw / 2} y={bot + 44} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize="15" fill={C.mute}>28 days</text>}
          </g>
        )
      })}
      <line x1="80" x2="1120" y1={base} y2={base} stroke={C.ink} strokeWidth="2" />

      {/* 2. squares to scale */}
      <line x1="80" x2="1120" y1="1220" y2="1220" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="1282" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>One month of UPI, one year of Tamil Nadu</text>
      <text x="80" y="1316" fontFamily={SANS} fontSize="20" fill={C.mute}>Areas drawn to scale, ₹ lakh crore. Separate amounts side by side, not parts of one total.</text>
      <rect x="80" y={1780 - side(last.val)} width={side(last.val)} height={side(last.val)} fill={C.teal} />
      <text x="104" y={1780 - side(last.val) + 64} fontFamily={SERIF} fontSize="52" fontWeight="800" fill="#fff">₹{last.val}</text>
      <text x="106" y={1780 - side(last.val) + 102} fontFamily={SANS} fontSize="21" fontWeight="700" fill="#fff">UPI payments, October 2026</text>
      <text x="106" y={1780 - side(last.val) + 128} fontFamily={SANS} fontSize="17" fill="#fff" opacity="0.85">one month of money moved</text>
      <rect x="580" y={1780 - side(TN)} width={side(TN)} height={side(TN)} fill={C.cream} stroke={C.ink} strokeWidth="2" />
      <text x="604" y={1780 - side(TN) + 64} fontFamily={SERIF} fontSize="52" fontWeight="800" fill={C.ink}>₹{TN.toFixed(2)}</text>
      <text x="606" y={1780 - side(TN) + 102} fontFamily={SANS} fontSize="21" fontWeight="700" fill={C.ink}>Tamil Nadu’s economy, {YEARS[L]}</text>
      <text x="606" y={1780 - side(TN) + 128} fontFamily={SANS} fontSize="17" fill={C.mute}>a whole year of output (GSDP)</text>
      {[[80, DAY, 'One average UPI day', C.tealPale], [430, FPI, 'October’s net FPI selling', '#f1b9ae'], [790, JIO, 'Jio Platforms IPO', C.gold]].map(([x, v, label, fill]) => (
        <g key={label}>
          <rect x={x} y={1900 - side(v)} width={side(v)} height={side(v)} fill={fill} />
          <text x={x + side(v) + 14} y={1876} fontFamily={SERIF} fontSize="26" fontWeight="800" fill={C.ink}>₹{v.toFixed(2)}</text>
          <text x={x + side(v) + 14} y={1900} fontFamily={SANS} fontSize="16" fill={C.mute}>{label}</text>
        </g>
      ))}
      <text x="80" y="1960" fontFamily={SANS} fontSize="19" fill={C.ink}>Among states with {YEARS[L]} figures, only Maharashtra’s yearly output, ₹{MH.toFixed(2)} lakh crore, is bigger than one month of UPI.</text>

      {/* 3. index lines */}
      <line x1="80" x2="1120" y1="2010" y2="2010" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="2072" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>More payments, smaller ones</text>
      <text x="80" y="2106" fontFamily={SANS} fontSize="20" fill={C.mute}>Growth since October 2025 (= 100). The gap between the lines is the average payment shrinking.</text>
      {[100, 110, 120].map((v) => (
        <g key={v}>
          <line x1={ix0 - 10} x2={ix1 + 10} y1={IY(v)} y2={IY(v)} stroke={C.rule} strokeWidth="1.5" strokeDasharray="2 6" />
          <text x={ix0 - 22} y={IY(v) + 6} textAnchor="end" fontFamily={SANS} fontSize="15" fill={C.mute}>{v}</text>
        </g>
      ))}
      <polygon points={gap} fill={C.teal} opacity="0.14" />
      <polyline points={pts(val).join(' ')} fill="none" stroke={C.goldDeep} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts(vol).join(' ')} fill="none" stroke={C.teal} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={IX(12)} cy={IY(vol[12])} r="8" fill={C.teal} />
      <circle cx={IX(12)} cy={IY(val[12])} r="8" fill={C.goldDeep} />
      <text x={ix1 + 22} y={IY(vol[12]) + 7} fontFamily={SANS} fontSize="20" fontWeight="700" fill={C.teal}>Payments +23%</text>
      <text x={ix1 + 22} y={IY(val[12]) + 7} fontFamily={SANS} fontSize="20" fontWeight="700" fill={C.goldDeep}>Value +16%</text>
      <text x={IX(8.6)} y={IY(120.5)} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize="18" fill={C.ink}>Average payment</text>
      <text x={IX(8.6)} y={IY(120.5) + 24} textAnchor="middle" fontFamily={SERIF} fontSize="22" fontWeight="800" fill={C.ink}>₹{n0(avgThen)} → ₹{n0(avgNow)}</text>
      {UPI_MONTHS.map((m, i) => {
        const [mo, yr] = m.month.split(' ')
        return (
          <g key={m.month}>
            <text x={IX(i)} y={iyB + 30} textAnchor="middle" fontFamily={SANS} fontSize="15" fill={C.ink}>{mo}</text>
            {(i === 0 || mo === 'Jan') && <text x={IX(i)} y={iyB + 50} textAnchor="middle" fontFamily={SANS} fontSize="14" fill={C.mute}>{yr}</text>}
          </g>
        )
      })}

      <g fontFamily={SANS} fontSize="14" fill={C.mute}>
        <text x="80" y="2570">Sources: NPCI UPI monthly statistics, October 2026 as reported by Inc42 and earlier months compiled by India Dispatch Research. State output: RBI Handbook of Statistics</text>
        <text x="80" y="2590">on Indian States 2024-25 (GSDP, current prices). Population: National Commission on Population projection, 2026. FPI selling: NSDL, net equity flows 1 to 23 October.</text>
        <text x="80" y="2610">Jio IPO size: NSE. UPI value is money moved, not output or spending, and the same money can move more than once: section 2 compares sizes only.</text>
        <text x="80" y="2630">Per-second, per-person, per-day and average-payment figures are our calculations.</text>
      </g>
    </svg>
  )
})

export default UpiRecord
