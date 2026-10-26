import { forwardRef } from 'react'
import { FPI_DAYS, NSE_DAYS } from './fpiSelloffData.js'

// Editorial infographic style: warm paper, serif display type, one visual idea per section.
// Fixed palette so screen and PNG export match.
const C = {
  paper: '#f4ede0', ink: '#1f1c18', mute: '#6f665b', rule: '#d9ccb6',
  sell: '#d6473b', sellPale: '#f1b9ae', buy: '#2a9d8f', gold: '#e9c22a', goldDeep: '#c9a20f', cream: '#ebe1cf',
}
const SERIF = 'Fraunces, Georgia, "Times New Roman", serif'
const SANS = '"Geist Variable", "Helvetica Neue", Arial, sans-serif'
const fmt = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN')
const dayLabel = (iso) => `${Number(iso.slice(8))} Oct`

const total = FPI_DAYS.reduce((s, r) => s + r.v, 0)
const firstSix = FPI_DAYS.slice(0, 6).reduce((s, r) => s + r.v, 0)
const rest = total - firstSix
const share = Math.round((firstSix / total) * 100)
const restBuy = FPI_DAYS.slice(6).filter((r) => r.v > 0).length
const diiSum = NSE_DAYS.reduce((s, r) => s + r.dii, 0)

// squarified treemap
function squarify(items, rect) {
  const totalV = items.reduce((s, i) => s + i.v, 0)
  const scale = (rect.w * rect.h) / totalV
  const list = items.map((i) => ({ ...i, a: i.v * scale })).sort((a, b) => b.a - a.a)
  const out = []
  let r = { ...rect }
  let row = []
  const worst = (rw, len) => {
    const s = rw.reduce((t, i) => t + i.a, 0)
    const mx = Math.max(...rw.map((i) => i.a)), mn = Math.min(...rw.map((i) => i.a))
    return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn))
  }
  const place = (rw) => {
    const s = rw.reduce((t, i) => t + i.a, 0)
    if (r.w >= r.h) {
      const w = s / r.h
      let y = r.y
      for (const i of rw) { const h = i.a / w; out.push({ ...i, x: r.x, y, w, h }); y += h }
      r = { x: r.x + w, y: r.y, w: r.w - w, h: r.h }
    } else {
      const h = s / r.w
      let x = r.x
      for (const i of rw) { const w = i.a / h; out.push({ ...i, x, y: r.y, w, h }); x += w }
      r = { x: r.x, y: r.y + h, w: r.w, h: r.h - h }
    }
  }
  while (list.length) {
    const len = Math.min(r.w, r.h)
    if (!row.length || worst([...row, list[0]], len) <= worst(row, len)) row.push(list.shift())
    else { place(row); row = [] }
  }
  if (row.length) place(row)
  return out
}

const OUT = Math.abs(total)
const COMPARE = [
  { v: OUT, label: 'October 2026', sub: 'net FPI selling, 1 to 23 Oct', fill: C.sell, text: '#fff', hero: true },
  { v: 35861, label: 'September 2026', sub: 'net FPI selling, whole month', fill: C.sellPale },
  { v: 30213, label: 'Jio Platforms IPO', sub: 'the largest IPO in India', fill: C.gold },
  { v: 29631, label: 'August 2026', sub: 'net FPI buying', fill: C.buy, text: '#fff' },
  { v: Math.abs(FPI_DAYS.reduce((a, b) => (b.v < a.v ? b : a)).v), label: '9 October alone', sub: 'the biggest day', fill: C.sellPale },
  { v: diiSum, label: 'DIIs bought', sub: '19 to 23 Oct', fill: C.cream },
]
const YTD = 312000, Y2025 = 166000

const FpiSelloff = forwardRef(function FpiSelloff(_, ref) {
  // fan of days
  const cx = 600, cy = 880, r0 = 104, maxL = 290
  const maxAbs = Math.max(...FPI_DAYS.map((d) => Math.abs(d.v)))
  const rays = FPI_DAYS.map((d, i) => {
    const a = Math.PI - ((i + 0.5) * Math.PI) / FPI_DAYS.length
    const L = 14 + (Math.abs(d.v) / maxAbs) * maxL
    const p = (rad) => [cx + rad * Math.cos(a), cy - rad * Math.sin(a)]
    return { d, a, L, p }
  })
  // glass
  const gx = 170, gy = 1010, gTop = 300, gBot = 214, gH = 400
  const gl = (t) => { // t: 0 top .. 1 bottom
    const w = gTop + (gBot - gTop) * t
    return [gx + (gTop - w) / 2, gx + (gTop + w) / 2, gy + gH * t]
  }
  const fillTop = 0.05, split = fillTop + (1 - fillTop) * (rest / total)
  const [a1, b1, y1] = gl(fillTop), [a2, b2, y2] = gl(split), [a3, b3, y3] = gl(1)
  // treemap
  const tm = squarify(COMPARE, { x: 80, y: 1585, w: 1040, h: 560 })
  const zx = 80, zw = 1040, zScale = zw / YTD

  return (
    <svg ref={ref} viewBox="0 0 1200 2460" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`Foreign investors took ₹${fmt(total)} crore out of Indian shares in 15 trading days of October 2026. ${share}% of it left in the first six sessions.`}
      style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect width="1200" height="2460" fill={C.paper} />

      {/* title */}
      <text x="80" y="92" fontFamily={SANS} fontSize="20" fontWeight="700" letterSpacing="3" fill={C.sell}>THE OCTOBER EXIT</text>
      <text x="80" y="170" fontFamily={SERIF} fontSize="64" fontWeight="700" fill={C.ink}>Foreign investors took</text>
      <text x="80" y="250" fontFamily={SERIF} fontSize="80" fontWeight="800" fill={C.sell}>₹{fmt(total)} crore</text>
      <text x="80" y="318" fontFamily={SERIF} fontSize="44" fontWeight="600" fill={C.ink}>out of Indian shares in 15 trading days</text>
      <text x="80" y="362" fontFamily={SANS} fontSize="21" fill={C.mute}>Each petal is one trading day in October 2026. Length shows the size of the net flow.</text>

      {/* fan */}
      {rays.map(({ d, a, L, p }) => {
        const [x1, y1_] = p(r0 + 6), [x2, y2_] = p(r0 + L)
        const ring = r0 + maxL + 44
        const [lx, ly] = p(ring)
        const [gx1, gy1] = p(r0 + L + 22), [gx2, gy2] = p(ring - 22)
        const anchor = Math.cos(a) < -0.3 ? 'end' : Math.cos(a) > 0.3 ? 'start' : 'middle'
        const big = d.v === rays.reduce((m, r) => (r.d.v < m ? r.d.v : m), 0)
        return (
          <g key={d.date}>
            {r0 + L + 22 < ring - 22 && <line x1={gx1} y1={gy1} x2={gx2} y2={gy2} stroke={C.rule} strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" />}
            <line x1={x1} y1={y1_} x2={x2} y2={y2_} stroke={d.v < 0 ? C.sell : C.buy} strokeWidth="28" strokeLinecap="round" />
            <text x={lx} y={ly - 4} textAnchor={anchor} fontFamily={SANS} fontSize="17" fontWeight="700" fill={C.ink}>{dayLabel(d.date)}</text>
            <text x={lx} y={ly + 16} textAnchor={anchor} fontFamily={SANS} fontSize="16" fill={d.v < 0 ? C.sell : C.buy}>{d.v < 0 ? '−' : '+'}{fmt(d.v)}</text>
            {big && <text x={lx} y={ly - 26} textAnchor={anchor} fontFamily={SERIF} fontStyle="italic" fontSize="16" fill={C.mute}>the biggest day</text>}
          </g>
        )
      })}
      <path d={`M${cx - r0},${cy} A${r0},${r0} 0 0 1 ${cx + r0},${cy} Z`} fill={C.cream} />
      <text x={cx} y={cy - 44} textAnchor="middle" fontFamily={SERIF} fontSize="30" fontWeight="700" fill={C.ink}>October</text>
      <text x={cx} y={cy - 14} textAnchor="middle" fontFamily={SANS} fontSize="16" fill={C.mute}>₹ crore, net</text>
      <line x1="80" x2="1120" y1={cy} y2={cy} stroke={C.rule} strokeWidth="2" />
      <g fontFamily={SANS} fontSize="17" fill={C.mute}>
        <rect x="80" y={cy + 24} width="18" height="18" rx="9" fill={C.sell} /><text x="106" y={cy + 39}>Net selling</text>
        <rect x="220" y={cy + 24} width="18" height="18" rx="9" fill={C.buy} /><text x="246" y={cy + 39}>Net buying</text>
        <text x="1120" y={cy + 39} textAnchor="end">Days run left to right, 1 to 23 October</text>
      </g>

      {/* glass */}
      <text x="80" y="985" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>Most of it left in the first week</text>
      <path d={`M${a1},${y1} L${b1},${y1} L${b2},${y2} L${a2},${y2} Z`} fill={C.sellPale} />
      <path d={`M${a2},${y2} L${b2},${y2} L${b3},${y3} L${a3},${y3} Z`} fill={C.sell} />
      <path d={`M${gx},${gy} L${gx + gTop},${gy} L${gx + (gTop + gBot) / 2},${gy + gH} L${gx + (gTop - gBot) / 2},${gy + gH} Z`} fill="none" stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
      <line x1={gx + (gTop - gBot) / 2 - 20} x2={gx + (gTop + gBot) / 2 + 20} y1={gy + gH + 14} y2={gy + gH + 14} stroke={C.ink} strokeWidth="6" strokeLinecap="round" />
      <text x={(a2 + b2) / 2} y={y2 + 120} textAnchor="middle" fontFamily={SANS} fontSize="20" fontWeight="700" fill="#fff">1 to 9 Oct</text>
      <text x={(a2 + b2) / 2} y={y2 + 146} textAnchor="middle" fontFamily={SANS} fontSize="18" fill="#fff">six sessions</text>
      <line x1={b1 + 6} x2="560" y1={(y1 + y2) / 2} y2={(y1 + y2) / 2} stroke={C.mute} strokeWidth="1.5" />
      <text x="572" y={(y1 + y2) / 2 + 6} fontFamily={SANS} fontSize="19" fill={C.ink}><tspan fontWeight="700">12 to 23 Oct:</tspan> ₹{fmt(rest)} cr over nine sessions, with net buying on {restBuy}</text>
      <text x="560" y="1215" fontFamily={SERIF} fontSize="120" fontWeight="800" fill={C.sell}>{share}%</text>
      <text x="566" y="1262" fontFamily={SERIF} fontSize="30" fontWeight="600" fill={C.ink}>of October’s net selling</text>
      <text x="566" y="1298" fontFamily={SERIF} fontSize="30" fontWeight="600" fill={C.ink}>came in the first six sessions:</text>
      <text x="566" y="1336" fontFamily={SANS} fontSize="24" fontWeight="700" fill={C.sell}>₹{fmt(firstSix)} crore</text>
      <text x="566" y="1372" fontFamily={SANS} fontSize="19" fill={C.mute}>After 9 October the flow was close to flat.</text>

      {/* treemap */}
      <line x1="80" x2="1120" y1="1470" y2="1470" stroke={C.rule} strokeWidth="2" />
      <text x="80" y="1530" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={C.ink}>How big is ₹{fmt(total)} crore?</text>
      <text x="80" y="1564" fontFamily={SANS} fontSize="20" fill={C.mute}>Areas drawn to scale, ₹ crore. Separate amounts side by side, not parts of one total.</text>
      {tm.map((t) => {
        const small = t.w < 170 || t.h < 120
        const pad = small ? 10 : 16
        const col = t.text || C.ink
        return (
          <g key={t.label}>
            <rect x={t.x + 3} y={t.y + 3} width={t.w - 6} height={t.h - 6} fill={t.fill} />
            <text x={t.x + pad} y={t.y + pad + (small ? 22 : t.hero ? 46 : 40)} fontFamily={SERIF} fontWeight="800" fontSize={small ? 22 : t.hero ? 44 : 38} fill={col}>
              {t.v >= 100000 ? `₹${(t.v / 100000).toFixed(2).replace(/0$/, '')} lakh cr` : `₹${fmt(t.v)}`}
            </text>
            <text x={t.x + pad} y={t.y + pad + (small ? 44 : t.hero ? 80 : 72)} fontFamily={SANS} fontWeight="700" fontSize={small ? 14 : 19} fill={col}>{t.label}</text>
            <text x={t.x + pad} y={t.y + pad + (small ? 62 : t.hero ? 104 : 96)} fontFamily={SANS} fontSize={small ? 13 : 16} fill={col} opacity="0.8">{t.sub}</text>
          </g>
        )
      })}

      {/* zoom out */}
      <text x="80" y="2205" fontFamily={SERIF} fontSize="30" fontWeight="700" fill={C.ink}>Zoom out: 2026 has seen almost twice the selling of 2025</text>
      <text x="80" y="2236" fontFamily={SANS} fontSize="19" fill={C.mute}>Net FPI selling of Indian shares, ₹ crore. October is the red part of 2026.</text>
      <rect x={zx} y="2258" width={Y2025 * zScale} height="40" fill={C.sellPale} />
      <text x={zx + Y2025 * zScale + 14} y="2285" fontFamily={SANS} fontSize="20" fill={C.ink}><tspan fontWeight="700">All of 2025:</tspan> ₹1.66 lakh crore</text>
      <rect x={zx} y="2312" width={(YTD - 52100) * zScale} height="40" fill={C.sell} opacity="0.55" />
      <rect x={zx + (YTD - 52100) * zScale} y="2312" width={52100 * zScale} height="40" fill={C.sell} />
      <text x={zx + 14} y="2339" fontFamily={SANS} fontSize="20" fill="#fff"><tspan fontWeight="700">2026, to 18 October:</tspan> about ₹3.12 lakh crore, almost double 2025</text>

      {/* footer */}
      <g fontFamily={SANS} fontSize="15" fill={C.mute}>
        <text x="80" y="2398">Sources: NSDL, trends in FPI investment (equity, all routes): daily flows to 23 Oct 2026, and monthly, 2025 and 2026 totals as reported to 18 Oct 2026</text>
        <text x="80" y="2420">(the 2026 bar uses October to 18 Oct, ₹52,100 crore). DII buying: NSE provisional FII/DII data, a different measure. Jio IPO size: NSE issue data.</text>
        <text x="80" y="2442">FPI data are revised. Not investment advice.</text>
      </g>
      <text x="1120" y="92" textAnchor="end" fontFamily={SERIF} fontSize="22" fontWeight="700" fill={C.ink}>India in Data</text>
      <text x="1120" y="116" textAnchor="end" fontFamily={SANS} fontSize="16" fill={C.mute}>indiaindata.online</text>
    </svg>
  )
})

export default FpiSelloff
